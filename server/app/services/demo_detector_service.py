import os
import asyncio
import threading
import time
import logging
from pathlib import Path
from typing import Callable, Optional

import cv2
import numpy as np

from app.services.detector_service import (
    _empty_behavior_counts,
    _runtime_detection_settings,
    _get_model,
    _detectors,
    _detectors_lock,
    _last_snapshot_time,
    _snapshot_lock,
    _set_detector_status,
    _detector_should_continue,
    _friendly_waiting_message,
    _clear_cached_model,
    DETECTOR_RETRY_SECONDS,
    SNAPSHOT_COOLDOWN_SECONDS,
)
from app.db.database import SessionLocal
from app.models.session import ClassSession
from app.schemas.session import BehaviorLogCreate
from app.services.snapshot_service import snapshot_service
from app.core.config import settings

logger = logging.getLogger(__name__)

DEFAULT_DEMO_VIDEO_PATH = r"C:\Users\kayaos\Desktop\1.mp4"
_demo_video_cap: Optional[cv2.VideoCapture] = None
_demo_video_lock = threading.Lock()


def _demo_video_path() -> Path:
    configured_path = (settings.DEMO_VIDEO_PATH or DEFAULT_DEMO_VIDEO_PATH).strip()
    return Path(configured_path).expanduser()


def _get_demo_video_cap() -> cv2.VideoCapture:
    """Get or create demo video capture instance"""
    global _demo_video_cap
    with _demo_video_lock:
        if _demo_video_cap is None:
            video_path = _demo_video_path()
            
            if not video_path.exists():
                raise FileNotFoundError(f"Demo video not found at: {video_path}")
            
            _demo_video_cap = cv2.VideoCapture(str(video_path))
            if not _demo_video_cap.isOpened():
                raise RuntimeError(f"Failed to open demo video: {video_path}")
            
            logger.info(f"Loaded demo video: {video_path}")
        
        return _demo_video_cap


def _reset_demo_video() -> None:
    """Reset video to beginning for loop playback"""
    global _demo_video_cap
    with _demo_video_lock:
        if _demo_video_cap:
            _demo_video_cap.set(cv2.CAP_PROP_POS_FRAMES, 0)


def _run_demo_video_detector(session_id: int, stop_event: threading.Event, process_log_fn: Callable) -> None:
    """Run detector using demo video instead of webcam"""
    model = None
    cap = None
    last_send_time = 0.0
    frame_count = 0
    
    try:
        _set_detector_status(session_id, "initializing", "Initializing detection...")
        while _detector_should_continue(session_id, stop_event):
            detection_settings = _runtime_detection_settings()
            missing = set()

            if model is None:
                try:
                    _set_detector_status(session_id, "initializing", "Reinitializing detection model...")
                    model = _get_model()
                except Exception as exc:
                    missing.add("model")
                    _set_detector_status(
                        session_id,
                        "waiting",
                        _friendly_waiting_message(missing),
                        missing,
                        str(exc),
                    )

            if cap is None:
                try:
                    _set_detector_status(session_id, "initializing", "Reconnecting to camera...")
                    cap = _get_demo_video_cap()
                except Exception as exc:
                    missing.add("camera")
                    _set_detector_status(
                        session_id,
                        "waiting",
                        _friendly_waiting_message(missing),
                        missing,
                        str(exc),
                    )

            if missing:
                time.sleep(DETECTOR_RETRY_SECONDS)
                continue

            _set_detector_status(session_id, "running", "Detection resumed")

            ret, frame = cap.read()
            if not ret:
                # Loop video when it ends
                _reset_demo_video()
                ret, frame = cap.read()
                if not ret:
                    _set_detector_status(
                        session_id,
                        "recovering",
                        "Camera unavailable — waiting for camera...",
                        {"camera"},
                        "Failed to read demo video frame after reset",
                    )
                    time.sleep(DETECTOR_RETRY_SECONDS)
                    continue

            current_time = time.time()
            if current_time - last_send_time < detection_settings["detect_interval_seconds"]:
                time.sleep(0.01)
                continue

            # Run detection on video frame
            try:
                results = model(frame, imgsz=int(detection_settings["detection_imgsz"]), verbose=False)
            except Exception as exc:
                _clear_cached_model()
                model = None
                _set_detector_status(
                    session_id,
                    "recovering",
                    "Detection model unavailable — waiting for model...",
                    {"model"},
                    str(exc),
                )
                time.sleep(DETECTOR_RETRY_SECONDS)
                continue
            
            # Optional: Show preview window
            if detection_settings.get("server_camera_preview", False):
                try:
                    annotated = results[0].plot()
                    cv2.imshow("TeachTrack Demo Detector", annotated)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break
                except Exception as exc:
                    logger.error(f"Demo preview error for session {session_id}: {exc}")

            counts = _empty_behavior_counts()
            phone_detections = []
            for box in results[0].boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                if conf < detection_settings["detection_confidence_threshold"]:
                    continue
                class_name = str(model.names[cls_id]).strip()
                if class_name in counts:
                    counts[class_name] += 1
                    if class_name == "using_phone" and snapshot_service.is_configured():
                        bbox = box.xyxy[0].cpu().numpy().tolist()
                        phone_detections.append({"bbox": bbox, "label": "Phone", "confidence": conf})

            log_data = BehaviorLogCreate(**counts)

            # Handle snapshots for phone detections (same logic as main detector)
            if phone_detections and snapshot_service.is_configured():
                should_upload = False
                with _snapshot_lock:
                    last_ts = _last_snapshot_time.get(session_id, 0.0)
                    if current_time - last_ts >= SNAPSHOT_COOLDOWN_SECONDS:
                        _last_snapshot_time[session_id] = current_time
                        should_upload = True

                if should_upload:
                    try:
                        db = SessionLocal()
                        try:
                            session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
                            if session:
                                if session.activity_mode == "EXAM":
                                    snapshot_url = asyncio.run(
                                        snapshot_service.upload_snapshot_with_detections(
                                            frame,
                                            phone_detections,
                                            session_id,
                                            "phone",
                                            int(current_time),
                                        )
                                    )
                                else:
                                    snapshot_url = asyncio.run(
                                        snapshot_service.upload_snapshot(
                                            frame,
                                            session_id,
                                            "phone",
                                            int(current_time),
                                        )
                                    )

                                if snapshot_url:
                                    setattr(log_data, "_snapshot_url", snapshot_url)
                        finally:
                            db.close()
                    except Exception as exc:
                        logger.error(f"Failed to capture demo snapshot for session {session_id}: {exc}")

            # Log the detection results
            db = SessionLocal()
            try:
                process_log_fn(db, session_id, log_data)
            except Exception as exc:
                logger.error(f"Demo detector failed to log metrics for session {session_id}: {exc}")
            finally:
                db.close()

            last_send_time = current_time
            frame_count += 1
            
            # Add demo info log every 30 frames
            if frame_count % 30 == 0:
                logger.info(f"Demo detector processed {frame_count} frames for session {session_id}")

    finally:
        detection_settings = _runtime_detection_settings()
        if detection_settings.get("server_camera_preview", False):
            try:
                cv2.destroyAllWindows()
            except Exception:
                pass
        _set_detector_status(session_id, "stopped", "Detection stopped")


def start_demo_video_detector(session_id: int, process_log_fn: Callable) -> str:
    """Start demo video detector (replaces webcam detector for demo branch)"""
    with _detectors_lock:
        existing = _detectors.get(session_id)
        if existing and existing["thread"].is_alive():
            existing["last_heartbeat"] = time.time()
            return "already_running"

        stop_event = threading.Event()
        thread = threading.Thread(
            target=_run_demo_video_detector,
            args=(session_id, stop_event, process_log_fn),
            daemon=True,
        )
        _detectors[session_id] = {
            "thread": thread,
            "stop": stop_event,
            "last_heartbeat": time.time(),
            "state": "initializing",
            "status": "initializing",
            "message": "Initializing detection...",
            "missing": [],
            "failure_count": 0,
            "last_error": None,
            "updated_at": time.time(),
        }
        thread.start()
        
    logger.info(f"Started demo video detector for session {session_id}")
    return "started"


def get_demo_video_info() -> dict:
    """Get information about the demo video"""
    try:
        cap = _get_demo_video_cap()
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = frame_count / fps if fps > 0 else 0
        
        return {
            "video_path": str(_demo_video_path()),
            "fps": fps,
            "frame_count": frame_count,
            "width": width,
            "height": height,
            "duration_seconds": duration,
            "status": "loaded"
        }
    except Exception as exc:
        return {
            "video_path": str(_demo_video_path()),
            "status": "error",
            "error": str(exc)
        }


def cleanup_demo_resources() -> None:
    """Clean up demo video resources"""
    global _demo_video_cap
    with _demo_video_lock:
        if _demo_video_cap:
            _demo_video_cap.release()
            _demo_video_cap = None

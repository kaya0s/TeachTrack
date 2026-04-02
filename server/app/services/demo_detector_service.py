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
    SNAPSHOT_COOLDOWN_SECONDS,
)
from app.db.database import SessionLocal
from app.models.session import ClassSession
from app.schemas.session import BehaviorLogCreate
from app.services.admin import settings_service
from app.services.snapshot_service import snapshot_service

logger = logging.getLogger(__name__)

# Demo video configuration - CHANGE THIS PATH TO YOUR VIDEO FILE
DEMO_VIDEO_PATH = r"C:\Users\kayaos\Desktop\1.mp4"  # <-- UPDATE THIS PATH
_demo_video_cap: Optional[cv2.VideoCapture] = None
_demo_video_lock = threading.Lock()


def _get_demo_video_cap() -> cv2.VideoCapture:
    """Get or create demo video capture instance"""
    global _demo_video_cap
    with _demo_video_lock:
        if _demo_video_cap is None:
            video_path = Path(DEMO_VIDEO_PATH)
            
            if not video_path.exists():
                raise FileNotFoundError(f"Demo video not found at: {DEMO_VIDEO_PATH}")
            
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
    detection_settings = _runtime_detection_settings()
    
    try:
        model = _get_model()
    except Exception as exc:
        logger.error(f"Demo detector failed to load model for session {session_id}: {exc}")
        return

    try:
        cap = _get_demo_video_cap()
    except Exception as exc:
        logger.error(f"Demo detector failed to load video for session {session_id}: {exc}")
        return

    last_send_time = 0.0
    frame_count = 0
    
    try:
        while not stop_event.is_set():
            with _detectors_lock:
                entry = _detectors.get(session_id)
                last_heartbeat = entry.get("last_heartbeat") if entry else None

            detection_settings = _runtime_detection_settings()
            if last_heartbeat is None or (time.time() - last_heartbeat) > detection_settings["detector_heartbeat_timeout_seconds"]:
                logger.info(f"Demo detector heartbeat expired for session {session_id}. Stopping.")
                break

            ret, frame = cap.read()
            if not ret:
                # Loop video when it ends
                _reset_demo_video()
                ret, frame = cap.read()
                if not ret:
                    logger.error(f"Demo detector failed to read frame after reset for session {session_id}")
                    break

            current_time = time.time()
            if current_time - last_send_time < detection_settings["detect_interval_seconds"]:
                continue

            # Run detection on video frame
            results = model(frame, imgsz=int(detection_settings["detection_imgsz"]), verbose=False)
            
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
        if detection_settings.get("server_camera_preview", False):
            try:
                cv2.destroyAllWindows()
            except Exception:
                pass


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
        _detectors[session_id] = {"thread": thread, "stop": stop_event, "last_heartbeat": time.time()}
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
            "video_path": DEMO_VIDEO_PATH,
            "fps": fps,
            "frame_count": frame_count,
            "width": width,
            "height": height,
            "duration_seconds": duration,
            "status": "loaded"
        }
    except Exception as exc:
        return {
            "video_path": DEMO_VIDEO_PATH,
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

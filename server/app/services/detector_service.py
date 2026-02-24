from pathlib import Path
import logging
import threading
import time
from typing import Callable

import cv2
import numpy as np
from ultralytics import YOLO

from app.core.config import settings
from app.db.database import SessionLocal
from app.schemas.session import BehaviorLogCreate

logger = logging.getLogger(__name__)

MODEL_PATH = settings.MODEL_PATH
DETECT_INTERVAL_SECONDS = settings.DETECT_INTERVAL_SECONDS
DETECTOR_HEARTBEAT_TIMEOUT_SECONDS = settings.DETECTOR_HEARTBEAT_TIMEOUT_SECONDS
SERVER_CAMERA_ENABLED = settings.SERVER_CAMERA_ENABLED
SERVER_CAMERA_PREVIEW = settings.SERVER_CAMERA_PREVIEW
SERVER_CAMERA_INDEX = settings.SERVER_CAMERA_INDEX

_model = None
_model_lock = threading.Lock()
_detectors: dict[int, dict] = {}
_detectors_lock = threading.Lock()

_server_root = Path(__file__).resolve().parents[2]
_initial_model_path = Path(MODEL_PATH)
_current_model_path = (
    _initial_model_path if _initial_model_path.is_absolute() else (_server_root / _initial_model_path)
).resolve()
_weights_dir = _current_model_path.parent


def _empty_behavior_counts() -> dict[str, int]:
    return {
        "on_task": 0,
        "sleeping": 0,
        "writing": 0,
        "using_phone": 0,
        "disengaged_posture": 0,
        "not_visible": 0,
    }


def _normalize_behavior_label(name: str) -> str:
    normalized = name.lower().replace(" ", "_")
    alias_map = {
        "attentive": "on_task",
        "raising_hand": "on_task",
        "bow_down": "disengaged_posture",
        "bown_down": "disengaged_posture",
        "bowed_down": "disengaged_posture",
    }
    return alias_map.get(normalized, normalized)


def _get_model() -> YOLO:
    global _model
    _ensure_current_model_exists()
    if _model is None:
        with _model_lock:
            if _model is None:
                if not _current_model_path.exists():
                    raise RuntimeError(f"Model not found at {_current_model_path}")
                _model = YOLO(str(_current_model_path))
    return _model


def _list_weight_files() -> list[Path]:
    if not _weights_dir.exists():
        return []
    return sorted(
        [p for p in _weights_dir.iterdir() if p.is_file() and p.suffix.lower() == ".pt"],
        key=lambda p: p.name.lower(),
    )


def _ensure_current_model_exists() -> None:
    global _current_model_path, _model
    if _current_model_path.exists():
        return

    files = _list_weight_files()
    if not files:
        return

    with _model_lock:
        _current_model_path = files[0]
        _model = None


def build_model_selection_response() -> dict:
    _ensure_current_model_exists()
    files = _list_weight_files()
    current_name = _current_model_path.name
    return {
        "current_model_file": current_name,
        "models": [{"file_name": p.name, "is_current": p.name == current_name} for p in files],
    }


def select_model_file(file_name: str) -> dict:
    global _current_model_path, _model

    requested = Path(file_name).name
    if not requested.lower().endswith(".pt"):
        raise ValueError("Only .pt files are allowed.")

    candidate = (_weights_dir / requested).resolve()
    if candidate.parent != _weights_dir.resolve():
        raise ValueError("Invalid model file path.")
    if not candidate.exists():
        raise FileNotFoundError("Model file not found.")

    with _model_lock:
        _current_model_path = candidate
        _model = None

    return build_model_selection_response()


def detect_counts_from_image_bytes(raw: bytes) -> dict[str, int]:
    image_array = np.frombuffer(raw, dtype=np.uint8)
    frame = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Invalid image data")

    model = _get_model()
    results = model(frame, verbose=False)

    counts = _empty_behavior_counts()
    for box in results[0].boxes:
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])
        if conf < 0.5:
            continue
        class_name = model.names[cls_id]
        normalized = _normalize_behavior_label(class_name)
        if normalized in counts:
            counts[normalized] += 1
    return counts


def _run_webcam_detector(session_id: int, stop_event: threading.Event, process_log_fn: Callable) -> None:
    if not SERVER_CAMERA_ENABLED:
        logger.warning(f"Detector not started for session {session_id}: SERVER_CAMERA_ENABLED=false")
        return

    try:
        model = _get_model()
    except Exception as exc:
        logger.error(f"Detector failed to load model for session {session_id}: {exc}")
        return

    cap = cv2.VideoCapture(SERVER_CAMERA_INDEX)
    if not cap.isOpened():
        logger.error(f"Detector failed to open webcam index {SERVER_CAMERA_INDEX} for session {session_id}")
        return

    last_send_time = 0.0
    try:
        while not stop_event.is_set():
            with _detectors_lock:
                entry = _detectors.get(session_id)
                last_heartbeat = entry.get("last_heartbeat") if entry else None

            if last_heartbeat is None or (time.time() - last_heartbeat) > DETECTOR_HEARTBEAT_TIMEOUT_SECONDS:
                logger.info(f"Detector heartbeat expired for session {session_id}. Stopping.")
                break

            ret, frame = cap.read()
            if not ret:
                time.sleep(0.2)
                continue

            current_time = time.time()
            if current_time - last_send_time < DETECT_INTERVAL_SECONDS:
                continue

            results = model(frame, verbose=False)
            if SERVER_CAMERA_PREVIEW:
                try:
                    annotated = results[0].plot()
                    cv2.imshow("TeachTrack Detector", annotated)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break
                except Exception as exc:
                    logger.error(f"Preview error for session {session_id}: {exc}")

            counts = _empty_behavior_counts()
            for box in results[0].boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                if conf < 0.5:
                    continue
                class_name = model.names[cls_id]
                normalized = _normalize_behavior_label(class_name)
                if normalized in counts:
                    counts[normalized] += 1

            db = SessionLocal()
            try:
                process_log_fn(db, session_id, BehaviorLogCreate(**counts))
            except Exception as exc:
                logger.error(f"Detector failed to log metrics for session {session_id}: {exc}")
            finally:
                db.close()

            last_send_time = current_time
    finally:
        cap.release()
        if SERVER_CAMERA_PREVIEW:
            try:
                cv2.destroyAllWindows()
            except Exception:
                pass


def start_webcam_detector(session_id: int, process_log_fn: Callable) -> str:
    if not SERVER_CAMERA_ENABLED:
        raise ValueError("Server camera disabled by SERVER_CAMERA_ENABLED")

    with _detectors_lock:
        existing = _detectors.get(session_id)
        if existing and existing["thread"].is_alive():
            existing["last_heartbeat"] = time.time()
            return "already_running"

        stop_event = threading.Event()
        thread = threading.Thread(
            target=_run_webcam_detector,
            args=(session_id, stop_event, process_log_fn),
            daemon=True,
        )
        _detectors[session_id] = {"thread": thread, "stop": stop_event, "last_heartbeat": time.time()}
        thread.start()
    return "started"


def stop_webcam_detector(session_id: int) -> str:
    with _detectors_lock:
        existing = _detectors.get(session_id)
        if not existing:
            return "not_running"
        existing["stop"].set()
        _detectors.pop(session_id, None)
    return "stopped"


def heartbeat_webcam_detector(session_id: int) -> str:
    with _detectors_lock:
        existing = _detectors.get(session_id)
        if not existing:
            return "not_running"
        existing["last_heartbeat"] = time.time()
    return "ok"


def get_webcam_detector_status(session_id: int) -> str:
    with _detectors_lock:
        existing = _detectors.get(session_id)
        if existing and existing["thread"].is_alive():
            return "running"
    return "stopped"


def stop_detector_if_running(session_id: int) -> None:
    with _detectors_lock:
        existing = _detectors.get(session_id)
        if not existing:
            return
        existing["stop"].set()
        _detectors.pop(session_id, None)

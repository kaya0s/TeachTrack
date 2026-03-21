import os
from pathlib import Path
import logging
import threading
import time
from typing import Any, Callable

import cv2
import numpy as np

# Ultralytics (YOLO) writes a settings file on import. In restricted environments this can fail
# if the default user config dir is not writeable, so we redirect it to a local project folder.
if "YOLO_CONFIG_DIR" not in os.environ:
    try:
        yolo_config_dir = Path(__file__).resolve().parents[2] / ".ultralytics"
        yolo_config_dir.mkdir(parents=True, exist_ok=True)
        os.environ["YOLO_CONFIG_DIR"] = str(yolo_config_dir)
    except Exception:
        # If we can't create the directory, fall back to Ultralytics defaults.
        pass

from ultralytics import YOLO

from app.core.config import settings
from app.db.database import SessionLocal
from app.schemas.session import BehaviorLogCreate
from app.services.admin import settings_service

logger = logging.getLogger(__name__)

MODEL_PATH = settings.MODEL_PATH

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


def _runtime_detection_settings() -> dict[str, Any]:
    return settings_service.get_detection_settings()


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
    detection_settings = _runtime_detection_settings()
    if not detection_settings["server_camera_enabled"]:
        logger.warning(f"Detector not started for session {session_id}: SERVER_CAMERA_ENABLED=false")
        return

    try:
        model = _get_model()
    except Exception as exc:
        logger.error(f"Detector failed to load model for session {session_id}: {exc}")
        return

    cap = cv2.VideoCapture(detection_settings["server_camera_index"])
    if not cap.isOpened():
        logger.error(
            f"Detector failed to open webcam index {detection_settings['server_camera_index']} for session {session_id}"
        )
        return

    last_send_time = 0.0
    try:
        while not stop_event.is_set():
            with _detectors_lock:
                entry = _detectors.get(session_id)
                last_heartbeat = entry.get("last_heartbeat") if entry else None

            detection_settings = _runtime_detection_settings()
            if last_heartbeat is None or (time.time() - last_heartbeat) > detection_settings["detector_heartbeat_timeout_seconds"]:
                logger.info(f"Detector heartbeat expired for session {session_id}. Stopping.")
                break

            ret, frame = cap.read()
            if not ret:
                time.sleep(0.2)
                continue

            current_time = time.time()
            if current_time - last_send_time < detection_settings["detect_interval_seconds"]:
                continue

            results = model(frame, verbose=False)
            if detection_settings["server_camera_preview"]:
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
        if detection_settings["server_camera_preview"]:
            try:
                cv2.destroyAllWindows()
            except Exception:
                pass


def start_webcam_detector(session_id: int, process_log_fn: Callable) -> str:
    detection_settings = _runtime_detection_settings()
    if not detection_settings["server_camera_enabled"]:
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

from datetime import datetime, timedelta
from typing import List, Any, Dict
import logging
import os
from pathlib import Path
import threading
import time

import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from ultralytics import YOLO
from dotenv import load_dotenv
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.api import deps
from app.db.database import get_db
from app.models.session import (
    ClassSession,
    BehaviorLog,
    Alert,
    AlertType,
    AlertSeverity,
    SessionMetrics as SessionMetricsModel,
    EngagementEvent,
    SessionHistory,
    AlertHistory,
)
from app.schemas.session import (
    SessionCreate, Session as SessionSchema,
    BehaviorLogCreate,
    Alert as AlertSchema, SessionMetrics,
    SessionMetricRow, EngagementEvent as EngagementEventSchema,
    SessionHistory as SessionHistorySchema,
    AlertHistory as AlertHistorySchema,
    SessionSummary as SessionSummarySchema,
    ModelSelectionRequest,
    ModelSelectionResponse,
)

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
models_router = APIRouter()

load_dotenv()

MODEL_PATH = os.getenv("MODEL_PATH", "ml_engine/weights/best.pt")
DETECT_INTERVAL_SECONDS = int(os.getenv("DETECT_INTERVAL_SECONDS", "3"))
DETECTOR_HEARTBEAT_TIMEOUT_SECONDS = int(os.getenv("DETECTOR_HEARTBEAT_TIMEOUT_SECONDS", "15"))
SERVER_CAMERA_ENABLED = os.getenv("SERVER_CAMERA_ENABLED", "true").lower() == "true"
SERVER_CAMERA_PREVIEW = os.getenv("SERVER_CAMERA_PREVIEW", "false").lower() == "true"
SERVER_CAMERA_INDEX = int(os.getenv("SERVER_CAMERA_INDEX", "0"))
_model = None
_model_lock = threading.Lock()
_detectors = {}
_detectors_lock = threading.Lock()
_server_root = Path(__file__).resolve().parents[2]
_initial_model_path = Path(MODEL_PATH)
_current_model_path = (
    _initial_model_path
    if _initial_model_path.is_absolute()
    else (_server_root / _initial_model_path)
).resolve()
_weights_dir = _current_model_path.parent

# Weighted behavior scoring config
W_ON_TASK = 1.0
W_WRITING = 0.8
W_PHONE = 1.2
W_SLEEPING = 1.5
W_DISENGAGED_POSTURE = 1.0

def _get_model() -> YOLO:
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                if not _current_model_path.exists():
                    raise RuntimeError(f"Model not found at {_current_model_path}")
                _model = YOLO(str(_current_model_path))
    return _model

def _list_weight_files() -> List[Path]:
    if not _weights_dir.exists():
        return []
    return sorted(
        [p for p in _weights_dir.iterdir() if p.is_file() and p.suffix.lower() == ".pt"],
        key=lambda p: p.name.lower(),
    )

def _build_model_selection_response() -> dict:
    files = _list_weight_files()
    current_name = _current_model_path.name
    return {
        "current_model_file": current_name,
        "models": [
            {
                "file_name": p.name,
                "is_current": p.name == current_name,
            }
            for p in files
        ],
    }

def _empty_behavior_counts() -> Dict[str, int]:
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

def _weighted_engagement_percent(
    on_task: int,
    writing: int,
    using_phone: int,
    sleeping: int,
    disengaged_posture: int,
    students_present: int,
) -> float:
    if students_present <= 0:
        return 0.0
    raw_score = (
        (W_ON_TASK * on_task)
        + (W_WRITING * writing)
        - (W_PHONE * using_phone)
        - (W_SLEEPING * sleeping)
        - (W_DISENGAGED_POSTURE * disengaged_posture)
    )
    percent = (raw_score / students_present) * 100
    return max(0.0, min(100.0, percent))

def _to_float(value: Any) -> float:
    if value is None:
        return 0.0
    return float(value)

def _run_webcam_detector(session_id: int, stop_event: threading.Event) -> None:
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
                    if cv2.waitKey(1) & 0xFF == ord('q'):
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

            try:
                db = next(get_db())
                _process_behavior_log(db, session_id, BehaviorLogCreate(**counts))
            except Exception as exc:
                logger.error(f"Detector failed to log metrics for session {session_id}: {exc}")
            finally:
                try:
                    db.close()
                except Exception:
                    pass

            last_send_time = current_time
    finally:
        cap.release()
        if SERVER_CAMERA_PREVIEW:
            try:
                cv2.destroyAllWindows()
            except Exception:
                pass

@router.post("/start", response_model=SessionSchema)
def start_session(
    *,
    db: Session = Depends(get_db),
    session_in: SessionCreate,
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    if session_in.students_present <= 0:
        raise HTTPException(status_code=400, detail="students_present must be greater than 0")

    session = ClassSession(
        **session_in.dict(),
        teacher_id=current_user.id,
        is_active=True,
        start_time=datetime.now()
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    _record_session_history(db, session, current_user.id, "CREATE")
    logger.info(f"✅ Session Started: ID {session.id} for Teacher {current_user.username}")
    return session

@router.post("/{session_id}/stop", response_model=SessionSchema)
def stop_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    session = db.query(ClassSession).filter(ClassSession.id == session_id, ClassSession.teacher_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.is_active = False
    session.end_time = datetime.now()
    _stop_detector_if_running(session_id)
    _record_session_history(db, session, current_user.id, "END")
    db.commit()
    db.refresh(session)
    return session

@router.get("/active", response_model=SessionSchema)
def get_active_session(
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    session = db.query(ClassSession).filter(
        ClassSession.teacher_id == current_user.id, 
        ClassSession.is_active == True
    ).order_by(ClassSession.start_time.desc()).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    return session

@router.get("", response_model=List[SessionSummarySchema])
def list_sessions(
    limit: int = 50,
    include_active: bool = True,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    query = db.query(ClassSession).options(
        joinedload(ClassSession.subject),
        joinedload(ClassSession.section),
    ).filter(ClassSession.teacher_id == current_user.id)

    if not include_active:
        query = query.filter(ClassSession.is_active == False)

    sessions = query.order_by(ClassSession.start_time.desc()).limit(max(1, min(limit, 200))).all()

    summaries = []
    for session in sessions:
        stats = db.query(
            func.sum(BehaviorLog.on_task),
            func.sum(BehaviorLog.writing),
            func.sum(BehaviorLog.using_phone),
            func.sum(BehaviorLog.sleeping),
            func.sum(BehaviorLog.disengaged_posture),
            func.count(BehaviorLog.id),
        ).filter(BehaviorLog.session_id == session.id).first()

        avg_eng = 0.0
        log_count = stats[5] or 0
        if log_count > 0 and session.students_present > 0:
            on_task_sum = _to_float(stats[0])
            writing_sum = _to_float(stats[1])
            phone_sum = _to_float(stats[2])
            sleeping_sum = _to_float(stats[3])
            disengaged_sum = _to_float(stats[4])
            raw_total = (
                (W_ON_TASK * on_task_sum)
                + (W_WRITING * writing_sum)
                - (W_PHONE * phone_sum)
                - (W_SLEEPING * sleeping_sum)
                - (W_DISENGAGED_POSTURE * disengaged_sum)
            )
            avg_eng = max(0.0, min(100.0, (raw_total / (session.students_present * log_count)) * 100))

        summaries.append({
            "id": session.id,
            "subject_id": session.subject_id,
            "section_id": session.section_id,
            "subject_name": session.subject.name if session.subject else "Unknown",
            "section_name": session.section.name if session.section else "Unknown",
            "start_time": session.start_time,
            "end_time": session.end_time,
            "is_active": session.is_active,
            "average_engagement": round(avg_eng, 2),
        })

    return summaries

@models_router.get("", response_model=ModelSelectionResponse)
def list_models(
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    return _build_model_selection_response()

@models_router.post("/select", response_model=ModelSelectionResponse)
def select_model(
    data: ModelSelectionRequest,
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    global _current_model_path, _model

    requested = Path(data.file_name).name
    if not requested.lower().endswith(".pt"):
        raise HTTPException(status_code=400, detail="Only .pt files are allowed.")

    candidate = (_weights_dir / requested).resolve()
    if candidate.parent != _weights_dir.resolve():
        raise HTTPException(status_code=400, detail="Invalid model file path.")
    if not candidate.exists():
        raise HTTPException(status_code=404, detail="Model file not found.")

    with _model_lock:
        _current_model_path = candidate
        _model = None

    return _build_model_selection_response()

# -- Data Ingestion form ML Script -- 
# Note: In production, you might use an API Key instead of User Token for the script,
# but for now we assume the script authenticates or we allow open access if secured by network.
# We will use teacher token for simplicity or just open for this specific endpoint if user desires.
# Assuming script has session_id.
@router.post("/{session_id}/log", status_code=200)
def log_behavior_metrics(
    session_id: int,
    log_in: BehaviorLogCreate,
    db: Session = Depends(get_db),
    # For a machine script, maybe skip auth or use a machine token. 
    # We will enforce existence of session only.
) -> Any:
    _get_active_session_or_404(db, session_id)
    _process_behavior_log(db, session_id, log_in)
    return {"status": "logged"}

@router.post("/{session_id}/detector/start", status_code=200)
def start_webcam_detector(
    session_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    if not SERVER_CAMERA_ENABLED:
        raise HTTPException(status_code=400, detail="Server camera disabled by SERVER_CAMERA_ENABLED")
    _get_active_session_or_404(db, session_id)
    with _detectors_lock:
        existing = _detectors.get(session_id)
        if existing and existing["thread"].is_alive():
            existing["last_heartbeat"] = time.time()
            return {"status": "already_running"}
        stop_event = threading.Event()
        thread = threading.Thread(
            target=_run_webcam_detector,
            args=(session_id, stop_event),
            daemon=True,
        )
        _detectors[session_id] = {"thread": thread, "stop": stop_event, "last_heartbeat": time.time()}
        thread.start()
    return {"status": "started"}

@router.post("/{session_id}/detector/stop", status_code=200)
def stop_webcam_detector(
    session_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    _get_active_session_or_404(db, session_id)
    with _detectors_lock:
        existing = _detectors.get(session_id)
        if not existing:
            return {"status": "not_running"}
        existing["stop"].set()
        _detectors.pop(session_id, None)
    return {"status": "stopped"}

@router.post("/{session_id}/detector/heartbeat", status_code=200)
def heartbeat_webcam_detector(
    session_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    _get_active_session_or_404(db, session_id)
    with _detectors_lock:
        existing = _detectors.get(session_id)
        if not existing:
            return {"status": "not_running"}
        existing["last_heartbeat"] = time.time()
    return {"status": "ok"}

@router.get("/{session_id}/detector/status", status_code=200)
def get_webcam_detector_status(
    session_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    _get_active_session_or_404(db, session_id)
    with _detectors_lock:
        existing = _detectors.get(session_id)
        if existing and existing["thread"].is_alive():
            return {"status": "running"}
    return {"status": "stopped"}

@router.post("/{session_id}/detect", status_code=200)
async def detect_behavior_metrics(
    session_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    _get_active_session_or_404(db, session_id)

    try:
        raw = await file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Unable to read uploaded image")

    image_array = np.frombuffer(raw, dtype=np.uint8)
    frame = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image data")

    try:
        model = _get_model()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

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

    log_in = BehaviorLogCreate(**counts)
    _process_behavior_log(db, session_id, log_in)

    return {"status": "logged", "counts": counts}

def _get_active_session_or_404(db: Session, session_id: int) -> ClassSession:
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session.is_active:
        raise HTTPException(status_code=400, detail="Session is not active")
    return session

def _stop_detector_if_running(session_id: int) -> None:
    with _detectors_lock:
        existing = _detectors.get(session_id)
        if not existing:
            return
        existing["stop"].set()
        _detectors.pop(session_id, None)

def _process_behavior_log(db: Session, session_id: int, log_in: BehaviorLogCreate) -> None:
    session = _get_active_session_or_404(db, session_id)
    observed = (
        log_in.on_task
        + log_in.writing
        + log_in.using_phone
        + log_in.sleeping
        + log_in.disengaged_posture
    )
    not_visible = max(0, session.students_present - observed)
    total = observed

    log = BehaviorLog(
        session_id=session_id,
        on_task=log_in.on_task,
        sleeping=log_in.sleeping,
        writing=log_in.writing,
        using_phone=log_in.using_phone,
        disengaged_posture=log_in.disengaged_posture,
        not_visible=not_visible,
        total_detected=total
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    logger.info(f"📡 Received Log for Session {session_id}: Sleep={log_in.sleeping}, Phone={log_in.using_phone}, Total={total}")

    if total > 0 and log_in.sleeping > 0:
        ratio = log_in.sleeping / total
        if ratio > 0.3 and total >= 5:
            msg = f"High sleeping detected: {log_in.sleeping} students ({int(ratio*100)}%)."
            _trigger_alert(db, session_id, AlertType.SLEEPING, msg, AlertSeverity.WARNING)

    if total > 0 and log_in.using_phone > 0:
        ratio = log_in.using_phone / total
        if ratio > 0.2:
            msg = f"Phone usage usage spike: {log_in.using_phone} students ({int(ratio*100)}%)."
            _trigger_alert(db, session_id, AlertType.PHONE, msg, AlertSeverity.WARNING)

    weighted_engagement = _weighted_engagement_percent(
        on_task=log_in.on_task,
        writing=log_in.writing,
        using_phone=log_in.using_phone,
        sleeping=log_in.sleeping,
        disengaged_posture=log_in.disengaged_posture,
        students_present=session.students_present,
    )
    if total >= 5 and weighted_engagement < 40:
        severity = AlertSeverity.CRITICAL if weighted_engagement < 25 else AlertSeverity.WARNING
        msg = f"Engagement drop: {int(weighted_engagement)}% weighted engagement."
        _trigger_alert(db, session_id, AlertType.ENGAGEMENT_DROP, msg, severity)
        _record_engagement_event(db, session_id, "ENGAGEMENT_DROP", severity.value, msg)
    elif weighted_engagement > 60:
        _record_recovery_if_needed(db, session_id, weighted_engagement)

    # Rollup Metrics (1-minute window)
    _update_session_metrics(db, session_id, log.timestamp)

def _trigger_alert(db: Session, session_id: int, a_type: AlertType, msg: str, severity: AlertSeverity):
    # Cooldown check: Check last alert of this type in last 5 mins
    five_min_ago = datetime.now() - timedelta(minutes=5)
    recent = db.query(Alert).filter(
        Alert.session_id == session_id,
        Alert.alert_type == a_type,
        Alert.triggered_at >= five_min_ago
    ).first()
    
    if not recent:
        alert = Alert(session_id=session_id, alert_type=str(a_type), message=msg, severity=severity.value)
        db.add(alert)
        db.commit()
        logger.warning(f"🚨 ALERT TRIGGERED ({session_id}): {msg}")

@router.get("/{session_id}/metrics", response_model=SessionMetrics)
def get_session_metrics(
    session_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Get recent logs (last 20 for graph)
    logs = db.query(BehaviorLog).filter(BehaviorLog.session_id == session_id).order_by(BehaviorLog.timestamp.desc()).limit(20).all()
    logs.reverse() # Oldest first for graph
    
    # Get unread alerts
    alerts = db.query(Alert).filter(Alert.session_id == session_id, Alert.is_read == False).all()
    
    stats = db.query(
        func.sum(BehaviorLog.on_task),
        func.sum(BehaviorLog.writing),
        func.sum(BehaviorLog.using_phone),
        func.sum(BehaviorLog.sleeping),
        func.sum(BehaviorLog.disengaged_posture),
        func.count(BehaviorLog.id),
    ).filter(BehaviorLog.session_id == session_id).first()
    
    avg_eng = 0.0
    log_count = stats[5] or 0
    if log_count > 0 and session.students_present > 0:
        on_task_sum = _to_float(stats[0])
        writing_sum = _to_float(stats[1])
        phone_sum = _to_float(stats[2])
        sleeping_sum = _to_float(stats[3])
        disengaged_sum = _to_float(stats[4])
        raw_total = (
            (W_ON_TASK * on_task_sum)
            + (W_WRITING * writing_sum)
            - (W_PHONE * phone_sum)
            - (W_SLEEPING * sleeping_sum)
            - (W_DISENGAGED_POSTURE * disengaged_sum)
        )
        avg_eng = max(0.0, min(100.0, (raw_total / (session.students_present * log_count)) * 100))
        
    return {
        "session_id": session_id,
        "students_present": session.students_present,
        "total_logs": len(logs),
        "average_engagement": round(avg_eng, 2),
        "recent_logs": logs,
        "alerts": alerts
    }

@router.get("/{session_id}/metrics/rollup", response_model=List[SessionMetricRow])
def get_session_metrics_rollup(
    session_id: int,
    minutes: int = 60,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    cutoff = datetime.now() - timedelta(minutes=max(1, minutes))
    rows = db.query(SessionMetricsModel).filter(
        SessionMetricsModel.session_id == session_id,
        SessionMetricsModel.window_start >= cutoff
    ).order_by(SessionMetricsModel.window_start.asc()).all()
    return rows

@router.get("/{session_id}/events", response_model=List[EngagementEventSchema])
def get_session_events(
    session_id: int,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    events = db.query(EngagementEvent).filter(
        EngagementEvent.session_id == session_id
    ).order_by(EngagementEvent.event_time.desc()).limit(max(1, limit)).all()
    events.reverse()
    return events

@router.get("/{session_id}/history", response_model=List[SessionHistorySchema])
def get_session_history(
    session_id: int,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    rows = db.query(SessionHistory).filter(
        SessionHistory.session_id == session_id
    ).order_by(SessionHistory.changed_at.desc()).limit(max(1, limit)).all()
    rows.reverse()
    return rows

@router.put("/alerts/{alert_id}/read", response_model=AlertSchema)
def mark_alert_read(
        alert_id: int,
        db: Session = Depends(get_db),
        current_user = Depends(deps.get_current_active_user),
) -> Any:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    _record_alert_history(db, alert, current_user.id, "READ")
    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return alert

@router.get("/alerts/{alert_id}/history", response_model=List[AlertHistorySchema])
def get_alert_history(
    alert_id: int,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    rows = db.query(AlertHistory).filter(
        AlertHistory.alert_id == alert_id
    ).order_by(AlertHistory.changed_at.desc()).limit(max(1, limit)).all()
    rows.reverse()
    return rows

def _floor_to_minute(dt: datetime) -> datetime:
    return dt.replace(second=0, microsecond=0)

def _update_session_metrics(db: Session, session_id: int, log_time: datetime) -> None:
    window_start = _floor_to_minute(log_time)
    window_end = window_start + timedelta(minutes=1)
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        return

    stats = db.query(
        func.count(BehaviorLog.id),
        func.sum(BehaviorLog.on_task),
        func.sum(BehaviorLog.using_phone),
        func.sum(BehaviorLog.sleeping),
        func.sum(BehaviorLog.writing),
        func.sum(BehaviorLog.disengaged_posture),
        func.sum(BehaviorLog.not_visible),
        func.sum(BehaviorLog.total_detected)
    ).filter(
        BehaviorLog.session_id == session_id,
        BehaviorLog.timestamp >= window_start,
        BehaviorLog.timestamp < window_end
    ).first()

    log_count = stats[0] or 0
    if log_count == 0:
        return

    on_task_sum = _to_float(stats[1])
    phone_sum = _to_float(stats[2])
    sleeping_sum = _to_float(stats[3])
    writing_sum = _to_float(stats[4])
    disengaged_sum = _to_float(stats[5])
    not_visible_sum = _to_float(stats[6])
    total_detected = int(stats[7] or 0)

    engagement_score = 0.0
    if session.students_present > 0:
        raw_total = (
            (W_ON_TASK * on_task_sum)
            + (W_WRITING * writing_sum)
            - (W_PHONE * phone_sum)
            - (W_SLEEPING * sleeping_sum)
            - (W_DISENGAGED_POSTURE * disengaged_sum)
        )
        engagement_score = max(
            0.0,
            min(100.0, (raw_total / (session.students_present * log_count)) * 100),
        )

    metrics = db.query(SessionMetricsModel).filter(
        SessionMetricsModel.session_id == session_id,
        SessionMetricsModel.window_start == window_start,
        SessionMetricsModel.window_end == window_end
    ).first()

    if not metrics:
        metrics = SessionMetricsModel(
            session_id=session_id,
            window_start=window_start,
            window_end=window_end
        )
        db.add(metrics)

    metrics.total_detected = total_detected
    metrics.on_task_avg = round(on_task_sum / log_count, 2)
    metrics.phone_avg = round(phone_sum / log_count, 2)
    metrics.sleeping_avg = round(sleeping_sum / log_count, 2)
    metrics.writing_avg = round(writing_sum / log_count, 2)
    metrics.disengaged_posture_avg = round(disengaged_sum / log_count, 2)
    metrics.not_visible_avg = round(not_visible_sum / log_count, 2)
    metrics.engagement_score = round(engagement_score, 2)

    db.commit()

def _record_engagement_event(db: Session, session_id: int, event_type: str, severity: str, notes: str) -> None:
    event = EngagementEvent(
        session_id=session_id,
        event_type=event_type,
        severity=severity,
        notes=notes
    )
    db.add(event)
    db.commit()

def _record_recovery_if_needed(db: Session, session_id: int, engagement_percent: float) -> None:
    ten_min_ago = datetime.now() - timedelta(minutes=10)
    last_event = db.query(EngagementEvent).filter(
        EngagementEvent.session_id == session_id,
        EngagementEvent.event_time >= ten_min_ago
    ).order_by(EngagementEvent.event_time.desc()).first()

    if last_event and last_event.event_type == "ENGAGEMENT_DROP":
        msg = f"Engagement recovery: {int(engagement_percent)}% weighted engagement."
        _record_engagement_event(db, session_id, "RECOVERY", AlertSeverity.WARNING.value, msg)

def _record_session_history(db: Session, session: ClassSession, user_id: int, change_type: str) -> None:
    history = SessionHistory(
        session_id=session.id,
        changed_by=user_id,
        change_type=change_type,
        prev_start_time=session.start_time,
        prev_end_time=session.end_time,
        prev_is_active=session.is_active
    )
    db.add(history)
    db.commit()

def _record_alert_history(db: Session, alert: Alert, user_id: int, change_type: str) -> None:
    history = AlertHistory(
        alert_id=alert.id,
        changed_by=user_id,
        change_type=change_type,
        prev_is_read=alert.is_read,
        prev_severity=alert.severity,
        prev_message=alert.message
    )
    db.add(history)
    db.commit()

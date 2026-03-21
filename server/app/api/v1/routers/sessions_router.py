from typing import Any, List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.v1 import deps
from app.db.database import get_db
from app.schemas.session import (
    Alert as AlertSchema,
    AlertHistory as AlertHistorySchema,
    BehaviorLogCreate,
    ModelSelectionRequest,
    ModelSelectionResponse,
    Session as SessionSchema,
    SessionCreate,
    SessionHistory as SessionHistorySchema,
    SessionMetricRow,
    SessionMetrics,
    SessionSummary as SessionSummarySchema,
)
from app.services import alert_service, detector_service, engagement_service, session_lifecycle_service
from app.constants import MAX_PAGE_SIZE

router = APIRouter()
models_router = APIRouter()


@router.post("/start", response_model=SessionSchema)
def start_session(
    *,
    db: Session = Depends(get_db),
    session_in: SessionCreate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    return session_lifecycle_service.start_session(db, session_in, current_user)


@router.post("/{session_id}/stop", response_model=SessionSchema)
def stop_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    return session_lifecycle_service.stop_session(db, session_id, current_user, detector_service.stop_detector_if_running)


@router.get("/active", response_model=SessionSchema)
def get_active_session(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    return session_lifecycle_service.get_active_session_for_teacher(db, current_user.id)


@router.get("", response_model=List[SessionSummarySchema])
def list_sessions(
    limit: int = 50,
    include_active: bool = True,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    return session_lifecycle_service.list_session_summaries(db, current_user.id, include_active, limit)


@models_router.get("", response_model=ModelSelectionResponse)
def list_models(
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    return detector_service.build_model_selection_response()


@models_router.post("/select", response_model=ModelSelectionResponse)
def select_model(
    data: ModelSelectionRequest,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    try:
        return detector_service.select_model_file(data.file_name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/{session_id}/log", status_code=200)
def log_behavior_metrics(
    session_id: int,
    log_in: BehaviorLogCreate,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    session_lifecycle_service.get_active_session_or_404(db, session_id, current_user.id)
    engagement_service.process_behavior_log(db, session_id, log_in, current_user.id)
    return {"status": "logged"}


@router.post("/{session_id}/detector/start", status_code=200)
def start_webcam_detector(
    session_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    session_lifecycle_service.get_active_session_or_404(db, session_id, current_user.id)
    try:
        status = detector_service.start_webcam_detector(session_id, engagement_service.process_behavior_log)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"status": status}


@router.post("/{session_id}/detector/stop", status_code=200)
def stop_webcam_detector(
    session_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    session_lifecycle_service.get_active_session_or_404(db, session_id, current_user.id)
    return {"status": detector_service.stop_webcam_detector(session_id)}


@router.post("/{session_id}/detector/heartbeat", status_code=200)
def heartbeat_webcam_detector(
    session_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    session_lifecycle_service.get_active_session_or_404(db, session_id, current_user.id)
    return {"status": detector_service.heartbeat_webcam_detector(session_id)}


@router.get("/{session_id}/detector/status", status_code=200)
def get_webcam_detector_status(
    session_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    session_lifecycle_service.get_active_session_or_404(db, session_id, current_user.id)
    return {"status": detector_service.get_webcam_detector_status(session_id)}


@router.post("/{session_id}/detect", status_code=200)
async def detect_behavior_metrics(
    session_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    session_lifecycle_service.get_active_session_or_404(db, session_id, current_user.id)

    try:
        raw = await file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Unable to read uploaded image")

    try:
        counts = detector_service.detect_counts_from_image_bytes(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    log_in = BehaviorLogCreate(**counts)
    engagement_service.process_behavior_log(db, session_id, log_in, current_user.id)
    return {"status": "logged", "counts": counts}


@router.get("/{session_id}/metrics", response_model=SessionMetrics)
def get_session_metrics(
    session_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    return engagement_service.get_session_metrics_response(db, session_id, current_user.id)


@router.get("/{session_id}/metrics/rollup", response_model=List[SessionMetricRow])
def get_session_metrics_rollup(
    session_id: int,
    minutes: int = 60,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    return engagement_service.get_session_metrics_rollup(db, session_id, current_user.id, minutes)


@router.get("/{session_id}/history", response_model=List[SessionHistorySchema])
def get_session_history(
    session_id: int,
    limit: int = MAX_PAGE_SIZE,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    return engagement_service.get_session_history(db, session_id, current_user.id, limit)


@router.put("/alerts/{alert_id}/read", response_model=AlertSchema)
def mark_alert_read(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    return alert_service.mark_alert_read(db, alert_id, current_user.id)


@router.get("/alerts/{alert_id}/history", response_model=List[AlertHistorySchema])
def get_alert_history(
    alert_id: int,
    limit: int = MAX_PAGE_SIZE,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    return alert_service.get_alert_history(db, alert_id, current_user.id, limit)

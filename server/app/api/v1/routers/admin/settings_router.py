from datetime import date
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.v1 import deps
from app.db.database import get_db
from app.models.user import User as UserModel
from app.schemas.admin import (
    AdminActionMessage,
    AdminSettingsResponse,
    AdminSettingsUpdate,
    AdminDashboardResponse,
    AdminServerLogsResponse,
    PaginatedAuditLogsResponse,
    PaginatedAlertsResponse,
    AdminTestDetectionResponse,
)
from app.services import admin_service, detector_service
from app.constants import DEFAULT_PAGE_SIZE

router = APIRouter()


@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(
    college_id: Optional[int] = None,
    department_id: Optional[int] = None,
    major_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.get_dashboard(
        db,
        college_id=college_id,
        department_id=department_id,
        major_id=major_id,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/settings", response_model=AdminSettingsResponse)
def get_admin_settings(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.get_settings(db)


@router.patch("/settings", response_model=AdminSettingsResponse)
def update_admin_settings(
    payload: AdminSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.update_settings(
        db,
        payload.model_dump(exclude_unset=True),
        actor_user_id=current_user.id,
        actor_username=current_user.username,
    )


@router.post("/settings/test-detection", response_model=AdminTestDetectionResponse)
async def test_detection(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    try:
        raw = await file.read()
        detections = detector_service.test_detection(raw)
        return {"detections": detections}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(exc)}")


@router.get("/server-logs", response_model=AdminServerLogsResponse)
def get_server_logs(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.get_server_logs(db)


@router.get("/audit-logs", response_model=PaginatedAuditLogsResponse)
def list_audit_logs(
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.list_audit_logs(db, skip=skip, limit=limit)


@router.get("/alerts", response_model=PaginatedAlertsResponse)
def list_alerts(
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.list_alerts(db, skip=skip, limit=limit)


@router.post("/alerts/{alert_id}/mark-read", response_model=AdminActionMessage)
def mark_alert_read(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    admin_service.mark_alert_read(db, alert_id=alert_id, actor_user_id=current_user.id)
    return {"message": "Alert marked as read"}

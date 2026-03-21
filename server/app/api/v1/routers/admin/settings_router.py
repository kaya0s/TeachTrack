from typing import Any

from fastapi import APIRouter, Depends
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
)
from app.services import admin_service
from app.constants import DEFAULT_PAGE_SIZE

router = APIRouter()


@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.get_dashboard(db)


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

from typing import Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.v1 import deps
from app.db.database import get_db
from app.models.user import User as UserModel
from app.schemas.admin import (
    AdminActionMessage,
    AdminDashboardResponse,
    AdminModelSelectionRequest,
    AdminSessionDetail,
    AdminUser,
    AdminUserUpdate,
    PaginatedAlertsResponse,
    PaginatedSessionsResponse,
    PaginatedUsersResponse,
)
from app.schemas.session import Alert as AlertSchema, ModelSelectionResponse, Session as SessionSchema
from app.services import admin_service

router = APIRouter(
    dependencies=[Depends(deps.get_current_active_superuser)],
)


class AdminPasswordReset(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.get_dashboard_data(db)


@router.get("/users", response_model=PaginatedUsersResponse)
def list_admin_users(
    skip: int = 0,
    limit: int = 25,
    q: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_superuser: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.list_users(
        db,
        skip=skip,
        limit=limit,
        q=q,
        is_active=is_active,
        is_superuser=is_superuser,
    )


@router.patch("/users/{user_id}", response_model=AdminUser)
def update_admin_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.update_user(db, user_id, payload.model_dump(exclude_unset=True), current_user.id)


@router.post("/users/{user_id}/reset-password", response_model=AdminActionMessage)
def reset_admin_user_password(
    user_id: int,
    payload: AdminPasswordReset,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    admin_service.admin_reset_user_password(db, user_id, payload.new_password, current_user.id)
    return {"message": "Password reset successfully"}


@router.get("/sessions", response_model=PaginatedSessionsResponse)
def list_admin_sessions(
    skip: int = 0,
    limit: int = 25,
    is_active: Optional[bool] = None,
    teacher_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.list_sessions(
        db,
        skip=skip,
        limit=limit,
        is_active=is_active,
        teacher_id=teacher_id,
    )


@router.post("/sessions/{session_id}/force-stop", response_model=SessionSchema)
def force_stop_admin_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.force_stop_session(db, session_id, current_user.id)


@router.get("/sessions/{session_id}/detail", response_model=AdminSessionDetail)
def get_admin_session_detail(
    session_id: int,
    minutes: int = 120,
    logs_limit: int = 120,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.get_session_detail(
        db,
        session_id=session_id,
        minutes=minutes,
        logs_limit=logs_limit,
    )


@router.get("/alerts", response_model=PaginatedAlertsResponse)
def list_admin_alerts(
    skip: int = 0,
    limit: int = 25,
    is_read: Optional[bool] = None,
    severity: Optional[str] = None,
    session_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.list_alerts(
        db,
        skip=skip,
        limit=limit,
        is_read=is_read,
        severity=severity,
        session_id=session_id,
    )


@router.put("/alerts/{alert_id}/read", response_model=AlertSchema)
def mark_admin_alert_read(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.mark_alert_read(db, alert_id, current_user.id)


@router.get("/models", response_model=ModelSelectionResponse)
def list_admin_models(
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.list_models()


@router.post("/models/select", response_model=ModelSelectionResponse)
def select_admin_model(
    payload: AdminModelSelectionRequest,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.select_model(payload.file_name)

from typing import Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.v1 import deps
from app.db.database import get_db
from app.models.user import User as UserModel
from app.schemas.admin import (
    AdminActionMessage,
    AdminClassCreate,
    AdminTeacherAssignment,
    AdminDashboardResponse,
    AdminSectionCreate,
    AdminSectionUpdate,
    AdminSectionSummary,
    AdminServerLogsResponse,
    PaginatedAuditLogsResponse,
    AdminModelSelectionRequest,
    AdminSessionDetail,
    AdminSubjectCreate,
    AdminSubjectUpdate,
    AdminSubjectSummary,
    AdminTeacherSummary,
    AdminUser,
    AdminUserUpdate,
    PaginatedAlertsResponse,
    PaginatedSectionsResponse,
    PaginatedSessionsResponse,
    PaginatedSubjectsResponse,
    PaginatedTeachersResponse,
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


@router.get("/server-logs", response_model=AdminServerLogsResponse)
def list_admin_server_logs(
    limit: int = 120,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.list_server_logs(limit=limit)


@router.get("/teachers", response_model=PaginatedTeachersResponse)
def list_admin_teachers(
    skip: int = 0,
    limit: int = 25,
    q: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.list_teachers(
        db,
        skip=skip,
        limit=limit,
        q=q,
        is_active=is_active,
    )


@router.get("/subjects", response_model=PaginatedSubjectsResponse)
def list_admin_subjects(
    skip: int = 0,
    limit: int = 50,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.list_subjects(db, skip=skip, limit=limit, q=q)


@router.post("/subjects", response_model=AdminSubjectSummary)
def create_admin_subject(
    payload: AdminSubjectCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.create_subject(db, payload.model_dump())


@router.patch("/subjects/{subject_id}", response_model=AdminSubjectSummary)
def update_admin_subject(
    subject_id: int,
    payload: AdminSubjectUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.update_subject(db, subject_id=subject_id, payload=payload.model_dump(exclude_unset=True))


@router.delete("/subjects/{subject_id}", response_model=AdminActionMessage)
def delete_admin_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.delete_subject(db, subject_id=subject_id)


@router.put("/subjects/{subject_id}/assign-teacher", response_model=AdminSubjectSummary)
def assign_admin_subject_teacher(
    subject_id: int,
    payload: AdminTeacherAssignment,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.assign_subject_teacher(db, subject_id=subject_id, teacher_id=payload.teacher_id)


@router.get("/sections", response_model=PaginatedSectionsResponse)
def list_admin_sections(
    skip: int = 0,
    limit: int = 50,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.list_sections(db, skip=skip, limit=limit, q=q)


@router.post("/sections", response_model=AdminSectionSummary)
def create_admin_section(
    payload: AdminSectionCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.create_section(db, payload.model_dump())


@router.patch("/sections/{section_id}", response_model=AdminSectionSummary)
def update_admin_section(
    section_id: int,
    payload: AdminSectionUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.update_section(db, section_id=section_id, payload=payload.model_dump(exclude_unset=True))


@router.delete("/sections/{section_id}", response_model=AdminActionMessage)
def delete_admin_section(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.delete_section(db, section_id=section_id)


@router.post("/classes", response_model=AdminSectionSummary)
def create_admin_class(
    payload: AdminClassCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.create_class(db, payload.model_dump(exclude_unset=True))


@router.put("/sections/{section_id}/assign-teacher", response_model=AdminSectionSummary)
def assign_admin_section_teacher(
    section_id: int,
    payload: AdminTeacherAssignment,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.assign_section_teacher(db, section_id=section_id, teacher_id=payload.teacher_id)


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
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.select_model(db, payload.file_name, current_user.id)


@router.get("/audit-logs", response_model=PaginatedAuditLogsResponse)
def list_admin_audit_logs(
    skip: int = 0,
    limit: int = 50,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    actor_user_id: Optional[int] = None,
    entity_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.list_audit_logs(
        db,
        skip=skip,
        limit=limit,
        action=action,
        entity_type=entity_type,
        actor_user_id=actor_user_id,
        entity_id=entity_id,
    )

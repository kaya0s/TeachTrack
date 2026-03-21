from typing import Any, Optional

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.api.v1 import deps
from app.db.database import get_db
from app.models.user import User as UserModel
from app.schemas.admin import (
    PaginatedSessionsResponse,
    AdminSessionDetail,
    AdminModelSelectionRequest,
)
from app.schemas.classroom import SubjectCoverUploadResponse
from app.schemas.session import Alert as AlertSchema, ModelSelectionResponse, Session as SessionSchema
from app.services import admin_service, classroom_service
from app.constants import DEFAULT_PAGE_SIZE

router = APIRouter()


@router.get("/sessions", response_model=PaginatedSessionsResponse)
def list_admin_sessions(
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    is_active: Optional[bool] = None,
    teacher_id: Optional[int] = None,
    college_id: Optional[int] = None,
    major_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.list_sessions(
        db,
        skip=skip,
        limit=limit,
        is_active=is_active,
        teacher_id=teacher_id,
        college_id=college_id,
        major_id=major_id,
    )


@router.get("/sessions/{session_id}", response_model=AdminSessionDetail)
def get_admin_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.get_session(db, session_id=session_id)


@router.get("/sessions/{session_id}/detail", response_model=AdminSessionDetail)
def get_admin_session_detail(
    session_id: int,
    minutes: int = 120,
    logs_limit: int = 120,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    # Admin UI uses /detail; this maps to the same underlying detail serializer.
    return admin_service.get_session_detail(db, session_id=session_id, minutes=minutes, logs_limit=logs_limit)


@router.post("/sessions/{session_id}/force-stop", response_model=SessionSchema)
def force_stop_admin_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.force_stop_session(db, session_id=session_id, actor_user_id=current_user.id)


@router.post("/subjects/{subject_id}/upload-cover", response_model=SubjectCoverUploadResponse)
def upload_subject_cover(
    subject_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return classroom_service.upload_subject_cover(db, subject_id=subject_id, file=file)


@router.get("/sessions/{session_id}/alerts", response_model=list[AlertSchema])
def get_session_alerts(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.get_session_alerts(db, session_id=session_id)


@router.get("/models", response_model=ModelSelectionResponse)
def list_models(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.list_models()


@router.post("/models/select", response_model=ModelSelectionResponse)
def select_model(
    payload: AdminModelSelectionRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.select_model(db, payload.file_name, current_user.id)

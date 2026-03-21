from typing import Any, Optional

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.api.v1 import deps
from app.db.database import get_db
from app.models.user import User as UserModel
from app.schemas.admin import (
    AdminActionMessage,
    AdminSubjectCreate,
    AdminSubjectUpdate,
    AdminSubjectSummary,
    PaginatedSubjectsResponse,
)
from app.schemas.classroom import SubjectCoverUploadResponse
from app.services import admin_service
from app.services import classroom_service
from app.constants import DEFAULT_PAGE_SIZE

router = APIRouter()


@router.get("/subjects", response_model=PaginatedSubjectsResponse)
def list_admin_subjects(
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    q: Optional[str] = None,
    college_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.list_subjects(db, skip=skip, limit=limit, q=q, college_id=college_id)


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


@router.post("/subjects/upload-cover", response_model=SubjectCoverUploadResponse)
async def upload_subject_cover_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    # Admin UI uploads a cover image first, then uses the returned URL when creating/updating the subject.
    return await classroom_service.upload_subject_cover_image(db, file=file, current_user=current_user)

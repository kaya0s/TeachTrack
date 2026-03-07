from typing import Any, List

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.api.v1 import deps
from app.db.database import get_db
from app.schemas.classroom import (
    Section as SectionSchema,
    SectionCreate,
    Subject as SubjectSchema,
    SubjectCoverUploadResponse,
    SubjectCreate,
    SubjectUpdate,
)
from app.services import classroom_service

router = APIRouter()


@router.get("/subjects", response_model=List[SubjectSchema])
def read_subjects(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    return classroom_service.read_subjects(db, current_user.id, skip, limit)


@router.post("/subjects", response_model=SubjectSchema)
def create_subject(
    *,
    db: Session = Depends(get_db),
    subject_in: SubjectCreate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    return classroom_service.create_subject(db, subject_in, current_user.id)


@router.get("/subjects/{subject_id}", response_model=SubjectSchema)
def read_subject(
    *,
    db: Session = Depends(get_db),
    subject_id: int,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    return classroom_service.read_subject(db, subject_id, current_user.id)


@router.patch("/subjects/{subject_id}", response_model=SubjectSchema)
def update_subject(
    *,
    db: Session = Depends(get_db),
    subject_id: int,
    subject_in: SubjectUpdate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    return classroom_service.update_subject(db, subject_id, subject_in, current_user.id)


@router.post("/subjects/cover-image", response_model=SubjectCoverUploadResponse)
async def upload_subject_cover_image(
    *,
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    return await classroom_service.upload_subject_cover_image(db, file, current_user)


@router.get("/subjects/{subject_id}/sections", response_model=List[SectionSchema])
def read_sections_by_subject(
    *,
    db: Session = Depends(get_db),
    subject_id: int,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    return classroom_service.read_sections_by_subject(db, subject_id, current_user.id)


@router.get("/sections", response_model=List[SectionSchema])
def read_sections(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    return classroom_service.read_sections(db, current_user.id, skip, limit)


@router.post("/sections", response_model=SectionSchema)
def create_section(
    *,
    db: Session = Depends(get_db),
    section_in: SectionCreate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    return classroom_service.create_section(db, section_in, current_user.id)

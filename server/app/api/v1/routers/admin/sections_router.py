from typing import Any, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1 import deps
from app.db.database import get_db
from app.models.user import User as UserModel
from app.schemas.admin import (
    AdminActionMessage,
    AdminCriticalActionConfirm,
    AdminSectionCreate,
    AdminSectionUpdate,
    AdminSectionSummary,
    AdminClassCreate,
    AdminTeacherAssignment,
    PaginatedSectionsResponse,
)
from app.services import admin_service
from app.constants import DEFAULT_PAGE_SIZE

router = APIRouter()


@router.get("/sections", response_model=PaginatedSectionsResponse)
def list_admin_sections(
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    q: Optional[str] = None,
    college_id: Optional[int] = None,
    department_id: Optional[int] = None,
    major_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.list_sections(
        db,
        skip=skip,
        limit=limit,
        q=q,
        college_id=college_id,
        department_id=department_id,
        major_id=major_id,
    )


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
    payload: AdminCriticalActionConfirm,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.delete_section(
        db,
        section_id=section_id,
        actor_user_id=current_user.id,
        confirm_password=payload.confirm_password,
    )


@router.post("/classes", response_model=AdminSectionSummary)
def create_admin_class(
    payload: AdminClassCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.create_class(db, payload.model_dump(exclude_unset=True))


@router.api_route("/sections/{section_id}/assign-teacher", methods=["PUT", "POST"], response_model=AdminSectionSummary)
def assign_admin_section_teacher(
    section_id: int,
    payload: AdminTeacherAssignment,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.assign_section_teacher(
        db,
        section_id=section_id,
        teacher_id=payload.teacher_id,
        subject_id=payload.subject_id,
    )


@router.api_route("/sections/{section_id}/unassign-teacher", methods=["PUT", "POST"], response_model=AdminSectionSummary)
def unassign_admin_section_teacher(
    section_id: int,
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.unassign_section_teacher(db, section_id=section_id, subject_id=subject_id)

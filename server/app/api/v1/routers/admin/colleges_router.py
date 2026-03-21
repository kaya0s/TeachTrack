from typing import Any, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1 import deps
from app.db.database import get_db
from app.models.user import User as UserModel
from app.schemas.admin import (
    AdminActionMessage,
    AdminCollegeCreate,
    AdminCollegeUpdate,
    AdminCollegeSummary,
    AdminCollegeDetails,
    AdminCollegeTeacher,
    PaginatedCollegesResponse,
    PaginatedMajorsResponse,
)
from app.services import admin_service
from app.constants import DEFAULT_PAGE_SIZE

router = APIRouter()


@router.get("/colleges", response_model=PaginatedCollegesResponse)
def list_admin_colleges(
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.list_colleges(db, skip=skip, limit=limit, q=q)


@router.post("/colleges", response_model=AdminCollegeSummary)
def create_admin_college(
    payload: AdminCollegeCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.create_college(db, payload.model_dump(), actor_user_id=current_user.id)


@router.get("/colleges/{college_id}", response_model=AdminCollegeDetails)
def get_admin_college(
    college_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.get_college(db, college_id=college_id)


@router.patch("/colleges/{college_id}", response_model=AdminCollegeSummary)
def update_admin_college(
    college_id: int,
    payload: AdminCollegeUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.update_college(
        db,
        college_id=college_id,
        payload=payload.model_dump(exclude_unset=True),
        actor_user_id=current_user.id,
    )


@router.delete("/colleges/{college_id}", response_model=AdminActionMessage)
def delete_admin_college(
    college_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.delete_college(db, college_id=college_id, actor_user_id=current_user.id)


@router.get("/majors", response_model=PaginatedMajorsResponse)
def list_admin_majors(
    college_id: Optional[int] = None,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.list_majors(db, college_id=college_id, skip=skip, limit=limit, q=q)

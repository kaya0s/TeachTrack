from typing import Any, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1 import deps
from app.db.database import get_db
from app.models.user import User as UserModel
from app.schemas.admin import (
    AdminActionMessage,
    AdminUser,
    AdminUserUpdate,
    AdminPasswordReset,
    PaginatedUsersResponse,
    PaginatedTeachersResponse,
    AdminTeacherCreate,
    AdminTeacherSummary,
)
from app.services import admin_service
from app.constants import DEFAULT_PAGE_SIZE

router = APIRouter()


@router.get("/users", response_model=PaginatedUsersResponse)
def list_admin_users(
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
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


@router.get("/teachers", response_model=PaginatedTeachersResponse)
def list_admin_teachers(
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    q: Optional[str] = None,
    college_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.list_teachers(db, skip=skip, limit=limit, q=q, college_id=college_id)


@router.post("/teachers", response_model=AdminTeacherSummary)
def create_admin_teacher(
    payload: AdminTeacherCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.create_teacher(db, payload.model_dump(), actor_user_id=current_user.id)

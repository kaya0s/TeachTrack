from typing import Any, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1 import deps
from app.constants import DEFAULT_PAGE_SIZE
from app.db.database import get_db
from app.models.user import User as UserModel
from app.schemas.admin import (
    AdminActionMessage,
    AdminCriticalActionConfirm,
    AdminDepartmentCreate,
    AdminDepartmentSummary,
    AdminDepartmentUpdate,
    PaginatedDepartmentsResponse,
)
from app.services import admin_service

router = APIRouter()


@router.get("/departments", response_model=PaginatedDepartmentsResponse)
def list_admin_departments(
    college_id: Optional[int] = None,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.list_departments(db, college_id=college_id, skip=skip, limit=limit, q=q)


@router.post("/departments", response_model=AdminDepartmentSummary)
def create_admin_department(
    payload: AdminDepartmentCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.create_department(db, payload.model_dump(), actor_user_id=current_user.id)


@router.patch("/departments/{department_id}", response_model=AdminDepartmentSummary)
def update_admin_department(
    department_id: int,
    payload: AdminDepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.update_department(
        db,
        department_id=department_id,
        payload=payload.model_dump(exclude_unset=True),
        actor_user_id=current_user.id,
    )


@router.delete("/departments/{department_id}", response_model=AdminActionMessage)
def delete_admin_department(
    department_id: int,
    payload: AdminCriticalActionConfirm,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return admin_service.delete_department(
        db,
        department_id=department_id,
        actor_user_id=current_user.id,
        confirm_password=payload.confirm_password,
    )

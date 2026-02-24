from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1 import deps
from app.db.database import get_db
from app.models.user import User as UserModel
from app.schemas.user import PasswordChange, User, UserUpdate
from app.services import user_service

router = APIRouter()


@router.get("/me", response_model=User)
def read_user_me(
    current_user: UserModel = Depends(deps.get_current_active_user),
) -> Any:
    return current_user


@router.patch("/me", response_model=User)
def update_user_me(
    *,
    db: Session = Depends(get_db),
    data: UserUpdate,
    current_user: UserModel = Depends(deps.get_current_active_user),
) -> Any:
    return user_service.update_user_me(db, data, current_user)


@router.post("/me/change-password")
def change_password_me(
    *,
    db: Session = Depends(get_db),
    data: PasswordChange,
    current_user: UserModel = Depends(deps.get_current_active_user),
) -> Any:
    return user_service.change_password_me(db, data, current_user)

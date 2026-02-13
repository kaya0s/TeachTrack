
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.core import security
from app.db.database import get_db
from app.models.user import User as UserModel
from app.schemas.user import User, UserUpdate, PasswordChange

router = APIRouter()

@router.get("/me", response_model=User)
def read_user_me(
    current_user: UserModel = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user.
    """
    return current_user

@router.patch("/me", response_model=User)
def update_user_me(
    *,
    db: Session = Depends(get_db),
    data: UserUpdate,
    current_user: UserModel = Depends(deps.get_current_active_user),
) -> Any:
    if data.email is not None and data.email != current_user.email:
        existing_email = db.query(UserModel).filter(UserModel.email == data.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email is already in use.")
        current_user.email = data.email

    if data.username is not None and data.username != current_user.username:
        existing_username = db.query(UserModel).filter(UserModel.username == data.username).first()
        if existing_username:
            raise HTTPException(status_code=400, detail="Username is already in use.")
        current_user.username = data.username

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/me/change-password")
def change_password_me(
    *,
    db: Session = Depends(get_db),
    data: PasswordChange,
    current_user: UserModel = Depends(deps.get_current_active_user),
) -> Any:
    if len(data.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 6 characters long.",
        )
    if not security.verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    current_user.hashed_password = security.get_password_hash(data.new_password)
    db.add(current_user)
    db.commit()
    return {"message": "Password updated successfully."}

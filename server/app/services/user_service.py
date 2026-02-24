from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core import security
from app.repositories.user_repository import UserRepository
from app.schemas.user import PasswordChange, UserUpdate


def update_user_me(db: Session, data: UserUpdate, current_user):
    if data.email is not None and data.email != current_user.email:
        existing_email = UserRepository.get_by_email(db, data.email)
        if existing_email:
            raise HTTPException(status_code=400, detail="Email is already in use.")
        current_user.email = data.email

    if data.username is not None and data.username != current_user.username:
        existing_username = UserRepository.get_by_username(db, data.username)
        if existing_username:
            raise HTTPException(status_code=400, detail="Username is already in use.")
        current_user.username = data.username

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


def change_password_me(db: Session, data: PasswordChange, current_user):
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long.")
    if not security.verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    current_user.hashed_password = security.get_password_hash(data.new_password)
    db.add(current_user)
    db.commit()
    return {"message": "Password updated successfully."}

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core import security
from app.models.user import User


def verify_admin_password_or_401(
    db: Session,
    actor_user_id: int | None,
    confirm_password: str | None,
) -> None:
    if not confirm_password:
        raise HTTPException(status_code=400, detail="confirm_password is required.")
    if actor_user_id is None:
        raise HTTPException(status_code=401, detail="Invalid actor for this action.")

    actor = db.query(User).filter(User.id == actor_user_id).first()
    if not actor or not security.verify_password(confirm_password, actor.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid password.")

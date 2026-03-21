from typing import Any

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.utils.datetime import utc_now


def create_notification(
    db: Session,
    *,
    user_id: int,
    title: str,
    body: str,
    type: str = "CLASS_ASSIGNMENT",
    metadata_json: str | None = None,
) -> Notification:
    row = Notification(
        user_id=user_id,
        title=title,
        body=body,
        type=type,
        metadata_json=metadata_json,
        is_read=False,
    )
    db.add(row)
    db.flush()
    return row


def list_user_notifications(
    db: Session,
    *,
    user_id: int,
    limit: int = 40,
    unread_only: bool = False,
) -> dict[str, Any]:
    safe_limit = max(1, min(limit, 100))
    query = db.query(Notification).filter(Notification.user_id == user_id)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    total = query.count()
    unread = (
        db.query(func.count(Notification.id))
        .filter(Notification.user_id == user_id, Notification.is_read == False)
        .scalar()
        or 0
    )
    items = query.order_by(Notification.created_at.desc(), Notification.id.desc()).limit(safe_limit).all()
    return {"total": total, "unread": unread, "items": items}


def mark_notification_read(db: Session, *, user_id: int, notification_id: int) -> Notification:
    row = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Notification not found")
    if not row.is_read:
        row.is_read = True
        row.read_at = utc_now()
        db.add(row)
        db.commit()
        db.refresh(row)
    return row

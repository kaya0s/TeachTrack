from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1 import deps
from app.db.database import get_db
from app.models.user import User as UserModel
from app.schemas.notification import TeacherNotification, TeacherNotificationsResponse
from app.services import notification_service

router = APIRouter()


@router.get("", response_model=TeacherNotificationsResponse)
def list_my_notifications(
    limit: int = 40,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_user),
) -> Any:
    return notification_service.list_user_notifications(
        db,
        user_id=current_user.id,
        limit=limit,
        unread_only=unread_only,
    )


@router.put("/{notification_id}/read", response_model=TeacherNotification)
def mark_my_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_user),
) -> Any:
    return notification_service.mark_notification_read(
        db,
        user_id=current_user.id,
        notification_id=notification_id,
    )

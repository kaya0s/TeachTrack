from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TeacherNotification(BaseModel):
    id: int
    title: str
    body: str
    type: str
    metadata_json: Optional[str] = None
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TeacherNotificationsResponse(BaseModel):
    total: int
    unread: int
    items: list[TeacherNotification]

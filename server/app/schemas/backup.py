from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class BackupRunBase(BaseModel):
    status: str
    filename: Optional[str] = None
    file_size_bytes: Optional[int] = None
    drive_file_id: Optional[str] = None
    drive_link: Optional[str] = None
    error_message: Optional[str] = None


class BackupRun(BackupRunBase):
    id: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    created_by: Optional[int] = None

    class Config:
        from_attributes = True

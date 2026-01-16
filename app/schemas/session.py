from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from enum import Enum

class AlertTypeEnum(str, Enum):
    SLEEPING = "SLEEPING"
    PHONE = "PHONE"
    ENGAGEMENT_DROP = "ENGAGEMENT_DROP"

# -- Logs --
class BehaviorLogBase(BaseModel):
    raising_hand: int = 0
    sleeping: int = 0
    writing: int = 0
    using_phone: int = 0
    attentive: int = 0
    undetected: int = 0

class BehaviorLogCreate(BehaviorLogBase):
    pass

class BehaviorLog(BehaviorLogBase):
    id: int
    session_id: int
    timestamp: datetime
    total_detected: int

    class Config:
        from_attributes = True

# -- Alerts --
class AlertBase(BaseModel):
    alert_type: str
    message: str
    is_read: bool = False

class Alert(AlertBase):
    id: int
    session_id: int
    triggered_at: datetime

    class Config:
        from_attributes = True

# -- Sessions --
class SessionBase(BaseModel):
    subject_id: int
    section_id: int
    total_students_enrolled: int = 0

class SessionCreate(SessionBase):
    pass

class Session(SessionBase):
    id: int
    teacher_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    is_active: bool
    
    # We might want logs or alerts nested, but usually fine to fetch separately
    
    class Config:
        from_attributes = True

class SessionMetrics(BaseModel):
    session_id: int
    total_logs: int
    average_engagement: float
    recent_logs: List[BehaviorLog]
    alerts: List[Alert]

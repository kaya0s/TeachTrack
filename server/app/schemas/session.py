from pydantic import BaseModel, Field, root_validator
from datetime import datetime
from typing import Optional, List
from enum import Enum

class AlertSeverityEnum(str, Enum):
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

# -- Logs --
class BehaviorLogBase(BaseModel):
    on_task: int = 0
    sleeping: int = 0
    using_phone: int = 0
    disengaged_posture: int = 0
    not_visible: int = 0

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
    severity: AlertSeverityEnum = AlertSeverityEnum.WARNING
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
    students_present: int = Field(..., ge=1)

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
    students_present: int
    total_logs: int
    average_engagement: float
    recent_logs: List[BehaviorLog]
    alerts: List[Alert]

class SessionMetricRow(BaseModel):
    id: int
    session_id: int
    window_start: datetime
    window_end: datetime
    total_detected: int
    on_task_avg: float
    phone_avg: float
    sleeping_avg: float
    disengaged_posture_avg: float
    not_visible_avg: float
    engagement_score: float
    computed_at: datetime

    class Config:
        from_attributes = True

class SessionSummary(BaseModel):
    id: int
    subject_id: int
    section_id: int
    subject_name: str
    section_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    is_active: bool
    average_engagement: float

    class Config:
        from_attributes = True

class SessionHistory(BaseModel):
    id: int
    session_id: int
    changed_at: datetime
    changed_by: Optional[int] = None
    change_type: str
    prev_start_time: Optional[datetime] = None
    prev_end_time: Optional[datetime] = None
    prev_is_active: Optional[bool] = None

    class Config:
        from_attributes = True

class AlertHistory(BaseModel):
    id: int
    alert_id: int
    changed_at: datetime
    changed_by: Optional[int] = None
    change_type: str
    prev_is_read: Optional[bool] = None
    prev_severity: Optional[str] = None
    prev_message: Optional[str] = None

    class Config:
        from_attributes = True

class ModelOption(BaseModel):
    file_name: str
    is_current: bool = False

class ModelSelectionRequest(BaseModel):
    file_name: str

class ModelSelectionResponse(BaseModel):
    current_model_file: str
    models: List[ModelOption]

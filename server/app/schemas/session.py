from datetime import datetime
from typing import Optional, List
from enum import Enum

from app.schemas.base import UtcAwareBaseModel

class ActivityMode(str, Enum):
    LECTURE = "LECTURE"
    COLLABORATION = "COLLABORATION"
    EXAM = "EXAM"

class SessionCreate(UtcAwareBaseModel):
    section_id: int
    subject_id: int
    students_present: int
    activity_mode: ActivityMode = ActivityMode.LECTURE

class AlertSeverityEnum(str, Enum):
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

# -- Behavior Logs --
class BehaviorLogBase(UtcAwareBaseModel):
    on_task: int = 0
    sleeping: int = 0
    using_phone: int = 0
    off_task: int = 0
    not_visible: int = 0

    class Config:
        from_attributes = True

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
class Alert(UtcAwareBaseModel):
    id: int
    session_id: int
    alert_type: str
    message: str
    triggered_at: datetime
    severity: str
    is_read: bool
    snapshot_url: Optional[str] = None

    class Config:
        from_attributes = True

# -- Session Metrics & Detail --
class SessionMetrics(UtcAwareBaseModel):
    session_id: int
    students_present: int
    total_logs: int
    average_engagement: float
    recent_logs: List[BehaviorLog]
    alerts: List[Alert]

class SessionMetricRow(UtcAwareBaseModel):
    id: int
    session_id: int
    window_start: datetime
    window_end: datetime
    total_detected: int
    on_task_avg: float
    using_phone_avg: float
    sleeping_avg: float
    off_task_avg: float
    not_visible_avg: float
    engagement_score: float
    computed_at: datetime

    class Config:
        from_attributes = True

# -- Session Summary --
class SessionSummary(UtcAwareBaseModel):
    id: int
    subject_id: int
    section_id: int
    subject_name: str
    subject_cover_image_url: Optional[str] = None
    section_name: str
    # Hierarchy context
    college_id: Optional[int] = None
    college_name: Optional[str] = None
    college_logo_path: Optional[str] = None
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    department_code: Optional[str] = None
    major_id: Optional[int] = None
    major_name: Optional[str] = None
    major_code: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    is_active: bool
    activity_mode: ActivityMode
    average_engagement: float

    class Config:
        from_attributes = True

class Session(SessionSummary):
    pass

# -- History & Logs --
class SessionHistory(UtcAwareBaseModel):
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

class AlertHistory(UtcAwareBaseModel):
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

# -- AI Model Management --
class ModelOption(UtcAwareBaseModel):
    file_name: str
    is_current: bool = False

class ModelSelectionRequest(UtcAwareBaseModel):
    file_name: str

class ModelSelectionResponse(UtcAwareBaseModel):
    current_model_file: str
    models: List[ModelOption]

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.schemas.session import AlertSeverityEnum


class AdminUser(BaseModel):
    id: int
    email: EmailStr
    username: str
    is_active: bool
    is_superuser: bool
    profile_picture_url: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None


class AdminSessionSummary(BaseModel):
    id: int
    teacher_id: int
    teacher_username: str
    subject_id: int
    subject_name: str
    section_id: int
    section_name: str
    students_present: int
    start_time: datetime
    end_time: Optional[datetime] = None
    is_active: bool
    teacher_profile_picture_url: Optional[str] = None
    average_engagement: float


class AdminAlertSummary(BaseModel):
    id: int
    session_id: int
    teacher_id: int
    teacher_username: str
    alert_type: str
    message: str
    severity: AlertSeverityEnum
    is_read: bool
    teacher_profile_picture_url: Optional[str] = None
    triggered_at: datetime
    updated_at: Optional[datetime] = None


class AdminDashboardStats(BaseModel):
    total_users: int
    active_users: int
    total_teachers: int
    total_subjects: int
    total_sections: int
    active_sessions: int
    unread_alerts: int
    critical_unread_alerts: int


class AdminDashboardResponse(BaseModel):
    stats: AdminDashboardStats
    active_sessions: list[AdminSessionSummary]
    recent_sessions: list[AdminSessionSummary]
    recent_alerts: list[AdminAlertSummary]


class PaginatedUsersResponse(BaseModel):
    total: int
    items: list[AdminUser]


class PaginatedSessionsResponse(BaseModel):
    total: int
    items: list[AdminSessionSummary]


class PaginatedAlertsResponse(BaseModel):
    total: int
    items: list[AdminAlertSummary]


class AdminModelSelectionRequest(BaseModel):
    file_name: str = Field(min_length=1)


class AdminActionMessage(BaseModel):
    message: str


class AdminBehaviorLogPoint(BaseModel):
    timestamp: datetime
    on_task: int
    sleeping: int
    writing: int
    using_phone: int
    disengaged_posture: int
    not_visible: int
    total_detected: int


class AdminMetricPoint(BaseModel):
    window_start: datetime
    window_end: datetime
    on_task_avg: float
    phone_avg: float
    sleeping_avg: float
    writing_avg: float
    disengaged_posture_avg: float
    not_visible_avg: float
    engagement_score: float


class AdminSessionDetail(BaseModel):
    session: AdminSessionSummary
    total_logs: int
    total_alerts: int
    unread_alerts: int
    logs: list[AdminBehaviorLogPoint]
    metrics_rollup: list[AdminMetricPoint]


class AdminServerLogEntry(BaseModel):
    timestamp: datetime
    level: str
    source: str
    request_id: str
    message: str


class AdminServerLogsResponse(BaseModel):
    total: int
    items: list[AdminServerLogEntry]


class AdminTeacherSummary(BaseModel):
    id: int
    email: EmailStr
    username: str
    is_active: bool
    profile_picture_url: Optional[str] = None
    updated_at: Optional[datetime] = None


class PaginatedTeachersResponse(BaseModel):
    total: int
    items: list[AdminTeacherSummary]


class AdminSubjectSummary(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    teacher_id: Optional[int] = None
    teacher_username: str
    teacher_profile_picture_url: Optional[str] = None
    sections_count: int
    created_at: Optional[datetime] = None


class PaginatedSubjectsResponse(BaseModel):
    total: int
    items: list[AdminSubjectSummary]


class AdminSectionSummary(BaseModel):
    id: int
    name: str
    subject_id: Optional[int] = None
    subject_name: str
    teacher_id: Optional[int] = None
    teacher_username: str
    teacher_profile_picture_url: Optional[str] = None
    created_at: Optional[datetime] = None


class PaginatedSectionsResponse(BaseModel):
    total: int
    items: list[AdminSectionSummary]


class AdminTeacherAssignment(BaseModel):
    teacher_id: int


class AdminSubjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    code: Optional[str] = Field(default=None, max_length=20)
    description: Optional[str] = None
    cover_image_url: Optional[str] = Field(default=None, max_length=500)


class AdminSubjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    code: Optional[str] = Field(default=None, max_length=20)
    description: Optional[str] = None
    cover_image_url: Optional[str] = Field(default=None, max_length=500)
    teacher_id: Optional[int] = None


class AdminSectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    subject_id: int
    teacher_id: Optional[int] = None


class AdminSectionUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None


class AdminClassCreate(BaseModel):
    subject_id: Optional[int] = None
    subject_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    subject_code: Optional[str] = Field(default=None, max_length=20)
    section_name: str = Field(min_length=1, max_length=100)

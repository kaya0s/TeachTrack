from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.constants import MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH
from app.schemas.session import AlertSeverityEnum
from app.validators.session import validate_subject_name
from app.validators.user import validate_name


class AdminUser(BaseModel):
    id: int
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    fullname: Optional[str] = None
    age: Optional[int] = None
    email: EmailStr
    username: str
    role: Optional[str] = None
    is_active: bool
    is_superuser: bool
    profile_picture_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None


class AdminPasswordReset(BaseModel):
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH)


class AdminSessionSummary(BaseModel):
    id: int
    teacher_id: int
    teacher_username: str
    teacher_fullname: Optional[str] = None
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
    college_id: Optional[int] = None
    college_name: Optional[str] = None
    major_id: Optional[int] = None
    major_name: Optional[str] = None



class AdminAlertSummary(BaseModel):
    id: int
    session_id: int
    teacher_id: int
    teacher_username: str
    teacher_fullname: Optional[str] = None
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
    using_phone: int
    off_task: int
    not_visible: int
    total_detected: int


class AdminMetricPoint(BaseModel):
    window_start: datetime
    window_end: datetime
    on_task_avg: float
    using_phone_avg: float
    sleeping_avg: float
    off_task_avg: float
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


class AdminAuditLogEntry(BaseModel):
    id: int
    actor_user_id: Optional[int] = None
    actor_username: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[dict] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedAuditLogsResponse(BaseModel):
    total: int
    items: list[AdminAuditLogEntry]


class AdminTeacherSummary(BaseModel):
    id: int
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    fullname: Optional[str] = None
    age: Optional[int] = None
    email: EmailStr
    username: str
    role: Optional[str] = None
    is_active: bool
    profile_picture_url: Optional[str] = None
    college_id: Optional[int] = None
    college_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdminTeacherCreate(BaseModel):
    firstname: str = Field(min_length=1, max_length=100)
    lastname: str = Field(min_length=1, max_length=100)
    age: int = Field(ge=1, le=120)
    email: EmailStr
    password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH)
    college_id: int

    @field_validator("firstname", "lastname")
    @classmethod
    def _validate_person_name(cls, value: str) -> str:
        value = (value or "").strip()
        valid, error = validate_name(value)
        if not valid:
            raise ValueError(error or "Invalid name")
        return value


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
    teacher_fullname: Optional[str] = None
    teacher_profile_picture_url: Optional[str] = None
    sections_count: int
    section_names: list[str] = []
    college_id: Optional[int] = None
    college_name: Optional[str] = None
    created_at: Optional[datetime] = None


class PaginatedSubjectsResponse(BaseModel):
    total: int
    items: list[AdminSubjectSummary]


class AdminSectionSummary(BaseModel):
    id: int
    name: str # From the linked Section model
    subject_id: Optional[int] = None
    subject_name: str
    teacher_id: Optional[int] = None
    teacher_username: str
    teacher_fullname: Optional[str] = None
    teacher_profile_picture_url: Optional[str] = None
    created_at: Optional[datetime] = None


class AdminCollegeSummary(BaseModel):
    id: int
    name: str
    logo_path: Optional[str] = None
    created_at: Optional[datetime] = None


class AdminMajorSummary(BaseModel):
    id: int
    college_id: int
    name: str
    code: str
    created_at: Optional[datetime] = None


class PaginatedCollegesResponse(BaseModel):
    total: int
    items: list[AdminCollegeSummary]


class PaginatedMajorsResponse(BaseModel):
    total: int
    items: list[AdminMajorSummary]


class AdminSectionPoolSummary(BaseModel):
    id: int
    name: str
    subjects_count: int = 0
    subject_names: list[str] = []
    major_id: Optional[int] = None
    year_level: Optional[int] = None
    section_letter: Optional[str] = None
    created_at: Optional[datetime] = None


class PaginatedSectionPoolResponse(BaseModel):
    total: int
    items: list[AdminSectionPoolSummary]


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
    college_id: Optional[int] = None

    @field_validator("name")
    @classmethod
    def _validate_subject_name(cls, value: str) -> str:
        value = (value or "").strip()
        valid, error = validate_subject_name(value)
        if not valid:
            raise ValueError(error or "Invalid subject name")
        return value


class AdminSubjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    code: Optional[str] = Field(default=None, max_length=20)
    description: Optional[str] = None
    cover_image_url: Optional[str] = Field(default=None, max_length=500)
    teacher_id: Optional[int] = None
    college_id: Optional[int] = None

    @field_validator("name")
    @classmethod
    def _validate_subject_name_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        valid, error = validate_subject_name(value)
        if not valid:
            raise ValueError(error or "Invalid subject name")
        return value


class AdminSectionCreate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)
    subject_id: Optional[int] = None # For backward compatibility
    subject_ids: Optional[list[int]] = None # For bulk linking
    teacher_id: Optional[int] = None
    # Hierarchy fields
    major_id: Optional[int] = None
    year_level: Optional[int] = None
    section_letter: Optional[str] = None


class AdminSectionUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    year_level: Optional[int] = None
    section_letter: Optional[str] = None
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None


class AdminClassCreate(BaseModel):
    subject_id: Optional[int] = None
    subject_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    subject_code: Optional[str] = Field(default=None, max_length=20)
    section_name: Optional[str] = None
    major_id: Optional[int] = None
    year_level: Optional[int] = None
    section_letter: Optional[str] = None


class AdminSettingsIntegrations(BaseModel):
    cloudinary_configured: bool
    mail_configured: bool


class AdminSettingsDetection(BaseModel):
    detect_interval_seconds: int
    detector_heartbeat_timeout_seconds: int
    server_camera_enabled: bool
    server_camera_preview: bool
    server_camera_index: int
    detection_confidence_threshold: float
    detection_imgsz: int
    alert_cooldown_minutes: int


class AdminDetectionBox(BaseModel):
    box: list[float]  # [x1, y1, x2, y2]
    label: str
    confidence: float


class AdminTestDetectionResponse(BaseModel):
    detections: list[AdminDetectionBox]


class AdminSettingsEngagementWeights(BaseModel):
    on_task: float
    using_phone: float
    sleeping: float
    off_task: float


class AdminSettingsAdminOps(BaseModel):
    enable_admin_log_stream: bool


class AdminSettingsSecurity(BaseModel):
    access_token_expire_minutes: int


class AdminSettingsResponse(BaseModel):
    detection: AdminSettingsDetection
    engagement_weights: AdminSettingsEngagementWeights
    admin_ops: AdminSettingsAdminOps
    security: AdminSettingsSecurity
    integrations: AdminSettingsIntegrations


class AdminSettingsUpdate(BaseModel):
    detection: Optional[dict[str, Any]] = None
    engagement_weights: Optional[dict[str, Any]] = None
    admin_ops: Optional[dict[str, Any]] = None
    security: Optional[dict[str, Any]] = None
    confirm_password: str = Field(min_length=1)
    reset: Optional[bool] = None


class AdminCollegeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    acronym: Optional[str] = Field(default=None, max_length=20)

    @field_validator("name")
    @classmethod
    def _normalize_college_name(cls, value: str) -> str:
        return (value or "").strip()

    @field_validator("acronym")
    @classmethod
    def _normalize_college_acronym(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().upper()
        return normalized or None


class AdminCollegeUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    acronym: Optional[str] = Field(default=None, max_length=20)

    @field_validator("name")
    @classmethod
    def _normalize_college_name_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip()

    @field_validator("acronym")
    @classmethod
    def _normalize_college_acronym_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().upper()
        return normalized or None


class AdminCollegeTeacher(BaseModel):
    id: int
    fullname: str
    email: EmailStr
    profile_picture_url: Optional[str] = None


class AdminCollegeDetails(BaseModel):
    id: int
    name: str
    acronym: Optional[str] = None
    logo_path: Optional[str] = None
    teachers_count: int
    teachers: list[AdminCollegeTeacher]
    total_sessions: int
    active_sessions: int
    avg_sessions_per_teacher: float
    majors_count: int
    majors: list[AdminMajorSummary]

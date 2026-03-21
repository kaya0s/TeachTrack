"""Application constants and enums."""

from enum import Enum
from typing import Final

# Pagination
DEFAULT_PAGE_SIZE: Final[int] = 25
MAX_PAGE_SIZE: Final[int] = 100

# File Upload
MAX_FILE_SIZE_MB: Final[int] = 10
MAX_PROFILE_PICTURE_SIZE_MB: Final[int] = 5
ALLOWED_IMAGE_EXTENSIONS: Final[set[str]] = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}

# Session Configuration
SESSION_TIMEOUT_MINUTES: Final[int] = 30
MAX_SESSION_DURATION_HOURS: Final[int] = 8

# Password Requirements
MIN_PASSWORD_LENGTH: Final[int] = 8
MAX_PASSWORD_LENGTH: Final[int] = 128

# Token Configuration
RESET_TOKEN_LENGTH: Final[int] = 32
RESET_TOKEN_EXPIRY_HOURS: Final[int] = 24
RESET_CODE_EXPIRY_SECONDS: Final[int] = 600

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE: Final[int] = 60
RATE_LIMIT_REQUESTS_PER_HOUR: Final[int] = 1000

# Cache TTL (in seconds)
CACHE_TTL_SHORT: Final[int] = 300  # 5 minutes
CACHE_TTL_MEDIUM: Final[int] = 1800  # 30 minutes
CACHE_TTL_LONG: Final[int] = 3600  # 1 hour


class UserRole(str, Enum):
    """User roles."""
    SUPERUSER = "superuser"
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"


class SessionStatus(str, Enum):
    """Session status values."""
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class AlertLevel(str, Enum):
    """Alert severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class BehaviorType(str, Enum):
    """Behavior tracking types."""
    ON_TASK = "on_task"
    USING_PHONE = "using_phone"
    SLEEPING = "sleeping"
    DISENGAGED_POSTURE = "disengaged_posture"


class AuditAction(str, Enum):
    """Audit log action types."""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    PASSWORD_RESET = "password_reset"
    SESSION_START = "session_start"
    SESSION_END = "session_end"


class NotificationType(str, Enum):
    """Notification types."""
    SYSTEM = "system"
    SESSION_ALERT = "session_alert"
    USER_MENTION = "user_mention"
    ASSIGNMENT = "assignment"
    REMINDER = "reminder"

from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "TeachTrack"
    API_V1_STR: str = "/api/v1"

    ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    ENABLE_ADMIN_LOG_STREAM: bool = True
    DEBUG: bool = False
    CORS_ORIGINS: str = ""

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    SQLALCHEMY_DATABASE_URL: str
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_RECYCLE_SECONDS: int = 1800
    DB_POOL_PRE_PING: bool = True

    GOOGLE_CLIENT_ID: str = ""

    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_PORT: int = 587
    MAIL_SERVER: str = ""
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    MODEL_PATH: str = "ml_engine/weights/best.pt"
    DETECT_INTERVAL_SECONDS: int = 3
    DETECTOR_HEARTBEAT_TIMEOUT_SECONDS: int = 15
    SERVER_CAMERA_ENABLED: bool = True
    SERVER_CAMERA_PREVIEW: bool = False
    SERVER_CAMERA_INDEX: int = 0
    DETECTION_CONFIDENCE_THRESHOLD: float = 0.5
    DETECTION_IMGSZ: int = 960
    ALERT_COOLDOWN_MINUTES: int = 5
    
    # Engagement calculation weights (PARTIAL)
    W_ON_TASK: float = 1.0
    W_USING_PHONE: float = 1.2
    W_SLEEPING: float = 1.5
    W_OFF_TASK: float = 1.0

    GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE: str = ""
    GOOGLE_DRIVE_FOLDER_ID: str = ""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    @field_validator("DEBUG", mode="before")
    @classmethod
    def _parse_debug(cls, value):
        # Some IDEs/shells set DEBUG to non-boolean strings (e.g. "release").
        if isinstance(value, bool):
            return value
        if value is None:
            return False
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "y", "on", "debug"}:
                return True
            if normalized in {"0", "false", "no", "n", "off", "release", "prod", "production"}:
                return False
        return bool(value)


settings = Settings()

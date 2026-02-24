from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "TeachTrack"
    API_V1_STR: str = "/api/v1"

    ENV: str = "development"
    LOG_LEVEL: str = "INFO"
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

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")


settings = Settings()

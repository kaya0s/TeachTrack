import logging
import warnings
warnings.filterwarnings("ignore", category=FutureWarning, module="google.api_core")
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routers.admin import router as admin_router
from app.api.v1.routers import auth_router, users_router, classrooms_router, sessions_router, notifications_router
from app.core.config import settings
from app.core.exceptions import unhandled_exception_handler
from app.core.logging import RequestIdFilter, configure_logging
from app.core.middleware import RequestContextMiddleware

configure_logging(settings.LOG_LEVEL, enable_admin_log_stream=settings.ENABLE_ADMIN_LOG_STREAM)
root_logger = logging.getLogger()
root_logger.addFilter(RequestIdFilter())

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="TeachTrack API",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    debug=settings.DEBUG,
)
app.add_exception_handler(Exception, unhandled_exception_handler)
app.add_middleware(RequestContextMiddleware)

cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
if cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    )

app.include_router(auth_router.router, prefix=settings.API_V1_STR, tags=["auth"])
app.include_router(users_router.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(classrooms_router.router, prefix=f"{settings.API_V1_STR}/classroom", tags=["classroom"])
app.include_router(sessions_router.router, prefix=f"{settings.API_V1_STR}/sessions", tags=["sessions"])
app.include_router(sessions_router.models_router, prefix=f"{settings.API_V1_STR}/models", tags=["models"])
app.include_router(notifications_router.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["notifications"])
app.include_router(admin_router, prefix=f"{settings.API_V1_STR}/admin")


@app.get("/healthz", tags=["system"])
def healthz():
    return {"status": "ok", "service": settings.PROJECT_NAME, "env": settings.ENV}


@app.get("/", tags=["system"])
def read_root():
    return {"message": "TeachTrack API is running. Visit http://localhost:8000/docs for API documentation."}

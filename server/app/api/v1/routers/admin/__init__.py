from fastapi import APIRouter

from app.api.v1.routers.admin import (
    users_router,
    colleges_router,
    departments_router,
    sections_router,
    sessions_router,
    subjects_router,
    media_router,
    backup_router,
    settings_router,
)

router = APIRouter()

# Include all sub-routers
router.include_router(users_router.router, tags=["admin-users"])
router.include_router(colleges_router.router, tags=["admin-colleges"])
router.include_router(departments_router.router, tags=["admin-departments"])
router.include_router(sections_router.router, tags=["admin-sections"])
router.include_router(sessions_router.router, tags=["admin-sessions"])
router.include_router(subjects_router.router, tags=["admin-subjects"])
router.include_router(media_router.router, tags=["admin-media"])
router.include_router(backup_router.router, tags=["admin-backup"])
router.include_router(settings_router.router, tags=["admin-settings"])

__all__ = ["router"]

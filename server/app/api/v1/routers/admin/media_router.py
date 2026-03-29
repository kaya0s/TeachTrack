from typing import Any, Literal

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.api.v1 import deps
from app.db.database import get_db
from app.models.user import User as UserModel
from app.schemas.admin import AdminMediaUploadResponse
from app.services import admin_service

router = APIRouter()


@router.post("/media/upload", response_model=AdminMediaUploadResponse)
async def upload_admin_media(
    entity: Literal["college", "department", "major", "subject"] = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return await admin_service.upload_admin_media(db=db, file=file, current_user=current_user, entity=entity)

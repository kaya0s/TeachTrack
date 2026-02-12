import hashlib
import time
from typing import List, Any

import requests
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.api import deps
from app.core.config import settings
from app.db.database import get_db
from app.models.classroom import Subject, ClassSection
from app.schemas.classroom import (
    SubjectCreate,
    SubjectUpdate,
    SubjectCoverUploadResponse,
    Subject as SubjectSchema,
    SectionCreate,
    Section as SectionSchema,
)

router = APIRouter()

# -- Subjects --

@router.get("/subjects", response_model=List[SubjectSchema])
def read_subjects(
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
    skip: int = 0,
    limit: int = 100
) -> Any:
    subjects = (
        db.query(Subject)
        .options(joinedload(Subject.sections))
        .filter(Subject.teacher_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    for subject in subjects:
        subject.sections = [
            section
            for section in subject.sections
            if section.subject_id == subject.id
        ]
    return subjects

@router.post("/subjects", response_model=SubjectSchema)
def create_subject(
    *,
    db: Session = Depends(get_db),
    subject_in: SubjectCreate,
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    subject = Subject(
        **subject_in.dict(),
        teacher_id=current_user.id
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject

@router.get("/subjects/{subject_id}", response_model=SubjectSchema)
def read_subject(
    *,
    db: Session = Depends(get_db),
    subject_id: int,
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    subject = (
        db.query(Subject)
        .options(joinedload(Subject.sections))
        .filter(Subject.id == subject_id, Subject.teacher_id == current_user.id)
        .first()
    )
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    subject.sections = [
        section for section in subject.sections if section.subject_id == subject.id
    ]
    return subject

@router.patch("/subjects/{subject_id}", response_model=SubjectSchema)
def update_subject(
    *,
    db: Session = Depends(get_db),
    subject_id: int,
    subject_in: SubjectUpdate,
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    subject = (
        db.query(Subject)
        .filter(Subject.id == subject_id, Subject.teacher_id == current_user.id)
        .first()
    )
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    update_data = subject_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subject, field, value)

    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject

@router.post("/subjects/cover-image", response_model=SubjectCoverUploadResponse)
async def upload_subject_cover_image(
    *,
    file: UploadFile = File(...),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files are allowed.",
        )

    cloud_name = settings.CLOUDINARY_CLOUD_NAME
    api_key = settings.CLOUDINARY_API_KEY
    api_secret = settings.CLOUDINARY_API_SECRET
    if not cloud_name or not api_key or not api_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudinary is not configured on the server.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image size exceeds 10 MB limit.",
        )

    timestamp = int(time.time())
    folder = f"teachtrack/teachers/{current_user.id}/subjects"
    public_id = f"subject_cover_{current_user.id}_{timestamp}"
    signature_payload = (
        f"folder={folder}&public_id={public_id}&timestamp={timestamp}{api_secret}"
    )
    signature = hashlib.sha1(signature_payload.encode("utf-8")).hexdigest()

    upload_url = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"
    response = requests.post(
        upload_url,
        data={
            "api_key": api_key,
            "timestamp": timestamp,
            "folder": folder,
            "public_id": public_id,
            "signature": signature,
        },
        files={"file": (file.filename or "subject-cover.jpg", file_bytes, file.content_type)},
        timeout=30,
    )

    if response.status_code >= 400:
        message = "Cloudinary upload failed."
        try:
            payload = response.json()
            message = payload.get("error", {}).get("message", message)
        except ValueError:
            pass
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=message)

    payload = response.json()
    secure_url = payload.get("secure_url")
    public_id = payload.get("public_id")
    if not secure_url or not public_id:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Cloudinary response missing secure_url/public_id.",
        )

    return SubjectCoverUploadResponse(secure_url=secure_url, public_id=public_id)

# -- Sections --

@router.get("/subjects/{subject_id}/sections", response_model=List[SectionSchema])
def read_sections_by_subject(
    *,
    db: Session = Depends(get_db),
    subject_id: int,
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    subject = (
        db.query(Subject)
        .filter(Subject.id == subject_id, Subject.teacher_id == current_user.id)
        .first()
    )
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    return (
        db.query(ClassSection)
        .filter(ClassSection.subject_id == subject_id)
        .order_by(ClassSection.id.asc())
        .all()
    )

@router.get("/sections", response_model=List[SectionSchema])
def read_sections(
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
    skip: int = 0,
    limit: int = 100
) -> Any:
    return (
        db.query(ClassSection)
        .join(Subject, ClassSection.subject_id == Subject.id)
        .filter(Subject.teacher_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .all()
    )

@router.post("/sections", response_model=SectionSchema)
def create_section(
    *,
    db: Session = Depends(get_db),
    section_in: SectionCreate,
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    section = ClassSection(
        **section_in.dict(),
        teacher_id=current_user.id
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    return section

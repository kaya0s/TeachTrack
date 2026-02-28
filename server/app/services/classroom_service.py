import hashlib
import time
from typing import Any

import httpx
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.classroom import ClassSection, Subject
from app.repositories.classroom_repository import ClassroomRepository
from app.schemas.classroom import SectionCreate, SubjectCreate, SubjectCoverUploadResponse, SubjectUpdate


def read_subjects(db: Session, teacher_id: int, skip: int, limit: int):
    subjects = ClassroomRepository.list_subjects(db, teacher_id, skip, limit)
    for subject in subjects:
        subject.sections = [section for section in subject.sections if section.subject_id == subject.id]
    return subjects


def create_subject(db: Session, subject_in: SubjectCreate, teacher_id: int) -> Subject:
    subject = Subject(**subject_in.dict(), teacher_id=teacher_id)
    return ClassroomRepository.create_subject(db, subject)


def read_subject(db: Session, subject_id: int, teacher_id: int) -> Subject:
    subject = ClassroomRepository.get_subject(db, subject_id, teacher_id, with_sections=True)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    subject.sections = [section for section in subject.sections if section.subject_id == subject.id]
    return subject


def update_subject(db: Session, subject_id: int, subject_in: SubjectUpdate, teacher_id: int) -> Subject:
    subject = ClassroomRepository.get_subject(db, subject_id, teacher_id, with_sections=False)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    update_data = subject_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subject, field, value)

    return ClassroomRepository.save_subject(db, subject)


async def upload_subject_cover_image(file: UploadFile, teacher_id: int) -> SubjectCoverUploadResponse:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files are allowed.")

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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image size exceeds 10 MB limit.")

    timestamp = int(time.time())
    folder = f"teachtrack/teachers/{teacher_id}/subjects"
    public_id = f"subject_cover_{teacher_id}_{timestamp}"
    signature_payload = f"folder={folder}&public_id={public_id}&timestamp={timestamp}{api_secret}"
    signature = hashlib.sha1(signature_payload.encode("utf-8")).hexdigest()

    upload_url = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            upload_url,
            data={
                "api_key": api_key,
                "timestamp": timestamp,
                "folder": folder,
                "public_id": public_id,
                "signature": signature,
            },
            files={"file": (file.filename or "subject-cover.jpg", file_bytes, file.content_type)},
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
    cloud_public_id = payload.get("public_id")
    if not secure_url or not cloud_public_id:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Cloudinary response missing secure_url/public_id.",
        )

    return SubjectCoverUploadResponse(secure_url=secure_url, public_id=cloud_public_id)


def read_sections_by_subject(db: Session, subject_id: int, teacher_id: int):
    # get_subject now accepts section-level teacher assignments too
    subject = ClassroomRepository.get_subject(db, subject_id, teacher_id, with_sections=False)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return ClassroomRepository.list_sections_by_subject(db, subject_id)


def read_sections(db: Session, teacher_id: int, skip: int, limit: int):
    return ClassroomRepository.list_sections(db, teacher_id, skip, limit)


def create_section(db: Session, section_in: SectionCreate, teacher_id: int) -> ClassSection:
    subject = ClassroomRepository.get_subject(db, section_in.subject_id, teacher_id, with_sections=False)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    section = ClassSection(**section_in.dict(), teacher_id=teacher_id)
    return ClassroomRepository.create_section(db, section)

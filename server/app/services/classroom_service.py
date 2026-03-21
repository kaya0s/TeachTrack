import hashlib
import time
from typing import Any

import httpx
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.classroom import Subject
from app.repositories.classroom_repository import ClassroomRepository
from app.schemas.classroom import SubjectCoverUploadResponse, SubjectUpdate
from app.services import audit_service
from app.utils.file import is_valid_image_extension, sanitize_filename
from app.constants import MAX_FILE_SIZE_MB, MAX_PAGE_SIZE
from app.validators.session import validate_subject_name


def read_colleges(db: Session):
    colleges = ClassroomRepository.list_colleges(db)
    return [
        {
            "id": college.id,
            "name": college.name,
            "acronym": college.acronym,
            "logo_path": college.logo_path,
        }
        for college in colleges
    ]


def read_subjects(db: Session, teacher_id: int, skip: int, limit: int):
    skip = max(0, skip)
    limit = max(1, min(limit, MAX_PAGE_SIZE))
    subjects = ClassroomRepository.list_subjects(db, teacher_id, skip, limit)
    formatted_subjects = []
    for subject in subjects:
        # Filter sections to only include those belonging to this subject
        subject_sections = [section for section in subject.sections if section.subject_id == subject.id]
        
        # Format sections with college and major info
        formatted_sections = []
        for section in subject_sections:
            college_name = None
            major_name = None
            
            if section.major:
                major_name = section.major.name
                if section.major.college:
                    college_name = section.major.college.name
            
            formatted_section = {
                "id": section.id,
                "name": section.name,
                "subject_id": section.subject_id,
                "teacher_id": section.teacher_id,
                "teacher_username": section.teacher.username if section.teacher else None,
                "college_name": college_name,
                "major_name": major_name,
                "created_at": section.created_at
            }
            formatted_sections.append(formatted_section)
        
        # Format subject
        formatted_subject = {
            "id": subject.id,
            "name": subject.name,
            "teacher_id": None,
            "teacher_username": None,
            "college_id": subject.college_id,
            "college_name": subject.college.name if subject.college else None,
            "college_logo_path": subject.college.logo_path if subject.college else None,
            "code": subject.code,
            "description": subject.description,
            "cover_image_url": subject.cover_image_url,
            "created_at": subject.created_at,
            "sections": formatted_sections
        }
        formatted_subjects.append(formatted_subject)
    
    return formatted_subjects


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

    before = {
        "name": subject.name,
        "code": subject.code,
        "description": subject.description,
        "cover_image_url": subject.cover_image_url,
    }

    update_data = subject_in.dict(exclude_unset=True)
    if "name" in update_data:
        valid, error = validate_subject_name(str(update_data.get("name") or ""))
        if not valid:
            raise HTTPException(status_code=400, detail=error or "Invalid subject name")
    for field, value in update_data.items():
        setattr(subject, field, value)

    subject = ClassroomRepository.save_subject(db, subject)
    audit_service.write_audit_log(
        db,
        actor_user_id=teacher_id,
        actor_username=None,
        action="TEACHER_SUBJECT_UPDATE",
        entity_type="Subject",
        entity_id=subject.id,
        details={
            "before": before,
            "after": {
                "name": subject.name,
                "code": subject.code,
                "description": subject.description,
                "cover_image_url": subject.cover_image_url,
            },
        },
    )
    db.commit()
    return subject


async def upload_subject_cover_image(db: Session, file: UploadFile, current_user) -> SubjectCoverUploadResponse:
    teacher_id = getattr(current_user, "id", None)
    teacher_username = getattr(current_user, "username", None)
    
    # Validate file extension using utility
    if file.filename and not is_valid_image_extension(file.filename):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image file type.")

    cloud_name = settings.CLOUDINARY_CLOUD_NAME
    api_key = settings.CLOUDINARY_API_KEY
    api_secret = settings.CLOUDINARY_API_SECRET
    if not cloud_name or not api_key or not api_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudinary is not configured on the server.",
        )

    file_bytes = await file.read()
    file_size_mb = len(file_bytes) / (1024 * 1024)
    if file_size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Image size exceeds {MAX_FILE_SIZE_MB} MB limit."
        )

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
            files={"file": (sanitize_filename(file.filename or "subject-cover.jpg"), file_bytes, file.content_type)},
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

    audit_service.write_audit_log(
        db,
        actor_user_id=teacher_id,
        actor_username=teacher_username,
        action="TEACHER_SUBJECT_COVER_UPLOAD",
        entity_type="SubjectCover",
        entity_id=cloud_public_id,
        details={"secure_url": secure_url, "file_name": file.filename},
    )
    db.commit()
    return SubjectCoverUploadResponse(secure_url=secure_url, public_id=cloud_public_id)


def read_sections_by_subject(db: Session, subject_id: int, teacher_id: int):
    # get_subject now accepts section-level teacher assignments too
    subject = ClassroomRepository.get_subject(db, subject_id, teacher_id, with_sections=False)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return ClassroomRepository.list_sections_by_subject(db, subject_id)


def read_sections(db: Session, teacher_id: int, skip: int, limit: int):
    skip = max(0, skip)
    limit = max(1, min(limit, MAX_PAGE_SIZE))
    return ClassroomRepository.list_sections(db, teacher_id, skip, limit)

from __future__ import annotations

import hashlib
import time
from typing import Any

import httpx
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.constants import MAX_FILE_SIZE_MB, MAX_PAGE_SIZE
from app.core.config import settings
from app.models.classroom import ClassSection, SectionSubjectAssignment, Subject
from app.repositories.classroom_repository import ClassroomRepository
from app.schemas.classroom import SubjectCoverUploadResponse, SubjectUpdate
from app.services import audit_service
from app.utils.file import is_valid_image_extension, sanitize_filename
from app.validators.session import validate_subject_name


def _is_assignment_visible_to_teacher(assignment: SectionSubjectAssignment, teacher_id: int) -> bool:
    if assignment.teacher_id == teacher_id:
        return True
    if assignment.teacher_id is None and assignment.section and assignment.section.teacher_id == teacher_id:
        return True
    return False


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


def read_departments(db: Session):
    departments = ClassroomRepository.list_departments(db)
    return [
        {
            "id": department.id,
            "college_id": department.college_id,
            "name": department.name,
            "code": department.code,
            "cover_image_url": department.cover_image_url,
        }
        for department in departments
    ]


def read_majors(db: Session):
    majors = ClassroomRepository.list_majors(db)
    return [
        {
            "id": major.id,
            "department_id": major.department_id,
            "name": major.name,
            "code": major.code,
            "cover_image_url": major.cover_image_url,
        }
        for major in majors
    ]


def _format_subject_for_teacher(subject: Subject, teacher_id: int) -> dict[str, Any]:
    visible_assignments = [
        assignment
        for assignment in (subject.section_assignments or [])
        if _is_assignment_visible_to_teacher(assignment, teacher_id)
    ]
    formatted_sections = []
    for assignment in visible_assignments:
        section = assignment.section
        if not section:
            continue
        major = section.major
        department = major.department if major else None
        college = department.college if department else None
        teacher = assignment.teacher if assignment.teacher else section.teacher
        formatted_sections.append(
            {
                "id": section.id,
                "name": section.name,
                "subject_id": subject.id,
                "teacher_id": teacher.id if teacher else None,
                "teacher_username": teacher.username if teacher else None,
                "college_name": college.name if college else None,
                "department_name": department.name if department else None,
                "major_name": major.name if major else None,
                "major_id": major.id if major else None,
                "year_level": section.year_level,
                "section_code": section.section_code,
                "created_at": section.created_at,
            }
        )

    major = subject.major
    department = major.department if major else None
    college = department.college if department else None
    return {
        "id": subject.id,
        "name": subject.name,
        "teacher_id": None,
        "teacher_username": None,
        "major_id": subject.major_id,
        "major_name": major.name if major else None,
        "major_code": major.code if major else None,
        "major_cover_image_url": major.cover_image_url if major else None,
        "department_id": department.id if department else None,
        "department_name": department.name if department else None,
        "department_code": department.code if department else None,
        "department_cover_image_url": department.cover_image_url if department else None,
        "college_id": college.id if college else None,
        "college_name": college.name if college else None,
        "college_acronym": college.acronym if college else None,
        "college_logo_path": college.logo_path if college else None,
        "code": subject.code,
        "description": subject.description,
        "cover_image_url": subject.cover_image_url,
        "created_at": subject.created_at,
        "sections": formatted_sections,
    }


def read_subjects(db: Session, teacher_id: int, skip: int, limit: int):
    skip = max(0, skip)
    limit = max(1, min(limit, MAX_PAGE_SIZE))
    subjects = ClassroomRepository.list_subjects(db, teacher_id, skip, limit)
    return [_format_subject_for_teacher(subject, teacher_id) for subject in subjects]


def read_subject(db: Session, subject_id: int, teacher_id: int) -> dict[str, Any]:
    subject = ClassroomRepository.get_subject(db, subject_id, teacher_id, with_sections=True)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return _format_subject_for_teacher(subject, teacher_id)


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
            detail=f"Image size exceeds {MAX_FILE_SIZE_MB} MB limit.",
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
    subject = ClassroomRepository.get_subject(db, subject_id, teacher_id, with_sections=False)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    sections = ClassroomRepository.list_sections_by_subject(db, subject_id)
    visible_sections: list[dict[str, Any]] = []
    for section in sections:
        for assignment in section.subject_assignments or []:
            if assignment.subject_id != subject_id:
                continue
            if _is_assignment_visible_to_teacher(assignment, teacher_id):
                major = section.major
                department = major.department if major else None
                college = department.college if department else None
                teacher = assignment.teacher if assignment.teacher else section.teacher
                visible_sections.append(
                    {
                        "id": section.id,
                        "name": section.name,
                        "subject_id": subject_id,
                        "teacher_id": teacher.id if teacher else None,
                        "teacher_username": teacher.username if teacher else None,
                        "college_name": college.name if college else None,
                        "department_name": department.name if department else None,
                        "major_name": major.name if major else None,
                        "major_id": major.id if major else None,
                        "year_level": section.year_level,
                        "section_code": section.section_code,
                        "created_at": section.created_at,
                    }
                )
                break
    return visible_sections


def read_sections(db: Session, teacher_id: int, skip: int, limit: int):
    skip = max(0, skip)
    limit = max(1, min(limit, MAX_PAGE_SIZE))
    sections = ClassroomRepository.list_sections(db, teacher_id, skip, limit)
    formatted = []
    for section in sections:
        major = section.major
        department = major.department if major else None
        college = department.college if department else None
        # Return one row per section with no subject binding in this endpoint.
        formatted.append(
            {
                "id": section.id,
                "name": section.name,
                "subject_id": None,
                "teacher_id": section.teacher_id,
                "teacher_username": section.teacher.username if section.teacher else None,
                "college_name": college.name if college else None,
                "department_name": department.name if department else None,
                "major_name": major.name if major else None,
                "major_id": major.id if major else None,
                "year_level": section.year_level,
                "section_code": section.section_code,
                "created_at": section.created_at,
            }
        )
    return formatted

from __future__ import annotations

from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.constants import DEFAULT_PAGE_SIZE
from app.core.pagination import clamp_pagination
from app.models.classroom import ClassSection, Department, Major, SectionSubjectAssignment, Subject
from app.models.session import ClassSession
from app.validators.session import validate_subject_name
from app.services.admin.security_service import verify_admin_password_or_401


def _subject_teacher_fields_from_assignments(subject: Subject) -> tuple[int | None, str, str | None, str | None]:
    teachers: dict[int, "User"] = {}
    for assignment in subject.section_assignments or []:
        if assignment.teacher_id and assignment.teacher:
            teachers[assignment.teacher_id] = assignment.teacher
            continue
        if assignment.section and assignment.section.teacher_id and assignment.section.teacher:
            teachers[assignment.section.teacher_id] = assignment.section.teacher

    if not teachers:
        return (None, "unassigned", None, None)
    if len(teachers) == 1:
        teacher = next(iter(teachers.values()))
        return (
            teacher.id,
            teacher.username,
            teacher.fullname if teacher else None,
            teacher.profile_picture_url if teacher else None,
        )
    return (None, "multiple", f"{len(teachers)} teachers", None)


def _serialize_subject(row: Subject) -> dict[str, Any]:
    teacher_id, teacher_username, teacher_fullname, teacher_profile_picture_url = _subject_teacher_fields_from_assignments(row)
    section_names: list[str] = []
    seen_sections: set[int] = set()
    for assignment in row.section_assignments or []:
        if assignment.section and assignment.section.id not in seen_sections:
            seen_sections.add(assignment.section.id)
            section_names.append(assignment.section.name)

    major = row.major
    department = major.department if major else None
    college = department.college if department else None
    return {
        "id": row.id,
        "name": row.name,
        "code": row.code,
        "description": row.description,
        "cover_image_url": row.cover_image_url,
        "teacher_id": teacher_id,
        "teacher_username": teacher_username,
        "teacher_fullname": teacher_fullname,
        "teacher_profile_picture_url": teacher_profile_picture_url,
        "sections_count": len(section_names),
        "section_names": section_names,
        "major_id": row.major_id,
        "major_name": major.name if major else None,
        "department_id": department.id if department else None,
        "department_name": department.name if department else None,
        "college_id": college.id if college else None,
        "college_name": college.name if college else None,
        "created_at": row.created_at,
    }


def _resolve_major_id_from_payload(db: Session, payload: dict[str, Any]) -> int:
    major_id = payload.get("major_id")
    if major_id is not None:
        major = db.query(Major).filter(Major.id == int(major_id)).first()
        if not major:
            raise HTTPException(status_code=404, detail="Major not found")
        return major.id

    # Backward compatibility: if client still sends college_id, map to first major under that college.
    college_id = payload.get("college_id")
    if college_id is not None:
        mapped_major = (
            db.query(Major)
            .join(Department, Major.department_id == Department.id)
            .filter(Department.college_id == int(college_id))
            .order_by(Major.id.asc())
            .first()
        )
        if not mapped_major:
            raise HTTPException(status_code=400, detail="No major found for the selected college")
        return mapped_major.id

    raise HTTPException(status_code=400, detail="major_id is required")


def list_subjects(
    db: Session,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    q: Optional[str] = None,
    major_id: Optional[int] = None,
    department_id: Optional[int] = None,
    college_id: Optional[int] = None,
) -> dict[str, Any]:
    skip, limit = clamp_pagination(skip, limit)
    query = (
        db.query(Subject)
        .join(Major, Subject.major_id == Major.id)
        .join(Department, Major.department_id == Department.id)
        .options(
            joinedload(Subject.major).joinedload(Major.department).joinedload(Department.college),
            joinedload(Subject.section_assignments).joinedload(SectionSubjectAssignment.section).joinedload(ClassSection.teacher),
            joinedload(Subject.section_assignments).joinedload(SectionSubjectAssignment.teacher),
        )
    )
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter((Subject.name.ilike(pattern)) | (Subject.code.ilike(pattern)))
    if major_id is not None:
        query = query.filter(Subject.major_id == major_id)
    if department_id is not None:
        query = query.filter(Major.department_id == department_id)
    if college_id is not None:
        query = query.filter(Department.college_id == college_id)

    total = query.count()
    rows = query.order_by(Subject.created_at.desc(), Subject.id.desc()).offset(skip).limit(limit).all()
    return {"total": total, "items": [_serialize_subject(row) for row in rows]}


def create_subject(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    name = (payload.get("name") or "").strip()
    valid, error = validate_subject_name(name)
    if not valid:
        raise HTTPException(status_code=400, detail=error or "Invalid subject name")

    code = payload.get("code")
    if isinstance(code, str):
        code = code.strip() or None
    cover_image_url = payload.get("cover_image_url")
    if isinstance(cover_image_url, str):
        cover_image_url = cover_image_url.strip() or None
    major_id = _resolve_major_id_from_payload(db, payload)

    if db.query(Subject).filter(Subject.major_id == major_id, func.lower(Subject.name) == name.lower()).first():
        raise HTTPException(status_code=400, detail="Subject already exists in this major")
    if code and db.query(Subject).filter(Subject.major_id == major_id, Subject.code == code).first():
        raise HTTPException(status_code=400, detail="Subject code already exists in this major")

    row = Subject(
        major_id=major_id,
        name=name,
        code=code,
        description=payload.get("description"),
        cover_image_url=cover_image_url,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    row = (
        db.query(Subject)
        .options(
            joinedload(Subject.major).joinedload(Major.department).joinedload(Department.college),
            joinedload(Subject.section_assignments).joinedload(SectionSubjectAssignment.section).joinedload(ClassSection.teacher),
            joinedload(Subject.section_assignments).joinedload(SectionSubjectAssignment.teacher),
        )
        .filter(Subject.id == row.id)
        .first()
    )
    return _serialize_subject(row)


def update_subject(db: Session, subject_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    print(f"DEBUG: Update subject payload received: {payload}")
    
    row = (
        db.query(Subject)
        .options(
            joinedload(Subject.major).joinedload(Major.department).joinedload(Department.college),
            joinedload(Subject.section_assignments).joinedload(SectionSubjectAssignment.section).joinedload(ClassSection.teacher),
            joinedload(Subject.section_assignments).joinedload(SectionSubjectAssignment.teacher),
        )
        .filter(Subject.id == subject_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Subject not found")

    print(f"DEBUG: Current subject cover_image_url: {row.cover_image_url}")

    target_major_id = row.major_id
    target_name = row.name
    target_code = row.code

    if payload.get("name") is not None:
        name = str(payload["name"]).strip()
        valid, error = validate_subject_name(name)
        if not valid:
            raise HTTPException(status_code=400, detail=error or "Invalid subject name")
        target_name = name
        row.name = name
    if payload.get("code") is not None:
        code = payload.get("code")
        target_code = str(code).strip() if isinstance(code, str) and code.strip() else None
        row.code = target_code
    if "description" in payload:
        row.description = payload.get("description")
    if "cover_image_url" in payload:
        cover_image_url = payload.get("cover_image_url")
        print(f"DEBUG: Processing cover_image_url: {cover_image_url}")
        row.cover_image_url = str(cover_image_url).strip() if isinstance(cover_image_url, str) and cover_image_url.strip() else None
        print(f"DEBUG: Updated subject cover_image_url to: {row.cover_image_url}")
    if "major_id" in payload or "college_id" in payload:
        target_major_id = _resolve_major_id_from_payload(db, payload)
        row.major_id = target_major_id

    duplicate_name = (
        db.query(Subject)
        .filter(
            Subject.id != row.id,
            Subject.major_id == target_major_id,
            func.lower(Subject.name) == target_name.lower(),
        )
        .first()
    )
    if duplicate_name:
        raise HTTPException(status_code=400, detail="Subject already exists in this major")

    if target_code:
        duplicate_code = (
            db.query(Subject)
            .filter(
                Subject.id != row.id,
                Subject.major_id == target_major_id,
                Subject.code == target_code,
            )
            .first()
        )
        if duplicate_code:
            raise HTTPException(status_code=400, detail="Subject code already exists in this major")

    try:
        db.add(row)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Subject name or code already exists for this major")
    db.refresh(row)

    row = (
        db.query(Subject)
        .options(
            joinedload(Subject.major).joinedload(Major.department).joinedload(Department.college),
            joinedload(Subject.section_assignments).joinedload(SectionSubjectAssignment.section).joinedload(ClassSection.teacher),
            joinedload(Subject.section_assignments).joinedload(SectionSubjectAssignment.teacher),
        )
        .filter(Subject.id == subject_id)
        .first()
    )
    return _serialize_subject(row)


def delete_subject(db: Session, subject_id: int, actor_user_id: int, confirm_password: str) -> dict[str, Any]:
    verify_admin_password_or_401(db, actor_user_id=actor_user_id, confirm_password=confirm_password)

    row = db.query(Subject).filter(Subject.id == subject_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Subject not found")
    sessions_count = db.query(func.count(ClassSession.id)).filter(ClassSession.subject_id == subject_id).scalar() or 0
    if sessions_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete subject with existing sessions")
    assignments_count = (
        db.query(func.count(SectionSubjectAssignment.id))
        .filter(SectionSubjectAssignment.subject_id == subject_id)
        .scalar()
        or 0
    )
    if assignments_count > 0:
        raise HTTPException(status_code=400, detail="Delete related section assignments first")
    db.delete(row)
    db.commit()
    return {"message": "Subject deleted"}

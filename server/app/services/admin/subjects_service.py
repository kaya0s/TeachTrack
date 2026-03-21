from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func

from app.models.classroom import Subject, ClassSection
from app.models.session import ClassSession
from app.validators.session import validate_subject_name
from app.constants import DEFAULT_PAGE_SIZE
from app.core.pagination import clamp_pagination


def _subject_teacher_fields_from_sections(subject: Subject) -> tuple[int | None, str, str | None, str | None]:
    teachers: dict[int, "User"] = {}
    for section in subject.sections or []:
        if section.teacher_id and section.teacher:
            teachers[section.teacher_id] = section.teacher

    if not teachers:
        return (None, "unassigned", None, None)

    if len(teachers) == 1:
        teacher = next(iter(teachers.values()))
        return (teacher.id, teacher.username, teacher.fullname if teacher else None, teacher.profile_picture_url)

    return (None, "multiple", f"{len(teachers)} teachers", None)


def _serialize_subject(row: Subject) -> dict[str, Any]:
    teacher_id, teacher_username, teacher_fullname, teacher_profile_picture_url = _subject_teacher_fields_from_sections(row)
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
        "sections_count": len(row.sections or []),
        "section_names": row.section_names,
        "college_id": row.college_id,
        "college_name": row.college.name if row.college else None,
        "created_at": row.created_at,
    }


def list_subjects(
    db: Session,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    q: Optional[str] = None,
    college_id: Optional[int] = None,
) -> dict[str, Any]:
    skip, limit = clamp_pagination(skip, limit)
    query = (
        db.query(Subject)
        .options(
            joinedload(Subject.sections).joinedload(ClassSection.teacher),
            joinedload(Subject.college),
        )
    )
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter((Subject.name.like(pattern)) | (Subject.code.like(pattern)))
    if college_id is not None:
        query = query.filter(Subject.college_id == college_id)

    total = query.count()
    rows = (
        query.order_by(Subject.created_at.desc(), Subject.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    items = [
        _serialize_subject(row)
        for row in rows
    ]
    return {"total": total, "items": items}


def create_subject(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    name = (payload.get("name") or "").strip()
    valid, error = validate_subject_name(name)
    if not valid:
        raise HTTPException(status_code=400, detail=error or "Invalid subject name")
    code = (payload.get("code") or None)
    if isinstance(code, str):
        code = code.strip() or None
    cover_image_url = payload.get("cover_image_url")
    if isinstance(cover_image_url, str):
        cover_image_url = cover_image_url.strip() or None

    if db.query(Subject).filter(Subject.name == name).first():
        raise HTTPException(status_code=400, detail="Subject already exists")
    if code and db.query(Subject).filter(Subject.code == code).first():
        raise HTTPException(status_code=400, detail="Subject already exists")

    row = Subject(
        name=name,
        code=code,
        description=payload.get("description"),
        cover_image_url=cover_image_url,
        college_id=payload.get("college_id")
    )
    db.add(row)
    db.flush() 

    db.commit()
    db.refresh(row)
    row = db.query(Subject).options(joinedload(Subject.sections).joinedload(ClassSection.teacher), joinedload(Subject.college)).filter(Subject.id == row.id).first()
    return _serialize_subject(row)


def update_subject(db: Session, subject_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = db.query(Subject).options(joinedload(Subject.sections).joinedload(ClassSection.teacher), joinedload(Subject.college)).filter(Subject.id == subject_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Subject not found")

    if payload.get("name") is not None:
        name = str(payload["name"]).strip()
        valid, error = validate_subject_name(name)
        if not valid:
            raise HTTPException(status_code=400, detail=error or "Invalid subject name")
        row.name = name
    if payload.get("code") is not None:
        code = payload.get("code")
        row.code = str(code).strip() if isinstance(code, str) and code.strip() else None
    if "description" in payload:
        row.description = payload.get("description")
    if "cover_image_url" in payload:
        cover_image_url = payload.get("cover_image_url")
        row.cover_image_url = (
            str(cover_image_url).strip() if isinstance(cover_image_url, str) and cover_image_url.strip() else None
        )
    try:
        db.add(row)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Subject name or code already exists")
    db.refresh(row)
    
    if "college_id" in payload:
        row.college_id = payload.get("college_id")
        db.add(row)
        db.commit()
        db.refresh(row)

    row = db.query(Subject).options(joinedload(Subject.sections).joinedload(ClassSection.teacher), joinedload(Subject.college)).filter(Subject.id == subject_id).first()
    return _serialize_subject(row)


def delete_subject(db: Session, subject_id: int) -> dict[str, Any]:
    row = db.query(Subject).filter(Subject.id == subject_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Subject not found")
    sessions_count = db.query(func.count(ClassSession.id)).filter(ClassSession.subject_id == subject_id).scalar() or 0
    if sessions_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete subject with existing sessions")
    sections_count = db.query(func.count(ClassSection.id)).filter(ClassSection.subject_id == subject_id).scalar() or 0
    if sections_count > 0:
        raise HTTPException(status_code=400, detail="Delete related sections first")
    db.delete(row)
    db.commit()
    return {"message": "Subject deleted"}

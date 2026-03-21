from typing import Any, Optional
import json

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.classroom import ClassSection, Subject, Major
from app.models.session import ClassSession
from app.models.user import User
from app.services import notification_service, audit_service
from app.constants import DEFAULT_PAGE_SIZE
from app.core.pagination import clamp_pagination


def _serialize_section(row: ClassSection) -> dict[str, Any]:
    return {
        "id": row.id,
        "name": row.name,
        "subject_id": row.subject_id,
        "subject_name": row.subject.name if row.subject else "unassigned",
        "major_id": row.major_id,
        "major_name": row.major.name if row.major else None,
        "year_level": row.year_level,
        "section_letter": row.section_letter,
        "teacher_id": row.teacher_id,
        "teacher_username": row.teacher.username if row.teacher else "unassigned",
        "teacher_fullname": row.teacher.username if row.teacher else None,
        "teacher_profile_picture_url": row.teacher.profile_picture_url if row.teacher else None,
        "created_at": row.created_at,
    }


def _ensure_teacher(db: Session, teacher_id: int) -> User:
    teacher = (
        db.query(User)
        .filter(User.id == teacher_id, User.is_superuser == False)
        .first()
    )
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return teacher


def list_sections(
    db: Session,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    q: Optional[str] = None,
    college_id: Optional[int] = None,
    major_id: Optional[int] = None,
) -> dict[str, Any]:
    skip, limit = clamp_pagination(skip, limit)
    query = (
        db.query(ClassSection)
        .options(
            joinedload(ClassSection.subject),
            joinedload(ClassSection.teacher),
            joinedload(ClassSection.major).joinedload(Major.college),
        )
    )
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(ClassSection.name.like(pattern))

    if major_id:
        query = query.filter(ClassSection.major_id == major_id)
    if college_id:
        query = query.join(Major, ClassSection.major_id == Major.id).filter(Major.college_id == college_id)

    total = query.count()
    rows = (
        query.order_by(ClassSection.created_at.desc(), ClassSection.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    items = [_serialize_section(row) for row in rows]
    return {"total": total, "items": items}


def create_section(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    subject_ids = payload.get("subject_ids")
    if not subject_ids:
        sid = payload.get("subject_id")
        subject_ids = [int(sid)] if sid is not None else []
    else:
        subject_ids = [int(sid) for sid in subject_ids if sid is not None]

    # Current data model keeps one subject per section record.
    if len(subject_ids) > 1:
        raise HTTPException(
            status_code=400,
            detail="A section can be linked to only one subject. Select one subject.",
        )

    teacher_id = payload.get("teacher_id")
    if teacher_id is not None:
        _ensure_teacher(db, int(teacher_id))

    major_id = payload.get("major_id")
    year_level = payload.get("year_level")
    section_letter = str(payload.get("section_letter") or "").strip().upper()

    section_name = str(payload.get("name") or "").strip()
    
    # Auto-generate name from hierarchy if provided
    if major_id and year_level and section_letter:
        major = db.query(Major).filter(Major.id == major_id).first()
        if major:
            section_name = f"{major.code}-{year_level}{section_letter}"

    if not section_name:
        raise HTTPException(status_code=400, detail="Section name or academic hierarchy is required")

    normalized_name = section_name.lower()
    existing_by_name = (
        db.query(ClassSection)
        .filter(func.lower(ClassSection.name) == normalized_name)
        .first()
    )
    if existing_by_name:
        raise HTTPException(
            status_code=400,
            detail=f"Section '{section_name}' already exists. Use the existing section instead.",
        )

    # With no pool table, create ClassSection entries directly. If no subjects
    # are provided, create a standalone ClassSection (subject_id NULL) to act
    # as a standalone section entry.
    last_created = None
    if not subject_ids:
        row = ClassSection(
            name=section_name,
            major_id=major_id,
            year_level=year_level,
            section_letter=section_letter,
            subject_id=None,
            teacher_id=int(teacher_id) if teacher_id is not None else None,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return {
            "id": row.id,
            "section_id": row.id,
            "section_name": row.name,
            "subject_id": None,
            "subject_name": None,
            "teacher_id": row.teacher_id,
            "teacher_username": row.teacher.username if row.teacher else None,
            "teacher_fullname": row.teacher.username if row.teacher else None,
            "major_id": row.major_id,
            "year_level": row.year_level,
            "section_letter": row.section_letter,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        }

    for sub_id in subject_ids:
        subject = db.query(Subject).filter(Subject.id == sub_id).first()
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")

        row = ClassSection(
            name=section_name,
            major_id=major_id,
            year_level=year_level,
            section_letter=section_letter,
            subject_id=sub_id,
            teacher_id=int(teacher_id) if teacher_id is not None else None,
        )
        db.add(row)
        last_created = row

    db.commit()
    if not last_created:
        raise HTTPException(status_code=400, detail="Could not create any section assignments")

    db.refresh(last_created)
    res = db.query(ClassSection).options(joinedload(ClassSection.subject), joinedload(ClassSection.teacher), joinedload(ClassSection.major)).filter(ClassSection.id == last_created.id).first()
    return _serialize_section(res)


def update_section(db: Session, section_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = db.query(ClassSection).options(joinedload(ClassSection.subject), joinedload(ClassSection.teacher), joinedload(ClassSection.major)).filter(ClassSection.id == section_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Section not found")

    if payload.get("name") is not None:
        name = str(payload["name"]).strip()
        if not name:
            raise HTTPException(status_code=400, detail="Section name cannot be empty")
        duplicate = (
            db.query(ClassSection)
            .filter(
                func.lower(ClassSection.name) == name.lower(),
                ClassSection.id != row.id,
            )
            .first()
        )
        if duplicate:
            raise HTTPException(status_code=400, detail=f"Section '{name}' already exists")
        row.name = name
    if payload.get("major_id") is not None:
        row.major_id = payload.get("major_id")
    if payload.get("year_level") is not None:
        row.year_level = payload.get("year_level")
    if payload.get("section_letter") is not None:
        row.section_letter = payload.get("section_letter")

    if payload.get("subject_id") is not None:
        subject_id = int(payload["subject_id"])
        subject = db.query(Subject).filter(Subject.id == subject_id).first()
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        row.subject_id = subject_id
    if "teacher_id" in payload:
        teacher_id = payload.get("teacher_id")
        if teacher_id is None:
            row.teacher_id = None
        else:
            teacher = _ensure_teacher(db, int(teacher_id))
            row.teacher_id = teacher.id

    db.add(row)
    db.commit()
    db.refresh(row)
    row = db.query(ClassSection).options(joinedload(ClassSection.subject), joinedload(ClassSection.teacher), joinedload(ClassSection.major)).filter(ClassSection.id == section_id).first()
    return _serialize_section(row)


def unassign_section_teacher(db: Session, section_id: int) -> dict[str, Any]:
    row = (
        db.query(ClassSection)
        .options(joinedload(ClassSection.subject), joinedload(ClassSection.teacher))
        .filter(ClassSection.id == section_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Section not found")

    row.teacher_id = None
    db.add(row)
    db.commit()
    db.refresh(row)
    row = db.query(ClassSection).options(joinedload(ClassSection.subject), joinedload(ClassSection.teacher), joinedload(ClassSection.major)).filter(ClassSection.id == section_id).first()
    return _serialize_section(row)


def delete_section(db: Session, section_id: int) -> dict[str, Any]:
    row = db.query(ClassSection).filter(ClassSection.id == section_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Section not found")
    sessions_count = db.query(func.count(ClassSession.id)).filter(ClassSession.section_id == section_id).scalar() or 0
    if sessions_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete section with existing sessions")
    db.delete(row)
    db.commit()
    return {"message": "Section deleted"}


def create_class(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    subject_id = payload.get("subject_id")
    subject = None
    if subject_id is not None:
        subject = db.query(Subject).filter(Subject.id == int(subject_id)).first()
    else:
        subject_name = str(payload.get("subject_name") or "").strip()
        if not subject_name:
            raise HTTPException(status_code=400, detail="Provide subject_id or subject_name")
        subject_code = payload.get("subject_code")
        subject = Subject(name=subject_name, code=(str(subject_code).strip() if isinstance(subject_code, str) and subject_code.strip() else None))
        db.add(subject)
        db.flush()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    major_id = payload.get("major_id")
    year_level = payload.get("year_level")
    section_letter = str(payload.get("section_letter") or "").strip().upper()
    section_name = str(payload.get("section_name") or "").strip()

    # Auto-generate name from hierarchy if provided
    if major_id and year_level and section_letter:
        major = db.query(Major).filter(Major.id == major_id).first()
        if major:
            section_name = f"{major.code}-{year_level}{section_letter}"

    if not section_name:
        raise HTTPException(status_code=400, detail="Section name or academic hierarchy is required")

    existing_by_name = (
        db.query(ClassSection)
        .filter(func.lower(ClassSection.name) == section_name.lower())
        .first()
    )
    if existing_by_name:
        raise HTTPException(
            status_code=400,
            detail=f"Section '{section_name}' already exists. Use the existing section instead.",
        )

    row = ClassSection(
        name=section_name,
        major_id=major_id,
        year_level=year_level,
        section_letter=section_letter,
        subject_id=subject.id,
        teacher_id=None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row = db.query(ClassSection).options(joinedload(ClassSection.subject), joinedload(ClassSection.teacher), joinedload(ClassSection.major)).filter(ClassSection.id == row.id).first()
    return _serialize_section(row)


def assign_section_teacher(db: Session, section_id: int, teacher_id: int) -> dict[str, Any]:
    teacher = _ensure_teacher(db, teacher_id)
    section = (
        db.query(ClassSection)
        .options(joinedload(ClassSection.subject))
        .filter(ClassSection.id == section_id)
        .first()
    )
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    if not section.subject_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot assign a teacher to a section without a subject.",
        )

    section.teacher_id = teacher.id
    subject_name = section.subject.name if section.subject else "Unknown Subject"
    db.add(section)
    notification_service.create_notification(
        db,
        user_id=teacher.id,
        title="New Class Assignment",
        body=f"You were assigned to {subject_name} - {section.name}.",
        type="CLASS_ASSIGNMENT",
        metadata_json=json.dumps(
            {
                "section_id": section.id,
                "subject_id": section.subject_id,
                "section_name": section.name,
                "subject_name": subject_name,
            }
        ),
    )
    db.commit()
    db.refresh(section)

    return {
        "id": section.id,
        "name": section.name,
        "subject_id": section.subject_id,
        "subject_name": section.subject.name if section.subject else "unassigned",
        "teacher_id": teacher.id,
        "teacher_username": teacher.username,
        "teacher_fullname": teacher.username,
        "teacher_profile_picture_url": teacher.profile_picture_url,
        "created_at": section.created_at,
    }

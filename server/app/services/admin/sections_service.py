from __future__ import annotations

from typing import Any, Optional
import json

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.constants import DEFAULT_PAGE_SIZE
from app.core.pagination import clamp_pagination
from app.models.classroom import ClassSection, Department, Major, SectionSubjectAssignment, Subject
from app.models.session import ClassSession
from app.models.user import User
from app.services import notification_service
from app.services.admin.security_service import verify_admin_password_or_401
from app.validators.session import validate_subject_name


def _normalize_section_code(payload: dict[str, Any]) -> str:
    raw = payload.get("section_code")
    if raw is None:
        raw = payload.get("section_letter")
    code = str(raw or "").strip().upper()
    return code


def _ensure_teacher(db: Session, teacher_id: int) -> User:
    teacher = db.query(User).filter(User.id == teacher_id, User.is_superuser == False).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return teacher


def _ensure_major(db: Session, major_id: Optional[int]) -> Major:
    if major_id is None:
        raise HTTPException(status_code=400, detail="major_id is required")
    major = (
        db.query(Major)
        .options(joinedload(Major.department).joinedload(Department.college))
        .filter(Major.id == int(major_id))
        .first()
    )
    if not major:
        raise HTTPException(status_code=404, detail="Major not found")
    return major


def _ensure_subject_for_major(db: Session, subject_id: int, major_id: int) -> Subject:
    subject = db.query(Subject).filter(Subject.id == int(subject_id)).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if subject.major_id != major_id:
        raise HTTPException(
            status_code=400,
            detail="Subject and section major must match.",
        )
    return subject


def _resolve_assignment(
    db: Session,
    section: ClassSection,
    subject_id: Optional[int] = None,
) -> Optional[SectionSubjectAssignment]:
    assignments = section.subject_assignments or []
    if subject_id is not None:
        assignment = next((row for row in assignments if row.subject_id == subject_id), None)
        return assignment
    if len(assignments) == 1:
        return assignments[0]
    return None


def _serialize_section(row: ClassSection, assignment: Optional[SectionSubjectAssignment] = None) -> dict[str, Any]:
    major = row.major
    department = major.department if major else None
    college = department.college if department else None
    teacher = assignment.teacher if assignment and assignment.teacher else row.teacher
    teacher_id = assignment.teacher_id if assignment else row.teacher_id
    subject = assignment.subject if assignment else None
    return {
        "id": row.id,
        "name": row.name,
        "subject_id": subject.id if subject else None,
        "subject_name": subject.name if subject else "unassigned",
        "major_id": row.major_id,
        "major_name": major.name if major else None,
        "department_id": department.id if department else None,
        "department_name": department.name if department else None,
        "college_id": college.id if college else None,
        "college_name": college.name if college else None,
        "year_level": row.year_level,
        "section_code": row.section_code,
        "section_letter": row.section_code,
        "teacher_id": teacher_id,
        "teacher_username": teacher.username if teacher else "unassigned",
        "teacher_fullname": teacher.fullname if teacher else None,
        "teacher_profile_picture_url": teacher.profile_picture_url if teacher else None,
        "created_at": row.created_at,
    }


def _class_status(assignment: SectionSubjectAssignment) -> str:
    section = assignment.section
    subject = assignment.subject
    if not section or not subject:
        return "invalid_mapping"
    if section.major_id != subject.major_id:
        return "invalid_mapping"

    section_department_id = section.major.department_id if section.major else None
    teacher = assignment.teacher
    if assignment.teacher_id is None:
        return "unassigned_teacher"
    if section_department_id is not None and (not teacher or teacher.department_id != section_department_id):
        return "invalid_mapping"
    return "assigned"


def _serialize_class_assignment(assignment: SectionSubjectAssignment) -> dict[str, Any]:
    section = assignment.section
    subject = assignment.subject
    teacher = assignment.teacher
    major = section.major if section else None
    department = major.department if major else None
    subject_major = subject.major if subject else None
    return {
        "id": assignment.id,
        "section": {
            "id": section.id if section else 0,
            "name": section.name if section else "Unknown section",
            "major_id": section.major_id if section else None,
            "major_name": major.name if major else None,
            "department_id": department.id if department else None,
            "department_name": department.name if department else None,
            "year_level": section.year_level if section else None,
            "section_code": section.section_code if section else None,
        },
        "subject": {
            "id": subject.id if subject else 0,
            "name": subject.name if subject else "Unknown subject",
            "code": subject.code if subject else None,
            "major_id": subject.major_id if subject else None,
            "major_name": subject_major.name if subject_major else None,
        },
        "teacher": {
            "id": teacher.id if teacher else None,
            "fullname": teacher.fullname if teacher else None,
            "username": teacher.username if teacher else None,
            "department_id": teacher.department_id if teacher else None,
            "profile_picture_url": teacher.profile_picture_url if teacher else None,
        },
        "status": _class_status(assignment),
        "created_at": assignment.created_at,
        "updated_at": assignment.updated_at,
    }


def _ensure_section(db: Session, section_id: int) -> ClassSection:
    section = (
        db.query(ClassSection)
        .options(
            joinedload(ClassSection.major).joinedload(Major.department).joinedload(Department.college),
            joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.subject).joinedload(Subject.major),
            joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.teacher),
        )
        .filter(ClassSection.id == section_id)
        .first()
    )
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    return section


def _ensure_class_assignment(db: Session, assignment_id: int) -> SectionSubjectAssignment:
    assignment = (
        db.query(SectionSubjectAssignment)
        .options(
            joinedload(SectionSubjectAssignment.section)
            .joinedload(ClassSection.major)
            .joinedload(Major.department)
            .joinedload(Department.college),
            joinedload(SectionSubjectAssignment.subject).joinedload(Subject.major),
            joinedload(SectionSubjectAssignment.teacher),
        )
        .filter(SectionSubjectAssignment.id == assignment_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Class assignment not found")
    return assignment


def _ensure_teacher_for_section(db: Session, teacher_id: int, section: ClassSection) -> User:
    teacher = _ensure_teacher(db, teacher_id)
    section_department_id = section.major.department_id if section.major else None
    if section_department_id is not None and teacher.department_id != section_department_id:
        raise HTTPException(status_code=400, detail="Teacher must belong to the section's department.")
    return teacher


def _notify_teacher_assignment(db: Session, teacher: User, section: ClassSection, subject: Subject) -> None:
    notification_service.create_notification(
        db,
        user_id=teacher.id,
        title="New Class Assignment",
        body=f"You were assigned to {subject.name} - {section.name}.",
        type="CLASS_ASSIGNMENT",
        metadata_json=json.dumps(
            {
                "section_id": section.id,
                "subject_id": subject.id,
                "section_name": section.name,
                "subject_name": subject.name,
            }
        ),
    )


def list_sections(
    db: Session,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    q: Optional[str] = None,
    college_id: Optional[int] = None,
    department_id: Optional[int] = None,
    major_id: Optional[int] = None,
) -> dict[str, Any]:
    skip, limit = clamp_pagination(skip, limit)
    query = (
        db.query(ClassSection)
        .join(Major, ClassSection.major_id == Major.id)
        .join(Department, Major.department_id == Department.id)
        .options(
            joinedload(ClassSection.major).joinedload(Major.department).joinedload(Department.college),
            joinedload(ClassSection.teacher),
            joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.subject),
            joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.teacher),
        )
    )
    if major_id:
        query = query.filter(ClassSection.major_id == major_id)
    if department_id:
        query = query.filter(Major.department_id == department_id)
    if college_id:
        query = query.filter(Department.college_id == college_id)

    sections = query.order_by(ClassSection.created_at.desc(), ClassSection.id.desc()).all()

    expanded: list[dict[str, Any]] = []
    for section in sections:
        if section.subject_assignments:
            for assignment in section.subject_assignments:
                expanded.append(_serialize_section(section, assignment))
        else:
            expanded.append(_serialize_section(section, None))

    if q:
        pattern = q.strip().lower()
        expanded = [
            row
            for row in expanded
            if pattern in (row["name"] or "").lower()
            or pattern in (row["subject_name"] or "").lower()
            or pattern in (row["teacher_username"] or "").lower()
            or pattern in (row["teacher_fullname"] or "").lower()
        ]

    total = len(expanded)
    return {"total": total, "items": expanded[skip : skip + limit]}


def list_classes(
    db: Session,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    q: Optional[str] = None,
    college_id: Optional[int] = None,
    department_id: Optional[int] = None,
    major_id: Optional[int] = None,
    teacher_id: Optional[int] = None,
    status: Optional[str] = None,
) -> dict[str, Any]:
    skip, limit = clamp_pagination(skip, limit)
    query = (
        db.query(SectionSubjectAssignment)
        .join(ClassSection, SectionSubjectAssignment.section_id == ClassSection.id)
        .join(Major, ClassSection.major_id == Major.id)
        .join(Department, Major.department_id == Department.id)
        .options(
            joinedload(SectionSubjectAssignment.section)
            .joinedload(ClassSection.major)
            .joinedload(Major.department)
            .joinedload(Department.college),
            joinedload(SectionSubjectAssignment.subject).joinedload(Subject.major),
            joinedload(SectionSubjectAssignment.teacher),
        )
    )
    if major_id is not None:
        query = query.filter(ClassSection.major_id == major_id)
    if department_id is not None:
        query = query.filter(Major.department_id == department_id)
    if college_id is not None:
        query = query.filter(Department.college_id == college_id)
    if teacher_id is not None:
        query = query.filter(SectionSubjectAssignment.teacher_id == teacher_id)

    rows = query.order_by(SectionSubjectAssignment.updated_at.desc(), SectionSubjectAssignment.id.desc()).all()
    pattern = q.strip().lower() if q else ""
    status_filter = (status or "").strip().lower()
    items: list[dict[str, Any]] = []
    for row in rows:
        serialized = _serialize_class_assignment(row)
        if pattern:
            teacher = serialized["teacher"]
            section = serialized["section"]
            subject_item = serialized["subject"]
            major_name = section.get("major_name") or ""
            haystack = " ".join(
                [
                    section.get("name") or "",
                    section.get("section_code") or "",
                    subject_item.get("name") or "",
                    subject_item.get("code") or "",
                    teacher.get("username") or "",
                    teacher.get("fullname") or "",
                    major_name,
                ]
            ).lower()
            if pattern not in haystack:
                continue

        if status_filter:
            current_status = serialized["status"]
            if status_filter == "needs_setup":
                if current_status == "assigned":
                    continue
            elif current_status != status_filter:
                continue

        items.append(serialized)

    total = len(items)
    return {"total": total, "items": items[skip : skip + limit]}


def create_section(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    major = _ensure_major(db, payload.get("major_id"))

    year_level = int(payload.get("year_level") or 0)
    if year_level <= 0:
        raise HTTPException(status_code=400, detail="year_level is required and must be > 0")

    section_code = _normalize_section_code(payload)
    if not section_code:
        raise HTTPException(status_code=400, detail="section_code is required")

    section_name = f"{major.code}-{year_level}{section_code}"

    duplicate = (
        db.query(ClassSection)
        .filter(
            ClassSection.major_id == major.id,
            ClassSection.year_level == year_level,
            func.upper(ClassSection.section_code) == section_code,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=400, detail=f"Section '{section_name}' already exists.")

    teacher_id = payload.get("teacher_id")
    if teacher_id is not None:
        _ensure_teacher(db, int(teacher_id))

    row = ClassSection(
        name=section_name,
        major_id=major.id,
        year_level=year_level,
        section_code=section_code,
        teacher_id=int(teacher_id) if teacher_id is not None else None,
    )
    db.add(row)
    db.flush()

    subject_ids = payload.get("subject_ids")
    if not subject_ids:
        sid = payload.get("subject_id")
        subject_ids = [int(sid)] if sid is not None else []
    else:
        subject_ids = [int(sid) for sid in subject_ids if sid is not None]

    for subject_id in subject_ids:
        _ensure_subject_for_major(db, subject_id, major.id)
        exists = (
            db.query(SectionSubjectAssignment)
            .filter(SectionSubjectAssignment.section_id == row.id, SectionSubjectAssignment.subject_id == subject_id)
            .first()
        )
        if exists:
            continue
        db.add(
            SectionSubjectAssignment(
                section_id=row.id,
                subject_id=subject_id,
                teacher_id=int(teacher_id) if teacher_id is not None else None,
            )
        )

    db.commit()
    db.refresh(row)
    row = (
        db.query(ClassSection)
        .options(
            joinedload(ClassSection.major).joinedload(Major.department).joinedload(Department.college),
            joinedload(ClassSection.teacher),
            joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.subject),
            joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.teacher),
        )
        .filter(ClassSection.id == row.id)
        .first()
    )
    assignment = row.subject_assignments[0] if row.subject_assignments else None
    return _serialize_section(row, assignment)


def update_section(db: Session, section_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = (
        db.query(ClassSection)
        .options(
            joinedload(ClassSection.major).joinedload(Major.department).joinedload(Department.college),
            joinedload(ClassSection.teacher),
            joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.subject),
            joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.teacher),
        )
        .filter(ClassSection.id == section_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Section not found")

    major_for_name = row.major
    if payload.get("major_id") is not None:
        major_for_name = _ensure_major(db, int(payload["major_id"]))
        for assignment in row.subject_assignments or []:
            if assignment.subject and assignment.subject.major_id != major_for_name.id:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot move section to another major while it has subjects from a different major.",
                )
        row.major_id = major_for_name.id

    if payload.get("year_level") is not None:
        year_level = int(payload["year_level"])
        if year_level <= 0:
            raise HTTPException(status_code=400, detail="year_level must be > 0")
        row.year_level = year_level

    if payload.get("section_code") is not None or payload.get("section_letter") is not None:
        section_code = _normalize_section_code(payload)
        if not section_code:
            raise HTTPException(status_code=400, detail="section_code cannot be empty")
        row.section_code = section_code

    if major_for_name:
        row.name = f"{major_for_name.code}-{row.year_level}{row.section_code}"

    subject_id = payload.get("subject_id")
    if subject_id is not None:
        subject = _ensure_subject_for_major(db, int(subject_id), row.major_id)
        assignment = (
            db.query(SectionSubjectAssignment)
            .filter(
                SectionSubjectAssignment.section_id == row.id,
                SectionSubjectAssignment.subject_id == subject.id,
            )
            .first()
        )
        if not assignment:
            assignment = SectionSubjectAssignment(section_id=row.id, subject_id=subject.id, teacher_id=None)
            db.add(assignment)

    if "teacher_id" in payload:
        teacher_id = payload.get("teacher_id")
        assignment = _resolve_assignment(db, row, int(subject_id) if subject_id is not None else None)
        if teacher_id is None:
            if assignment:
                assignment.teacher_id = None
                db.add(assignment)
            else:
                row.teacher_id = None
        else:
            teacher = _ensure_teacher(db, int(teacher_id))
            if assignment:
                assignment.teacher_id = teacher.id
                db.add(assignment)
            else:
                row.teacher_id = teacher.id

    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Section already exists for this major/year/section code")
    db.refresh(row)
    row = (
        db.query(ClassSection)
        .options(
            joinedload(ClassSection.major).joinedload(Major.department).joinedload(Department.college),
            joinedload(ClassSection.teacher),
            joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.subject),
            joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.teacher),
        )
        .filter(ClassSection.id == section_id)
        .first()
    )
    assignment = _resolve_assignment(db, row, int(subject_id) if subject_id is not None else None)
    return _serialize_section(row, assignment)


def unassign_section_teacher(db: Session, section_id: int, subject_id: Optional[int] = None) -> dict[str, Any]:
    row = (
        db.query(ClassSection)
        .options(
            joinedload(ClassSection.major).joinedload(Major.department).joinedload(Department.college),
            joinedload(ClassSection.teacher),
            joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.subject),
            joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.teacher),
        )
        .filter(ClassSection.id == section_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Section not found")

    assignment = _resolve_assignment(db, row, subject_id)
    if assignment:
        assignment.teacher_id = None
        db.add(assignment)
    else:
        row.teacher_id = None
        db.add(row)

    db.commit()
    db.refresh(row)
    row = (
        db.query(ClassSection)
        .options(
            joinedload(ClassSection.major).joinedload(Major.department).joinedload(Department.college),
            joinedload(ClassSection.teacher),
            joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.subject),
            joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.teacher),
        )
        .filter(ClassSection.id == section_id)
        .first()
    )
    assignment = _resolve_assignment(db, row, subject_id)
    return _serialize_section(row, assignment)


def delete_section(db: Session, section_id: int, actor_user_id: int, confirm_password: str) -> dict[str, Any]:
    verify_admin_password_or_401(db, actor_user_id=actor_user_id, confirm_password=confirm_password)

    row = db.query(ClassSection).filter(ClassSection.id == section_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Section not found")
    sessions_count = db.query(func.count(ClassSession.id)).filter(ClassSession.section_id == section_id).scalar() or 0
    if sessions_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete section with existing sessions")
    db.query(SectionSubjectAssignment).filter(SectionSubjectAssignment.section_id == section_id).delete()
    db.delete(row)
    db.commit()
    return {"message": "Section deleted"}


def create_class(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    section_id = payload.get("section_id")
    section: ClassSection | None = None
    created_section = False

    if section_id is not None:
        section = _ensure_section(db, int(section_id))
    else:
        major = _ensure_major(db, payload.get("major_id"))
        year_level = int(payload.get("year_level") or 0)
        if year_level <= 0:
            raise HTTPException(status_code=400, detail="year_level is required and must be > 0")

        section_code = _normalize_section_code(payload)
        if not section_code:
            raise HTTPException(status_code=400, detail="section_code is required")

        section_name = f"{major.code}-{year_level}{section_code}"
        duplicate = (
            db.query(ClassSection)
            .filter(
                ClassSection.major_id == major.id,
                ClassSection.year_level == year_level,
                func.upper(ClassSection.section_code) == section_code,
            )
            .first()
        )
        if duplicate:
            raise HTTPException(status_code=400, detail=f"Section '{section_name}' already exists.")

        section = ClassSection(
            name=section_name,
            major_id=major.id,
            year_level=year_level,
            section_code=section_code,
            teacher_id=None,
        )
        db.add(section)
        db.flush()
        created_section = True

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    subject_id = payload.get("subject_id")
    if subject_id is not None:
        subject = _ensure_subject_for_major(db, int(subject_id), section.major_id)
    else:
        subject_name = str(payload.get("subject_name") or "").strip()
        if not subject_name:
            raise HTTPException(status_code=400, detail="Provide subject_id or subject_name")
        valid, error = validate_subject_name(subject_name)
        if not valid:
            raise HTTPException(status_code=400, detail=error or "Invalid subject name")

        duplicate_subject = (
            db.query(Subject)
            .filter(Subject.major_id == section.major_id, func.lower(Subject.name) == subject_name.lower())
            .first()
        )
        if duplicate_subject:
            raise HTTPException(status_code=400, detail="Subject already exists in this major. Use subject_id.")

        subject_code = payload.get("subject_code")
        normalized_code = str(subject_code).strip() if isinstance(subject_code, str) and subject_code.strip() else None
        if normalized_code:
            duplicate_code = (
                db.query(Subject)
                .filter(Subject.major_id == section.major_id, Subject.code == normalized_code)
                .first()
            )
            if duplicate_code:
                raise HTTPException(status_code=400, detail="Subject code already exists in this major.")

        subject = Subject(
            major_id=section.major_id,
            name=subject_name,
            code=normalized_code,
        )
        db.add(subject)
        db.flush()

    existing_assignment = (
        db.query(SectionSubjectAssignment)
        .filter(
            SectionSubjectAssignment.section_id == section.id,
            SectionSubjectAssignment.subject_id == subject.id,
        )
        .first()
    )
    if existing_assignment:
        raise HTTPException(status_code=400, detail="This section is already linked to the selected subject.")

    teacher: User | None = None
    teacher_id = payload.get("teacher_id")
    if teacher_id is not None:
        teacher = _ensure_teacher_for_section(db, int(teacher_id), section)

    assignment = SectionSubjectAssignment(
        section_id=section.id,
        subject_id=subject.id,
        teacher_id=teacher.id if teacher else None,
    )
    db.add(assignment)

    try:
        db.commit()
    except Exception:
        db.rollback()
        if created_section:
            # Keep explicit rollback behavior clear when this function creates the section in-process.
            pass
        raise

    assignment = _ensure_class_assignment(db, assignment.id)
    if teacher:
        _notify_teacher_assignment(db, teacher=teacher, section=assignment.section, subject=assignment.subject)
        db.commit()
        assignment = _ensure_class_assignment(db, assignment.id)
    return _serialize_class_assignment(assignment)


def update_class(db: Session, class_assignment_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    assignment = _ensure_class_assignment(db, class_assignment_id)
    section = assignment.section
    if not section:
        raise HTTPException(status_code=400, detail="Class assignment has no linked section.")

    if payload.get("subject_id") is not None:
        next_subject = _ensure_subject_for_major(db, int(payload["subject_id"]), section.major_id)
        duplicate = (
            db.query(SectionSubjectAssignment)
            .filter(
                SectionSubjectAssignment.id != assignment.id,
                SectionSubjectAssignment.section_id == section.id,
                SectionSubjectAssignment.subject_id == next_subject.id,
            )
            .first()
        )
        if duplicate:
            raise HTTPException(status_code=400, detail="Section already linked to this subject.")
        assignment.subject_id = next_subject.id

    teacher_for_notification: User | None = None
    if "teacher_id" in payload:
        teacher_id = payload.get("teacher_id")
        if teacher_id is None:
            assignment.teacher_id = None
        else:
            teacher_for_notification = _ensure_teacher_for_section(db, int(teacher_id), section)
            assignment.teacher_id = teacher_for_notification.id

    db.add(assignment)
    db.commit()
    assignment = _ensure_class_assignment(db, assignment.id)
    if teacher_for_notification:
        _notify_teacher_assignment(
            db,
            teacher=teacher_for_notification,
            section=assignment.section,
            subject=assignment.subject,
        )
        db.commit()
        assignment = _ensure_class_assignment(db, assignment.id)
    return _serialize_class_assignment(assignment)


def delete_class(db: Session, class_assignment_id: int) -> dict[str, Any]:
    assignment = db.query(SectionSubjectAssignment).filter(SectionSubjectAssignment.id == class_assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Class assignment not found")
    db.delete(assignment)
    db.commit()
    return {"message": "Class assignment removed"}


def assign_section_teacher(
    db: Session,
    section_id: int,
    teacher_id: int,
    subject_id: Optional[int] = None,
) -> dict[str, Any]:
    teacher = _ensure_teacher(db, teacher_id)
    section = (
        db.query(ClassSection)
        .options(
            joinedload(ClassSection.major).joinedload(Major.department).joinedload(Department.college),
            joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.subject),
            joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.teacher),
            joinedload(ClassSection.teacher),
        )
        .filter(ClassSection.id == section_id)
        .first()
    )
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    assignment = _resolve_assignment(db, section, subject_id)
    active_subject = assignment.subject if assignment else None
    if subject_id is not None and not assignment:
        subject = _ensure_subject_for_major(db, int(subject_id), section.major_id)
        assignment = SectionSubjectAssignment(section_id=section.id, subject_id=subject.id, teacher_id=teacher.id)
        db.add(assignment)
        active_subject = subject
    elif assignment:
        assignment.teacher_id = teacher.id
        db.add(assignment)
        active_subject = assignment.subject
    else:
        # compatibility fallback for sections without subject assignments
        section.teacher_id = teacher.id
        db.add(section)

    subject_name = active_subject.name if active_subject else "Subject"
    notification_service.create_notification(
        db,
        user_id=teacher.id,
        title="New Class Assignment",
        body=f"You were assigned to {subject_name} - {section.name}.",
        type="CLASS_ASSIGNMENT",
        metadata_json=json.dumps(
            {
                "section_id": section.id,
                "subject_id": active_subject.id if active_subject else None,
                "section_name": section.name,
                "subject_name": subject_name,
            }
        ),
    )
    db.commit()
    db.refresh(section)

    section = (
        db.query(ClassSection)
        .options(
            joinedload(ClassSection.major).joinedload(Major.department).joinedload(Department.college),
            joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.subject),
            joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.teacher),
            joinedload(ClassSection.teacher),
        )
        .filter(ClassSection.id == section_id)
        .first()
    )
    assignment = _resolve_assignment(db, section, subject_id)
    return _serialize_section(section, assignment)

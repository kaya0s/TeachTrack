from datetime import datetime, timedelta
import json
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.logging import get_recent_server_logs
from app.core import security
from app.models.audit import AuditLog
from app.models.classroom import ClassSection, Section, Subject, College, Major
from app.models.session import Alert, AlertHistory, AlertSeverity, BehaviorLog, ClassSession, SessionHistory, SessionMetrics
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services import audit_service
from app.services import detector_service, notification_service

W_ON_TASK = 1.0
W_WRITING = 0.8
W_PHONE = 1.2
W_SLEEPING = 1.5
W_DISENGAGED_POSTURE = 1.0


def _clamp_limit(limit: int) -> int:
    return max(1, min(limit, 200))


def _to_float(value: Any) -> float:
    if value is None:
        return 0.0
    return float(value)


def _get_actor_username(db: Session, actor_user_id: int | None) -> str | None:
    if actor_user_id is None:
        return None
    actor = db.query(User).filter(User.id == actor_user_id).first()
    return _user_display_name(actor) if actor else None


def _user_display_name(user: User | None) -> str:
    if not user:
        return "unknown"
    full_name = (user.fullname or "").strip()
    if full_name:
        return full_name
    return user.username


def _teacher_name_fields(user: User | None) -> tuple[str, str | None]:
    if not user:
        return ("unknown", None)
    return (user.username, _user_display_name(user))


def _generate_unique_username(db: Session, email: str, firstname: str, lastname: str) -> str:
    local_part = email.split("@")[0].strip()
    if local_part:
        base = local_part
    else:
        base = f"{firstname}.{lastname}".strip(".").replace(" ", ".").lower()
    if not base:
        base = "teacher"

    username = base
    suffix = 1
    while UserRepository.get_by_username(db, username):
        username = f"{base}{suffix}"
        suffix += 1
    return username


def _avg_engagement_from_stats(stats_row: tuple, students_present: int) -> float:
    if not stats_row or students_present <= 0:
        return 0.0
    on_task_sum, writing_sum, phone_sum, sleeping_sum, disengaged_sum, log_count = stats_row
    if (log_count or 0) <= 0:
        return 0.0
    raw_total = (
        (W_ON_TASK * _to_float(on_task_sum))
        + (W_WRITING * _to_float(writing_sum))
        - (W_PHONE * _to_float(phone_sum))
        - (W_SLEEPING * _to_float(sleeping_sum))
        - (W_DISENGAGED_POSTURE * _to_float(disengaged_sum))
    )
    return round(max(0.0, min(100.0, (raw_total / (students_present * log_count)) * 100)), 2)


def get_dashboard_data(db: Session) -> dict[str, Any]:
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    total_subjects = db.query(func.count(Subject.id)).scalar() or 0
    total_sections = db.query(func.count(ClassSection.id)).scalar() or 0
    active_sessions_count = db.query(func.count(ClassSession.id)).filter(ClassSession.is_active == True).scalar() or 0
    unread_alerts = db.query(func.count(Alert.id)).filter(Alert.is_read == False).scalar() or 0
    critical_unread_alerts = (
        db.query(func.count(Alert.id))
        .filter(Alert.is_read == False, Alert.severity == AlertSeverity.CRITICAL.value)
        .scalar()
        or 0
    )
    teacher_rows = (
        db.query(User.id)
        .join(ClassSession, ClassSession.teacher_id == User.id)
        .distinct()
        .all()
    )
    total_teachers = len(teacher_rows)

    active_sessions_raw = (
        db.query(ClassSession)
        .options(
            joinedload(ClassSession.subject),
            joinedload(ClassSession.section),
            joinedload(ClassSession.teacher),
        )
        .filter(ClassSession.is_active == True)
        .order_by(ClassSession.start_time.desc())
        .limit(8)
        .all()
    )
    active_session_ids = [row.id for row in active_sessions_raw]

    recent_sessions_raw = (
        db.query(ClassSession)
        .options(
            joinedload(ClassSession.subject),
            joinedload(ClassSession.section),
            joinedload(ClassSession.teacher),
        )
        .order_by(ClassSession.start_time.desc())
        .limit(10)
        .all()
    )
    session_ids = list({*active_session_ids, *[row.id for row in recent_sessions_raw]})
    behavior_rows = {}
    if session_ids:
        stats_rows = (
            db.query(
                BehaviorLog.session_id,
                func.sum(BehaviorLog.on_task),
                func.sum(BehaviorLog.writing),
                func.sum(BehaviorLog.using_phone),
                func.sum(BehaviorLog.sleeping),
                func.sum(BehaviorLog.disengaged_posture),
                func.count(BehaviorLog.id),
            )
            .filter(BehaviorLog.session_id.in_(session_ids))
            .group_by(BehaviorLog.session_id)
            .all()
        )
        behavior_rows = {row[0]: row[1:] for row in stats_rows}

    def _serialize_session(row: ClassSession) -> dict[str, Any]:
        teacher_username, teacher_fullname = _teacher_name_fields(row.teacher)
        return {
            "id": row.id,
            "teacher_id": row.teacher_id,
            "teacher_username": teacher_username,
            "teacher_fullname": teacher_fullname,
            "subject_id": row.subject_id,
            "subject_name": row.subject.name if row.subject else "unknown",
            "section_id": row.section_id,
            "section_name": row.section.name if row.section else "unknown",
            "college_id": row.section.section.major.college_id if row.section and row.section.section and row.section.section.major else None,
            "college_name": row.section.section.major.college.name if row.section and row.section.section and row.section.section.major and row.section.section.major.college else None,
            "major_id": row.section.section.major_id if row.section and row.section.section else None,
            "major_name": row.section.section.major.name if row.section and row.section.section and row.section.section.major else None,
            "students_present": row.students_present,
            "start_time": row.start_time,
            "end_time": row.end_time,
            "is_active": row.is_active,
            "teacher_profile_picture_url": row.teacher.profile_picture_url if row.teacher else None,
            "average_engagement": _avg_engagement_from_stats(
                behavior_rows.get(row.id),
                row.students_present,
            ),
        }

    active_sessions = [_serialize_session(row) for row in active_sessions_raw]
    recent_sessions = [_serialize_session(row) for row in recent_sessions_raw]

    recent_alerts_raw = (
        db.query(Alert, ClassSession, User)
        .join(ClassSession, Alert.session_id == ClassSession.id)
        .join(User, User.id == ClassSession.teacher_id)
        .order_by(Alert.triggered_at.desc())
        .limit(10)
        .all()
    )
    recent_alerts = []
    for alert, _, teacher in recent_alerts_raw:
        teacher_username, teacher_fullname = _teacher_name_fields(teacher)
        recent_alerts.append(
            {
                "id": alert.id,
                "session_id": alert.session_id,
                "teacher_id": teacher.id if teacher else -1,
                "teacher_username": teacher_username,
                "teacher_fullname": teacher_fullname,
                "alert_type": alert.alert_type,
                "message": alert.message,
                "severity": alert.severity,
                "is_read": alert.is_read,
                "triggered_at": alert.triggered_at,
                "updated_at": alert.updated_at,
            }
        )

    return {
        "stats": {
            "total_users": total_users,
            "active_users": active_users,
            "total_teachers": total_teachers,
            "total_subjects": total_subjects,
            "total_sections": total_sections,
            "active_sessions": active_sessions_count,
            "unread_alerts": unread_alerts,
            "critical_unread_alerts": critical_unread_alerts,
        },
        "active_sessions": active_sessions,
        "recent_sessions": recent_sessions,
        "recent_alerts": recent_alerts,
    }


def list_users(
    db: Session,
    skip: int = 0,
    limit: int = 25,
    q: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_superuser: Optional[bool] = None,
) -> dict[str, Any]:
    query = db.query(User)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(
            (User.username.like(pattern))
            | (User.email.like(pattern))
            | (User.fullname.like(pattern))
            | (User.firstname.like(pattern))
            | (User.lastname.like(pattern))
        )
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if is_superuser is not None:
        query = query.filter(User.is_superuser == is_superuser)

    total = query.count()
    items = (
        query.order_by(User.id.desc())
        .offset(max(0, skip))
        .limit(_clamp_limit(limit))
        .all()
    )
    return {"total": total, "items": items}


def list_teachers(
    db: Session,
    skip: int = 0,
    limit: int = 25,
    q: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> dict[str, Any]:
    query = db.query(User).filter(User.is_superuser == False)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(
            (User.username.like(pattern))
            | (User.email.like(pattern))
            | (User.fullname.like(pattern))
            | (User.firstname.like(pattern))
            | (User.lastname.like(pattern))
        )
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    total = query.count()
    items = (
        query.order_by(User.id.desc())
        .offset(max(0, skip))
        .limit(_clamp_limit(limit))
        .all()
    )
    return {"total": total, "items": items}


def create_teacher(db: Session, payload: dict[str, Any], actor_user_id: int) -> User:
    firstname = str(payload.get("firstname") or "").strip()
    lastname = str(payload.get("lastname") or "").strip()
    age = payload.get("age")
    email = str(payload.get("email") or "").strip().lower()
    password = str(payload.get("password") or "")

    if not firstname or not lastname:
        raise HTTPException(status_code=400, detail="First name and last name are required.")
    if age is None or int(age) < 1 or int(age) > 120:
        raise HTTPException(status_code=400, detail="Age must be between 1 and 120.")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")

    if UserRepository.get_by_email(db, email):
        raise HTTPException(status_code=400, detail="Email is already in use.")

    username = _generate_unique_username(db, email, firstname, lastname)
    teacher = User(
        firstname=firstname,
        lastname=lastname,
        age=int(age),
        email=email,
        username=username,
        hashed_password=security.get_password_hash(password),
        role="teacher",
        is_active=True,
        is_superuser=False,
    )
    db.add(teacher)
    db.flush()

    audit_service.write_audit_log(
        db,
        actor_user_id=actor_user_id,
        actor_username=_get_actor_username(db, actor_user_id),
        action="TEACHER_CREATE",
        entity_type="User",
        entity_id=teacher.id,
        details={
            "email": teacher.email,
            "username": teacher.username,
            "fullname": teacher.fullname,
        },
    )
    db.commit()
    db.refresh(teacher)
    return teacher


def list_subjects(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    q: Optional[str] = None,
) -> dict[str, Any]:
    query = (
        db.query(Subject)
        .options(joinedload(Subject.teacher), joinedload(Subject.sections), joinedload(Subject.college))
    )
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter((Subject.name.like(pattern)) | (Subject.code.like(pattern)))

    total = query.count()
    rows = (
        query.order_by(Subject.created_at.desc(), Subject.id.desc())
        .offset(max(0, skip))
        .limit(_clamp_limit(limit))
        .all()
    )
    items = [
        {
            "id": row.id,
            "name": row.name,
            "code": row.code,
            "description": row.description,
            "cover_image_url": row.cover_image_url,
            "teacher_id": row.teacher_id,
            "teacher_username": row.teacher.username if row.teacher else "unassigned",
            "teacher_fullname": _user_display_name(row.teacher) if row.teacher else None,
            "teacher_profile_picture_url": row.teacher.profile_picture_url if row.teacher else None,
            "sections_count": len(row.sections or []),
            "section_names": row.section_names,
            "college_id": row.college_id,
            "college_name": row.college.name if row.college else None,
            "created_at": row.created_at,
        }
        for row in rows
    ]
    return {"total": total, "items": items}


def list_colleges(db: Session, skip: int = 0, limit: int = 100, q: Optional[str] = None):
    query = db.query(College)
    if q:
        query = query.filter(College.name.ilike(f"%{q}%"))
    total = query.count()
    items = query.order_by(College.name.asc()).offset(skip).limit(_clamp_limit(limit)).all()
    return {"total": total, "items": items}


def list_majors(db: Session, college_id: Optional[int] = None, skip: int = 0, limit: int = 100, q: Optional[str] = None):
    query = db.query(Major)
    if college_id:
        query = query.filter(Major.college_id == college_id)
    if q:
        query = query.filter(Major.name.ilike(f"%{q}%"))
    total = query.count()
    items = query.order_by(Major.name.asc()).offset(skip).limit(_clamp_limit(limit)).all()
    return {"total": total, "items": items}


def _serialize_subject(row: Subject) -> dict[str, Any]:
    return {
        "id": row.id,
        "name": row.name,
        "code": row.code,
        "description": row.description,
        "cover_image_url": row.cover_image_url,
        "teacher_id": row.teacher_id,
        "teacher_username": row.teacher.username if row.teacher else "unassigned",
        "teacher_fullname": _user_display_name(row.teacher) if row.teacher else None,
        "teacher_profile_picture_url": row.teacher.profile_picture_url if row.teacher else None,
        "sections_count": len(row.sections or []),
        "section_names": row.section_names,
        "college_id": row.college_id,
        "college_name": row.college.name if row.college else None,
        "created_at": row.created_at,
    }


def create_subject(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Subject name is required")
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
    row = db.query(Subject).options(joinedload(Subject.teacher), joinedload(Subject.sections), joinedload(Subject.college)).filter(Subject.id == row.id).first()
    return _serialize_subject(row)


def update_subject(db: Session, subject_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = db.query(Subject).options(joinedload(Subject.teacher), joinedload(Subject.sections), joinedload(Subject.college)).filter(Subject.id == subject_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Subject not found")

    if payload.get("name") is not None:
        name = str(payload["name"]).strip()
        if not name:
            raise HTTPException(status_code=400, detail="Subject name cannot be empty")
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
    if "teacher_id" in payload:
        teacher_id = payload.get("teacher_id")
        if teacher_id is None:
            row.teacher_id = None
        else:
            teacher = _ensure_teacher(db, int(teacher_id))
            row.teacher_id = teacher.id

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

    row = db.query(Subject).options(joinedload(Subject.teacher), joinedload(Subject.sections), joinedload(Subject.college)).filter(Subject.id == subject_id).first()
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


def list_sections(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    q: Optional[str] = None,
    college_id: Optional[int] = None,
    major_id: Optional[int] = None,
) -> dict[str, Any]:
    query = (
        db.query(ClassSection)
        .join(Section, ClassSection.section_id == Section.id)
        .options(joinedload(ClassSection.subject), joinedload(ClassSection.teacher), joinedload(ClassSection.section))
    )
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(Section.name.like(pattern))

    if major_id:
        query = query.filter(Section.major_id == major_id)
    if college_id:
        query = query.join(Major, Section.major_id == Major.id).filter(Major.college_id == college_id)

    total = query.count()
    rows = (
        query.order_by(ClassSection.created_at.desc(), ClassSection.id.desc())
        .offset(max(0, skip))
        .limit(_clamp_limit(limit))
        .all()
    )
    items = [
        {
            "id": row.id,
            "name": row.section.name if row.section else "unknown",
            "subject_id": row.subject_id,
            "subject_name": row.subject.name if row.subject else "unassigned",
            "teacher_id": row.teacher_id,
            "teacher_username": row.teacher.username if row.teacher else "unassigned",
            "teacher_fullname": _user_display_name(row.teacher) if row.teacher else None,
            "teacher_profile_picture_url": row.teacher.profile_picture_url if row.teacher else None,
            "created_at": row.created_at,
        }
        for row in rows
    ]
    return {"total": total, "items": items}


def _serialize_section(row: ClassSection) -> dict[str, Any]:
    return {
        "id": row.id,
        "name": row.section.name if row.section else "unknown",
        "subject_id": row.subject_id,
        "subject_name": row.subject.name if row.subject else "unassigned",
        "teacher_id": row.teacher_id,
        "teacher_username": row.teacher.username if row.teacher else "unassigned",
        "teacher_fullname": _user_display_name(row.teacher) if row.teacher else None,
        "teacher_profile_picture_url": row.teacher.profile_picture_url if row.teacher else None,
        "created_at": row.created_at,
    }


def list_section_pool(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None,
) -> dict[str, Any]:
    query = db.query(Section).options(
        joinedload(Section.class_assignments).joinedload(ClassSection.subject)
    )
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(Section.name.like(pattern))

    total = query.count()
    rows = (
        query.order_by(Section.name.asc())
        .offset(max(0, skip))
        .limit(_clamp_limit(limit))
        .all()
    )
    items = [
        {
            "id": row.id,
            "name": row.name,
            "subjects_count": len(row.class_assignments),
            "subject_names": [ca.subject.name for ca in row.class_assignments if ca.subject],
            "major_id": row.major_id,
            "year_level": row.year_level,
            "section_letter": row.section_letter,
            "created_at": row.created_at,
        }
        for row in rows
    ]
    return {"total": total, "items": items}


def create_section(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    print(f"DEBUG: create_section called with payload: {payload}")
    
    # Support both single subject_id and list of subject_ids
    subject_ids = payload.get("subject_ids")
    if not subject_ids:
        sid = payload.get("subject_id")
        subject_ids = [int(sid)] if sid is not None else []
        
    print(f"DEBUG: processed subject_ids: {subject_ids}")

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

    # Find or create standalone section
    section = db.query(Section).filter(Section.name == section_name).first()
    if not section:
        section = Section(
            name=section_name,
            major_id=major_id,
            year_level=year_level,
            section_letter=section_letter
        )
        db.add(section)
        db.flush()
    else:
        # Update existing section's hierarchy if not set
        if major_id: section.major_id = major_id
        if year_level: section.year_level = year_level
        if section_letter: section.section_letter = section_letter
        db.add(section)
        db.flush()

    # If no subjects provided, just return the section without assignments
    if not subject_ids:
        print("DEBUG: No subjects provided, returning standalone section")
        db.commit()
        db.refresh(section)
        # Return a serialized version of the section without subject assignments
        return {
            "id": section.id,
            "section_id": section.id,
            "section_name": section.name,
            "subject_id": None,
            "subject_name": None,
            "teacher_id": None,
            "teacher_username": None,
            "teacher_fullname": None,
            "major_id": section.major_id,
            "year_level": section.year_level,
            "section_letter": section.section_letter,
            "created_at": section.created_at.isoformat() if section.created_at else None,
            "updated_at": section.updated_at.isoformat() if section.updated_at else None,
        }

    last_created = None
    for sub_id in subject_ids:
        subject = db.query(Subject).filter(Subject.id == sub_id).first()
        if not subject:
            continue # Skip invalid subjects or raise error
            
        # Check if already exists in this subject
        exists = db.query(ClassSection).filter(
            ClassSection.subject_id == sub_id, 
            ClassSection.section_id == section.id
        ).first()
        
        if exists:
            last_created = exists
            continue
            
        row = ClassSection(
            section_id=section.id,
            subject_id=sub_id,
            teacher_id=int(teacher_id) if teacher_id is not None else subject.teacher_id,
        )
        db.add(row)
        last_created = row

    db.commit()
    if not last_created:
        raise HTTPException(status_code=400, detail="Could not create any section assignments")
        
    db.refresh(last_created)
    # Reload with relations
    res = db.query(ClassSection).options(
        joinedload(ClassSection.subject), 
        joinedload(ClassSection.teacher), 
        joinedload(ClassSection.section)
    ).filter(ClassSection.id == last_created.id).first()
    
    return _serialize_section(res)


def update_section(db: Session, section_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = db.query(ClassSection).options(joinedload(ClassSection.subject), joinedload(ClassSection.teacher), joinedload(ClassSection.section)).filter(ClassSection.id == section_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Section not found")

    if payload.get("name") is not None:
        name = str(payload["name"]).strip()
        if not name:
            raise HTTPException(status_code=400, detail="Section name cannot be empty")
        # Find or create new section pool item
        section = db.query(Section).filter(Section.name == name).first()
        if not section:
            section = Section(name=name)
            db.add(section)
            db.flush()
        row.section_id = section.id

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
    row = db.query(ClassSection).options(joinedload(ClassSection.subject), joinedload(ClassSection.teacher), joinedload(ClassSection.section)).filter(ClassSection.id == section_id).first()
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
    row = db.query(ClassSection).options(joinedload(ClassSection.subject), joinedload(ClassSection.teacher), joinedload(ClassSection.section)).filter(ClassSection.id == section_id).first()
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

    # Find or create standalone section
    section = db.query(Section).filter(Section.name == section_name).first()
    if not section:
        section = Section(
            name=section_name,
            major_id=major_id,
            year_level=year_level,
            section_letter=section_letter
        )
        db.add(section)
        db.flush()
    else:
        # Update existing section's hierarchy if not set
        if major_id: section.major_id = major_id
        if year_level: section.year_level = year_level
        if section_letter: section.section_letter = section_letter
        db.add(section)
        db.flush()

    # Check if this subject already has this section
    exists = db.query(ClassSection).filter(ClassSection.subject_id == subject.id, ClassSection.section_id == section.id).first()
    if exists:
        return _serialize_section(exists) # Already exists, just return it

    row = ClassSection(
        section_id=section.id,
        subject_id=subject.id,
        teacher_id=subject.teacher_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row = db.query(ClassSection).options(joinedload(ClassSection.subject), joinedload(ClassSection.teacher), joinedload(ClassSection.section)).filter(ClassSection.id == row.id).first()
    return _serialize_section(row)


def _ensure_teacher(db: Session, teacher_id: int) -> User:
    teacher = (
        db.query(User)
        .filter(User.id == teacher_id, User.is_superuser == False)
        .first()
    )
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return teacher


def assign_subject_teacher(db: Session, subject_id: int, teacher_id: int) -> dict[str, Any]:
    teacher = _ensure_teacher(db, teacher_id)
    subject = (
        db.query(Subject)
        .options(joinedload(Subject.sections))
        .filter(Subject.id == subject_id)
        .first()
    )
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    subject.teacher_id = teacher.id
    db.add(subject)
    notification_service.create_notification(
        db,
        user_id=teacher.id,
        title="New Subject Assignment",
        body=f"You were assigned as the teacher for {subject.name}.",
        type="SUBJECT_ASSIGNMENT",
        metadata_json=json.dumps(
            {
                "subject_id": subject.id,
                "subject_name": subject.name,
            }
        ),
    )
    db.commit()
    db.refresh(subject)

    return {
        "id": subject.id,
        "name": subject.name,
        "code": subject.code,
        "description": subject.description,
        "cover_image_url": subject.cover_image_url,
        "teacher_id": teacher.id,
        "teacher_username": teacher.username,
        "teacher_fullname": _user_display_name(teacher),
        "teacher_profile_picture_url": teacher.profile_picture_url,
        "sections_count": len(subject.sections or []),
        "created_at": subject.created_at,
    }


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
        "teacher_fullname": _user_display_name(teacher),
        "teacher_profile_picture_url": teacher.profile_picture_url,
        "created_at": section.created_at,
    }


def update_user(db: Session, user_id: int, payload: dict[str, Any], actor_user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    before = {
        "email": user.email,
        "username": user.username,
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
    }

    new_email = payload.get("email")
    new_username = payload.get("username")
    new_is_active = payload.get("is_active")
    new_is_superuser = payload.get("is_superuser")

    if new_email and new_email != user.email:
        exists = db.query(User).filter(User.email == new_email, User.id != user.id).first()
        if exists:
            raise HTTPException(status_code=400, detail="Email is already in use.")
        user.email = new_email
    if new_username and new_username != user.username:
        exists = db.query(User).filter(User.username == new_username, User.id != user.id).first()
        if exists:
            raise HTTPException(status_code=400, detail="Username is already in use.")
        user.username = new_username
    if new_is_active is not None:
        user.is_active = new_is_active
    if new_is_superuser is not None:
        user.is_superuser = new_is_superuser
        user.role = "admin" if new_is_superuser else "teacher"

    db.add(user)
    audit_service.write_audit_log(
        db,
        actor_user_id=actor_user_id,
        actor_username=_get_actor_username(db, actor_user_id),
        action="USER_UPDATE",
        entity_type="User",
        entity_id=user.id,
        details={
            "before": before,
            "after": {
                "email": user.email,
                "username": user.username,
                "is_active": user.is_active,
                "is_superuser": user.is_superuser,
            },
        },
    )
    db.commit()
    db.refresh(user)
    return user


def admin_reset_user_password(db: Session, user_id: int, new_password: str, actor_user_id: int) -> None:
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = security.get_password_hash(new_password)
    user.reset_code = None
    user.reset_code_expires = None
    db.add(user)
    audit_service.write_audit_log(
        db,
        actor_user_id=actor_user_id,
        actor_username=_get_actor_username(db, actor_user_id),
        action="USER_PASSWORD_RESET",
        entity_type="User",
        entity_id=user.id,
        details={"username": user.username},
    )
    db.commit()


def list_sessions(
    db: Session,
    skip: int = 0,
    limit: int = 25,
    is_active: Optional[bool] = None,
    teacher_id: Optional[int] = None,
    college_id: Optional[int] = None,
    major_id: Optional[int] = None,
) -> dict[str, Any]:
    query = db.query(ClassSession).options(
        joinedload(ClassSession.teacher),
        joinedload(ClassSession.subject),
        joinedload(ClassSession.section),
    )
    if is_active is not None:
        query = query.filter(ClassSession.is_active == is_active)
    if teacher_id is not None:
        query = query.filter(ClassSession.teacher_id == teacher_id)
    
    if college_id or major_id:
        # We need to join through ClassSection to get to Section
        query = query.join(ClassSection, ClassSession.section_id == ClassSection.id).join(Section, ClassSection.section_id == Section.id)
        if major_id:
            query = query.filter(Section.major_id == major_id)
        if college_id:
            query = query.join(Major, Section.major_id == Major.id).filter(Major.college_id == college_id)

    total = query.count()
    rows = (
        query.order_by(ClassSession.start_time.desc())
        .offset(max(0, skip))
        .limit(_clamp_limit(limit))
        .all()
    )
    session_ids = [r.id for r in rows]
    behavior_map = {}
    if session_ids:
        behavior_rows = (
            db.query(
                BehaviorLog.session_id,
                func.sum(BehaviorLog.on_task),
                func.sum(BehaviorLog.writing),
                func.sum(BehaviorLog.using_phone),
                func.sum(BehaviorLog.sleeping),
                func.sum(BehaviorLog.disengaged_posture),
                func.count(BehaviorLog.id),
            )
            .filter(BehaviorLog.session_id.in_(session_ids))
            .group_by(BehaviorLog.session_id)
            .all()
        )
        behavior_map = {row[0]: row[1:] for row in behavior_rows}

    items = []
    for row in rows:
        teacher_username, teacher_fullname = _teacher_name_fields(row.teacher)
        items.append(
            {
                "id": row.id,
                "teacher_id": row.teacher_id,
                "teacher_username": teacher_username,
                "teacher_fullname": teacher_fullname,
                "subject_id": row.subject_id,
                "subject_name": row.subject.name if row.subject else "unknown",
                "section_id": row.section_id,
                "section_name": row.section.name if row.section else "unknown",
                "college_id": row.section.section.major.college_id if row.section and row.section.section and row.section.section.major else None,
                "college_name": row.section.section.major.college.name if row.section and row.section.section and row.section.section.major and row.section.section.major.college else None,
                "major_id": row.section.section.major_id if row.section and row.section.section else None,
                "major_name": row.section.section.major.name if row.section and row.section.section and row.section.section.major else None,
                "students_present": row.students_present,
                "start_time": row.start_time,
                "end_time": row.end_time,
                "is_active": row.is_active,
                "teacher_profile_picture_url": row.teacher.profile_picture_url if row.teacher else None,
                "average_engagement": _avg_engagement_from_stats(
                    behavior_map.get(row.id), row.students_present
                ),
            }
        )
    return {"total": total, "items": items}


def force_stop_session(db: Session, session_id: int, actor_user_id: int) -> ClassSession:
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session.is_active:
        return session

    prev_end_time = session.end_time
    session.is_active = False
    session.end_time = datetime.now()
    db.add(
        SessionHistory(
            session_id=session.id,
            changed_by=actor_user_id,
            change_type="ADMIN_FORCE_END",
            prev_start_time=session.start_time,
            prev_end_time=prev_end_time,
            prev_is_active=True,
        )
    )
    db.add(session)
    audit_service.write_audit_log(
        db,
        actor_user_id=actor_user_id,
        actor_username=_get_actor_username(db, actor_user_id),
        action="SESSION_FORCE_STOP",
        entity_type="ClassSession",
        entity_id=session.id,
        details={
            "teacher_id": session.teacher_id,
            "section_id": session.section_id,
            "subject_id": session.subject_id,
            "prev_end_time": prev_end_time.isoformat() if isinstance(prev_end_time, datetime) else None,
        },
    )
    db.commit()
    db.refresh(session)
    return session


def get_session_detail(
    db: Session,
    session_id: int,
    minutes: int = 120,
    logs_limit: int = 120,
) -> dict[str, Any]:
    session = (
        db.query(ClassSession)
        .options(
            joinedload(ClassSession.teacher),
            joinedload(ClassSession.subject),
            joinedload(ClassSession.section),
        )
        .filter(ClassSession.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    stats_row = (
        db.query(
            func.sum(BehaviorLog.on_task),
            func.sum(BehaviorLog.writing),
            func.sum(BehaviorLog.using_phone),
            func.sum(BehaviorLog.sleeping),
            func.sum(BehaviorLog.disengaged_posture),
            func.count(BehaviorLog.id),
        )
        .filter(BehaviorLog.session_id == session_id)
        .first()
    )
    summary = {
        "id": session.id,
        "teacher_id": session.teacher_id,
        "teacher_username": _teacher_name_fields(session.teacher)[0],
        "teacher_fullname": _teacher_name_fields(session.teacher)[1],
        "subject_id": session.subject_id,
        "subject_name": session.subject.name if session.subject else "unknown",
        "section_id": session.section_id,
        "section_name": session.section.name if session.section else "unknown",
        "students_present": session.students_present,
        "start_time": session.start_time,
        "end_time": session.end_time,
        "is_active": session.is_active,
        "teacher_profile_picture_url": session.teacher.profile_picture_url if session.teacher else None,
        "average_engagement": _avg_engagement_from_stats(stats_row, session.students_present),
    }

    logs = (
        db.query(BehaviorLog)
        .filter(BehaviorLog.session_id == session_id)
        .order_by(BehaviorLog.timestamp.desc())
        .limit(max(10, min(logs_limit, 500)))
        .all()
    )
    logs.reverse()
    logs_points = [
        {
            "timestamp": row.timestamp,
            "on_task": row.on_task,
            "sleeping": row.sleeping,
            "writing": row.writing,
            "using_phone": row.using_phone,
            "disengaged_posture": row.disengaged_posture,
            "not_visible": row.not_visible,
            "total_detected": row.total_detected,
        }
        for row in logs
    ]

    # For ended sessions, use the session end timestamp as the anchor so
    # historical sessions still return chartable metrics data.
    anchor_time = session.end_time or datetime.now()
    if isinstance(anchor_time, str):
        try:
            anchor_time = datetime.fromisoformat(anchor_time)
        except ValueError:
            anchor_time = datetime.now()
    if not isinstance(anchor_time, datetime):
        anchor_time = datetime.now()
    cutoff = anchor_time - timedelta(minutes=max(5, min(minutes, 24 * 60)))
    metrics_rows = (
        db.query(SessionMetrics)
        .filter(
            SessionMetrics.session_id == session_id,
            SessionMetrics.window_start >= cutoff,
        )
        .order_by(SessionMetrics.window_start.asc())
        .all()
    )
    metrics_rollup = [
        {
            "window_start": row.window_start,
            "window_end": row.window_end,
            "on_task_avg": float(row.on_task_avg),
            "phone_avg": float(row.phone_avg),
            "sleeping_avg": float(row.sleeping_avg),
            "writing_avg": float(row.writing_avg),
            "disengaged_posture_avg": float(row.disengaged_posture_avg),
            "not_visible_avg": float(row.not_visible_avg),
            "engagement_score": float(row.engagement_score),
        }
        for row in metrics_rows
    ]

    total_logs = db.query(func.count(BehaviorLog.id)).filter(BehaviorLog.session_id == session_id).scalar() or 0
    total_alerts = db.query(func.count(Alert.id)).filter(Alert.session_id == session_id).scalar() or 0
    unread_alerts = (
        db.query(func.count(Alert.id))
        .filter(Alert.session_id == session_id, Alert.is_read == False)
        .scalar()
        or 0
    )

    return {
        "session": summary,
        "total_logs": total_logs,
        "total_alerts": total_alerts,
        "unread_alerts": unread_alerts,
        "logs": logs_points,
        "metrics_rollup": metrics_rollup,
    }


def list_alerts(
    db: Session,
    skip: int = 0,
    limit: int = 25,
    is_read: Optional[bool] = None,
    severity: Optional[str] = None,
    session_id: Optional[int] = None,
) -> dict[str, Any]:
    query = (
        db.query(Alert, ClassSession, User)
        .join(ClassSession, Alert.session_id == ClassSession.id)
        .join(User, User.id == ClassSession.teacher_id)
    )
    if is_read is not None:
        query = query.filter(Alert.is_read == is_read)
    if severity:
        query = query.filter(Alert.severity == severity)
    if session_id is not None:
        query = query.filter(Alert.session_id == session_id)

    total = query.count()
    rows = (
        query.order_by(Alert.triggered_at.desc())
        .offset(max(0, skip))
        .limit(_clamp_limit(limit))
        .all()
    )
    items = []
    for alert, session, teacher in rows:
        teacher_username, teacher_fullname = _teacher_name_fields(teacher)
        items.append(
            {
                "id": alert.id,
                "session_id": alert.session_id,
                "teacher_id": teacher.id,
                "teacher_username": teacher_username,
                "teacher_fullname": teacher_fullname,
                "alert_type": alert.alert_type,
                "message": alert.message,
                "severity": alert.severity,
                "is_read": alert.is_read,
                "triggered_at": alert.triggered_at,
                "updated_at": alert.updated_at,
            }
        )
    return {"total": total, "items": items}


def mark_alert_read(db: Session, alert_id: int, actor_user_id: int) -> Alert:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.is_read:
        return alert

    db.add(
        AlertHistory(
            alert_id=alert.id,
            changed_by=actor_user_id,
            change_type="ADMIN_READ",
            prev_is_read=alert.is_read,
            prev_severity=alert.severity,
            prev_message=alert.message,
        )
    )
    alert.is_read = True
    db.add(alert)
    audit_service.write_audit_log(
        db,
        actor_user_id=actor_user_id,
        actor_username=_get_actor_username(db, actor_user_id),
        action="ALERT_MARK_READ",
        entity_type="Alert",
        entity_id=alert.id,
        details={"session_id": alert.session_id, "alert_type": alert.alert_type, "severity": alert.severity},
    )
    db.commit()
    db.refresh(alert)
    return alert


def list_models() -> dict[str, Any]:
    return detector_service.build_model_selection_response()


def select_model(db: Session, file_name: str, actor_user_id: int) -> dict[str, Any]:
    try:
        response = detector_service.select_model_file(file_name)
        audit_service.write_audit_log(
            db,
            actor_user_id=actor_user_id,
            actor_username=_get_actor_username(db, actor_user_id),
            action="MODEL_SELECT",
            entity_type="Model",
            entity_id=file_name,
            details={"selected_model_file": file_name, "current_model_file": response.get("current_model_file")},
        )
        db.commit()
        return response
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


def list_audit_logs(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    action: str | None = None,
    entity_type: str | None = None,
    actor_user_id: int | None = None,
    entity_id: str | None = None,
) -> dict[str, Any]:
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if actor_user_id is not None:
        query = query.filter(AuditLog.actor_user_id == actor_user_id)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)

    total = query.count()
    items = (
        query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset(max(0, skip))
        .limit(_clamp_limit(limit))
        .all()
    )
    return {"total": total, "items": items}


def list_server_logs(limit: int = 120) -> dict[str, Any]:
    if not settings.ENABLE_ADMIN_LOG_STREAM:
        return {"total": 0, "items": []}
    items = get_recent_server_logs(limit=limit)
    return {"total": len(items), "items": items}

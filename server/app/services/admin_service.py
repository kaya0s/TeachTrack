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
from app.models.classroom import ClassSection, Subject
from app.models.session import Alert, AlertHistory, AlertSeverity, BehaviorLog, ClassSession, SessionHistory, SessionMetrics
from app.models.user import User
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
        return {
            "id": row.id,
            "teacher_id": row.teacher_id,
            "teacher_username": row.teacher.username if row.teacher else "unknown",
            "subject_id": row.subject_id,
            "subject_name": row.subject.name if row.subject else "unknown",
            "section_id": row.section_id,
            "section_name": row.section.name if row.section else "unknown",
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
        recent_alerts.append(
            {
                "id": alert.id,
                "session_id": alert.session_id,
                "teacher_id": teacher.id if teacher else -1,
                "teacher_username": teacher.username if teacher else "unknown",
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
        query = query.filter((User.username.like(pattern)) | (User.email.like(pattern)))
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
        query = query.filter((User.username.like(pattern)) | (User.email.like(pattern)))
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


def list_subjects(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    q: Optional[str] = None,
) -> dict[str, Any]:
    query = (
        db.query(Subject)
        .options(joinedload(Subject.teacher), joinedload(Subject.sections))
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
            "teacher_profile_picture_url": row.teacher.profile_picture_url if row.teacher else None,
            "sections_count": len(row.sections or []),
            "created_at": row.created_at,
        }
        for row in rows
    ]
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
        "teacher_profile_picture_url": row.teacher.profile_picture_url if row.teacher else None,
        "sections_count": len(row.sections or []),
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
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row = db.query(Subject).options(joinedload(Subject.teacher), joinedload(Subject.sections)).filter(Subject.id == row.id).first()
    return _serialize_subject(row)


def update_subject(db: Session, subject_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = db.query(Subject).options(joinedload(Subject.teacher), joinedload(Subject.sections)).filter(Subject.id == subject_id).first()
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
    if payload.get("teacher_id") is not None:
        teacher = _ensure_teacher(db, int(payload["teacher_id"]))
        row.teacher_id = teacher.id

    try:
        db.add(row)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Subject name or code already exists")
    db.refresh(row)
    row = db.query(Subject).options(joinedload(Subject.teacher), joinedload(Subject.sections)).filter(Subject.id == subject_id).first()
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
) -> dict[str, Any]:
    query = (
        db.query(ClassSection)
        .options(joinedload(ClassSection.subject), joinedload(ClassSection.teacher))
    )
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(ClassSection.name.like(pattern))

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
            "name": row.name,
            "subject_id": row.subject_id,
            "subject_name": row.subject.name if row.subject else "unassigned",
            "teacher_id": row.teacher_id,
            "teacher_username": row.teacher.username if row.teacher else "unassigned",
            "teacher_profile_picture_url": row.teacher.profile_picture_url if row.teacher else None,
            "created_at": row.created_at,
        }
        for row in rows
    ]
    return {"total": total, "items": items}


def _serialize_section(row: ClassSection) -> dict[str, Any]:
    return {
        "id": row.id,
        "name": row.name,
        "subject_id": row.subject_id,
        "subject_name": row.subject.name if row.subject else "unassigned",
        "teacher_id": row.teacher_id,
        "teacher_username": row.teacher.username if row.teacher else "unassigned",
        "teacher_profile_picture_url": row.teacher.profile_picture_url if row.teacher else None,
        "created_at": row.created_at,
    }


def create_section(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    subject_id = int(payload.get("subject_id"))
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    teacher_id = payload.get("teacher_id")
    if teacher_id is not None:
        _ensure_teacher(db, int(teacher_id))

    row = ClassSection(
        name=str(payload.get("name") or "").strip(),
        subject_id=subject_id,
        teacher_id=int(teacher_id) if teacher_id is not None else subject.teacher_id,
    )
    if not row.name:
        raise HTTPException(status_code=400, detail="Section name is required")
    db.add(row)
    db.commit()
    db.refresh(row)
    row = db.query(ClassSection).options(joinedload(ClassSection.subject), joinedload(ClassSection.teacher)).filter(ClassSection.id == row.id).first()
    return _serialize_section(row)


def update_section(db: Session, section_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = db.query(ClassSection).options(joinedload(ClassSection.subject), joinedload(ClassSection.teacher)).filter(ClassSection.id == section_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Section not found")

    if payload.get("name") is not None:
        name = str(payload["name"]).strip()
        if not name:
            raise HTTPException(status_code=400, detail="Section name cannot be empty")
        row.name = name
    if payload.get("subject_id") is not None:
        subject_id = int(payload["subject_id"])
        subject = db.query(Subject).filter(Subject.id == subject_id).first()
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        row.subject_id = subject_id
    if payload.get("teacher_id") is not None:
        teacher = _ensure_teacher(db, int(payload["teacher_id"]))
        row.teacher_id = teacher.id

    db.add(row)
    db.commit()
    db.refresh(row)
    row = db.query(ClassSection).options(joinedload(ClassSection.subject), joinedload(ClassSection.teacher)).filter(ClassSection.id == section_id).first()
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

    section_name = str(payload.get("section_name") or "").strip()
    if not section_name:
        raise HTTPException(status_code=400, detail="Section name is required")

    row = ClassSection(
        name=section_name,
        subject_id=subject.id,
        teacher_id=subject.teacher_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row = db.query(ClassSection).options(joinedload(ClassSection.subject), joinedload(ClassSection.teacher)).filter(ClassSection.id == row.id).first()
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
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    subject.teacher_id = teacher.id
    db.add(subject)
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
        "teacher_profile_picture_url": teacher.profile_picture_url,
        "created_at": section.created_at,
    }


def update_user(db: Session, user_id: int, payload: dict[str, Any], actor_user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

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

    db.add(user)
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
    db.commit()


def list_sessions(
    db: Session,
    skip: int = 0,
    limit: int = 25,
    is_active: Optional[bool] = None,
    teacher_id: Optional[int] = None,
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
        items.append(
            {
                "id": row.id,
                "teacher_id": row.teacher_id,
                "teacher_username": row.teacher.username if row.teacher else "unknown",
                "subject_id": row.subject_id,
                "subject_name": row.subject.name if row.subject else "unknown",
                "section_id": row.section_id,
                "section_name": row.section.name if row.section else "unknown",
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
        "teacher_username": session.teacher.username if session.teacher else "unknown",
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
        items.append(
            {
                "id": alert.id,
                "session_id": alert.session_id,
                "teacher_id": teacher.id,
                "teacher_username": teacher.username,
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
    db.commit()
    db.refresh(alert)
    return alert


def list_models() -> dict[str, Any]:
    return detector_service.build_model_selection_response()


def select_model(file_name: str) -> dict[str, Any]:
    try:
        return detector_service.select_model_file(file_name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


def list_server_logs(limit: int = 120) -> dict[str, Any]:
    if not settings.ENABLE_ADMIN_LOG_STREAM:
        return {"total": 0, "items": []}
    items = get_recent_server_logs(limit=limit)
    return {"total": len(items), "items": items}

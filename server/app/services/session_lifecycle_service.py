from datetime import datetime
from typing import Any
import logging

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.session import ClassSession, SessionHistory
from app.repositories.session_repository import SessionRepository
from app.schemas.session import SessionCreate
from app.services import audit_service
from app.services.admin import settings_service
from app.utils.datetime import utc_now

logger = logging.getLogger(__name__)


def _to_float(value: Any) -> float:
    if value is None:
        return 0.0
    return float(value)


def start_session(db: Session, session_in: SessionCreate, current_user) -> ClassSession:
    if session_in.students_present <= 0:
        raise HTTPException(status_code=400, detail="students_present must be greater than 0")

    session = ClassSession(
        **session_in.dict(),
        teacher_id=current_user.id,
        is_active=True,
        start_time=utc_now(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    _record_session_history(db, session, current_user.id, "CREATE")
    audit_service.write_audit_log(
        db,
        actor_user_id=current_user.id,
        actor_username=getattr(current_user, "username", None),
        action="TEACHER_SESSION_START",
        entity_type="ClassSession",
        entity_id=session.id,
        details={
            "subject_id": session.subject_id,
            "section_id": session.section_id,
            "students_present": session.students_present,
        },
    )
    db.commit()
    logger.info(f"Session started: ID {session.id} teacher={current_user.username}")
    return session


def stop_session(db: Session, session_id: int, current_user, stop_detector_fn) -> ClassSession:
    session = db.query(ClassSession).filter(
        ClassSession.id == session_id,
        ClassSession.teacher_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    prev_end_time = session.end_time
    session.is_active = False
    session.end_time = utc_now()
    stop_detector_fn(session_id)
    _record_session_history(db, session, current_user.id, "END")
    audit_service.write_audit_log(
        db,
        actor_user_id=current_user.id,
        actor_username=getattr(current_user, "username", None),
        action="TEACHER_SESSION_STOP",
        entity_type="ClassSession",
        entity_id=session.id,
        details={
            "subject_id": session.subject_id,
            "section_id": session.section_id,
            "prev_end_time": prev_end_time.isoformat() if isinstance(prev_end_time, datetime) else None,
        },
    )
    db.commit()
    db.refresh(session)
    return session


def get_active_session_for_teacher(db: Session, teacher_id: int) -> ClassSession:
    session = db.query(ClassSession).filter(
        ClassSession.teacher_id == teacher_id,
        ClassSession.is_active == True,
    ).order_by(ClassSession.start_time.desc()).first()

    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    return session


def list_session_summaries(db: Session, teacher_id: int, include_active: bool, limit: int) -> list[dict[str, Any]]:
    sessions = SessionRepository.list_sessions(
        db,
        teacher_id=teacher_id,
        include_active=include_active,
        limit=max(1, min(limit, 200)),
    )
    session_ids = [s.id for s in sessions]
    stats_map = SessionRepository.aggregate_behavior(db, session_ids)

    summaries = []
    for session in sessions:
        stats = stats_map.get(session.id, (session.id, 0, 0, 0, 0, 0))

        avg_eng = 0.0
        log_count = stats[5] or 0
        weights = settings_service.get_engagement_weights(db)
        if log_count > 0 and session.students_present > 0:
            on_task_sum = _to_float(stats[1])
            using_phone_sum = _to_float(stats[2])
            sleeping_sum = _to_float(stats[3])
            off_task_sum = _to_float(stats[4])
            raw_total = (
                (weights["on_task"] * on_task_sum)
                - (weights["using_phone"] * using_phone_sum)
                - (weights["sleeping"] * sleeping_sum)
                - (weights["off_task"] * off_task_sum)
            )
            avg_eng = max(0.0, min(100.0, (raw_total / (session.students_present * log_count)) * 100))

        summaries.append(
            {
                "id": session.id,
                "subject_id": session.subject_id,
                "section_id": session.section_id,
                "subject_name": session.subject.name if session.subject else "Unknown",
                "section_name": session.section.name if session.section else "Unknown",
                "start_time": session.start_time,
                "end_time": session.end_time,
                "is_active": session.is_active,
                "average_engagement": round(avg_eng, 2),
            }
        )
    return summaries


def get_active_session_or_404(db: Session, session_id: int, teacher_id: int | None = None) -> ClassSession:
    session = SessionRepository.get_active_session(db, session_id, teacher_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def get_session_or_404(db: Session, session_id: int, teacher_id: int | None = None) -> ClassSession:
    session = SessionRepository.get_session(db, session_id, teacher_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def _record_session_history(db: Session, session: ClassSession, user_id: int, change_type: str) -> None:
    history = SessionHistory(
        session_id=session.id,
        changed_by=user_id,
        change_type=change_type,
        prev_start_time=session.start_time,
        prev_end_time=session.end_time,
        prev_is_active=session.is_active,
    )
    db.add(history)

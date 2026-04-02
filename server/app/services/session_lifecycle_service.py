from datetime import datetime
from typing import Any
import logging

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.session import ClassSession, SessionHistory
from app.models.classroom import ClassSection, SectionSubjectAssignment, Subject
from app.repositories.session_repository import SessionRepository
from app.schemas.session import SessionCreate, Session as SessionSchema
from app.services import audit_service
from app.services.admin import settings_service
from app.utils.datetime import utc_now

logger = logging.getLogger(__name__)


def _to_float(value: Any) -> float:
    if value is None:
        return 0.0
    return float(value)


def start_session(db: Session, session_in: SessionCreate, current_user) -> SessionSchema:
    if session_in.students_present <= 0:
        raise HTTPException(status_code=400, detail="students_present must be greater than 0")
    section = db.query(ClassSection).filter(ClassSection.id == session_in.section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    subject = db.query(Subject).filter(Subject.id == session_in.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if section.major_id != subject.major_id:
        raise HTTPException(status_code=400, detail="Section and subject must belong to the same major")

    assignment = (
        db.query(SectionSubjectAssignment)
        .filter(
            SectionSubjectAssignment.section_id == section.id,
            SectionSubjectAssignment.subject_id == subject.id,
        )
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=400, detail="Selected subject is not assigned to the selected section")
    if assignment.teacher_id is not None and assignment.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not assigned to this section and subject")

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
            "activity_mode": session.activity_mode,
        },
    )
    db.commit()
    logger.info(f"Session started: ID {session.id} teacher={current_user.username}")
    
    # Re-query the session with all required relationships
    session_with_relations = db.query(ClassSession).filter(ClassSession.id == session.id).first()
    
    # Convert to SessionSchema with required fields
    return SessionSchema(
        id=session_with_relations.id,
        subject_id=session_with_relations.subject_id,
        section_id=session_with_relations.section_id,
        subject_name=session_with_relations.subject.name if session_with_relations.subject else "Unknown",
        section_name=session_with_relations.section.name if session_with_relations.section else "Unknown",
        college_id=(
            session_with_relations.section.major.department.college_id
            if session_with_relations.section and session_with_relations.section.major and session_with_relations.section.major.department
            else None
        ),
        college_name=(
            session_with_relations.section.major.department.college.name
            if session_with_relations.section
            and session_with_relations.section.major
            and session_with_relations.section.major.department
            and session_with_relations.section.major.department.college
            else None
        ),
        college_logo_path=(
            session_with_relations.section.major.department.college.logo_path
            if session_with_relations.section
            and session_with_relations.section.major
            and session_with_relations.section.major.department
            and session_with_relations.section.major.department.college
            else None
        ),
        department_id=(
            session_with_relations.section.major.department_id
            if session_with_relations.section and session_with_relations.section.major
            else None
        ),
        department_name=(
            session_with_relations.section.major.department.name
            if session_with_relations.section and session_with_relations.section.major and session_with_relations.section.major.department
            else None
        ),
        department_code=(
            session_with_relations.section.major.department.code
            if session_with_relations.section and session_with_relations.section.major and session_with_relations.section.major.department
            else None
        ),
        major_id=session_with_relations.section.major_id if session_with_relations.section else None,
        major_name=session_with_relations.section.major.name if session_with_relations.section and session_with_relations.section.major else None,
        major_code=session_with_relations.section.major.code if session_with_relations.section and session_with_relations.section.major else None,
        start_time=session_with_relations.start_time,
        end_time=session_with_relations.end_time,
        is_active=session_with_relations.is_active,
        activity_mode=session_with_relations.activity_mode,
        average_engagement=float(session_with_relations.average_engagement) if session_with_relations.average_engagement else 0.0
    )


def stop_session(db: Session, session_id: int, current_user, stop_detector_fn) -> SessionSchema:
    session = db.query(ClassSession).filter(
        ClassSession.id == session_id,
        ClassSession.teacher_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    prev_end_time = session.end_time
    
    # Use direct update to ensure it hits the DB immediately and bypasses any object-state issues
    db.query(ClassSession).filter(ClassSession.id == session_id).update({
        "is_active": False,
        "end_time": utc_now()
    })
    db.commit()
    
    # Refresh to pick up the changes for the rest of the function
    db.refresh(session)
    stop_detector_fn(session_id)

    if session.activity_mode == "EXAM":
        # For exam sessions, return a final session object before deletion
        # This allows the Flutter app to properly close monitoring
        final_session_data = {
            "id": session.id,
            "subject_id": session.subject_id,
            "section_id": session.section_id,
            "subject_name": session.subject.name if session.subject else "Unknown",
            "section_name": session.section.name if session.section else "Unknown",
            "college_id": (
                session.section.major.department.college_id
                if session.section and session.section.major and session.section.major.department
                else None
            ),
            "college_name": (
                session.section.major.department.college.name
                if session.section
                and session.section.major
                and session.section.major.department
                and session.section.major.department.college
                else None
            ),
            "college_logo_path": (
                session.section.major.department.college.logo_path
                if session.section
                and session.section.major
                and session.section.major.department
                and session.section.major.department.college
                else None
            ),
            "department_id": (
                session.section.major.department_id
                if session.section and session.section.major
                else None
            ),
            "department_name": (
                session.section.major.department.name
                if session.section and session.section.major and session.section.major.department
                else None
            ),
            "department_code": (
                session.section.major.department.code
                if session.section and session.section.major and session.section.major.department
                else None
            ),
            "major_id": session.section.major_id if session.section else None,
            "major_name": session.section.major.name if session.section and session.section.major else None,
            "major_code": session.section.major.code if session.section and session.section.major else None,
            "start_time": session.start_time,
            "end_time": utc_now(),  # Set end time for final response
            "is_active": False,  # Mark as inactive
            "activity_mode": session.activity_mode,
            "average_engagement": float(session.average_engagement) if session.average_engagement else 0.0
        }
        
        # Now delete the session
        db.delete(session)
        db.commit()
        audit_service.write_audit_log(
            db,
            actor_user_id=current_user.id,
            actor_username=getattr(current_user, "username", None),
            action="TEACHER_EXAM_SESSION_DISCARDED",
            entity_type="ClassSession",
            entity_id=session_id,
            details={"msg": "Exam session ended and discarded per volatile policy"},
        )
        db.commit()
        
        # Return the final session data for Flutter app to properly close monitoring
        return SessionSchema(**final_session_data)

    # Commit the status change first to ensure it sticks
    db.commit()
    
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
    
    # Re-query the session with all required relationships
    session_with_relations = db.query(ClassSession).filter(ClassSession.id == session.id).first()
    
    # Convert to SessionSchema with required fields
    return SessionSchema(
        id=session_with_relations.id,
        subject_id=session_with_relations.subject_id,
        section_id=session_with_relations.section_id,
        subject_name=session_with_relations.subject.name if session_with_relations.subject else "Unknown",
        section_name=session_with_relations.section.name if session_with_relations.section else "Unknown",
        college_id=(
            session_with_relations.section.major.department.college_id
            if session_with_relations.section and session_with_relations.section.major and session_with_relations.section.major.department
            else None
        ),
        college_name=(
            session_with_relations.section.major.department.college.name
            if session_with_relations.section
            and session_with_relations.section.major
            and session_with_relations.section.major.department
            and session_with_relations.section.major.department.college
            else None
        ),
        college_logo_path=(
            session_with_relations.section.major.department.college.logo_path
            if session_with_relations.section
            and session_with_relations.section.major
            and session_with_relations.section.major.department
            and session_with_relations.section.major.department.college
            else None
        ),
        department_id=(
            session_with_relations.section.major.department_id
            if session_with_relations.section and session_with_relations.section.major
            else None
        ),
        department_name=(
            session_with_relations.section.major.department.name
            if session_with_relations.section and session_with_relations.section.major and session_with_relations.section.major.department
            else None
        ),
        department_code=(
            session_with_relations.section.major.department.code
            if session_with_relations.section and session_with_relations.section.major and session_with_relations.section.major.department
            else None
        ),
        major_id=session_with_relations.section.major_id if session_with_relations.section else None,
        major_name=session_with_relations.section.major.name if session_with_relations.section and session_with_relations.section.major else None,
        major_code=session_with_relations.section.major.code if session_with_relations.section and session_with_relations.section.major else None,
        start_time=session_with_relations.start_time,
        end_time=session_with_relations.end_time,
        is_active=session_with_relations.is_active,
        activity_mode=session_with_relations.activity_mode,
        average_engagement=float(session_with_relations.average_engagement) if session_with_relations.average_engagement else 0.0
    )


def get_active_session_for_teacher(db: Session, teacher_id: int) -> SessionSchema:
    session = db.query(ClassSession).filter(
        ClassSession.teacher_id == teacher_id,
        ClassSession.is_active == True,
    ).order_by(ClassSession.start_time.desc()).first()

    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    
    # Convert to SessionSchema with required fields
    return SessionSchema(
        id=session.id,
        subject_id=session.subject_id,
        section_id=session.section_id,
        subject_name=session.subject.name if session.subject else "Unknown",
        section_name=session.section.name if session.section else "Unknown",
        college_id=(
            session.section.major.department.college_id
            if session.section and session.section.major and session.section.major.department
            else None
        ),
        college_name=(
            session.section.major.department.college.name
            if session.section
            and session.section.major
            and session.section.major.department
            and session.section.major.department.college
            else None
        ),
        college_logo_path=(
            session.section.major.department.college.logo_path
            if session.section
            and session.section.major
            and session.section.major.department
            and session.section.major.department.college
            else None
        ),
        department_id=(
            session.section.major.department_id
            if session.section and session.section.major
            else None
        ),
        department_name=(
            session.section.major.department.name
            if session.section and session.section.major and session.section.major.department
            else None
        ),
        department_code=(
            session.section.major.department.code
            if session.section and session.section.major and session.section.major.department
            else None
        ),
        major_id=session.section.major_id if session.section else None,
        major_name=session.section.major.name if session.section and session.section.major else None,
        major_code=session.section.major.code if session.section and session.section.major else None,
        start_time=session.start_time,
        end_time=session.end_time,
        is_active=session.is_active,
        activity_mode=session.activity_mode,
        average_engagement=float(session.average_engagement) if session.average_engagement else 0.0
    )


def list_session_summaries(db: Session, teacher_id: int, include_active: bool, limit: int) -> list[dict[str, Any]]:
    sessions = SessionRepository.list_sessions(
        db,
        teacher_id=teacher_id,
        include_active=include_active,
        limit=max(1, min(limit, 200)),
    )
    summaries = []
    for session in sessions:
        summaries.append(
            {
                "id": session.id,
                "subject_id": session.subject_id,
                "section_id": session.section_id,
                "subject_name": session.subject.name if session.subject else "Unknown",
                "section_name": session.section.name if session.section else "Unknown",
                "college_id": (
                    session.section.major.department.college_id
                    if session.section and session.section.major and session.section.major.department
                    else None
                ),
                "college_name": (
                    session.section.major.department.college.name
                    if session.section
                    and session.section.major
                    and session.section.major.department
                    and session.section.major.department.college
                    else None
                ),
                "college_logo_path": (
                    session.section.major.department.college.logo_path
                    if session.section
                    and session.section.major
                    and session.section.major.department
                    and session.section.major.department.college
                    else None
                ),
                "department_id": (
                    session.section.major.department_id
                    if session.section and session.section.major
                    else None
                ),
                "department_name": (
                    session.section.major.department.name
                    if session.section and session.section.major and session.section.major.department
                    else None
                ),
                "department_code": (
                    session.section.major.department.code
                    if session.section and session.section.major and session.section.major.department
                    else None
                ),
                "major_id": session.section.major_id if session.section else None,
                "major_name": session.section.major.name if session.section and session.section.major else None,
                "major_code": session.section.major.code if session.section and session.section.major else None,
                "start_time": session.start_time,
                "end_time": session.end_time,
                "is_active": session.is_active,
                "activity_mode": session.activity_mode,
                "average_engagement": round(float(session.average_engagement), 2) if session.average_engagement else 0.0,
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

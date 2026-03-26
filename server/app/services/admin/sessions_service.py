from datetime import datetime, timedelta
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.session import (
    Alert,
    AlertHistory,
    AlertSeverity,
    BehaviorLog,
    ClassSession,
    SessionHistory,
    SessionMetrics,
)
from app.models.user import User
from app.services.admin import settings_service
from app.services import audit_service, detector_service
from app.core.logging import get_recent_server_logs
from app.utils.datetime import utc_now
from app.constants import DEFAULT_PAGE_SIZE
from app.core.pagination import clamp_pagination


def _to_float(value: Any) -> float:
    if value is None:
        return 0.0
    return float(value)


def _get_actor_username(db: Session, actor_user_id: int | None) -> str | None:
    if actor_user_id is None:
        return None
    actor = db.query(User).filter(User.id == actor_user_id).first()
    if not actor:
        return None
    full_name = (actor.fullname or "").strip()
    return full_name if full_name else actor.username


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


def _avg_engagement_from_stats(stats_row: tuple, students_present: int, weights: dict[str, float]) -> float:
    if not stats_row or students_present <= 0:
        return 0.0
    on_task_sum, using_phone_sum, sleeping_sum, off_task_sum, log_count = stats_row
    if (log_count or 0) <= 0:
        return 0.0
    raw_total = (
        (weights["on_task"] * _to_float(on_task_sum))
        - (weights["using_phone"] * _to_float(using_phone_sum))
        - (weights["sleeping"] * _to_float(sleeping_sum))
        - (weights["off_task"] * _to_float(off_task_sum))
    )
    return round(max(0.0, min(100.0, (raw_total / (students_present * log_count)) * 100)), 2)


def get_dashboard_data(db: Session) -> dict[str, Any]:
    weights = settings_service.get_engagement_weights(db)
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    total_subjects = db.query(func.count(ClassSession.subject_id)).scalar() or 0
    total_sections = db.query(func.count(ClassSession.section_id)).scalar() or 0
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
                func.sum(BehaviorLog.using_phone),
                func.sum(BehaviorLog.sleeping),
                func.sum(BehaviorLog.off_task),
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
            "college_id": row.section.major.college_id if row.section and row.section.major else None,
            "college_name": row.section.major.college.name if row.section and row.section.major and row.section.major.college else None,
            "major_id": row.section.major_id if row.section else None,
            "major_name": row.section.major.name if row.section and row.section.major else None,
            "students_present": row.students_present,
            "start_time": row.start_time,
            "end_time": row.end_time,
            "is_active": row.is_active,
            "teacher_profile_picture_url": row.teacher.profile_picture_url if row.teacher else None,
            "average_engagement": _avg_engagement_from_stats(
                behavior_rows.get(row.id),
                row.students_present,
                weights,
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


def list_sessions(
    db: Session,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    is_active: Optional[bool] = None,
    teacher_id: Optional[int] = None,
    college_id: Optional[int] = None,
    major_id: Optional[int] = None,
) -> dict[str, Any]:
    skip, limit = clamp_pagination(skip, limit, default_limit=DEFAULT_PAGE_SIZE)
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
        # Join through ClassSection and its embedded major to filter by major/college
        query = query.join(ClassSection, ClassSession.section_id == ClassSection.id)
        if major_id:
            query = query.filter(ClassSection.major_id == major_id)
        if college_id:
            query = query.join(Major, ClassSection.major_id == Major.id).filter(Major.college_id == college_id)

    total = query.count()
    rows = (
        query.order_by(ClassSession.start_time.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    session_ids = [r.id for r in rows]
    behavior_map = {}
    if session_ids:
        behavior_rows = (
            db.query(
                BehaviorLog.session_id,
                func.sum(BehaviorLog.on_task),
                func.sum(BehaviorLog.using_phone),
                func.sum(BehaviorLog.sleeping),
                func.sum(BehaviorLog.off_task),
                func.count(BehaviorLog.id),
            )
            .filter(BehaviorLog.session_id.in_(session_ids))
            .group_by(BehaviorLog.session_id)
            .all()
        )
        behavior_map = {row[0]: row[1:] for row in behavior_rows}

    weights = settings_service.get_engagement_weights(db)
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
                "college_id": row.section.major.college_id if row.section and row.section.major else None,
                "college_name": row.section.major.college.name if row.section and row.section.major and row.section.major.college else None,
                "major_id": row.section.major_id if row.section else None,
                "major_name": row.section.major.name if row.section and row.section.major else None,
                "students_present": row.students_present,
                "start_time": row.start_time,
                "end_time": row.end_time,
                "is_active": row.is_active,
                "teacher_profile_picture_url": row.teacher.profile_picture_url if row.teacher else None,
                "average_engagement": _avg_engagement_from_stats(
                    behavior_map.get(row.id),
                    row.students_present,
                    weights,
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
    session.end_time = utc_now()
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
            func.sum(BehaviorLog.using_phone),
            func.sum(BehaviorLog.sleeping),
            func.sum(BehaviorLog.off_task),
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
        "average_engagement": _avg_engagement_from_stats(
            stats_row,
            session.students_present,
            settings_service.get_engagement_weights(db),
        ),
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
            "using_phone": row.using_phone,
            "off_task": row.off_task,
            "not_visible": row.not_visible,
            "total_detected": row.total_detected,
        }
        for row in logs
    ]

    # For ended sessions, use the session end timestamp as the anchor so
    # historical sessions still return chartable metrics data.
    anchor_time = session.end_time or utc_now()
    if isinstance(anchor_time, str):
        try:
            anchor_time = datetime.fromisoformat(anchor_time)
        except ValueError:
            anchor_time = utc_now()
    if not isinstance(anchor_time, datetime):
        anchor_time = utc_now()
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
            "using_phone_avg": float(row.using_phone_avg),
            "sleeping_avg": float(row.sleeping_avg),
            "off_task_avg": float(row.off_task_avg),
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
    limit: int = DEFAULT_PAGE_SIZE,
    is_read: Optional[bool] = None,
    severity: Optional[str] = None,
    session_id: Optional[int] = None,
) -> dict[str, Any]:
    skip, limit = clamp_pagination(skip, limit, default_limit=DEFAULT_PAGE_SIZE)
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
        .offset(skip)
        .limit(limit)
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
    from app.models.audit import AuditLog

    skip, limit = clamp_pagination(skip, limit)
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
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {"total": total, "items": items}


def list_server_logs(limit: int = 120) -> dict[str, Any]:
    if not settings_service.is_admin_log_stream_enabled():
        return {"total": 0, "items": []}
    items = get_recent_server_logs(limit=limit)
    return {"total": len(items), "items": items}

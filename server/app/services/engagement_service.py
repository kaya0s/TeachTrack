from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.session import Alert, AlertSeverity, AlertType, BehaviorLog, ClassSession, EngagementEvent, SessionHistory, SessionMetrics as SessionMetricsModel
from app.schemas.session import BehaviorLogCreate
from app.services import alert_service, session_lifecycle_service

W_ON_TASK = 1.0
W_WRITING = 0.8
W_PHONE = 1.2
W_SLEEPING = 1.5
W_DISENGAGED_POSTURE = 1.0


def _to_float(value: Any) -> float:
    if value is None:
        return 0.0
    return float(value)


def _weighted_engagement_percent(
    on_task: int,
    writing: int,
    using_phone: int,
    sleeping: int,
    disengaged_posture: int,
    students_present: int,
) -> float:
    if students_present <= 0:
        return 0.0
    raw_score = (
        (W_ON_TASK * on_task)
        + (W_WRITING * writing)
        - (W_PHONE * using_phone)
        - (W_SLEEPING * sleeping)
        - (W_DISENGAGED_POSTURE * disengaged_posture)
    )
    percent = (raw_score / students_present) * 100
    return max(0.0, min(100.0, percent))


def process_behavior_log(
    db: Session,
    session_id: int,
    log_in: BehaviorLogCreate,
    teacher_id: int | None = None,
) -> None:
    session = session_lifecycle_service.get_active_session_or_404(db, session_id, teacher_id)
    observed = (
        log_in.on_task
        + log_in.writing
        + log_in.using_phone
        + log_in.sleeping
        + log_in.disengaged_posture
    )
    not_visible = max(0, session.students_present - observed)
    total = observed

    log = BehaviorLog(
        session_id=session_id,
        on_task=log_in.on_task,
        sleeping=log_in.sleeping,
        writing=log_in.writing,
        using_phone=log_in.using_phone,
        disengaged_posture=log_in.disengaged_posture,
        not_visible=not_visible,
        total_detected=total,
    )
    db.add(log)
    db.flush()

    if total > 0 and log_in.sleeping > 0:
        ratio = log_in.sleeping / total
        if ratio > 0.3 and total >= 5:
            msg = f"High sleeping detected: {log_in.sleeping} students ({int(ratio*100)}%)."
            alert_service.trigger_alert(db, session_id, AlertType.SLEEPING, msg, AlertSeverity.WARNING)

    if total > 0 and log_in.using_phone > 0:
        ratio = log_in.using_phone / total
        if ratio > 0.2:
            msg = f"Phone usage usage spike: {log_in.using_phone} students ({int(ratio*100)}%)."
            alert_service.trigger_alert(db, session_id, AlertType.PHONE, msg, AlertSeverity.WARNING)

    weighted_engagement = _weighted_engagement_percent(
        on_task=log_in.on_task,
        writing=log_in.writing,
        using_phone=log_in.using_phone,
        sleeping=log_in.sleeping,
        disengaged_posture=log_in.disengaged_posture,
        students_present=session.students_present,
    )
    if total >= 5 and weighted_engagement < 40:
        severity = AlertSeverity.CRITICAL if weighted_engagement < 25 else AlertSeverity.WARNING
        msg = f"Engagement drop: {int(weighted_engagement)}% weighted engagement."
        alert_service.trigger_alert(db, session_id, AlertType.ENGAGEMENT_DROP, msg, severity)
        alert_service.record_engagement_event(db, session_id, "ENGAGEMENT_DROP", severity.value, msg)
    elif weighted_engagement > 60:
        alert_service.record_recovery_if_needed(db, session_id, weighted_engagement)

    _update_session_metrics(db, session_id, log.timestamp)
    db.commit()


def get_session_metrics_response(db: Session, session_id: int, teacher_id: int) -> dict[str, Any]:
    session = session_lifecycle_service.get_session_or_404(db, session_id, teacher_id)

    logs = db.query(BehaviorLog).filter(BehaviorLog.session_id == session_id).order_by(BehaviorLog.timestamp.desc()).limit(20).all()
    logs.reverse()

    alerts = db.query(Alert).filter(Alert.session_id == session_id, Alert.is_read == False).all()

    stats = db.query(
        func.sum(BehaviorLog.on_task),
        func.sum(BehaviorLog.writing),
        func.sum(BehaviorLog.using_phone),
        func.sum(BehaviorLog.sleeping),
        func.sum(BehaviorLog.disengaged_posture),
        func.count(BehaviorLog.id),
    ).filter(BehaviorLog.session_id == session_id).first()

    avg_eng = 0.0
    log_count = stats[5] or 0
    if log_count > 0 and session.students_present > 0:
        on_task_sum = _to_float(stats[0])
        writing_sum = _to_float(stats[1])
        phone_sum = _to_float(stats[2])
        sleeping_sum = _to_float(stats[3])
        disengaged_sum = _to_float(stats[4])
        raw_total = (
            (W_ON_TASK * on_task_sum)
            + (W_WRITING * writing_sum)
            - (W_PHONE * phone_sum)
            - (W_SLEEPING * sleeping_sum)
            - (W_DISENGAGED_POSTURE * disengaged_sum)
        )
        avg_eng = max(0.0, min(100.0, (raw_total / (session.students_present * log_count)) * 100))

    return {
        "session_id": session_id,
        "students_present": session.students_present,
        "total_logs": len(logs),
        "average_engagement": round(avg_eng, 2),
        "recent_logs": logs,
        "alerts": alerts,
    }


def get_session_metrics_rollup(db: Session, session_id: int, teacher_id: int, minutes: int):
    session_lifecycle_service.get_session_or_404(db, session_id, teacher_id)
    cutoff = datetime.now() - timedelta(minutes=max(1, minutes))
    return db.query(SessionMetricsModel).filter(
        SessionMetricsModel.session_id == session_id,
        SessionMetricsModel.window_start >= cutoff,
    ).order_by(SessionMetricsModel.window_start.asc()).all()


def get_session_events(db: Session, session_id: int, teacher_id: int, limit: int):
    session_lifecycle_service.get_session_or_404(db, session_id, teacher_id)
    events = db.query(EngagementEvent).filter(
        EngagementEvent.session_id == session_id
    ).order_by(EngagementEvent.event_time.desc()).limit(max(1, limit)).all()
    events.reverse()
    return events


def get_session_history(db: Session, session_id: int, teacher_id: int, limit: int):
    session_lifecycle_service.get_session_or_404(db, session_id, teacher_id)
    rows = db.query(SessionHistory).filter(
        SessionHistory.session_id == session_id
    ).order_by(SessionHistory.changed_at.desc()).limit(max(1, limit)).all()
    rows.reverse()
    return rows


def _floor_to_minute(dt: datetime) -> datetime:
    return dt.replace(second=0, microsecond=0)


def _update_session_metrics(db: Session, session_id: int, log_time: datetime) -> None:
    window_start = _floor_to_minute(log_time)
    window_end = window_start + timedelta(minutes=1)
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        return

    stats = db.query(
        func.count(BehaviorLog.id),
        func.sum(BehaviorLog.on_task),
        func.sum(BehaviorLog.using_phone),
        func.sum(BehaviorLog.sleeping),
        func.sum(BehaviorLog.writing),
        func.sum(BehaviorLog.disengaged_posture),
        func.sum(BehaviorLog.not_visible),
        func.sum(BehaviorLog.total_detected),
    ).filter(
        BehaviorLog.session_id == session_id,
        BehaviorLog.timestamp >= window_start,
        BehaviorLog.timestamp < window_end,
    ).first()

    log_count = stats[0] or 0
    if log_count == 0:
        return

    on_task_sum = _to_float(stats[1])
    phone_sum = _to_float(stats[2])
    sleeping_sum = _to_float(stats[3])
    writing_sum = _to_float(stats[4])
    disengaged_sum = _to_float(stats[5])
    not_visible_sum = _to_float(stats[6])
    total_detected = int(stats[7] or 0)

    engagement_score = 0.0
    if session.students_present > 0:
        raw_total = (
            (W_ON_TASK * on_task_sum)
            + (W_WRITING * writing_sum)
            - (W_PHONE * phone_sum)
            - (W_SLEEPING * sleeping_sum)
            - (W_DISENGAGED_POSTURE * disengaged_sum)
        )
        engagement_score = max(
            0.0,
            min(100.0, (raw_total / (session.students_present * log_count)) * 100),
        )

    metrics = db.query(SessionMetricsModel).filter(
        SessionMetricsModel.session_id == session_id,
        SessionMetricsModel.window_start == window_start,
        SessionMetricsModel.window_end == window_end,
    ).first()

    if not metrics:
        metrics = SessionMetricsModel(
            session_id=session_id,
            window_start=window_start,
            window_end=window_end,
        )
        db.add(metrics)

    metrics.total_detected = total_detected
    metrics.on_task_avg = round(on_task_sum / log_count, 2)
    metrics.phone_avg = round(phone_sum / log_count, 2)
    metrics.sleeping_avg = round(sleeping_sum / log_count, 2)
    metrics.writing_avg = round(writing_sum / log_count, 2)
    metrics.disengaged_posture_avg = round(disengaged_sum / log_count, 2)
    metrics.not_visible_avg = round(not_visible_sum / log_count, 2)
    metrics.engagement_score = round(engagement_score, 2)

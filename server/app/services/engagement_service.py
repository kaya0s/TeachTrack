from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.session import Alert, AlertSeverity, AlertType, BehaviorLog, ClassSession, SessionHistory, SessionMetrics as SessionMetricsModel
from app.schemas.session import BehaviorLogCreate
from app.services import alert_service, session_lifecycle_service
from app.services.admin import settings_service
from app.utils.datetime import utc_now


def _to_float(value: Any) -> float:
    if value is None:
        return 0.0
    return float(value)


def _weighted_engagement_percent(
    on_task: int,
    using_phone: int,
    sleeping: int,
    off_task: int,
    not_visible: int,
    students_present: int,
    weights: dict[str, float],
) -> float:
    """Calculate weighted engagement percent for a single detection cycle.

    Uses students_present as the normaliser so the score reflects the
    proportion of the whole class that is engaged, not just detected students.
    not_visible students receive an optional configurable penalty (default 0).
    """
    if students_present <= 0:
        return 0.0
    raw_score = (
        (weights["on_task"] * on_task)
        - (weights["using_phone"] * using_phone)
        - (weights["sleeping"] * sleeping)
        - (weights["off_task"] * off_task)
        - (weights.get("not_visible", 0.0) * not_visible)
    )
    percent = (raw_score / students_present) * 100
    return max(0.0, min(100.0, percent))


def _avg_engagement_from_snapshot_logs(
    db: Session,
    session_id: int,
    session_students_present: int,
    weights: dict[str, float],
) -> float:
    """Compute session-level engagement by averaging per-log scores.

    When a log has students_present_snapshot recorded, that value is used
    as the normaliser for that log (accurate even if headcount changed mid-session).
    Older logs without a snapshot fall back to session_students_present.
    Returns a value in [0, 100].
    """
    rows = (
        db.query(
            BehaviorLog.on_task,
            BehaviorLog.using_phone,
            BehaviorLog.sleeping,
            BehaviorLog.off_task,
            BehaviorLog.not_visible,
            BehaviorLog.students_present_snapshot,
        )
        .filter(BehaviorLog.session_id == session_id)
        .all()
    )
    if not rows:
        return 0.0

    total_score = 0.0
    count = 0
    for on_task, using_phone, sleeping, off_task, not_visible, snapshot in rows:
        sp = snapshot if snapshot and snapshot > 0 else session_students_present
        if sp <= 0:
            continue
        score = _weighted_engagement_percent(
            on_task=on_task or 0,
            using_phone=using_phone or 0,
            sleeping=sleeping or 0,
            off_task=off_task or 0,
            not_visible=not_visible or 0,
            students_present=sp,
            weights=weights,
        )
        total_score += score
        count += 1

    if count == 0:
        return 0.0
    return round(total_score / count, 2)


def process_behavior_log(
    db: Session,
    session_id: int,
    log_in: BehaviorLogCreate,
    teacher_id: int | None = None,
) -> None:
    session = session_lifecycle_service.get_active_session_or_404(db, session_id, teacher_id)
    
    # Extract snapshot URL if available (added by detector service)
    snapshot_url = getattr(log_in, '_snapshot_url', None)
    
    observed = (
        log_in.on_task
        + log_in.using_phone
        + log_in.sleeping
        + log_in.off_task
    )
    not_visible = max(0, session.students_present - observed)
    total = observed

    log = BehaviorLog(
        session_id=session_id,
        on_task=log_in.on_task,
        sleeping=log_in.sleeping,
        using_phone=log_in.using_phone,
        off_task=log_in.off_task,
        not_visible=not_visible,
        total_detected=total,
        # Snapshot the current headcount so the engagement formula stays
        # accurate even if the teacher changes students_present later.
        students_present_snapshot=session.students_present,
    )
    db.add(log)
    db.flush()

    weights = settings_service.get_engagement_weights(db, mode=session.activity_mode)
    
    # --- Mode-Aware Alerts ---
    
    if session.activity_mode == "EXAM":
        # Proctoring Mode: Focused only on phone usage (current limitation)
        proctor_configs = settings_service.get_proctoring_settings(db)
        
        # Strict Phone Count Check - ONLY phone alerts for exam mode
        if log_in.using_phone >= proctor_configs["phone_count_threshold"]:
            msg = f"EXAM ALERT: Phone usage detected! {log_in.using_phone} student(s)."
            alert_service.trigger_alert(db, session_id, AlertType.PHONE, msg, AlertSeverity.CRITICAL, snapshot_url=snapshot_url)
            
        # For EXAM mode, we don't save engagement averages. Keep at zero.
        session.average_engagement = 0.0
        db.add(session)
        db.commit()
        return  # End processing for exams (No permanent engagement saved)

    # Standard Mode Logic (Lecture, Study, Collaboration)
    
    # High sleeping rate: Require total >= 5 for sleeping.
    sleeping_threshold = 0.5 if session.activity_mode == "COLLABORATION" else 0.3
    if total > 0 and total >= 5 and log_in.sleeping > 0:
        ratio = log_in.sleeping / total
        if ratio > sleeping_threshold:
            msg = f"High sleeping detected [{session.activity_mode}]: {log_in.sleeping} students ({int(ratio*100)}%)."
            alert_service.trigger_alert(db, session_id, AlertType.SLEEPING, msg, AlertSeverity.WARNING, snapshot_url=None)

    # Phone usage spike:
    if total > 0 and total >= 5 and log_in.using_phone > 0:
        ratio = log_in.using_phone / total
        if ratio > 0.2:
            msg = f"Phone usage spike: {log_in.using_phone} students ({int(ratio*100)}%)."
            alert_service.trigger_alert(db, session_id, AlertType.PHONE, msg, AlertSeverity.WARNING, snapshot_url=snapshot_url)

    # Off-task alerts:
    if session.activity_mode != "COLLABORATION" and total >= 5 and log_in.off_task > 0:
        ratio = log_in.off_task / total
        if ratio > 0.4:
            msg = f"High off-task/talking detected [{session.activity_mode}]: {log_in.off_task} students ({int(ratio*100)}%)."
            # Triggering alert
    
    weighted_engagement = _weighted_engagement_percent(
        on_task=log_in.on_task,
        using_phone=log_in.using_phone,
        sleeping=log_in.sleeping,
        off_task=log_in.off_task,
        not_visible=not_visible,
        students_present=session.students_present,
        weights=weights,
    )
    if total >= 5 and weighted_engagement < 40:
        severity = AlertSeverity.CRITICAL if weighted_engagement < 25 else AlertSeverity.WARNING
        msg = f"Engagement drop [{session.activity_mode}]: {int(weighted_engagement)}% weighted engagement."
        alert_service.trigger_alert(db, session_id, AlertType.ENGAGEMENT_DROP, msg, severity, snapshot_url=None)

    _update_session_metrics(db, session_id, log.timestamp)
    
    # Recalculate and cache overall session engagement for performant sorting in admin views
    session.average_engagement = _avg_engagement_from_snapshot_logs(db, session_id, session.students_present, weights)
    db.add(session)
    
    db.commit()


def get_session_metrics_response(db: Session, session_id: int, teacher_id: int) -> dict[str, Any]:
    session = session_lifecycle_service.get_session_or_404(db, session_id, teacher_id)

    logs = db.query(BehaviorLog).filter(BehaviorLog.session_id == session_id).order_by(BehaviorLog.timestamp.desc()).limit(20).all()
    logs.reverse()

    alerts = db.query(Alert).filter(Alert.session_id == session_id, Alert.is_read == False).all()

    weights = settings_service.get_engagement_weights(db, mode=session.activity_mode)
    avg_eng = _avg_engagement_from_snapshot_logs(db, session_id, session.students_present, weights)

    return {
        "session_id": session_id,
        "students_present": session.students_present,
        "total_logs": len(logs),
        "average_engagement": avg_eng,
        "recent_logs": logs,
        "alerts": alerts,
    }


def get_session_metrics_rollup(db: Session, session_id: int, teacher_id: int, minutes: int):
    session_lifecycle_service.get_session_or_404(db, session_id, teacher_id)
    cutoff = utc_now() - timedelta(minutes=max(1, minutes))
    return db.query(SessionMetricsModel).filter(
        SessionMetricsModel.session_id == session_id,
        SessionMetricsModel.window_start >= cutoff,
    ).order_by(SessionMetricsModel.window_start.asc()).all()


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

    # Pull rows for this window including the snapshot column
    window_rows = (
        db.query(
            BehaviorLog.on_task,
            BehaviorLog.using_phone,
            BehaviorLog.sleeping,
            BehaviorLog.off_task,
            BehaviorLog.not_visible,
            BehaviorLog.total_detected,
            BehaviorLog.students_present_snapshot,
        )
        .filter(
            BehaviorLog.session_id == session_id,
            BehaviorLog.timestamp >= window_start,
            BehaviorLog.timestamp < window_end,
        )
        .all()
    )

    log_count = len(window_rows)
    if log_count == 0:
        return

    on_task_sum = sum(r[0] or 0 for r in window_rows)
    using_phone_sum = sum(r[1] or 0 for r in window_rows)
    sleeping_sum = sum(r[2] or 0 for r in window_rows)
    off_task_sum = sum(r[3] or 0 for r in window_rows)
    not_visible_sum = sum(r[4] or 0 for r in window_rows)
    total_detected = sum(r[5] or 0 for r in window_rows)

    weights = settings_service.get_engagement_weights(db, mode=session.activity_mode)

    # Compute engagement by averaging per-log scores (using their individual snapshots)
    window_engagement_sum = 0.0
    for on_task, using_phone, sleeping, off_task, not_visible, _, snapshot in window_rows:
        sp = snapshot if snapshot and snapshot > 0 else session.students_present
        if sp <= 0:
            continue
        window_engagement_sum += _weighted_engagement_percent(
            on_task=on_task or 0,
            using_phone=using_phone or 0,
            sleeping=sleeping or 0,
            off_task=off_task or 0,
            not_visible=not_visible or 0,
            students_present=sp,
            weights=weights,
        )
    engagement_score = round(window_engagement_sum / log_count, 2)

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
    metrics.using_phone_avg = round(using_phone_sum / log_count, 2)
    metrics.sleeping_avg = round(sleeping_sum / log_count, 2)
    metrics.off_task_avg = round(off_task_sum / log_count, 2)
    metrics.not_visible_avg = round(not_visible_sum / log_count, 2)
    metrics.engagement_score = engagement_score

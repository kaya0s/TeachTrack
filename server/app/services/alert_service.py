from datetime import datetime, timedelta
import logging

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.session import Alert, AlertHistory, AlertSeverity, AlertType, EngagementEvent
from app.repositories.session_repository import SessionRepository

logger = logging.getLogger(__name__)


def get_alert_or_404(db: Session, alert_id: int, teacher_id: int | None = None) -> Alert:
    alert = SessionRepository.get_alert(db, alert_id, teacher_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


def trigger_alert(db: Session, session_id: int, a_type: AlertType, msg: str, severity: AlertSeverity) -> None:
    five_min_ago = datetime.now() - timedelta(minutes=5)
    recent = db.query(Alert).filter(
        Alert.session_id == session_id,
        Alert.alert_type == a_type.value,
        Alert.triggered_at >= five_min_ago,
    ).first()

    if not recent:
        alert = Alert(session_id=session_id, alert_type=a_type.value, message=msg, severity=severity.value)
        db.add(alert)
        logger.warning(f"Alert triggered ({session_id}): {msg}")


def record_engagement_event(db: Session, session_id: int, event_type: str, severity: str, notes: str) -> None:
    event = EngagementEvent(
        session_id=session_id,
        event_type=event_type,
        severity=severity,
        notes=notes,
    )
    db.add(event)


def record_recovery_if_needed(db: Session, session_id: int, engagement_percent: float) -> None:
    ten_min_ago = datetime.now() - timedelta(minutes=10)
    last_event = db.query(EngagementEvent).filter(
        EngagementEvent.session_id == session_id,
        EngagementEvent.event_time >= ten_min_ago,
    ).order_by(EngagementEvent.event_time.desc()).first()

    if last_event and last_event.event_type == "ENGAGEMENT_DROP":
        msg = f"Engagement recovery: {int(engagement_percent)}% weighted engagement."
        record_engagement_event(db, session_id, "RECOVERY", AlertSeverity.WARNING.value, msg)


def mark_alert_read(db: Session, alert_id: int, user_id: int) -> Alert:
    alert = get_alert_or_404(db, alert_id, user_id)
    _record_alert_history(db, alert, user_id, "READ")
    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return alert


def get_alert_history(db: Session, alert_id: int, user_id: int, limit: int):
    get_alert_or_404(db, alert_id, user_id)
    rows = db.query(AlertHistory).filter(
        AlertHistory.alert_id == alert_id
    ).order_by(AlertHistory.changed_at.desc()).limit(max(1, limit)).all()
    rows.reverse()
    return rows


def _record_alert_history(db: Session, alert: Alert, user_id: int, change_type: str) -> None:
    history = AlertHistory(
        alert_id=alert.id,
        changed_by=user_id,
        change_type=change_type,
        prev_is_read=alert.is_read,
        prev_severity=alert.severity,
        prev_message=alert.message,
    )
    db.add(history)

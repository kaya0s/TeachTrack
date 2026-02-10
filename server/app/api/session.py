from datetime import datetime, timedelta
from typing import List, Any
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.api import deps
from app.db.database import get_db
from app.models.session import (
    ClassSession,
    BehaviorLog,
    Alert,
    AlertType,
    AlertSeverity,
    SessionMetrics as SessionMetricsModel,
    EngagementEvent,
    SessionHistory,
    AlertHistory,
)
from app.schemas.session import (
    SessionCreate, Session as SessionSchema,
    BehaviorLogCreate, BehaviorLog as BehaviorLogSchema,
    Alert as AlertSchema, SessionMetrics,
    SessionMetricRow, EngagementEvent as EngagementEventSchema,
    SessionHistory as SessionHistorySchema,
    AlertHistory as AlertHistorySchema,
)

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/start", response_model=SessionSchema)
def start_session(
    *,
    db: Session = Depends(get_db),
    session_in: SessionCreate,
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    # Close any existing active sessions for this teacher? Optional. 
    # For now, just create new.
    session = ClassSession(
        **session_in.dict(),
        teacher_id=current_user.id,
        is_active=True,
        start_time=datetime.now()
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    _record_session_history(db, session, current_user.id, "CREATE")
    logger.info(f"✅ Session Started: ID {session.id} for Teacher {current_user.username}")
    return session

@router.post("/{session_id}/stop", response_model=SessionSchema)
def stop_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    session = db.query(ClassSession).filter(ClassSession.id == session_id, ClassSession.teacher_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.is_active = False
    session.end_time = datetime.now()
    _record_session_history(db, session, current_user.id, "END")
    db.commit()
    db.refresh(session)
    return session

@router.get("/active", response_model=SessionSchema)
def get_active_session(
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    session = db.query(ClassSession).filter(
        ClassSession.teacher_id == current_user.id, 
        ClassSession.is_active == True
    ).order_by(ClassSession.start_time.desc()).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    return session

# -- Data Ingestion form ML Script -- 
# Note: In production, you might use an API Key instead of User Token for the script,
# but for now we assume the script authenticates or we allow open access if secured by network.
# We will use teacher token for simplicity or just open for this specific endpoint if user desires.
# Assuming script has session_id.
@router.post("/{session_id}/log", status_code=200)
def log_behavior_metrics(
    session_id: int,
    log_in: BehaviorLogCreate,
    db: Session = Depends(get_db),
    # For a machine script, maybe skip auth or use a machine token. 
    # We will enforce existence of session only.
) -> Any:
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session.is_active:
        raise HTTPException(status_code=400, detail="Session is not active")

    # 1. Calc total detected
    total = (log_in.raising_hand + log_in.sleeping + log_in.writing + 
             log_in.using_phone + log_in.attentive)
    # Undetected is separate from "detected behaviors" usuallly, but user said "undetected students"
    # log_in.undetected is tracked separately.
    
    # Create Log
    log = BehaviorLog(
        session_id=session_id,
        **log_in.dict(),
        total_detected=total
    )
    db.add(log)
    db.commit() # Commit to get timestamp/ID
    db.refresh(log)
    
    logger.info(f"📡 Received Log for Session {session_id}: Sleep={log_in.sleeping}, Phone={log_in.using_phone}, Total={total}")

    # 2. Alert Logic
    # Check Sleeping
    if total > 0 and log_in.sleeping > 0:
        ratio = log_in.sleeping / total
        if ratio > 0.3 and total >= 5: # >30% sleeping
            msg = f"High sleeping detected: {log_in.sleeping} students ({int(ratio*100)}%)."
            _trigger_alert(db, session_id, AlertType.SLEEPING, msg, AlertSeverity.WARNING)
            
    # Check Phone
    if total > 0 and log_in.using_phone > 0:
        ratio = log_in.using_phone / total
        if ratio > 0.2: # >20% using phone
            msg = f"Phone usage usage spike: {log_in.using_phone} students ({int(ratio*100)}%)."
            _trigger_alert(db, session_id, AlertType.PHONE, msg, AlertSeverity.WARNING)

    # Check Engagement Drop
    engagement_ratio = 0.0
    if total > 0:
        positives = log_in.attentive + log_in.writing + log_in.raising_hand
        engagement_ratio = positives / total
        if engagement_ratio < 0.4 and total >= 5:
            severity = AlertSeverity.CRITICAL if engagement_ratio < 0.25 else AlertSeverity.WARNING
            msg = f"Engagement drop: {int(engagement_ratio*100)}% positive behaviors."
            _trigger_alert(db, session_id, AlertType.ENGAGEMENT_DROP, msg, severity)
            _record_engagement_event(db, session_id, "ENGAGEMENT_DROP", severity.value, msg)
        elif engagement_ratio > 0.6:
            _record_recovery_if_needed(db, session_id, engagement_ratio)

    # Rollup Metrics (1-minute window)
    _update_session_metrics(db, session_id, log.timestamp)

    return {"status": "logged"}

def _trigger_alert(db: Session, session_id: int, a_type: AlertType, msg: str, severity: AlertSeverity):
    # Cooldown check: Check last alert of this type in last 5 mins
    five_min_ago = datetime.now() - timedelta(minutes=5)
    recent = db.query(Alert).filter(
        Alert.session_id == session_id,
        Alert.alert_type == a_type,
        Alert.triggered_at >= five_min_ago
    ).first()
    
    if not recent:
        alert = Alert(session_id=session_id, alert_type=str(a_type), message=msg, severity=severity.value)
        db.add(alert)
        db.commit()
        logger.warning(f"🚨 ALERT TRIGGERED ({session_id}): {msg}")

@router.get("/{session_id}/metrics", response_model=SessionMetrics)
def get_session_metrics(
    session_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Get recent logs (last 20 for graph)
    logs = db.query(BehaviorLog).filter(BehaviorLog.session_id == session_id).order_by(BehaviorLog.timestamp.desc()).limit(20).all()
    logs.reverse() # Oldest first for graph
    
    # Get unread alerts
    alerts = db.query(Alert).filter(Alert.session_id == session_id, Alert.is_read == False).all()
    
    # Avg Engagement (Attentive + Writing + Raising Hand) / Total
    # Simple calculation over all logs
    stats = db.query(
        func.sum(BehaviorLog.attentive),
        func.sum(BehaviorLog.writing),
        func.sum(BehaviorLog.raising_hand),
        func.sum(BehaviorLog.total_detected)
    ).filter(BehaviorLog.session_id == session_id).first()
    
    avg_eng = 0.0
    if stats[3] and stats[3] > 0:
        positives = (stats[0] or 0) + (stats[1] or 0) + (stats[2] or 0)
        avg_eng = (positives / stats[3]) * 100
        
    return {
        "session_id": session_id,
        "total_logs": len(logs),
        "average_engagement": round(avg_eng, 2),
        "recent_logs": logs,
        "alerts": alerts
    }

@router.get("/{session_id}/metrics/rollup", response_model=List[SessionMetricRow])
def get_session_metrics_rollup(
    session_id: int,
    minutes: int = 60,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    cutoff = datetime.now() - timedelta(minutes=max(1, minutes))
    rows = db.query(SessionMetricsModel).filter(
        SessionMetricsModel.session_id == session_id,
        SessionMetricsModel.window_start >= cutoff
    ).order_by(SessionMetricsModel.window_start.asc()).all()
    return rows

@router.get("/{session_id}/events", response_model=List[EngagementEventSchema])
def get_session_events(
    session_id: int,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    events = db.query(EngagementEvent).filter(
        EngagementEvent.session_id == session_id
    ).order_by(EngagementEvent.event_time.desc()).limit(max(1, limit)).all()
    events.reverse()
    return events

@router.get("/{session_id}/history", response_model=List[SessionHistorySchema])
def get_session_history(
    session_id: int,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    rows = db.query(SessionHistory).filter(
        SessionHistory.session_id == session_id
    ).order_by(SessionHistory.changed_at.desc()).limit(max(1, limit)).all()
    rows.reverse()
    return rows

@router.put("/alerts/{alert_id}/read", response_model=AlertSchema)
def mark_alert_read(
        alert_id: int,
        db: Session = Depends(get_db),
        current_user = Depends(deps.get_current_active_user),
) -> Any:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    _record_alert_history(db, alert, current_user.id, "READ")
    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return alert

@router.get("/alerts/{alert_id}/history", response_model=List[AlertHistorySchema])
def get_alert_history(
    alert_id: int,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    rows = db.query(AlertHistory).filter(
        AlertHistory.alert_id == alert_id
    ).order_by(AlertHistory.changed_at.desc()).limit(max(1, limit)).all()
    rows.reverse()
    return rows

def _floor_to_minute(dt: datetime) -> datetime:
    return dt.replace(second=0, microsecond=0)

def _update_session_metrics(db: Session, session_id: int, log_time: datetime) -> None:
    window_start = _floor_to_minute(log_time)
    window_end = window_start + timedelta(minutes=1)

    stats = db.query(
        func.count(BehaviorLog.id),
        func.sum(BehaviorLog.attentive),
        func.sum(BehaviorLog.using_phone),
        func.sum(BehaviorLog.sleeping),
        func.sum(BehaviorLog.writing),
        func.sum(BehaviorLog.raising_hand),
        func.sum(BehaviorLog.undetected),
        func.sum(BehaviorLog.total_detected)
    ).filter(
        BehaviorLog.session_id == session_id,
        BehaviorLog.timestamp >= window_start,
        BehaviorLog.timestamp < window_end
    ).first()

    log_count = stats[0] or 0
    if log_count == 0:
        return

    attentive_sum = stats[1] or 0
    phone_sum = stats[2] or 0
    sleeping_sum = stats[3] or 0
    writing_sum = stats[4] or 0
    raising_sum = stats[5] or 0
    undetected_sum = stats[6] or 0
    total_detected = stats[7] or 0

    engagement_score = 0.0
    if total_detected > 0:
        engagement_score = ((attentive_sum + writing_sum + raising_sum) / total_detected) * 100

    metrics = db.query(SessionMetricsModel).filter(
        SessionMetricsModel.session_id == session_id,
        SessionMetricsModel.window_start == window_start,
        SessionMetricsModel.window_end == window_end
    ).first()

    if not metrics:
        metrics = SessionMetricsModel(
            session_id=session_id,
            window_start=window_start,
            window_end=window_end
        )
        db.add(metrics)

    metrics.total_detected = total_detected
    metrics.attentive_avg = round(attentive_sum / log_count, 2)
    metrics.phone_avg = round(phone_sum / log_count, 2)
    metrics.sleeping_avg = round(sleeping_sum / log_count, 2)
    metrics.writing_avg = round(writing_sum / log_count, 2)
    metrics.raising_hand_avg = round(raising_sum / log_count, 2)
    metrics.undetected_avg = round(undetected_sum / log_count, 2)
    metrics.engagement_score = round(engagement_score, 2)

    db.commit()

def _record_engagement_event(db: Session, session_id: int, event_type: str, severity: str, notes: str) -> None:
    event = EngagementEvent(
        session_id=session_id,
        event_type=event_type,
        severity=severity,
        notes=notes
    )
    db.add(event)
    db.commit()

def _record_recovery_if_needed(db: Session, session_id: int, engagement_ratio: float) -> None:
    ten_min_ago = datetime.now() - timedelta(minutes=10)
    last_event = db.query(EngagementEvent).filter(
        EngagementEvent.session_id == session_id,
        EngagementEvent.event_time >= ten_min_ago
    ).order_by(EngagementEvent.event_time.desc()).first()

    if last_event and last_event.event_type == "ENGAGEMENT_DROP":
        msg = f"Engagement recovery: {int(engagement_ratio*100)}% positive behaviors."
        _record_engagement_event(db, session_id, "RECOVERY", AlertSeverity.WARNING.value, msg)

def _record_session_history(db: Session, session: ClassSession, user_id: int, change_type: str) -> None:
    history = SessionHistory(
        session_id=session.id,
        changed_by=user_id,
        change_type=change_type,
        prev_start_time=session.start_time,
        prev_end_time=session.end_time,
        prev_is_active=session.is_active,
        prev_total_students_enrolled=session.total_students_enrolled
    )
    db.add(history)
    db.commit()

def _record_alert_history(db: Session, alert: Alert, user_id: int, change_type: str) -> None:
    history = AlertHistory(
        alert_id=alert.id,
        changed_by=user_id,
        change_type=change_type,
        prev_is_read=alert.is_read,
        prev_severity=alert.severity,
        prev_message=alert.message
    )
    db.add(history)
    db.commit()

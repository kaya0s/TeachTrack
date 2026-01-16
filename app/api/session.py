from datetime import datetime, timedelta
from typing import List, Any
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.api import deps
from app.db.database import get_db
from app.models.session import ClassSession, BehaviorLog, Alert, AlertType
from app.schemas.session import (
    SessionCreate, Session as SessionSchema, 
    BehaviorLogCreate, BehaviorLog as BehaviorLogSchema,
    Alert as AlertSchema, SessionMetrics
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
    
    logger.info(f"📡 Received Log for Session {session_id}: Sleep={log_in.sleeping}, Phone={log_in.using_phone}, Total={total}")

    # 2. Alert Logic
    # Check Sleeping
    if total > 0 and log_in.sleeping > 0:
        ratio = log_in.sleeping / total
        if ratio > 0.3 and total >= 5: # >30% sleeping
            msg = f"High sleeping detected: {log_in.sleeping} students ({int(ratio*100)}%)."
            _trigger_alert(db, session_id, AlertType.SLEEPING, msg)
            
    # Check Phone
    if total > 0 and log_in.using_phone > 0:
        ratio = log_in.using_phone / total
        if ratio > 0.2: # >20% using phone
            msg = f"Phone usage usage spike: {log_in.using_phone} students ({int(ratio*100)}%)."
            _trigger_alert(db, session_id, AlertType.PHONE, msg)

    return {"status": "logged"}

def _trigger_alert(db: Session, session_id: int, a_type: AlertType, msg: str):
    # Cooldown check: Check last alert of this type in last 5 mins
    five_min_ago = datetime.now() - timedelta(minutes=5)
    recent = db.query(Alert).filter(
        Alert.session_id == session_id,
        Alert.alert_type == a_type,
        Alert.triggered_at >= five_min_ago
    ).first()
    
    if not recent:
        alert = Alert(session_id=session_id, alert_type=str(a_type), message=msg)
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

@router.put("/alerts/{alert_id}/read", response_model=AlertSchema)
def mark_alert_read(
        alert_id: int,
        db: Session = Depends(get_db),
        current_user = Depends(deps.get_current_active_user),
) -> Any:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return alert

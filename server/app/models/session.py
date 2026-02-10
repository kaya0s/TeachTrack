from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, BigInteger, DECIMAL
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum

class AlertType(str, enum.Enum):
    SLEEPING = "SLEEPING"
    PHONE = "PHONE"
    ENGAGEMENT_DROP = "ENGAGEMENT_DROP"

class AlertSeverity(str, enum.Enum):
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

class ClassSession(Base):
    __tablename__ = "class_sessions"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    section_id = Column(Integer, ForeignKey("class_sections.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Snapshot of context
    total_students_enrolled = Column(Integer, default=0)

    teacher = relationship("User", back_populates="sessions")
    section = relationship("ClassSection", back_populates="sessions")
    subject = relationship("Subject", back_populates="sessions")
    
    logs = relationship("BehaviorLog", back_populates="session", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="session", cascade="all, delete-orphan")

class BehaviorLog(Base):
    __tablename__ = "behavior_logs"

    id = Column(BigInteger, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("class_sessions.id"))
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Counts
    raising_hand = Column(Integer, default=0)
    sleeping = Column(Integer, default=0)
    writing = Column(Integer, default=0)
    using_phone = Column(Integer, default=0)
    attentive = Column(Integer, default=0)
    undetected = Column(Integer, default=0)
    
    total_detected = Column(Integer, default=0)

    session = relationship("ClassSession", back_populates="logs")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("class_sessions.id"))
    
    alert_type = Column(String(50)) # Storing Enum as string for simplicity in DB, or use Enum type
    message = Column(String(255))
    triggered_at = Column(DateTime(timezone=True), server_default=func.now())
    severity = Column(String(20), default=AlertSeverity.WARNING.value)
    is_read = Column(Boolean, default=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    session = relationship("ClassSession", back_populates="alerts")

class SessionMetrics(Base):
    __tablename__ = "session_metrics"

    id = Column(BigInteger, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("class_sessions.id"))
    window_start = Column(DateTime(timezone=True), nullable=False)
    window_end = Column(DateTime(timezone=True), nullable=False)

    total_detected = Column(Integer, nullable=False, default=0)
    attentive_avg = Column(DECIMAL(5, 2), nullable=False, default=0)
    phone_avg = Column(DECIMAL(5, 2), nullable=False, default=0)
    sleeping_avg = Column(DECIMAL(5, 2), nullable=False, default=0)
    writing_avg = Column(DECIMAL(5, 2), nullable=False, default=0)
    raising_hand_avg = Column(DECIMAL(5, 2), nullable=False, default=0)
    undetected_avg = Column(DECIMAL(5, 2), nullable=False, default=0)

    engagement_score = Column(DECIMAL(5, 2), nullable=False, default=0)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("ClassSession")

class EngagementEvent(Base):
    __tablename__ = "engagement_events"

    id = Column(BigInteger, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("class_sessions.id"))
    event_time = Column(DateTime(timezone=True), server_default=func.now())
    event_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)
    notes = Column(String(255), nullable=True)

    session = relationship("ClassSession")

class SessionHistory(Base):
    __tablename__ = "session_history"

    id = Column(BigInteger, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("class_sessions.id"))
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    change_type = Column(String(20), nullable=False)
    prev_start_time = Column(DateTime(timezone=True), nullable=True)
    prev_end_time = Column(DateTime(timezone=True), nullable=True)
    prev_is_active = Column(Boolean, nullable=True)
    prev_total_students_enrolled = Column(Integer, nullable=True)

    session = relationship("ClassSession")

class AlertHistory(Base):
    __tablename__ = "alerts_history"

    id = Column(BigInteger, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"))
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    change_type = Column(String(20), nullable=False)
    prev_is_read = Column(Boolean, nullable=True)
    prev_severity = Column(String(20), nullable=True)
    prev_message = Column(String(255), nullable=True)

    alert = relationship("Alert")

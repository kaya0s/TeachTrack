from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, BigInteger, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum

class AlertType(str, enum.Enum):
    SLEEPING = "SLEEPING"
    PHONE = "PHONE"
    ENGAGEMENT_DROP = "ENGAGEMENT_DROP"

class ClassSession(Base):
    __tablename__ = "class_sessions"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    section_id = Column(Integer, ForeignKey("class_sections.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    
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
    is_read = Column(Boolean, default=False)

    session = relationship("ClassSession", back_populates="alerts")

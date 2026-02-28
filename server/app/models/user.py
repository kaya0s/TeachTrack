
from sqlalchemy import Boolean, Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    username = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    reset_code = Column(String(128), nullable=True)
    reset_code_expires = Column(Integer, nullable=True) # Unix timestamp
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    subjects = relationship("Subject", back_populates="teacher")
    sections = relationship("ClassSection", back_populates="teacher")
    sessions = relationship("ClassSession", back_populates="teacher")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

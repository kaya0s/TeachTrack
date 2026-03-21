from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.sql import func

from app.db.database import Base


class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    config = Column(JSON, nullable=False, default=dict)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

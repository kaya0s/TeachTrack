from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, BigInteger
from sqlalchemy.sql import func
from app.db.database import Base


class BackupRun(Base):
    __tablename__ = "backup_runs"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(String(20), nullable=False, default="running")  # running, success, failed
    filename = Column(String(255), nullable=True)
    file_size_bytes = Column(BigInteger, nullable=True)
    drive_file_id = Column(String(255), nullable=True)
    drive_link = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    error_message = Column(Text, nullable=True)

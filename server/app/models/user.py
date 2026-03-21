
from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey, event
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    firstname = Column(String(100), nullable=True)
    lastname = Column(String(100), nullable=True)
    fullname = Column(String(201), index=True, nullable=True)
    age = Column(Integer, nullable=True)
    email = Column(String(255), unique=True, index=True)
    username = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(255))
    role = Column(String(32), nullable=False, server_default="teacher")
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    reset_code = Column(String(128), nullable=True)
    reset_code_expires = Column(Integer, nullable=True) # Unix timestamp
    profile_picture_url = Column(String(512), nullable=True)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    sections = relationship("ClassSection", back_populates="teacher")
    sessions = relationship("ClassSession", back_populates="teacher")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    college = relationship("College", back_populates="teachers")

    @property
    def college_name(self) -> str | None:
        return self.college.name if self.college else None


def _compose_fullname(firstname: str | None, lastname: str | None) -> str | None:
    first = (firstname or "").strip()
    last = (lastname or "").strip()
    composed = " ".join(part for part in [first, last] if part)
    return composed or None


@event.listens_for(User, "before_insert")
@event.listens_for(User, "before_update")
def _sync_fullname(_mapper, _connection, target: User) -> None:
    target.fullname = _compose_fullname(target.firstname, target.lastname)

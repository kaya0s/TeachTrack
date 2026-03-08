from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=True)
    description = Column(Text, nullable=True)
    cover_image_url = Column(String(500), nullable=True)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    teacher = relationship("User", back_populates="subjects")
    college = relationship("College", back_populates="subjects")
    sections = relationship("ClassSection", back_populates="subject")
    sessions = relationship("ClassSession", back_populates="subject")

    @property
    def teacher_username(self) -> str | None:
        return self.teacher.username if self.teacher else None

    @property
    def section_names(self) -> list[str]:
        return [cs.section.name for cs in self.sections if cs.section]




class College(Base):
    __tablename__ = "colleges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    logo_path = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    majors = relationship("Major", back_populates="college")
    subjects = relationship("Subject", back_populates="college")


class Major(Base):
    __tablename__ = "majors"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=False) # e.g. BSIT, BSBA
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    college = relationship("College", back_populates="majors")
    sections = relationship("Section", back_populates="major")


class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)  # This will be the auto-generated code
    major_id = Column(Integer, ForeignKey("majors.id"), nullable=True)
    year_level = Column(Integer, nullable=True)
    section_letter = Column(String(10), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    major = relationship("Major", back_populates="sections")
    class_assignments = relationship("ClassSection", back_populates="section", cascade="all, delete-orphan")


class ClassSection(Base):
    __tablename__ = "class_sections"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    teacher_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    section = relationship("Section", back_populates="class_assignments")
    teacher = relationship("User", back_populates="sections")
    subject = relationship("Subject", back_populates="sections")
    sessions = relationship("ClassSession", back_populates="section")

    @property
    def name(self) -> str:
        return self.section.name if self.section else "Unknown"

    @property
    def teacher_username(self) -> str | None:
        return self.teacher.username if self.teacher else None

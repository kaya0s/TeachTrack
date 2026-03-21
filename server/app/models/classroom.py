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
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    college = relationship("College", back_populates="subjects")
    sections = relationship("ClassSection", back_populates="subject")
    sessions = relationship("ClassSession", back_populates="subject")


    @property
    def college_logo_path(self) -> str | None:
        return self.college.logo_path if self.college else None

    @property
    def section_names(self) -> list[str]:
        return [cs.name for cs in self.sections]




class College(Base):
    __tablename__ = "colleges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    acronym = Column(String(20), nullable=True)
    logo_path = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    majors = relationship("Major", back_populates="college")
    subjects = relationship("Subject", back_populates="college")
    teachers = relationship("User", back_populates="college")


class Major(Base):
    __tablename__ = "majors"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=False) # e.g. BSIT, BSBA
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    college = relationship("College", back_populates="majors")
    # Previously this pointed to `Section` pool. Sections are now embedded
    # on `ClassSection` so expose class_assignments/class_sections instead.
    class_sections = relationship("ClassSection", back_populates="major")


class ClassSection(Base):
    __tablename__ = "class_sections"

    id = Column(Integer, primary_key=True, index=True)
    # Embedded section fields (previously in `sections` pool)
    name = Column(String(100), nullable=False)
    major_id = Column(Integer, ForeignKey("majors.id"), nullable=True)
    year_level = Column(Integer, nullable=True)
    section_letter = Column(String(10), nullable=True)

    subject_id = Column(Integer, ForeignKey("subjects.id"))
    teacher_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # relationships
    major = relationship("Major", back_populates="class_sections")
    teacher = relationship("User", back_populates="sections")
    subject = relationship("Subject", back_populates="sections")
    sessions = relationship("ClassSession", back_populates="section")

    @property
    def teacher_username(self) -> str | None:
        return self.teacher.username if self.teacher else None

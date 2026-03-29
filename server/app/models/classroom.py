from __future__ import annotations

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class College(Base):
    __tablename__ = "colleges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    acronym = Column(String(20), nullable=True)
    logo_path = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    departments = relationship("Department", back_populates="college")
    teachers = relationship("User", back_populates="college")


class Department(Base):
    __tablename__ = "departments"
    __table_args__ = (UniqueConstraint("college_id", "name", name="uq_departments_college_name"),)

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    code = Column(String(30), nullable=True)
    cover_image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    college = relationship("College", back_populates="departments")
    majors = relationship("Major", back_populates="department")
    teachers = relationship("User", back_populates="department")


class Major(Base):
    __tablename__ = "majors"
    __table_args__ = (
        UniqueConstraint("department_id", "name", name="uq_majors_department_name"),
        UniqueConstraint("department_id", "code", name="uq_majors_department_code"),
    )

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=False)  # e.g. BS-Math, AB-Econ
    cover_image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    department = relationship("Department", back_populates="majors")
    subjects = relationship("Subject", back_populates="major")
    class_sections = relationship("ClassSection", back_populates="major")

    @property
    def college(self) -> College | None:
        return self.department.college if self.department else None

    @property
    def college_id(self) -> int | None:
        return self.department.college_id if self.department else None


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    major_id = Column(Integer, ForeignKey("majors.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=True)
    description = Column(Text, nullable=True)
    cover_image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    major = relationship("Major", back_populates="subjects")
    section_assignments = relationship("SectionSubjectAssignment", back_populates="subject")
    sessions = relationship("ClassSession", back_populates="subject")

    @property
    def department(self) -> Department | None:
        return self.major.department if self.major else None

    @property
    def college(self) -> College | None:
        return self.major.department.college if self.major and self.major.department else None

    @property
    def college_logo_path(self) -> str | None:
        college = self.college
        return college.logo_path if college else None

    @property
    def sections(self) -> list["ClassSection"]:
        return [assignment.section for assignment in self.section_assignments if assignment.section is not None]

    @property
    def section_names(self) -> list[str]:
        return [section.name for section in self.sections]


class ClassSection(Base):
    __tablename__ = "class_sections"
    __table_args__ = (
        UniqueConstraint("major_id", "year_level", "section_code", name="uq_class_sections_major_year_code"),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    major_id = Column(Integer, ForeignKey("majors.id"), nullable=False, index=True)
    year_level = Column(Integer, nullable=False)
    section_code = Column(String(10), nullable=False)

    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    major = relationship("Major", back_populates="class_sections")
    teacher = relationship("User", back_populates="sections")
    sessions = relationship("ClassSession", back_populates="section")
    subject_assignments = relationship("SectionSubjectAssignment", back_populates="section")

    @property
    def section_letter(self) -> str:
        # Backward-compatible alias for older API/UI fields.
        return self.section_code

    @section_letter.setter
    def section_letter(self, value: str | None) -> None:
        self.section_code = (value or "").strip().upper()

    @property
    def teacher_username(self) -> str | None:
        return self.teacher.username if self.teacher else None

    @property
    def subject_id(self) -> int | None:
        assignment = self.subject_assignments[0] if self.subject_assignments else None
        return assignment.subject_id if assignment else None

    @property
    def subject(self) -> "Subject" | None:
        assignment = self.subject_assignments[0] if self.subject_assignments else None
        return assignment.subject if assignment else None


class SectionSubjectAssignment(Base):
    __tablename__ = "section_subject_assignments"
    __table_args__ = (
        UniqueConstraint("section_id", "subject_id", name="uq_section_subject_assignment"),
    )

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("class_sections.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    section = relationship("ClassSection", back_populates="subject_assignments")
    subject = relationship("Subject", back_populates="section_assignments")
    teacher = relationship("User")

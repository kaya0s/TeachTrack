from __future__ import annotations

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

from app.models.classroom import (
    ClassSection,
    College,
    Department,
    Major,
    SectionSubjectAssignment,
    Subject,
)


def _teacher_visibility_filter(teacher_id: int):
    # Teacher sees explicit assignment rows or legacy section-level assignment rows.
    return or_(
        SectionSubjectAssignment.teacher_id == teacher_id,
        and_(SectionSubjectAssignment.teacher_id.is_(None), ClassSection.teacher_id == teacher_id),
    )


class ClassroomRepository:
    @staticmethod
    def list_colleges(db: Session) -> list[College]:
        return db.query(College).order_by(College.name.asc()).all()

    @staticmethod
    def list_subjects(db: Session, teacher_id: int, skip: int, limit: int) -> list[Subject]:
        subject_subquery = (
            db.query(SectionSubjectAssignment.subject_id)
            .join(ClassSection, SectionSubjectAssignment.section_id == ClassSection.id)
            .filter(_teacher_visibility_filter(teacher_id))
            .distinct()
            .subquery()
        )
        return (
            db.query(Subject)
            .options(joinedload(Subject.major).joinedload(Major.department).joinedload(Department.college))
            .options(
                joinedload(Subject.section_assignments).joinedload(SectionSubjectAssignment.section).joinedload(ClassSection.teacher)
            )
            .options(joinedload(Subject.section_assignments).joinedload(SectionSubjectAssignment.teacher))
            .filter(Subject.id.in_(subject_subquery))
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_subject(db: Session, subject_id: int, teacher_id: int, with_sections: bool = True) -> Subject | None:
        subject_subquery = (
            db.query(SectionSubjectAssignment.subject_id)
            .join(ClassSection, SectionSubjectAssignment.section_id == ClassSection.id)
            .filter(_teacher_visibility_filter(teacher_id))
            .distinct()
            .subquery()
        )
        query = db.query(Subject).options(joinedload(Subject.major).joinedload(Major.department).joinedload(Department.college))
        if with_sections:
            query = query.options(
                joinedload(Subject.section_assignments).joinedload(SectionSubjectAssignment.section).joinedload(ClassSection.teacher),
                joinedload(Subject.section_assignments).joinedload(SectionSubjectAssignment.teacher),
            )
        return query.filter(
            Subject.id == subject_id,
            Subject.id.in_(subject_subquery),
        ).first()

    @staticmethod
    def save_subject(db: Session, subject: Subject) -> Subject:
        db.add(subject)
        db.commit()
        db.refresh(subject)
        return subject

    @staticmethod
    def list_sections_by_subject(db: Session, subject_id: int) -> list[ClassSection]:
        return (
            db.query(ClassSection)
            .join(SectionSubjectAssignment, SectionSubjectAssignment.section_id == ClassSection.id)
            .options(joinedload(ClassSection.teacher))
            .options(joinedload(ClassSection.major).joinedload(Major.department).joinedload(Department.college))
            .options(joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.subject))
            .options(joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.teacher))
            .filter(SectionSubjectAssignment.subject_id == subject_id)
            .order_by(ClassSection.id.asc())
            .all()
        )

    @staticmethod
    def list_sections(db: Session, teacher_id: int, skip: int, limit: int) -> list[ClassSection]:
        return (
            db.query(ClassSection)
            .join(SectionSubjectAssignment, SectionSubjectAssignment.section_id == ClassSection.id)
            .options(joinedload(ClassSection.teacher))
            .options(joinedload(ClassSection.major).joinedload(Major.department).joinedload(Department.college))
            .options(joinedload(ClassSection.subject_assignments).joinedload(SectionSubjectAssignment.subject))
            .filter(_teacher_visibility_filter(teacher_id))
            .distinct()
            .offset(skip)
            .limit(limit)
            .all()
        )

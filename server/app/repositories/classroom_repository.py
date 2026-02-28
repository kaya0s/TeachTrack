from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.classroom import Subject, ClassSection


class ClassroomRepository:
    @staticmethod
    def list_subjects(db: Session, teacher_id: int, skip: int, limit: int) -> list[Subject]:
        section_subquery = (
            db.query(ClassSection.subject_id)
            .filter(ClassSection.teacher_id == teacher_id)
            .subquery()
        )
        return (
            db.query(Subject)
            .options(joinedload(Subject.sections).joinedload(ClassSection.teacher))
            .options(joinedload(Subject.teacher))
            .filter(
                or_(
                    Subject.teacher_id == teacher_id,
                    Subject.id.in_(section_subquery),
                )
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_subject(db: Session, subject_id: int, teacher_id: int, with_sections: bool = True) -> Subject | None:
        # Allow fetching a subject if the teacher owns it at the subject level
        # OR is assigned to at least one section within it.
        section_subquery = (
            db.query(ClassSection.subject_id)
            .filter(ClassSection.teacher_id == teacher_id)
            .subquery()
        )
        query = db.query(Subject).options(joinedload(Subject.teacher))
        if with_sections:
            query = query.options(joinedload(Subject.sections).joinedload(ClassSection.teacher))
        return query.filter(
            Subject.id == subject_id,
            or_(
                Subject.teacher_id == teacher_id,
                Subject.id.in_(section_subquery),
            ),
        ).first()

    @staticmethod
    def create_subject(db: Session, subject: Subject) -> Subject:
        db.add(subject)
        db.commit()
        db.refresh(subject)
        return subject

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
            .options(joinedload(ClassSection.teacher))
            .filter(ClassSection.subject_id == subject_id)
            .order_by(ClassSection.id.asc())
            .all()
        )

    @staticmethod
    def list_sections(db: Session, teacher_id: int, skip: int, limit: int) -> list[ClassSection]:
        # Return sections where the teacher is assigned directly to the section
        # OR where the teacher owns the parent subject.
        return (
            db.query(ClassSection)
            .options(joinedload(ClassSection.teacher))
            .join(Subject, ClassSection.subject_id == Subject.id)
            .filter(
                or_(
                    ClassSection.teacher_id == teacher_id,
                    Subject.teacher_id == teacher_id,
                )
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def create_section(db: Session, section: ClassSection) -> ClassSection:
        db.add(section)
        db.commit()
        db.refresh(section)
        return section

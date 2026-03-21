from sqlalchemy.orm import Session, joinedload

from app.models.classroom import College, Subject, ClassSection, Major


class ClassroomRepository:
    @staticmethod
    def list_colleges(db: Session) -> list[College]:
        return db.query(College).order_by(College.name.asc()).all()

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
            .options(joinedload(Subject.sections).joinedload(ClassSection.major).joinedload(Major.college))
            .options(joinedload(Subject.college))
            .filter(Subject.id.in_(section_subquery))
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_subject(db: Session, subject_id: int, teacher_id: int, with_sections: bool = True) -> Subject | None:
        # Subject is visible to a teacher only when they are assigned to
        # at least one section under that subject.
        section_subquery = (
            db.query(ClassSection.subject_id)
            .filter(ClassSection.teacher_id == teacher_id)
            .subquery()
        )
        query = db.query(Subject)
        if with_sections:
            query = query.options(joinedload(Subject.sections).joinedload(ClassSection.teacher))
        return query.filter(
            Subject.id == subject_id,
            Subject.id.in_(section_subquery),
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
            .options(joinedload(ClassSection.teacher))
            .filter(ClassSection.subject_id == subject_id)
            .order_by(ClassSection.id.asc())
            .all()
        )

    @staticmethod
    def list_sections(db: Session, teacher_id: int, skip: int, limit: int) -> list[ClassSection]:
        # Return sections only where the teacher is assigned directly.
        return (
            db.query(ClassSection)
            .options(joinedload(ClassSection.teacher))
            .filter(ClassSection.teacher_id == teacher_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

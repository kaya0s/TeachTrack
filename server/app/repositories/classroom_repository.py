from sqlalchemy.orm import Session, joinedload

from app.models.classroom import Subject, ClassSection


class ClassroomRepository:
    @staticmethod
    def list_subjects(db: Session, teacher_id: int, skip: int, limit: int) -> list[Subject]:
        return (
            db.query(Subject)
            .options(joinedload(Subject.sections))
            .filter(Subject.teacher_id == teacher_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_subject(db: Session, subject_id: int, teacher_id: int, with_sections: bool = True) -> Subject | None:
        query = db.query(Subject)
        if with_sections:
            query = query.options(joinedload(Subject.sections))
        return query.filter(Subject.id == subject_id, Subject.teacher_id == teacher_id).first()

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
            .filter(ClassSection.subject_id == subject_id)
            .order_by(ClassSection.id.asc())
            .all()
        )

    @staticmethod
    def list_sections(db: Session, teacher_id: int, skip: int, limit: int) -> list[ClassSection]:
        return (
            db.query(ClassSection)
            .join(Subject, ClassSection.subject_id == Subject.id)
            .filter(Subject.teacher_id == teacher_id)
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

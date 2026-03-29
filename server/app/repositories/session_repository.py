from typing import Iterable
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.session import ClassSession, BehaviorLog, Alert


class SessionRepository:
    @staticmethod
    def get_session(db: Session, session_id: int, teacher_id: int | None = None) -> ClassSession | None:
        query = db.query(ClassSession).filter(ClassSession.id == session_id)
        if teacher_id is not None:
            query = query.filter(ClassSession.teacher_id == teacher_id)
        return query.first()

    @staticmethod
    def get_active_session(db: Session, session_id: int, teacher_id: int | None = None) -> ClassSession | None:
        query = db.query(ClassSession).filter(ClassSession.id == session_id, ClassSession.is_active == True)
        if teacher_id is not None:
            query = query.filter(ClassSession.teacher_id == teacher_id)
        return query.first()

    @staticmethod
    def list_sessions(db: Session, teacher_id: int, include_active: bool, limit: int) -> list[ClassSession]:
        query = db.query(ClassSession).options(
            joinedload(ClassSession.subject),
            joinedload(ClassSession.section),
        ).filter(ClassSession.teacher_id == teacher_id)

        if not include_active:
            query = query.filter(ClassSession.is_active == False)

        return query.order_by(ClassSession.start_time.desc()).limit(limit).all()

    @staticmethod
    def aggregate_behavior(db: Session, session_ids: Iterable[int]):
        ids = list(session_ids)
        if not ids:
            return {}
        rows = db.query(
            BehaviorLog.session_id,
            func.sum(BehaviorLog.on_task),
            func.sum(BehaviorLog.using_phone),
            func.sum(BehaviorLog.sleeping),
            func.sum(BehaviorLog.off_task),
            func.count(BehaviorLog.id),
        ).filter(BehaviorLog.session_id.in_(ids)).group_by(BehaviorLog.session_id).all()
        return {row[0]: row for row in rows}

    @staticmethod
    def get_alert(db: Session, alert_id: int, teacher_id: int | None = None) -> Alert | None:
        query = db.query(Alert).join(ClassSession, Alert.session_id == ClassSession.id).filter(Alert.id == alert_id)
        if teacher_id is not None:
            query = query.filter(ClassSession.teacher_id == teacher_id)
        return query.first()

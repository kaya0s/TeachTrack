from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.classroom import College, Major, ClassSection
from app.models.user import User
from app.models.session import ClassSession
from app.services import audit_service
from app.constants import DEFAULT_PAGE_SIZE
from app.core.pagination import clamp_pagination


def list_colleges(db: Session, skip: int = 0, limit: int = DEFAULT_PAGE_SIZE, q: Optional[str] = None):
    skip, limit = clamp_pagination(skip, limit)
    query = db.query(College).options(joinedload(College.majors))
    if q:
        query = query.filter(College.name.ilike(f"%{q}%") | College.acronym.ilike(f"%{q}%"))
    total = query.count()
    items = query.order_by(College.name.asc()).offset(skip).limit(limit).all()
    return {"total": total, "items": items}


def create_college(db: Session, payload: dict[str, Any], actor_user_id: int) -> College:
    name = str(payload.get("name") or "").strip()
    acronym = str(payload.get("acronym") or "").strip().upper() or None
    if not name:
        raise HTTPException(status_code=400, detail="College name is required.")
    
    if db.query(College).filter(College.name == name).first():
        raise HTTPException(status_code=400, detail="College with this name already exists.")

    college = College(name=name, acronym=acronym)
    db.add(college)
    db.flush()

    audit_service.write_audit_log(
        db,
        actor_user_id=actor_user_id,
        actor_username=None,
        action="COLLEGE_CREATE",
        entity_type="College",
        entity_id=college.id,
        details={"name": name, "acronym": acronym},
    )
    db.commit()
    db.refresh(college)
    return college


def update_college(db: Session, college_id: int, payload: dict[str, Any], actor_user_id: int) -> College:
    college = db.query(College).filter(College.id == college_id).first()
    if not college:
        raise HTTPException(status_code=404, detail="College not found.")

    if "name" in payload:
        name = str(payload["name"]).strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty.")
        if db.query(College).filter(College.name == name, College.id != college_id).first():
            raise HTTPException(status_code=400, detail="Another college with this name exists.")
        college.name = name

    if "acronym" in payload:
        college.acronym = str(payload["acronym"]).strip().upper() or None

    db.add(college)
    audit_service.write_audit_log(
        db,
        actor_user_id=actor_user_id,
        actor_username=None,
        action="COLLEGE_UPDATE",
        entity_type="College",
        entity_id=college.id,
        details=payload,
    )
    db.commit()
    db.refresh(college)
    return college


def delete_college(db: Session, college_id: int, actor_user_id: int) -> dict[str, Any]:
    college = db.query(College).filter(College.id == college_id).first()
    if not college:
        raise HTTPException(status_code=404, detail="College not found.")

    # Check for relations
    if db.query(User).filter(User.college_id == college_id).first():
        raise HTTPException(status_code=400, detail="Cannot delete college with linked teachers.")
    if db.query(Major).filter(Major.college_id == college_id).first():
        raise HTTPException(status_code=400, detail="Delete related majors first.")

    db.delete(college)
    audit_service.write_audit_log(
        db,
        actor_user_id=actor_user_id,
        actor_username=None,
        action="COLLEGE_DELETE",
        entity_type="College",
        entity_id=college_id,
        details={"name": college.name},
    )
    db.commit()
    return {"message": "College deleted successfully"}


def list_majors(db: Session, college_id: Optional[int] = None, skip: int = 0, limit: int = DEFAULT_PAGE_SIZE, q: Optional[str] = None):
    skip, limit = clamp_pagination(skip, limit)
    query = db.query(Major)
    if college_id:
        query = query.filter(Major.college_id == college_id)
    if q:
        query = query.filter(Major.name.ilike(f"%{q}%"))
    total = query.count()
    items = query.order_by(Major.name.asc()).offset(skip).limit(limit).all()
    return {"total": total, "items": items}


def get_college_details(db: Session, college_id: int) -> dict[str, Any]:
    college = db.query(College).filter(College.id == college_id).first()
    if not college:
        raise HTTPException(status_code=404, detail="College not found")

    teachers = (
        db.query(User)
        .filter(User.college_id == college_id, User.is_active == True)
        .order_by(User.fullname.asc())
        .all()
    )
    teacher_ids = [t.id for t in teachers]

    total_sessions = 0
    active_sessions_count = 0
    avg_sessions_per_teacher = 0.0

    if teacher_ids:
        total_sessions = (
            db.query(func.count(ClassSession.id))
            .filter(ClassSession.teacher_id.in_(teacher_ids))
            .scalar()
        ) or 0
        active_sessions_count = (
            db.query(func.count(ClassSession.id))
            .filter(
                ClassSession.teacher_id.in_(teacher_ids), ClassSession.is_active == True
            )
            .scalar()
        ) or 0
        avg_sessions_per_teacher = float(total_sessions) / len(teacher_ids)

    return {
        "id": college.id,
        "name": college.name,
        "acronym": college.acronym,
        "logo_path": college.logo_path,
        "teachers_count": len(teachers),
        "teachers": [
            {
                "id": t.id,
                "fullname": t.fullname or t.username,
                "email": t.email,
                "profile_picture_url": t.profile_picture_url,
            }
            for t in teachers
        ],
        "total_sessions": total_sessions,
        "active_sessions": active_sessions_count,
        "avg_sessions_per_teacher": round(avg_sessions_per_teacher, 1),
        "majors_count": len(college.majors),
        "majors": college.majors,
    }

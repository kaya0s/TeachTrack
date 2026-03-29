from __future__ import annotations

from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.constants import DEFAULT_PAGE_SIZE
from app.core.pagination import clamp_pagination
from app.models.classroom import ClassSection, College, Department, Major, Subject
from app.models.session import ClassSession
from app.models.user import User
from app.services import audit_service
from app.services.admin.security_service import verify_admin_password_or_401


def _serialize_department(row: Department) -> dict[str, Any]:
    return {
        "id": row.id,
        "college_id": row.college_id,
        "college_name": row.college.name if row.college else None,
        "name": row.name,
        "code": row.code,
        "cover_image_url": row.cover_image_url,
        "created_at": row.created_at,
    }


def _serialize_major(row: Major) -> dict[str, Any]:
    department = row.department
    college = department.college if department else None
    return {
        "id": row.id,
        "department_id": row.department_id,
        "department_name": department.name if department else None,
        "college_id": college.id if college else None,
        "college_name": college.name if college else None,
        "name": row.name,
        "code": row.code,
        "cover_image_url": row.cover_image_url,
        "created_at": row.created_at,
    }


def list_colleges(
    db: Session,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    q: Optional[str] = None,
) -> dict[str, Any]:
    skip, limit = clamp_pagination(skip, limit)
    query = db.query(College).options(joinedload(College.departments).joinedload(Department.majors))
    if q:
        query = query.filter(College.name.ilike(f"%{q}%") | College.acronym.ilike(f"%{q}%"))
    total = query.count()
    rows = query.order_by(College.name.asc()).offset(skip).limit(limit).all()
    items = []
    for row in rows:
        majors = []
        for department in row.departments or []:
            majors.extend(
                {
                    "id": major.id,
                    "department_id": major.department_id,
                    "department_name": department.name,
                    "college_id": row.id,
                    "college_name": row.name,
                    "name": major.name,
                    "code": major.code,
                    "cover_image_url": major.cover_image_url,
                    "created_at": major.created_at,
                }
                for major in (department.majors or [])
            )
        items.append(
            {
                "id": row.id,
                "name": row.name,
                "acronym": row.acronym,
                "logo_path": row.logo_path,
                "majors_count": len(majors),
                "majors": majors,
                "created_at": row.created_at,
            }
        )
    return {"total": total, "items": items}


def create_college(db: Session, payload: dict[str, Any], actor_user_id: int) -> College:
    name = str(payload.get("name") or "").strip()
    acronym = str(payload.get("acronym") or "").strip().upper() or None
    logo_path = str(payload.get("logo_path") or "").strip() or None
    if not name:
        raise HTTPException(status_code=400, detail="College name is required.")
    if db.query(College).filter(College.name == name).first():
        raise HTTPException(status_code=400, detail="College with this name already exists.")

    college = College(name=name, acronym=acronym, logo_path=logo_path)
    db.add(college)
    db.flush()

    audit_service.write_audit_log(
        db,
        actor_user_id=actor_user_id,
        actor_username=None,
        action="COLLEGE_CREATE",
        entity_type="College",
        entity_id=college.id,
        details={"name": name, "acronym": acronym, "logo_path": logo_path},
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
    if "logo_path" in payload:
        college.logo_path = str(payload["logo_path"]).strip() or None

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


def delete_college(db: Session, college_id: int, actor_user_id: int, confirm_password: str) -> dict[str, Any]:
    verify_admin_password_or_401(db, actor_user_id=actor_user_id, confirm_password=confirm_password)

    college = db.query(College).filter(College.id == college_id).first()
    if not college:
        raise HTTPException(status_code=404, detail="College not found.")

    if db.query(User).filter(User.college_id == college_id).first():
        raise HTTPException(status_code=400, detail="Cannot delete college with linked teachers.")
    if db.query(Department).filter(Department.college_id == college_id).first():
        raise HTTPException(status_code=400, detail="Delete related departments first.")

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


def list_departments(
    db: Session,
    college_id: Optional[int] = None,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    q: Optional[str] = None,
) -> dict[str, Any]:
    skip, limit = clamp_pagination(skip, limit)
    query = db.query(Department).options(joinedload(Department.college))
    if college_id is not None:
        query = query.filter(Department.college_id == college_id)
    if q:
        query = query.filter(Department.name.ilike(f"%{q}%") | Department.code.ilike(f"%{q}%"))
    total = query.count()
    rows = query.order_by(Department.name.asc()).offset(skip).limit(limit).all()
    return {"total": total, "items": [_serialize_department(row) for row in rows]}


def create_department(db: Session, payload: dict[str, Any], actor_user_id: int) -> dict[str, Any]:
    college_id = payload.get("college_id")
    name = str(payload.get("name") or "").strip()
    code = str(payload.get("code") or "").strip().upper() or None
    cover_image_url = str(payload.get("cover_image_url") or "").strip() or None
    if not college_id:
        raise HTTPException(status_code=400, detail="college_id is required.")
    if not name:
        raise HTTPException(status_code=400, detail="Department name is required.")

    college = db.query(College).filter(College.id == int(college_id)).first()
    if not college:
        raise HTTPException(status_code=404, detail="College not found.")

    existing = (
        db.query(Department)
        .filter(Department.college_id == int(college_id), func.lower(Department.name) == name.lower())
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Department already exists in this college.")

    row = Department(college_id=int(college_id), name=name, code=code, cover_image_url=cover_image_url)
    db.add(row)
    db.flush()
    audit_service.write_audit_log(
        db,
        actor_user_id=actor_user_id,
        actor_username=None,
        action="DEPARTMENT_CREATE",
        entity_type="Department",
        entity_id=row.id,
        details={"college_id": college_id, "name": name, "code": code, "cover_image_url": cover_image_url},
    )
    db.commit()
    db.refresh(row)
    return _serialize_department(row)


def update_department(db: Session, department_id: int, payload: dict[str, Any], actor_user_id: int) -> dict[str, Any]:
    row = db.query(Department).options(joinedload(Department.college)).filter(Department.id == department_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Department not found.")

    target_college_id = row.college_id
    target_name = row.name

    if "college_id" in payload and payload.get("college_id") is not None:
        college = db.query(College).filter(College.id == int(payload["college_id"])).first()
        if not college:
            raise HTTPException(status_code=404, detail="College not found.")
        target_college_id = int(payload["college_id"])
        row.college_id = target_college_id
    if "name" in payload and payload.get("name") is not None:
        name = str(payload["name"]).strip()
        if not name:
            raise HTTPException(status_code=400, detail="Department name cannot be empty.")
        target_name = name
        row.name = name
    if "code" in payload:
        row.code = str(payload.get("code") or "").strip().upper() or None
    if "cover_image_url" in payload:
        row.cover_image_url = str(payload.get("cover_image_url") or "").strip() or None

    duplicate = (
        db.query(Department)
        .filter(
            Department.college_id == target_college_id,
            func.lower(Department.name) == target_name.lower(),
            Department.id != row.id,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=400, detail="Another department with this name exists in this college.")

    db.add(row)
    audit_service.write_audit_log(
        db,
        actor_user_id=actor_user_id,
        actor_username=None,
        action="DEPARTMENT_UPDATE",
        entity_type="Department",
        entity_id=row.id,
        details=payload,
    )
    db.commit()
    db.refresh(row)
    return _serialize_department(row)


def delete_department(db: Session, department_id: int, actor_user_id: int, confirm_password: str) -> dict[str, Any]:
    verify_admin_password_or_401(db, actor_user_id=actor_user_id, confirm_password=confirm_password)

    row = db.query(Department).filter(Department.id == department_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Department not found.")
    if db.query(Major).filter(Major.department_id == department_id).first():
        raise HTTPException(status_code=400, detail="Delete related majors first.")

    db.delete(row)
    audit_service.write_audit_log(
        db,
        actor_user_id=actor_user_id,
        actor_username=None,
        action="DEPARTMENT_DELETE",
        entity_type="Department",
        entity_id=department_id,
        details={"name": row.name},
    )
    db.commit()
    return {"message": "Department deleted successfully"}


def list_majors(
    db: Session,
    college_id: Optional[int] = None,
    department_id: Optional[int] = None,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    q: Optional[str] = None,
) -> dict[str, Any]:
    skip, limit = clamp_pagination(skip, limit)
    query = db.query(Major).join(Department, Major.department_id == Department.id).options(
        joinedload(Major.department).joinedload(Department.college)
    )
    if college_id:
        query = query.filter(Department.college_id == college_id)
    if department_id:
        query = query.filter(Major.department_id == department_id)
    if q:
        query = query.filter(Major.name.ilike(f"%{q}%") | Major.code.ilike(f"%{q}%"))
    total = query.count()
    rows = query.order_by(Major.name.asc()).offset(skip).limit(limit).all()
    return {"total": total, "items": [_serialize_major(row) for row in rows]}


def create_major(db: Session, payload: dict[str, Any], actor_user_id: int) -> dict[str, Any]:
    department_id = payload.get("department_id")
    name = str(payload.get("name") or "").strip()
    code = str(payload.get("code") or "").strip().upper()
    cover_image_url = str(payload.get("cover_image_url") or "").strip() or None
    if not department_id:
        raise HTTPException(status_code=400, detail="department_id is required.")
    if not name:
        raise HTTPException(status_code=400, detail="Major name is required.")
    if not code:
        raise HTTPException(status_code=400, detail="Major code is required.")

    department = (
        db.query(Department)
        .options(joinedload(Department.college))
        .filter(Department.id == int(department_id))
        .first()
    )
    if not department:
        raise HTTPException(status_code=404, detail="Department not found.")

    duplicate_name = (
        db.query(Major)
        .filter(Major.department_id == int(department_id), func.lower(Major.name) == name.lower())
        .first()
    )
    if duplicate_name:
        raise HTTPException(status_code=400, detail="Major already exists in this department.")
    duplicate_code = (
        db.query(Major)
        .filter(Major.department_id == int(department_id), func.lower(Major.code) == code.lower())
        .first()
    )
    if duplicate_code:
        raise HTTPException(status_code=400, detail="Major code already exists in this department.")

    row = Major(department_id=int(department_id), name=name, code=code, cover_image_url=cover_image_url)
    db.add(row)
    db.flush()
    audit_service.write_audit_log(
        db,
        actor_user_id=actor_user_id,
        actor_username=None,
        action="MAJOR_CREATE",
        entity_type="Major",
        entity_id=row.id,
        details={"department_id": department_id, "name": name, "code": code, "cover_image_url": cover_image_url},
    )
    db.commit()
    row = (
        db.query(Major)
        .options(joinedload(Major.department).joinedload(Department.college))
        .filter(Major.id == row.id)
        .first()
    )
    return _serialize_major(row)


def update_major(db: Session, major_id: int, payload: dict[str, Any], actor_user_id: int) -> dict[str, Any]:
    row = (
        db.query(Major)
        .options(joinedload(Major.department).joinedload(Department.college))
        .filter(Major.id == major_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Major not found.")

    target_department_id = row.department_id
    target_name = row.name
    target_code = row.code

    if "department_id" in payload and payload.get("department_id") is not None:
        department = db.query(Department).filter(Department.id == int(payload["department_id"])).first()
        if not department:
            raise HTTPException(status_code=404, detail="Department not found.")
        target_department_id = int(payload["department_id"])
        row.department_id = target_department_id

    if "name" in payload and payload.get("name") is not None:
        target_name = str(payload["name"]).strip()
        if not target_name:
            raise HTTPException(status_code=400, detail="Major name cannot be empty.")
        row.name = target_name

    if "code" in payload and payload.get("code") is not None:
        target_code = str(payload["code"]).strip().upper()
        if not target_code:
            raise HTTPException(status_code=400, detail="Major code cannot be empty.")
        row.code = target_code
    if "cover_image_url" in payload:
        row.cover_image_url = str(payload.get("cover_image_url") or "").strip() or None

    duplicate_name = (
        db.query(Major)
        .filter(
            Major.department_id == target_department_id,
            func.lower(Major.name) == target_name.lower(),
            Major.id != row.id,
        )
        .first()
    )
    if duplicate_name:
        raise HTTPException(status_code=400, detail="Another major with this name exists in this department.")
    duplicate_code = (
        db.query(Major)
        .filter(
            Major.department_id == target_department_id,
            func.lower(Major.code) == target_code.lower(),
            Major.id != row.id,
        )
        .first()
    )
    if duplicate_code:
        raise HTTPException(status_code=400, detail="Another major with this code exists in this department.")

    db.add(row)
    audit_service.write_audit_log(
        db,
        actor_user_id=actor_user_id,
        actor_username=None,
        action="MAJOR_UPDATE",
        entity_type="Major",
        entity_id=row.id,
        details=payload,
    )
    db.commit()
    row = (
        db.query(Major)
        .options(joinedload(Major.department).joinedload(Department.college))
        .filter(Major.id == major_id)
        .first()
    )
    return _serialize_major(row)


def delete_major(db: Session, major_id: int, actor_user_id: int, confirm_password: str) -> dict[str, Any]:
    verify_admin_password_or_401(db, actor_user_id=actor_user_id, confirm_password=confirm_password)

    row = db.query(Major).filter(Major.id == major_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Major not found.")

    if db.query(Subject).filter(Subject.major_id == major_id).first():
        raise HTTPException(status_code=400, detail="Delete related subjects first.")
    if db.query(ClassSection).filter(ClassSection.major_id == major_id).first():
        raise HTTPException(status_code=400, detail="Delete related sections first.")

    db.delete(row)
    audit_service.write_audit_log(
        db,
        actor_user_id=actor_user_id,
        actor_username=None,
        action="MAJOR_DELETE",
        entity_type="Major",
        entity_id=major_id,
        details={"name": row.name, "code": row.code},
    )
    db.commit()
    return {"message": "Major deleted successfully"}


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
    departments = (
        db.query(Department)
        .options(joinedload(Department.college))
        .filter(Department.college_id == college_id)
        .order_by(Department.name.asc())
        .all()
    )
    majors = (
        db.query(Major)
        .join(Department, Major.department_id == Department.id)
        .options(joinedload(Major.department).joinedload(Department.college))
        .filter(Department.college_id == college_id)
        .order_by(Major.name.asc())
        .all()
    )

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
            .filter(ClassSession.teacher_id.in_(teacher_ids), ClassSession.is_active == True)
            .scalar()
        ) or 0
        avg_sessions_per_teacher = float(total_sessions) / len(teacher_ids)

    # include section counts grouped under this college through department->major
    _ = (
        db.query(func.count(ClassSection.id))
        .join(Major, ClassSection.major_id == Major.id)
        .join(Department, Major.department_id == Department.id)
        .filter(Department.college_id == college_id)
        .scalar()
        or 0
    )

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
        "departments_count": len(departments),
        "departments": [_serialize_department(d) for d in departments],
        "total_sessions": total_sessions,
        "active_sessions": active_sessions_count,
        "avg_sessions_per_teacher": round(avg_sessions_per_teacher, 1),
        "majors_count": len(majors),
        "majors": [_serialize_major(m) for m in majors],
    }

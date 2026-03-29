import json
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core import security
from app.constants import DEFAULT_PAGE_SIZE, MIN_PASSWORD_LENGTH, UserRole
from app.core.pagination import clamp_pagination
from app.models.user import User
from app.models.classroom import College, Department
from app.repositories.user_repository import UserRepository
from app.services import audit_service, notification_service
from app.services.admin.security_service import verify_admin_password_or_401
from app.utils.datetime import utc_now


def _to_float(value: Any) -> float:
    if value is None:
        return 0.0
    return float(value)


def _get_actor_username(db: Session, actor_user_id: int | None) -> str | None:
    if actor_user_id is None:
        return None
    actor = db.query(User).filter(User.id == actor_user_id).first()
    return _user_display_name(actor) if actor else None


def _user_display_name(user: User | None) -> str:
    if not user:
        return "unknown"
    full_name = (user.fullname or "").strip()
    if full_name:
        return full_name
    return user.username


def _teacher_name_fields(user: User | None) -> tuple[str, str | None]:
    if not user:
        return ("unknown", None)
    return (user.username, _user_display_name(user))


def _generate_unique_username(db: Session, email: str, firstname: str, lastname: str) -> str:
    local_part = email.split("@")[0].strip()
    if local_part:
        base = local_part
    else:
        base = f"{firstname}.{lastname}".strip(".").replace(" ", ".").lower()
    if not base:
        base = "teacher"

    username = base
    suffix = 1
    while UserRepository.get_by_username(db, username):
        username = f"{base}{suffix}"
        suffix += 1
    return username


def list_users(
    db: Session,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    q: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_superuser: Optional[bool] = None,
) -> dict[str, Any]:
    skip, limit = clamp_pagination(skip, limit)
    query = db.query(User)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(
            (User.username.like(pattern))
            | (User.email.like(pattern))
            | (User.fullname.like(pattern))
            | (User.firstname.like(pattern))
            | (User.lastname.like(pattern))
        )
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if is_superuser is not None:
        query = query.filter(User.is_superuser == is_superuser)

    total = query.count()
    items = (
        query.order_by(User.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {"total": total, "items": items}


def list_teachers(
    db: Session,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    q: Optional[str] = None,
    is_active: Optional[bool] = None,
    college_id: Optional[int] = None,
    department_id: Optional[int] = None,
) -> dict[str, Any]:
    skip, limit = clamp_pagination(skip, limit)
    query = (
        db.query(User)
        .options(joinedload(User.college), joinedload(User.department))
        .filter(User.is_superuser == False, User.role == UserRole.TEACHER.value)
    )
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(
            (User.username.like(pattern))
            | (User.email.like(pattern))
            | (User.fullname.like(pattern))
            | (User.firstname.like(pattern))
            | (User.lastname.like(pattern))
        )
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if college_id is not None:
        query = query.filter(User.college_id == college_id)
    if department_id is not None:
        query = query.filter(User.department_id == department_id)

    total = query.count()
    items = (
        query.order_by(User.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {"total": total, "items": items}


def create_teacher(db: Session, payload: dict[str, Any], actor_user_id: int) -> User:
    firstname = str(payload.get("firstname") or "").strip()
    lastname = str(payload.get("lastname") or "").strip()
    age = payload.get("age")
    email = str(payload.get("email") or "").strip().lower()
    password = str(payload.get("password") or "")
    college_id = payload.get("college_id")
    department_id = payload.get("department_id")

    if not firstname or not lastname:
        raise HTTPException(status_code=400, detail="First name and last name are required.")
    if age is None or int(age) < 1 or int(age) > 120:
        raise HTTPException(status_code=400, detail="Age must be between 1 and 120.")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    if len(password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters long.",
        )
    if college_id is None:
        raise HTTPException(status_code=400, detail="College is required.")
    if department_id is None:
        raise HTTPException(status_code=400, detail="Department is required.")

    college = db.query(College).filter(College.id == int(college_id)).first()
    if not college:
        raise HTTPException(status_code=404, detail="College not found.")
    department = (
        db.query(Department)
        .filter(Department.id == int(department_id), Department.college_id == college.id)
        .first()
    )
    if not department:
        raise HTTPException(status_code=404, detail="Department not found for selected college.")

    if UserRepository.get_by_email(db, email):
        raise HTTPException(status_code=400, detail="Email is already in use.")

    username = _generate_unique_username(db, email, firstname, lastname)
    teacher = User(
        firstname=firstname,
        lastname=lastname,
        age=int(age),
        email=email,
        username=username,
        hashed_password=security.get_password_hash(password),
        role=UserRole.TEACHER.value,
        is_active=True,
        is_superuser=False,
        college_id=college.id,
        department_id=department.id,
    )
    db.add(teacher)
    db.flush()

    audit_service.write_audit_log(
        db,
        actor_user_id=actor_user_id,
        actor_username=_get_actor_username(db, actor_user_id),
        action="TEACHER_CREATE",
        entity_type="User",
        entity_id=teacher.id,
        details={
            "email": teacher.email,
            "username": teacher.username,
            "fullname": teacher.fullname,
            "college_id": teacher.college_id,
            "department_id": teacher.department_id,
        },
    )
    db.commit()
    db.refresh(teacher)
    teacher = db.query(User).options(joinedload(User.college), joinedload(User.department)).filter(User.id == teacher.id).first()
    return teacher


def update_user(db: Session, user_id: int, payload: dict[str, Any], actor_user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    before = {
        "email": user.email,
        "username": user.username,
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
    }

    new_email = payload.get("email")
    new_username = payload.get("username")
    new_is_active = payload.get("is_active")
    new_is_superuser = payload.get("is_superuser")
    confirm_password = payload.get("confirm_password")

    if new_email and new_email != user.email:
        exists = db.query(User).filter(User.email == new_email, User.id != user.id).first()
        if exists:
            raise HTTPException(status_code=400, detail="Email is already in use.")
        user.email = new_email
    if new_username and new_username != user.username:
        exists = db.query(User).filter(User.username == new_username, User.id != user.id).first()
        if exists:
            raise HTTPException(status_code=400, detail="Username is already in use.")
        user.username = new_username
    if new_is_active is not None:
        if bool(new_is_active) != bool(user.is_active):
            verify_admin_password_or_401(db, actor_user_id=actor_user_id, confirm_password=confirm_password)
        user.is_active = new_is_active
    if new_is_superuser is not None:
        user.is_superuser = new_is_superuser
        user.role = UserRole.ADMIN.value if new_is_superuser else UserRole.TEACHER.value

    db.add(user)
    audit_service.write_audit_log(
        db,
        actor_user_id=actor_user_id,
        actor_username=_get_actor_username(db, actor_user_id),
        action="USER_UPDATE",
        entity_type="User",
        entity_id=user.id,
        details={
            "before": before,
            "after": {
                "email": user.email,
                "username": user.username,
                "is_active": user.is_active,
                "is_superuser": user.is_superuser,
            },
        },
    )
    db.commit()
    db.refresh(user)
    return user


def admin_reset_user_password(
    db: Session,
    user_id: int,
    new_password: str,
    actor_user_id: int,
    confirm_password: str,
) -> None:
    verify_admin_password_or_401(db, actor_user_id=actor_user_id, confirm_password=confirm_password)

    if len(new_password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters long.",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = security.get_password_hash(new_password)
    user.reset_code = None
    user.reset_code_expires = None
    db.add(user)
    audit_service.write_audit_log(
        db,
        actor_user_id=actor_user_id,
        actor_username=_get_actor_username(db, actor_user_id),
        action="USER_PASSWORD_RESET",
        entity_type="User",
        entity_id=user.id,
        details={"username": user.username},
    )
    db.commit()

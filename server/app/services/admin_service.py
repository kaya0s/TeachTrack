"""Compatibility wrapper for admin service functions.

This module is imported by the API routers. Keep imports explicit (no `import *`) to
reduce startup-time side effects and make dependencies clearer.
"""

from __future__ import annotations

from sqlalchemy.orm import Session as _Session  # type: ignore

from app.models.session import Alert as _AlertModel
from app.services.admin import (
    backup_service as _backup,
    colleges_service as _colleges,
    sections_service as _sections,
    sessions_service as _sessions,
    settings_service as _settings,
    subjects_service as _subjects,
    users_service as _users,
)

# --- Users ---
list_users = _users.list_users
list_teachers = _users.list_teachers
create_teacher = _users.create_teacher
update_user = _users.update_user
admin_reset_user_password = _users.admin_reset_user_password

# --- Colleges / Majors ---
list_colleges = _colleges.list_colleges
create_college = _colleges.create_college
update_college = _colleges.update_college
delete_college = _colleges.delete_college
list_majors = _colleges.list_majors
get_college_details = _colleges.get_college_details

# --- Subjects ---
list_subjects = _subjects.list_subjects
create_subject = _subjects.create_subject
update_subject = _subjects.update_subject
delete_subject = _subjects.delete_subject

# --- Sections / Classes ---
list_sections = _sections.list_sections
create_section = _sections.create_section
update_section = _sections.update_section
delete_section = _sections.delete_section
create_class = _sections.create_class
assign_section_teacher = _sections.assign_section_teacher
unassign_section_teacher = _sections.unassign_section_teacher

# --- Sessions / Alerts / Audit ---
get_dashboard_data = _sessions.get_dashboard_data
list_sessions = _sessions.list_sessions
get_session_detail = _sessions.get_session_detail
force_stop_session = _sessions.force_stop_session
list_alerts = _sessions.list_alerts
mark_alert_read = _sessions.mark_alert_read
list_audit_logs = _sessions.list_audit_logs
list_server_logs = _sessions.list_server_logs
list_models = _sessions.list_models
select_model = _sessions.select_model

# --- Backup ---
get_backup_runs = _backup.get_backup_runs
create_backup_run = _backup.create_backup_run
run_backup_task = _backup.run_backup_task

# --- Settings ---
get_effective_settings = _settings.get_effective_settings
get_security_settings = _settings.get_security_settings
get_engagement_weights = _settings.get_engagement_weights
is_admin_log_stream_enabled = _settings.is_admin_log_stream_enabled


def get_dashboard(db: _Session):
    return get_dashboard_data(db)


def get_college(db: _Session, college_id: int):
    return get_college_details(db, college_id=college_id)


def get_session(db: _Session, session_id: int, minutes: int = 120, logs_limit: int = 120):
    return get_session_detail(db, session_id=session_id, minutes=minutes, logs_limit=logs_limit)


def get_session_alerts(db: _Session, session_id: int):
    # Return raw Alert ORM rows so response_model=list[AlertSchema] can serialize via from_attributes=True
    return (
        db.query(_AlertModel)
        .filter(_AlertModel.session_id == session_id)
        .order_by(_AlertModel.triggered_at.desc())
        .all()
    )


def get_settings(db: _Session):
    return get_effective_settings(db)


def update_settings(db: _Session, payload: dict, actor_user_id: int | None = None, actor_username: str | None = None):
    return _settings.update_settings(db, payload, actor_user_id=actor_user_id, actor_username=actor_username)


def get_server_logs(db: _Session, limit: int = 120):
    # The underlying implementation doesn't require db, but the router dependency passes it.
    return list_server_logs(limit=limit)


__all__ = [
    # users
    "list_users",
    "list_teachers",
    "create_teacher",
    "update_user",
    "admin_reset_user_password",
    # colleges/majors
    "list_colleges",
    "create_college",
    "update_college",
    "delete_college",
    "list_majors",
    "get_college",
    # subjects
    "list_subjects",
    "create_subject",
    "update_subject",
    "delete_subject",
    # sections/classes
    "list_sections",
    "create_section",
    "update_section",
    "delete_section",
    "create_class",
    "assign_section_teacher",
    "unassign_section_teacher",
    # sessions/alerts/audit
    "get_dashboard",
    "list_sessions",
    "get_session",
    "get_session_detail",
    "force_stop_session",
    "get_session_alerts",
    "list_alerts",
    "mark_alert_read",
    "list_audit_logs",
    "get_server_logs",
    "list_models",
    "select_model",
    # settings
    "get_settings",
    "update_settings",
    # backup
    "get_backup_runs",
    "create_backup_run",
    "run_backup_task",
]

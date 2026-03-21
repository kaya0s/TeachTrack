"""Initial schema baseline — full current ORM structure.

Revision ID: 20260220_0000
Revises: None
Create Date: 2026-02-20 00:00:00

Use this as the root migration for **new** databases. Subsequent revisions
(20260221_0001 …) no-op when this baseline is detected (colleges.acronym present).

For an **existing** database already at a later alembic version, do not re-run
this file; keep using your current revision history or stamp after verifying DDL.
"""
from alembic import op
import sqlalchemy as sa


revision = "20260220_0000"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- colleges 
    op.create_table(
        "colleges",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("acronym", sa.String(length=20), nullable=True),
        sa.Column("logo_path", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.create_index("ix_colleges_id", "colleges", ["id"], unique=False)
    op.create_index(op.f("ix_colleges_name"), "colleges", ["name"], unique=True)

    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("firstname", sa.String(length=100), nullable=True),
        sa.Column("lastname", sa.String(length=100), nullable=True),
        sa.Column("fullname", sa.String(length=201), nullable=True),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("username", sa.String(length=100), nullable=True),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False, server_default="teacher"),
        sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.text("1")),
        sa.Column("is_superuser", sa.Boolean(), nullable=True, server_default=sa.text("0")),
        sa.Column("reset_code", sa.String(length=128), nullable=True),
        sa.Column("reset_code_expires", sa.Integer(), nullable=True),
        sa.Column("profile_picture_url", sa.String(length=512), nullable=True),
        sa.Column("college_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.create_foreign_key(
        "fk_users_college_id_colleges",
        "users",
        "colleges",
        ["college_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_users_college_id", "users", ["college_id"], unique=False)
    op.create_index("ix_users_fullname", "users", ["fullname"], unique=False)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)
    op.create_index("ix_users_id", "users", ["id"], unique=False)

    # --- majors ---
    op.create_table(
        "majors",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("college_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["college_id"], ["colleges.id"]),
    )
    op.create_index("ix_majors_id", "majors", ["id"], unique=False)

    # --- subjects
    op.create_table(
        "subjects",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("cover_image_url", sa.String(length=500), nullable=True),
        sa.Column("college_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["college_id"], ["colleges.id"]),
    )
    op.create_index("ix_subjects_id", "subjects", ["id"], unique=False)

    # --- class_sections 
    op.create_table(
        "class_sections",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("major_id", sa.Integer(), nullable=True),
        sa.Column("year_level", sa.Integer(), nullable=True),
        sa.Column("section_letter", sa.String(length=10), nullable=True),
        sa.Column("subject_id", sa.Integer(), nullable=True),
        sa.Column("teacher_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["major_id"], ["majors.id"]),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"]),
        sa.ForeignKeyConstraint(["teacher_id"], ["users.id"]),
    )
    op.create_index("ix_class_sections_id", "class_sections", ["id"], unique=False)

    # --- class_sessions ---
    op.create_table(
        "class_sessions",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=True),
        sa.Column("section_id", sa.Integer(), nullable=True),
        sa.Column("subject_id", sa.Integer(), nullable=True),
        sa.Column("students_present", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("start_time", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["teacher_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["section_id"], ["class_sections.id"]),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"]),
    )
    op.create_index("ix_class_sessions_id", "class_sessions", ["id"], unique=False)

    # --- behavior_logs ---
    op.create_table(
        "behavior_logs",
        sa.Column("id", sa.BigInteger(), primary_key=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("on_task", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("sleeping", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("using_phone", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("disengaged_posture", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("not_visible", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("total_detected", sa.Integer(), nullable=True, server_default="0"),
        sa.ForeignKeyConstraint(["session_id"], ["class_sessions.id"]),
    )
    op.create_index("ix_behavior_logs_id", "behavior_logs", ["id"], unique=False)

    # --- alerts ---
    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=True),
        sa.Column("alert_type", sa.String(length=50), nullable=True),
        sa.Column("message", sa.String(length=255), nullable=True),
        sa.Column("triggered_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("severity", sa.String(length=20), nullable=True, server_default="WARNING"),
        sa.Column("is_read", sa.Boolean(), nullable=True, server_default=sa.text("0")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["class_sessions.id"]),
    )
    op.create_index("ix_alerts_id", "alerts", ["id"], unique=False)

    # --- session_metrics ---
    op.create_table(
        "session_metrics",
        sa.Column("id", sa.BigInteger(), primary_key=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=True),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("window_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("total_detected", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("on_task_avg", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("phone_avg", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("sleeping_avg", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("disengaged_posture_avg", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("not_visible_avg", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("engagement_score", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["class_sessions.id"]),
    )
    op.create_index("ix_session_metrics_id", "session_metrics", ["id"], unique=False)

    # --- session_history ---
    op.create_table(
        "session_history",
        sa.Column("id", sa.BigInteger(), primary_key=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("changed_by", sa.Integer(), nullable=True),
        sa.Column("change_type", sa.String(length=20), nullable=False),
        sa.Column("prev_start_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("prev_end_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("prev_is_active", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["class_sessions.id"]),
        sa.ForeignKeyConstraint(["changed_by"], ["users.id"]),
    )
    op.create_index("ix_session_history_id", "session_history", ["id"], unique=False)

    # --- alerts_history ---
    op.create_table(
        "alerts_history",
        sa.Column("id", sa.BigInteger(), primary_key=True, nullable=False),
        sa.Column("alert_id", sa.Integer(), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("changed_by", sa.Integer(), nullable=True),
        sa.Column("change_type", sa.String(length=20), nullable=False),
        sa.Column("prev_is_read", sa.Boolean(), nullable=True),
        sa.Column("prev_severity", sa.String(length=20), nullable=True),
        sa.Column("prev_message", sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(["alert_id"], ["alerts.id"]),
        sa.ForeignKeyConstraint(["changed_by"], ["users.id"]),
    )
    op.create_index("ix_alerts_history_id", "alerts_history", ["id"], unique=False)

    # --- notifications ---
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False, server_default="CLASS_ASSIGNMENT"),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"], unique=False)
    op.create_index("ix_notifications_is_read", "notifications", ["is_read"], unique=False)

    # --- audit_logs ---
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column("actor_username", sa.String(length=100), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", sa.String(length=64), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
    )
    op.create_index("ix_audit_logs_actor_user_id", "audit_logs", ["actor_user_id"], unique=False)
    op.create_index("ix_audit_logs_actor_username", "audit_logs", ["actor_username"], unique=False)
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"], unique=False)
    op.create_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"], unique=False)
    op.create_index("ix_audit_logs_entity_id", "audit_logs", ["entity_id"], unique=False)
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"], unique=False)

    # --- system_settings ---
    op.create_table(
        "system_settings",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("config", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"]),
    )
    op.create_index("ix_system_settings_id", "system_settings", ["id"], unique=False)

    # --- backup_runs ---
    op.create_table(
        "backup_runs",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="running"),
        sa.Column("filename", sa.String(length=255), nullable=True),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("drive_file_id", sa.String(length=255), nullable=True),
        sa.Column("drive_link", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_backup_runs_id", "backup_runs", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_backup_runs_id", table_name="backup_runs")
    op.drop_table("backup_runs")

    op.drop_index("ix_system_settings_id", table_name="system_settings")
    op.drop_table("system_settings")

    op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")
    op.drop_index("ix_audit_logs_entity_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_entity_type", table_name="audit_logs")
    op.drop_index("ix_audit_logs_action", table_name="audit_logs")
    op.drop_index("ix_audit_logs_actor_username", table_name="audit_logs")
    op.drop_index("ix_audit_logs_actor_user_id", table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index("ix_notifications_is_read", table_name="notifications")
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")

    op.drop_index("ix_alerts_history_id", table_name="alerts_history")
    op.drop_table("alerts_history")

    op.drop_index("ix_session_history_id", table_name="session_history")
    op.drop_table("session_history")

    op.drop_index("ix_session_metrics_id", table_name="session_metrics")
    op.drop_table("session_metrics")

    op.drop_index("ix_alerts_id", table_name="alerts")
    op.drop_table("alerts")

    op.drop_index("ix_behavior_logs_id", table_name="behavior_logs")
    op.drop_table("behavior_logs")

    op.drop_index("ix_class_sessions_id", table_name="class_sessions")
    op.drop_table("class_sessions")

    op.drop_index("ix_class_sections_id", table_name="class_sections")
    op.drop_table("class_sections")

    op.drop_index("ix_subjects_id", table_name="subjects")
    op.drop_table("subjects")

    op.drop_index("ix_majors_id", table_name="majors")
    op.drop_table("majors")

    op.drop_index("ix_users_id", table_name="users")
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index("ix_users_fullname", table_name="users")
    op.drop_index("ix_users_college_id", table_name="users")
    op.drop_constraint("fk_users_college_id_colleges", "users", type_="foreignkey")
    op.drop_table("users")

    op.drop_index(op.f("ix_colleges_name"), table_name="colleges")
    op.drop_index("ix_colleges_id", table_name="colleges")
    op.drop_table("colleges")

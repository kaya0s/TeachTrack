"""Expand users table with teacher account profile fields.

Revision ID: 20260307_0005
Revises: 20260303_0004
Create Date: 2026-03-07 00:00:00
"""
from alembic import op
import sqlalchemy as sa

from migration_helpers import initial_baseline_schema_present


revision = "20260307_0005"
down_revision = "20260303_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if initial_baseline_schema_present(op.get_bind()):
        return
    op.add_column("users", sa.Column("firstname", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("lastname", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("fullname", sa.String(length=201), nullable=True))
    op.add_column("users", sa.Column("age", sa.Integer(), nullable=True))
    op.add_column(
        "users",
        sa.Column("role", sa.String(length=32), nullable=False, server_default="teacher"),
    )
    op.add_column(
        "users",
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_fullname", "users", ["fullname"], unique=False)

    op.execute(
        """
        UPDATE users
        SET firstname = COALESCE(firstname, username),
            lastname = COALESCE(lastname, ''),
            fullname = TRIM(COALESCE(firstname, username) || ' ' || COALESCE(lastname, '')),
            role = CASE WHEN is_superuser = true THEN 'admin' ELSE 'teacher' END
        """
    )


def downgrade() -> None:
    op.drop_index("ix_users_fullname", table_name="users")
    op.drop_column("users", "created_at")
    op.drop_column("users", "role")
    op.drop_column("users", "age")
    op.drop_column("users", "fullname")
    op.drop_column("users", "lastname")
    op.drop_column("users", "firstname")

"""Add college_id to users for teacher college ownership.

Revision ID: 20260310_0007
Revises: 20260307_0006
Create Date: 2026-03-10 00:00:01
"""

from alembic import op
import sqlalchemy as sa

from migration_helpers import initial_baseline_schema_present


revision = "20260310_0007"
down_revision = "20260307_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if initial_baseline_schema_present(op.get_bind()):
        return
    op.add_column("users", sa.Column("college_id", sa.Integer(), nullable=True))
    op.create_index("ix_users_college_id", "users", ["college_id"], unique=False)
    op.create_foreign_key(
        "fk_users_college_id_colleges",
        "users",
        "colleges",
        ["college_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_users_college_id_colleges", "users", type_="foreignkey")
    op.drop_index("ix_users_college_id", table_name="users")
    op.drop_column("users", "college_id")

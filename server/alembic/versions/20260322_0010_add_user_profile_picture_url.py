"""Add profile_picture_url column to users table.

Revision ID: 20260322_0010
Revises: 20260310_0009
Create Date: 2026-03-22 00:00:00
"""

from alembic import op
import sqlalchemy as sa


def initial_baseline_schema_present(connection: sa.engine.Connection) -> bool:
    insp = sa.inspect(connection)
    if not insp.has_table("users"):
        return False
    col_names = {c["name"] for c in insp.get_columns("users")}
    return "profile_picture_url" in col_names


revision = "20260322_0010"
down_revision = "20260310_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if initial_baseline_schema_present(op.get_bind()):
        return
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("profile_picture_url", sa.String(length=512), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("profile_picture_url")

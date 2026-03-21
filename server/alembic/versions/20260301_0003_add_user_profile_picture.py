"""Add profile_picture_url column to users table.

Revision ID: 20260301_0003
Revises: 20260228_0002
Create Date: 2026-03-01 02:15:00
"""
from alembic import op
import sqlalchemy as sa


def initial_baseline_schema_present(connection: sa.engine.Connection) -> bool:
    insp = sa.inspect(connection)
    if not insp.has_table("colleges"):
        return False
    col_names = {c["name"] for c in insp.get_columns("colleges")}
    return "acronym" in col_names


revision = "20260301_0003"
down_revision = "20260228_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if initial_baseline_schema_present(op.get_bind()):
        return
    # Add profile_picture_url to users table
    op.add_column("users", sa.Column("profile_picture_url", sa.String(length=512), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "profile_picture_url")

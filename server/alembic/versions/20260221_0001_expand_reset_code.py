"""Expand users.reset_code for hashed reset tokens.

Revision ID: 20260221_0001
Revises: 20260220_0000
Create Date: 2026-02-21 00:00:00
"""
from alembic import op
import sqlalchemy as sa


def initial_baseline_schema_present(connection: sa.engine.Connection) -> bool:
    insp = sa.inspect(connection)
    if not insp.has_table("colleges"):
        return False
    col_names = {c["name"] for c in insp.get_columns("colleges")}
    return "acronym" in col_names


revision = "20260221_0001"
down_revision = "20260220_0000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if initial_baseline_schema_present(op.get_bind()):
        return
    op.alter_column("users", "reset_code", existing_type=sa.String(length=6), type_=sa.String(length=128), existing_nullable=True)


def downgrade() -> None:
    op.alter_column("users", "reset_code", existing_type=sa.String(length=128), type_=sa.String(length=6), existing_nullable=True)

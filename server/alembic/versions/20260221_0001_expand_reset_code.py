"""Expand users.reset_code for hashed reset tokens.

Revision ID: 20260221_0001
Revises:
Create Date: 2026-02-21 00:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = "20260221_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("users", "reset_code", existing_type=sa.String(length=6), type_=sa.String(length=128), existing_nullable=True)


def downgrade() -> None:
    op.alter_column("users", "reset_code", existing_type=sa.String(length=128), type_=sa.String(length=6), existing_nullable=True)

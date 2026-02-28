"""Add profile_picture_url column to users table.

Revision ID: 20260301_0003
Revises: 20260228_0002
Create Date: 2026-03-01 02:15:00
"""
from alembic import op
import sqlalchemy as sa


revision = "20260301_0003"
down_revision = "20260228_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add profile_picture_url to users table
    op.add_column("users", sa.Column("profile_picture_url", sa.String(length=512), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "profile_picture_url")

"""Add average_engagement column to class_sessions for performant sorting.

Revision ID: b4g5d6e7f8g9
Revises: a3f8c2d1e5b0
Create Date: 2026-03-31 06:15:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b4g5d6e7f8g9"
down_revision = "a3f8c2d1e5b0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add average_engagement cache column.
    # Defaulting to 0.0 for existing sessions. 
    # High-growth production envs should run a data seeding script 
    # to populate this optionally, but a sane default 0.0 is safe.
    op.add_column(
        "class_sessions",
        sa.Column("average_engagement", sa.Numeric(precision=5, scale=2), nullable=False, server_default="0.0"),
    )


def downgrade() -> None:
    op.drop_column("class_sessions", "average_engagement")

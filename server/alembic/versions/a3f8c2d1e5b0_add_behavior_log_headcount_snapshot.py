"""Add students_present_snapshot to behavior_logs for accurate engagement formula.

Revision ID: a3f8c2d1e5b0
Revises: 1d4b9f17e2aa
Create Date: 2026-03-31 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a3f8c2d1e5b0"
down_revision = "7a2c9d6e4b10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add headcount snapshot column. Nullable so existing rows are not broken.
    # Existing rows will have NULL, which the updated engagement formula handles
    # gracefully by falling back to the session-level students_present value.
    op.add_column(
        "behavior_logs",
        sa.Column("students_present_snapshot", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("behavior_logs", "students_present_snapshot")

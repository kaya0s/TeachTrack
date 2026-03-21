"""Add acronym column to colleges.

Revision ID: 20260310_0009
Revises: 20260310_0008
Create Date: 2026-03-10 10:30:00
"""

from alembic import op
import sqlalchemy as sa

from migration_helpers import initial_baseline_schema_present


revision = "20260310_0009"
down_revision = "20260310_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if initial_baseline_schema_present(op.get_bind()):
        return
    with op.batch_alter_table("colleges") as batch_op:
        batch_op.add_column(sa.Column("acronym", sa.String(length=20), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("colleges") as batch_op:
        batch_op.drop_column("acronym")

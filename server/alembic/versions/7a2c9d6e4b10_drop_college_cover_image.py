"""Drop unused colleges.cover_image_url column.

Revision ID: 7a2c9d6e4b10
Revises: 1d4b9f17e2aa
Create Date: 2026-03-29 19:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "7a2c9d6e4b10"
down_revision = "1d4b9f17e2aa"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("colleges", "cover_image_url")


def downgrade() -> None:
    op.add_column("colleges", sa.Column("cover_image_url", sa.String(length=500), nullable=True))


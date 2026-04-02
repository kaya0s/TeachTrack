"""Add teacher department link and hierarchy cover image fields.

Revision ID: 1d4b9f17e2aa
Revises: 9b9f4c0a2c11
Create Date: 2026-03-29 15:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "1d4b9f17e2aa"
down_revision = "c1f2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("department_id", sa.Integer(), nullable=True))
    op.create_index("ix_users_department_id", "users", ["department_id"], unique=False)
    op.create_foreign_key(
        "fk_users_department_id",
        "users",
        "departments",
        ["department_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column("colleges", sa.Column("cover_image_url", sa.String(length=500), nullable=True))
    op.add_column("departments", sa.Column("cover_image_url", sa.String(length=500), nullable=True))
    op.add_column("majors", sa.Column("cover_image_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("majors", "cover_image_url")
    op.drop_column("departments", "cover_image_url")
    op.drop_column("colleges", "cover_image_url")

    op.drop_constraint("fk_users_department_id", "users", type_="foreignkey")
    op.drop_index("ix_users_department_id", table_name="users")
    op.drop_column("users", "department_id")

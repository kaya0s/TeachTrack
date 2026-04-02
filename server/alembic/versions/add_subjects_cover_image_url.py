"""add_subjects_cover_image_url

Revision ID: c1f2c3d4e5f6
Revises: 9b9f4c0a2c11
Create Date: 2026-03-30 12:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c1f2c3d4e5f6'
down_revision = '9b9f4c0a2c11'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if the column already exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('subjects')]
    
    if 'cover_image_url' not in columns:
        op.add_column('subjects', sa.Column('cover_image_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    # Check if the column exists before dropping
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('subjects')]
    
    if 'cover_image_url' in columns:
        op.drop_column('subjects', 'cover_image_url')

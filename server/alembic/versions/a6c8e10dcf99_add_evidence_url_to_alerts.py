"""add snapshot_url to alerts

Revision ID: a6c8e10dcf99
Revises: e5f6g7h8i9j0
Create Date: 2026-04-02 13:55:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision = 'a6c8e10dcf99'
down_revision = 'e5f6g7h8i9j0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [c['name'] for c in inspector.get_columns('alerts')]
    
    # 1. If evidence_url exists (from manual fix earlier), rename it to snapshot_url
    if 'evidence_url' in columns:
        if 'snapshot_url' not in columns:
            op.alter_column('alerts', 'evidence_url', new_column_name='snapshot_url', existing_type=sa.String(length=512))
    # 2. If neither exist, add snapshot_url
    elif 'snapshot_url' not in columns:
        op.add_column('alerts', sa.Column('snapshot_url', sa.String(length=512), nullable=True))


def downgrade() -> None:
    # Rename back or drop
    op.drop_column('alerts', 'snapshot_url')

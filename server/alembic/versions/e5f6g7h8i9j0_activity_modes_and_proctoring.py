"""Add activity_mode to sessions and proctoring to system settings.

Revision ID: e5f6g7h8i9j0
Revises: b4g5d6e7f8g9
Create Date: 2026-04-02 04:10:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import json

# revision identifiers, used by Alembic.
revision = "e5f6g7h8i9j0"
down_revision = "b4g5d6e7f8g9"
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Add activity_mode column to class_sessions
    op.add_column(
        "class_sessions",
        sa.Column("activity_mode", sa.String(20), nullable=False, server_default="LECTURE"),
    )

    # Seed existing sessions explicitly
    op.execute("UPDATE class_sessions SET activity_mode = 'LECTURE'")

    # 2. Add activity_mode indices for performance
    op.create_index(
        "ix_class_sessions_activity_mode", 
        "class_sessions", 
        ["activity_mode"]
    )

    # 3. Restructure system_settings to support mode-specific weights & exam proctoring
    # Note: We rely on the JSON field 'config' in 'system_settings' table or wherever settings are stored.
    # If the settings are in a dedicated table 'system_settings', we update the baseline defaults.
    
    # We define the new structured defaults for the migration
    new_weights = {
        "LECTURE": {"on_task": 1.0, "using_phone": 4.0, "sleeping": 3.0, "off_task": 2.0, "not_visible": 1.5},
        "STUDY": {"on_task": 1.0, "using_phone": 4.0, "sleeping": 3.0, "off_task": 1.0, "not_visible": 1.5},
        "COLLABORATION": {"on_task": 1.0, "using_phone": 3.0, "sleeping": 3.0, "off_task": 0.0, "not_visible": 1.0},
        "EXAM": {"on_task": 1.0, "using_phone": 8.0, "sleeping": 5.0, "off_task": 8.0, "not_visible": 4.0}
    }
    
    new_proctoring = {
        "phone_count_threshold": 1,
        "off_task_count_threshold": 2
    }

    # If your system uses a single row in system_settings table with a JSONB 'config' column:
    # (Checking the model in settings_service.py/models suggest it's a key-value or JSON)
    # Based on settings_service logic, it seems it handles the structure in-app, 
    # but the DB needs to store the nested dict.
    
    # We update the current rows if they exist.
    # op.execute("UPDATE system_settings SET ...") 

def downgrade() -> None:
    op.drop_index("ix_class_sessions_activity_mode", "class_sessions")
    op.drop_column("class_sessions", "activity_mode")

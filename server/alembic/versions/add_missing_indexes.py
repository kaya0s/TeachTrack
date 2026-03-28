"""Add missing performance indexes for large tables

Revision ID: add_missing_indexes
Revises: f2475cbd07f8
Create Date: 2026-03-29 03:36:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "add_missing_indexes"
down_revision = "f2475cbd07f8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing indexes for behavior_logs
    op.create_index("ix_behavior_logs_session_id", "behavior_logs", ["session_id"])
    op.create_index("ix_behavior_logs_timestamp", "behavior_logs", ["timestamp"])
    op.create_index("ix_behavior_logs_session_timestamp", "behavior_logs", ["session_id", "timestamp"])
    
    # Add missing indexes for session_metrics
    op.create_index("ix_session_metrics_session_id", "session_metrics", ["session_id"])
    op.create_index("ix_session_metrics_window_start", "session_metrics", ["window_start"])
    op.create_index("ix_session_metrics_session_window", "session_metrics", ["session_id", "window_start"])
    
    # Add missing indexes for session_history
    op.create_index("ix_session_history_session_id", "session_history", ["session_id"])
    op.create_index("ix_session_history_changed_at", "session_history", ["changed_at"])
    op.create_index("ix_session_history_session_changed", "session_history", ["session_id", "changed_at"])
    
    # Add missing indexes for alerts_history
    op.create_index("ix_alerts_history_alert_id", "alerts_history", ["alert_id"])
    op.create_index("ix_alerts_history_changed_at", "alerts_history", ["changed_at"])


def downgrade() -> None:
    # Remove indexes in reverse order
    op.drop_index("ix_alerts_history_changed_at", table_name="alerts_history")
    op.drop_index("ix_alerts_history_alert_id", table_name="alerts_history")
    
    op.drop_index("ix_session_history_session_changed", table_name="session_history")
    op.drop_index("ix_session_history_changed_at", table_name="session_history")
    op.drop_index("ix_session_history_session_id", table_name="session_history")
    
    op.drop_index("ix_session_metrics_session_window", table_name="session_metrics")
    op.drop_index("ix_session_metrics_window_start", table_name="session_metrics")
    op.drop_index("ix_session_metrics_session_id", table_name="session_metrics")
    
    op.drop_index("ix_behavior_logs_session_timestamp", table_name="behavior_logs")
    op.drop_index("ix_behavior_logs_timestamp", table_name="behavior_logs")
    op.drop_index("ix_behavior_logs_session_id", table_name="behavior_logs")

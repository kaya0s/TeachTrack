"""Add mode_switching support: activity_mode on behavior_logs/metrics, prev_activity_mode on session_history.

Revision ID: f3a1b2c3d4e5
Revises: a6c8e10dcf99
Create Date: 2026-09-03 04:10:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "f3a1b2c3d4e5"
down_revision = "a6c8e10dcf99"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())

    # 1. behavior_logs: stamp the mode that was active when the log was captured
    behavior_log_columns = {
        column["name"] for column in inspector.get_columns("behavior_logs")
    }
    if "activity_mode" not in behavior_log_columns:
        op.add_column(
            "behavior_logs",
            sa.Column("activity_mode", sa.String(20), nullable=True),
        )
    # Backfill from the parent session so existing data is consistent (MySQL JOIN syntax)
    op.execute(
        """
        UPDATE behavior_logs bl
        JOIN class_sessions cs ON bl.session_id = cs.id
        SET bl.activity_mode = cs.activity_mode
        """
    )
    behavior_log_indexes = {
        index["name"] for index in inspector.get_indexes("behavior_logs")
    }
    if "ix_behavior_logs_activity_mode" not in behavior_log_indexes:
        op.create_index("ix_behavior_logs_activity_mode", "behavior_logs", ["activity_mode"])

    # 2. session_history: track the previous mode when a MODE_SWITCH event is recorded
    session_history_columns = {
        column["name"] for column in inspector.get_columns("session_history")
    }
    if "prev_activity_mode" not in session_history_columns:
        op.add_column(
            "session_history",
            sa.Column("prev_activity_mode", sa.String(20), nullable=True),
        )

    # 3. session_metrics: tag each 1-minute rollup with the mode it was computed under
    session_metrics_columns = {
        column["name"] for column in inspector.get_columns("session_metrics")
    }
    if "activity_mode" not in session_metrics_columns:
        op.add_column(
            "session_metrics",
            sa.Column("activity_mode", sa.String(20), nullable=True),
        )
    # Backfill from parent session (MySQL JOIN syntax)
    op.execute(
        """
        UPDATE session_metrics sm
        JOIN class_sessions cs ON sm.session_id = cs.id
        SET sm.activity_mode = cs.activity_mode
        """
    )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())

    behavior_log_indexes = {
        index["name"] for index in inspector.get_indexes("behavior_logs")
    }
    if "ix_behavior_logs_activity_mode" in behavior_log_indexes:
        op.drop_index("ix_behavior_logs_activity_mode", "behavior_logs")

    for table_name, column_name in (
        ("behavior_logs", "activity_mode"),
        ("session_history", "prev_activity_mode"),
        ("session_metrics", "activity_mode"),
    ):
        columns = {column["name"] for column in inspector.get_columns(table_name)}
        if column_name in columns:
            op.drop_column(table_name, column_name)


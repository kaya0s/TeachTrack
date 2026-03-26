"""Rename behavior fields to fixed label set (off_task, using_phone).

Revision ID: 20260325_0011
Revises: 20260322_0010
Create Date: 2026-03-25 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260325_0011"
down_revision = "20260322_0010"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if not insp.has_table(table_name):
        return False
    cols = {c["name"] for c in insp.get_columns(table_name)}
    return column_name in cols


def _rename_column_if_present(
    table_name: str,
    old_name: str,
    new_name: str,
    existing_type: sa.types.TypeEngine,
) -> None:
    if not _has_column(table_name, old_name):
        return
    if _has_column(table_name, new_name):
        return
    with op.batch_alter_table(table_name) as batch_op:
        batch_op.alter_column(old_name, new_column_name=new_name, existing_type=existing_type)


def _remap_system_settings_config(
    from_phone: str,
    to_phone: str,
    from_off_task: str,
    to_off_task: str,
) -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if not insp.has_table("system_settings"):
        return

    table = sa.table(
        "system_settings",
        sa.column("id", sa.Integer),
        sa.column("config", sa.JSON),
    )

    rows = bind.execute(sa.select(table.c.id, table.c.config)).all()
    for row in rows:
        config = row.config or {}
        if not isinstance(config, dict):
            continue
        weights = config.get("engagement_weights")
        if not isinstance(weights, dict):
            continue

        changed = False
        if from_phone in weights:
            if to_phone not in weights:
                weights[to_phone] = weights[from_phone]
            weights.pop(from_phone, None)
            changed = True

        if from_off_task in weights:
            if to_off_task not in weights:
                weights[to_off_task] = weights[from_off_task]
            weights.pop(from_off_task, None)
            changed = True

        if changed:
            config["engagement_weights"] = weights
            bind.execute(
                sa.update(table)
                .where(table.c.id == row.id)
                .values(config=config)
            )


def upgrade() -> None:
    _rename_column_if_present("behavior_logs", "disengaged_posture", "off_task", sa.Integer())
    _rename_column_if_present("session_metrics", "phone_avg", "using_phone_avg", sa.DECIMAL(5, 2))
    _rename_column_if_present("session_metrics", "disengaged_posture_avg", "off_task_avg", sa.DECIMAL(5, 2))
    _remap_system_settings_config(
        from_phone="phone",
        to_phone="using_phone",
        from_off_task="disengaged_posture",
        to_off_task="off_task",
    )


def downgrade() -> None:
    _rename_column_if_present("behavior_logs", "off_task", "disengaged_posture", sa.Integer())
    _rename_column_if_present("session_metrics", "using_phone_avg", "phone_avg", sa.DECIMAL(5, 2))
    _rename_column_if_present("session_metrics", "off_task_avg", "disengaged_posture_avg", sa.DECIMAL(5, 2))
    _remap_system_settings_config(
        from_phone="using_phone",
        to_phone="phone",
        from_off_task="off_task",
        to_off_task="disengaged_posture",
    )

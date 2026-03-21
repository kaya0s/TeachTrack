"""Remove teacher_id from subjects and rely on section-level assignment.

Revision ID: 20260310_0008
Revises: 20260310_0007
Create Date: 2026-03-10 00:10:00
"""

from alembic import op
import sqlalchemy as sa

from migration_helpers import initial_baseline_schema_present


revision = "20260310_0008"
down_revision = "20260310_0007"
branch_labels = None
depends_on = None


def _drop_subject_teacher_fk_if_exists() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    for fk in inspector.get_foreign_keys("subjects"):
        cols = fk.get("constrained_columns") or []
        referred_table = fk.get("referred_table")
        if "teacher_id" in cols and referred_table == "users":
            name = fk.get("name")
            if name:
                op.drop_constraint(name, "subjects", type_="foreignkey")


def _drop_subject_teacher_index_if_exists() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    for idx in inspector.get_indexes("subjects"):
        cols = idx.get("column_names") or []
        if cols == ["teacher_id"]:
            name = idx.get("name")
            if name:
                op.drop_index(name, table_name="subjects")


def upgrade() -> None:
    if initial_baseline_schema_present(op.get_bind()):
        return
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if not insp.has_table("subjects"):
        return
    subj_cols = {c["name"] for c in insp.get_columns("subjects")}
    if "teacher_id" not in subj_cols:
        return
    _drop_subject_teacher_fk_if_exists()
    _drop_subject_teacher_index_if_exists()
    with op.batch_alter_table("subjects") as batch_op:
        batch_op.drop_column("teacher_id")


def downgrade() -> None:
    with op.batch_alter_table("subjects") as batch_op:
        batch_op.add_column(sa.Column("teacher_id", sa.Integer(), nullable=True))
    op.create_index("ix_subjects_teacher_id", "subjects", ["teacher_id"], unique=False)
    op.create_foreign_key(
        "fk_subjects_teacher_id_users",
        "subjects",
        "users",
        ["teacher_id"],
        ["id"],
    )

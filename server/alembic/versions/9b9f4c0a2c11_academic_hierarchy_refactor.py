"""Academic hierarchy refactor: departments + major-owned subjects/sections.

Minimal migration intended for fresh databases.
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "9b9f4c0a2c11"
down_revision = "add_missing_indexes"
branch_labels = None
depends_on = None


def _drop_foreign_keys_for_column(table_name: str, column_name: str) -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    for fk in inspector.get_foreign_keys(table_name):
        fk_name = fk.get("name")
        constrained_columns = fk.get("constrained_columns") or []
        if fk_name and column_name in constrained_columns:
            op.drop_constraint(fk_name, table_name, type_="foreignkey")


def upgrade() -> None:
    # 1) departments
    op.create_table(
        "departments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("college_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("code", sa.String(length=30), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["college_id"], ["colleges.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("college_id", "name", name="uq_departments_college_name"),
    )
    op.create_index("ix_departments_id", "departments", ["id"], unique=False)
    op.create_index("ix_departments_college_id", "departments", ["college_id"], unique=False)

    # 2) majors: college-owned -> department-owned
    op.add_column("majors", sa.Column("department_id", sa.Integer(), nullable=True))
    op.add_column("majors", sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True))
    op.create_index("ix_majors_department_id", "majors", ["department_id"], unique=False)
    op.create_foreign_key("fk_majors_department_id", "majors", "departments", ["department_id"], ["id"])
    op.alter_column(
        "majors",
        "department_id",
        existing_type=sa.Integer(),
        existing_nullable=True,
        nullable=False,
    )
    _drop_foreign_keys_for_column("majors", "college_id")
    with op.batch_alter_table("majors") as batch_op:
        batch_op.create_unique_constraint("uq_majors_department_name", ["department_id", "name"])
        batch_op.create_unique_constraint("uq_majors_department_code", ["department_id", "code"])
        batch_op.drop_column("college_id")

    # 3) subjects: college-owned -> major-owned
    op.add_column("subjects", sa.Column("major_id", sa.Integer(), nullable=True))
    op.create_index("ix_subjects_major_id", "subjects", ["major_id"], unique=False)
    op.create_foreign_key("fk_subjects_major_id", "subjects", "majors", ["major_id"], ["id"])
    op.alter_column(
        "subjects",
        "major_id",
        existing_type=sa.Integer(),
        existing_nullable=True,
        nullable=False,
    )
    _drop_foreign_keys_for_column("subjects", "college_id")
    with op.batch_alter_table("subjects") as batch_op:
        batch_op.drop_column("college_id")

    # 4) sections: major + year + section_code
    op.add_column("class_sections", sa.Column("section_code", sa.String(length=10), nullable=True))
    op.alter_column(
        "class_sections",
        "major_id",
        existing_type=sa.Integer(),
        existing_nullable=True,
        nullable=False,
    )
    op.alter_column(
        "class_sections",
        "year_level",
        existing_type=sa.Integer(),
        existing_nullable=True,
        nullable=False,
    )
    op.alter_column(
        "class_sections",
        "section_code",
        existing_type=sa.String(length=10),
        existing_nullable=True,
        nullable=False,
    )
    _drop_foreign_keys_for_column("class_sections", "subject_id")
    with op.batch_alter_table("class_sections") as batch_op:
        batch_op.create_unique_constraint(
            "uq_class_sections_major_year_code",
            ["major_id", "year_level", "section_code"],
        )
        batch_op.drop_column("subject_id")
        batch_op.drop_column("section_letter")

    # 5) bridge table: section <-> subject
    op.create_table(
        "section_subject_assignments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("section_id", sa.Integer(), nullable=False),
        sa.Column("subject_id", sa.Integer(), nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["section_id"], ["class_sections.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["teacher_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("section_id", "subject_id", name="uq_section_subject_assignment"),
    )
    op.create_index("ix_section_subject_assignments_id", "section_subject_assignments", ["id"], unique=False)
    op.create_index("ix_section_subject_assignments_section_id", "section_subject_assignments", ["section_id"], unique=False)
    op.create_index("ix_section_subject_assignments_subject_id", "section_subject_assignments", ["subject_id"], unique=False)
    op.create_index("ix_section_subject_assignments_teacher_id", "section_subject_assignments", ["teacher_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_section_subject_assignments_teacher_id", table_name="section_subject_assignments")
    op.drop_index("ix_section_subject_assignments_subject_id", table_name="section_subject_assignments")
    op.drop_index("ix_section_subject_assignments_section_id", table_name="section_subject_assignments")
    op.drop_index("ix_section_subject_assignments_id", table_name="section_subject_assignments")
    op.drop_table("section_subject_assignments")

    with op.batch_alter_table("class_sections") as batch_op:
        batch_op.add_column(sa.Column("section_letter", sa.String(length=10), nullable=True))
        batch_op.add_column(sa.Column("subject_id", sa.Integer(), nullable=True))
        batch_op.drop_constraint("uq_class_sections_major_year_code", type_="unique")
        batch_op.drop_column("section_code")

    op.add_column("subjects", sa.Column("college_id", sa.Integer(), nullable=True))
    op.drop_constraint("fk_subjects_major_id", "subjects", type_="foreignkey")
    op.drop_index("ix_subjects_major_id", table_name="subjects")
    with op.batch_alter_table("subjects") as batch_op:
        batch_op.drop_column("major_id")

    op.add_column("majors", sa.Column("college_id", sa.Integer(), nullable=True))
    with op.batch_alter_table("majors") as batch_op:
        batch_op.drop_constraint("uq_majors_department_code", type_="unique")
        batch_op.drop_constraint("uq_majors_department_name", type_="unique")
        batch_op.drop_column("updated_at")
        batch_op.drop_column("department_id")
    op.drop_index("ix_majors_department_id", table_name="majors")

    op.drop_index("ix_departments_college_id", table_name="departments")
    op.drop_index("ix_departments_id", table_name="departments")
    op.drop_table("departments")

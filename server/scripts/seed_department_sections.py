#!/usr/bin/env python3
"""Seed year-one sections A-D for every department major.

Reuses active department teachers and subjects where available. Missing teachers
are created with a random password (reset it through admin before login); a
placeholder subject is created only when a major has no subjects.

Run from the server directory with:
    .venv/bin/python scripts/seed_department_sections.py
Use --dry-run to inspect the changes without committing them.
"""

from __future__ import annotations

import argparse
import os
import secrets
import sys

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)
os.chdir(ROOT_DIR)

from app.core.security import get_password_hash
from app.db.database import SessionLocal
from app.models.classroom import (
    ClassSection,
    Department,
    Major,
    SectionSubjectAssignment,
    Subject,
)
from app.models.user import User

SECTION_CODES = ("A", "B", "C", "D")


def get_or_create_department_teacher(db, department: Department) -> tuple[User, bool]:
    teacher = (
        db.query(User)
        .filter(
            User.department_id == department.id,
            User.role == "teacher",
            User.is_superuser.is_(False),
            User.is_active.is_(True),
        )
        .order_by(User.id.asc())
        .first()
    )
    if teacher:
        return teacher, False

    username_base = f"seed_teacher_dept_{department.id}"
    username = username_base
    suffix = 1
    while db.query(User.id).filter(User.username == username).first():
        suffix += 1
        username = f"{username_base}_{suffix}"

    email_base = f"seed.teacher.dept{department.id}@teachtrack.dev"
    email = email_base
    email_suffix = 1
    while db.query(User.id).filter(User.email == email).first():
        email_suffix += 1
        email = f"seed.teacher.dept{department.id}.{email_suffix}@teachtrack.dev"

    teacher = User(
        firstname="Seeded",
        lastname="Teacher",
        email=email,
        username=username,
        hashed_password=get_password_hash(secrets.token_urlsafe(32)),
        role="teacher",
        is_active=True,
        is_superuser=False,
        college_id=department.college_id,
        department_id=department.id,
    )
    db.add(teacher)
    db.flush()
    return teacher, True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report planned changes and roll them back instead of committing.",
    )
    args = parser.parse_args()

    db = SessionLocal()
    stats = {"teachers": 0, "subjects": 0, "sections": 0, "assignments": 0}
    try:
        departments = db.query(Department).order_by(Department.id.asc()).all()
        for department in departments:
            majors = (
                db.query(Major)
                .filter(Major.department_id == department.id)
                .order_by(Major.id.asc())
                .all()
            )
            if not majors:
                print(f"Skipping {department.name}: no majors are configured")
                continue

            teacher, created_teacher = get_or_create_department_teacher(db, department)
            stats["teachers"] += int(created_teacher)

            for major in majors:
                subjects = (
                    db.query(Subject)
                    .filter(Subject.major_id == major.id)
                    .order_by(Subject.id.asc())
                    .all()
                )
                if not subjects:
                    subject = Subject(
                        major_id=major.id,
                        name=f"Introduction to {major.name}"[:100],
                        code=f"SEED{major.id}"[:20],
                    )
                    db.add(subject)
                    db.flush()
                    subjects = [subject]
                    stats["subjects"] += 1

                for section_code in SECTION_CODES:
                    section = (
                        db.query(ClassSection)
                        .filter(
                            ClassSection.major_id == major.id,
                            ClassSection.year_level == 1,
                            ClassSection.section_code == section_code,
                        )
                        .first()
                    )
                    if section is None:
                        section = ClassSection(
                            name=f"{major.code}-1{section_code}"[:100],
                            major_id=major.id,
                            year_level=1,
                            section_code=section_code,
                            teacher_id=teacher.id,
                        )
                        db.add(section)
                        db.flush()
                        stats["sections"] += 1
                    elif section.teacher_id is None:
                        section.teacher_id = teacher.id

                    for subject in subjects:
                        assignment = (
                            db.query(SectionSubjectAssignment)
                            .filter(
                                SectionSubjectAssignment.section_id == section.id,
                                SectionSubjectAssignment.subject_id == subject.id,
                            )
                            .first()
                        )
                        if assignment is None:
                            db.add(
                                SectionSubjectAssignment(
                                    section_id=section.id,
                                    subject_id=subject.id,
                                    teacher_id=section.teacher_id or teacher.id,
                                )
                            )
                            stats["assignments"] += 1
                        elif assignment.teacher_id is None:
                            assignment.teacher_id = section.teacher_id or teacher.id

            print(f"{department.name}: teacher={teacher.username}, majors={len(majors)}")

        if args.dry_run:
            db.rollback()
            print("Dry run complete; all changes rolled back.")
        else:
            db.commit()
            print("Seeding committed.")
        print(
            "Created: "
            f"{stats['teachers']} teachers, {stats['subjects']} subjects, "
            f"{stats['sections']} sections, {stats['assignments']} subject assignments."
        )
        return 0
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())

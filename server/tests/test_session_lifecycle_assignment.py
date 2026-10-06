from types import SimpleNamespace
import unittest

from fastapi import HTTPException

from app.services.session_lifecycle_service import _ensure_teacher_assignment


class TestSessionLifecycleAssignment(unittest.TestCase):
    def test_unassigned_class_cannot_start_session(self) -> None:
        assignment = SimpleNamespace(teacher_id=None)
        section = SimpleNamespace(teacher_id=None)

        with self.assertRaises(HTTPException) as raised:
            _ensure_teacher_assignment(assignment, section, teacher_id=10)

        self.assertEqual(raised.exception.status_code, 403)

    def test_only_assigned_class_teacher_can_start_session(self) -> None:
        assignment = SimpleNamespace(teacher_id=10)
        section = SimpleNamespace(teacher_id=None)

        _ensure_teacher_assignment(assignment, section, teacher_id=10)
        with self.assertRaises(HTTPException) as raised:
            _ensure_teacher_assignment(assignment, section, teacher_id=11)

        self.assertEqual(raised.exception.status_code, 403)

    def test_section_teacher_is_used_for_legacy_assignment(self) -> None:
        assignment = SimpleNamespace(teacher_id=None)
        section = SimpleNamespace(teacher_id=10)

        _ensure_teacher_assignment(assignment, section, teacher_id=10)


if __name__ == "__main__":
    unittest.main()
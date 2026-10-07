import unittest
from importlib import import_module


class TestImportApp(unittest.TestCase):
    def test_import_app(self) -> None:
        module = import_module("app.main")
        self.assertTrue(hasattr(module, "app"))
        paths = {route.path for route in module.app.routes}
        self.assertIn("/api/v1/sessions/{session_id}/detector/start", paths)
        self.assertFalse(any(path.startswith("/api/v1/demo") for path in paths))

    def test_import_admin_sessions_service(self) -> None:
        module = import_module("app.services.admin.sessions_service")
        self.assertTrue(hasattr(module, "_avg_engagement_for_session"))

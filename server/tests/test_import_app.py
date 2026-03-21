import unittest
from importlib import import_module


class TestImportApp(unittest.TestCase):
    def test_import_app(self) -> None:
        module = import_module("app.main")
        self.assertTrue(hasattr(module, "app"))


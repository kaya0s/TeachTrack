import unittest
from datetime import datetime, timedelta, timezone

from app.schemas.base import UtcAwareBaseModel


class TimestampModel(UtcAwareBaseModel):
    timestamp: datetime


class TestDateTimeSchema(unittest.TestCase):
    def test_naive_database_datetime_is_serialized_as_manila_time(self) -> None:
        model = TimestampModel(timestamp=datetime(2026, 10, 6, 12, 30))

        self.assertEqual(model.timestamp.utcoffset(), timedelta(hours=8))
        self.assertEqual(
            model.model_dump(mode="json")["timestamp"],
            "2026-10-06T12:30:00+08:00",
        )

    def test_explicit_timezone_is_preserved(self) -> None:
        timestamp = datetime(2026, 10, 6, 4, 30, tzinfo=timezone.utc)

        model = TimestampModel(timestamp=timestamp)

        self.assertEqual(model.timestamp, timestamp)
        self.assertEqual(model.timestamp.utcoffset(), timedelta(0))


if __name__ == "__main__":
    unittest.main()

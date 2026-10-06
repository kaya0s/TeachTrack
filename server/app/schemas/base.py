from __future__ import annotations

from datetime import datetime, timedelta, timezone

from pydantic import BaseModel, field_validator


MANILA_TIMEZONE = timezone(timedelta(hours=8))


class UtcAwareBaseModel(BaseModel):
    """Keep timezone-naive database datetimes in their stored Manila timezone."""

    @field_validator("*", mode="before")
    @classmethod
    def _coerce_naive_datetime_to_manila(cls, value):
        if isinstance(value, datetime) and value.tzinfo is None:
            return value.replace(tzinfo=MANILA_TIMEZONE)
        return value

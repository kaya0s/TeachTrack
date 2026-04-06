from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, field_validator


class UtcAwareBaseModel(BaseModel):
    @field_validator("*", mode="before")
    @classmethod
    def _coerce_naive_datetime_to_utc(cls, value):
        if isinstance(value, datetime) and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value


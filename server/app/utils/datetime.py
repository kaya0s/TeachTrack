"""Date and time utility functions."""

from datetime import datetime, timezone
from typing import Optional


def utc_now() -> datetime:
    """Get current UTC datetime."""
    return datetime.now(timezone.utc)


def from_timestamp(timestamp: float) -> datetime:
    """Convert timestamp to UTC datetime."""
    return datetime.fromtimestamp(timestamp, timezone.utc)


def format_duration(start_time: datetime, end_time: Optional[datetime] = None) -> str:
    """Format duration between two datetimes as human-readable string."""
    if end_time is None:
        end_time = utc_now()
    
    duration = end_time - start_time
    total_seconds = int(duration.total_seconds())
    
    if total_seconds < 60:
        return f"{total_seconds}s"
    elif total_seconds < 3600:
        minutes = total_seconds // 60
        return f"{minutes}m"
    else:
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        return f"{hours}h {minutes}m" if minutes > 0 else f"{hours}h"

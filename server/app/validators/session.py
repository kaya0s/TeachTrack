"""Session-related validation functions."""

from datetime import datetime, timedelta
from typing import Optional

from app.constants import MAX_SESSION_DURATION_HOURS, SESSION_TIMEOUT_MINUTES


def validate_session_duration(start_time: datetime, end_time: Optional[datetime] = None) -> tuple[bool, Optional[str]]:
    """
    Validate session duration.
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if end_time is None:
        end_time = datetime.utcnow()
    
    duration = end_time - start_time
    
    # Check if session is in the future
    if start_time > datetime.utcnow():
        return False, "Session start time cannot be in the future"
    
    # Check if end time is before start time
    if end_time < start_time:
        return False, "Session end time cannot be before start time"
    
    # Check maximum duration
    max_duration = timedelta(hours=MAX_SESSION_DURATION_HOURS)
    if duration > max_duration:
        return False, f"Session duration cannot exceed {MAX_SESSION_DURATION_HOURS} hours"
    
    return True, None


def validate_session_time_overlap(
    start_time: datetime,
    end_time: Optional[datetime] = None,
    existing_sessions: Optional[list[dict]] = None
) -> tuple[bool, Optional[str]]:
    """
    Validate that session doesn't overlap with existing sessions for the same teacher.
    
    Args:
        start_time: Session start time
        end_time: Session end time (defaults to current time if None)
        existing_sessions: List of existing session dictionaries with 'start_time' and 'end_time'
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if end_time is None:
        end_time = datetime.utcnow()
    
    if not existing_sessions:
        return True, None
    
    for session in existing_sessions:
        session_start = session.get('start_time')
        session_end = session.get('end_time')
        
        if not session_start or not session_end:
            continue
        
        # Check for overlap
        if (start_time < session_end and end_time > session_start):
            return False, "Session overlaps with an existing session"
    
    return True, None


def validate_subject_name(subject_name: str) -> tuple[bool, Optional[str]]:
    """
    Validate subject name.
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not subject_name or not subject_name.strip():
        return False, "Subject name cannot be empty"
    
    if len(subject_name.strip()) < 2:
        return False, "Subject name must be at least 2 characters long"
    
    if len(subject_name) > 100:
        return False, "Subject name must not exceed 100 characters"
    
    # Allow letters, numbers, spaces, hyphens, and common symbols
    if not any(c.isalnum() for c in subject_name):
        return False, "Subject name must contain at least one letter or number"
    
    return True, None


def validate_classroom_code(code: str) -> tuple[bool, Optional[str]]:
    """
    Validate classroom code format.
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not code or not code.strip():
        return False, "Classroom code cannot be empty"
    
    code = code.strip().upper()
    
    # Check length (typically 4-8 characters)
    if len(code) < 4 or len(code) > 8:
        return False, "Classroom code must be 4-8 characters long"
    
    # Only allow alphanumeric characters
    if not code.isalnum():
        return False, "Classroom code can only contain letters and numbers"
    
    return True, None

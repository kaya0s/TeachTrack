"""User-related validation functions."""

import re
from typing import Optional

from app.constants import MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH


def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password strength.
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters long"
    
    if len(password) > MAX_PASSWORD_LENGTH:
        return False, f"Password must not exceed {MAX_PASSWORD_LENGTH} characters"
    
    # Check for at least one uppercase letter
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    # Check for at least one lowercase letter
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    # Check for at least one digit
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    # Check for at least one special character
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    return True, None


def validate_username(username: str) -> tuple[bool, Optional[str]]:
    """
    Validate username format.
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(username) < 3:
        return False, "Username must be at least 3 characters long"
    
    if len(username) > 30:
        return False, "Username must not exceed 30 characters"
    
    # Only allow alphanumeric characters, underscores, and hyphens
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        return False, "Username can only contain letters, numbers, underscores, and hyphens"
    
    # Cannot start or end with underscore or hyphen
    if username.startswith(('_','-')) or username.endswith(('_','-')):
        return False, "Username cannot start or end with underscore or hyphen"
    
    return True, None


def validate_phone_number(phone: str) -> bool:
    """Validate phone number format (international format)."""
    # Remove all non-digit characters
    digits_only = re.sub(r'\D', '', phone)
    
    # Check if it's a valid international number (8-15 digits)
    return 8 <= len(digits_only) <= 15 and digits_only.isdigit()


def validate_name(name: str) -> tuple[bool, Optional[str]]:
    """
    Validate person's name.
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not name or not name.strip():
        return False, "Name cannot be empty"
    
    if len(name.strip()) < 2:
        return False, "Name must be at least 2 characters long"
    
    if len(name) > 100:
        return False, "Name must not exceed 100 characters"
    
    # Allow letters, spaces, hyphens, and apostrophes
    if not re.match(r'^[a-zA-Z\s\'\-]+$', name):
        return False, "Name can only contain letters, spaces, hyphens, and apostrophes"
    
    return True, None

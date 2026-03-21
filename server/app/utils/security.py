"""Security utility functions."""

import secrets
import string
from typing import Optional

from app.constants import RESET_TOKEN_LENGTH


def generate_reset_token(length: int = RESET_TOKEN_LENGTH) -> str:
    """Generate a secure random token for password reset."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def generate_session_id() -> str:
    """Generate a unique session identifier."""
    return secrets.token_urlsafe(16)


def mask_sensitive_data(data: str, mask_char: str = "*", visible_chars: int = 4) -> str:
    """Mask sensitive data showing only first few characters."""
    if len(data) <= visible_chars:
        return mask_char * len(data)
    return data[:visible_chars] + mask_char * (len(data) - visible_chars)


def is_safe_url(url: str, allowed_hosts: Optional[list[str]] = None) -> bool:
    """Check if URL is safe for redirects."""
    if not url or url.startswith(('/', '#')):
        return True
    
    if allowed_hosts:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        return parsed.netloc in allowed_hosts
    
    return False

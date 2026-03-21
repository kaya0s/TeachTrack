"""File handling utility functions."""

import os
import uuid
from pathlib import Path
from typing import Optional

from app.constants import ALLOWED_IMAGE_EXTENSIONS


def generate_unique_filename(original_filename: str, extension: Optional[str] = None) -> str:
    """Generate a unique filename preserving the original extension."""
    if extension is None:
        extension = Path(original_filename).suffix
    
    unique_id = str(uuid.uuid4())
    return f"{unique_id}{extension}"


def ensure_directory_exists(directory_path: str | Path) -> Path:
    """Ensure directory exists, create if it doesn't."""
    path = Path(directory_path)
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_file_size_mb(file_path: str | Path) -> float:
    """Get file size in megabytes."""
    path = Path(file_path)
    if not path.exists():
        return 0.0
    return path.stat().st_size / (1024 * 1024)


def is_valid_image_extension(filename: str) -> bool:
    """Check if file has a valid image extension."""
    return Path(filename).suffix.lower() in ALLOWED_IMAGE_EXTENSIONS


def sanitize_filename(filename: str) -> str:
    """Sanitize filename by removing potentially harmful characters."""
    # Remove path separators and other problematic characters
    sanitized = filename.replace('/', '_').replace('\\', '_')
    sanitized = sanitized.replace('..', '_')
    
    # Remove or replace other problematic characters
    invalid_chars = '<>:"|?*'
    for char in invalid_chars:
        sanitized = sanitized.replace(char, '_')
    
    # Limit length
    if len(sanitized) > 255:
        name, ext = os.path.splitext(sanitized)
        sanitized = name[:255-len(ext)] + ext
    
    return sanitized

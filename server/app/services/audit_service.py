from __future__ import annotations

from typing import Any, Optional, Tuple
import re

from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.core.request_context import get_request


def _extract_version(ua: str, token: str) -> str | None:
    match = re.search(rf"{re.escape(token)}/([0-9.]+)", ua)
    if not match:
        return None
    return match.group(1)


def _simplify_user_agent(user_agent: str | None) -> str | None:
    if not user_agent:
        return None
    ua = user_agent
    ua_lower = ua.lower()

    browser = None
    version = None
    if "edg/" in ua_lower:
        browser = "Edge"
        version = _extract_version(ua, "Edg")
    elif "chrome/" in ua_lower and "chromium" not in ua_lower:
        browser = "Chrome"
        version = _extract_version(ua, "Chrome")
    elif "firefox/" in ua_lower:
        browser = "Firefox"
        version = _extract_version(ua, "Firefox")
    elif "safari/" in ua_lower and "chrome/" not in ua_lower:
        browser = "Safari"
        version = _extract_version(ua, "Version") or _extract_version(ua, "Safari")

    os_name = None
    if "windows nt 10.0" in ua_lower:
        os_name = "Windows 10"
    elif "windows nt 6.3" in ua_lower:
        os_name = "Windows 8.1"
    elif "windows nt 6.2" in ua_lower:
        os_name = "Windows 8"
    elif "windows nt 6.1" in ua_lower:
        os_name = "Windows 7"
    elif "mac os x" in ua_lower:
        match = re.search(r"mac os x ([0-9_]+)", ua_lower)
        if match:
            os_name = f"macOS {match.group(1).replace('_', '.')}"
        else:
            os_name = "macOS"
    elif "iphone" in ua_lower or "ipad" in ua_lower:
        os_name = "iOS"
    elif "android" in ua_lower:
        os_name = "Android"
    elif "linux" in ua_lower:
        os_name = "Linux"

    arch = None
    if "arm64" in ua_lower:
        arch = "ARM64"
    elif "win64" in ua_lower or "x64" in ua_lower or "amd64" in ua_lower:
        arch = "64-bit"
    elif "x86" in ua_lower or "i686" in ua_lower:
        arch = "32-bit"

    if not browser and not os_name:
        return user_agent

    browser_part = browser + (f" {version}" if version else "") if browser else "Unknown browser"
    os_part = f"on {os_name}" if os_name else "on Unknown OS"
    if arch:
        os_part = f"{os_part} ({arch})"
    return f"{browser_part} {os_part}"


def _extract_request_metadata() -> Tuple[str | None, str | None]:
    request = get_request()
    if not request:
        return None, None
    ip_address = None
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        ip_address = forwarded_for.split(",")[0].strip()
    if not ip_address and request.client:
        ip_address = request.client.host
    user_agent = _simplify_user_agent(request.headers.get("user-agent"))
    return ip_address, user_agent


def write_audit_log(
    db: Session,
    *,
    actor_user_id: int | None,
    actor_username: str | None,
    action: str,
    entity_type: str,
    entity_id: str | int | None = None,
    details: Optional[dict[str, Any]] = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    if ip_address is None or user_agent is None:
        req_ip, req_user_agent = _extract_request_metadata()
        if ip_address is None:
            ip_address = req_ip
        if user_agent is None:
            user_agent = req_user_agent

    row = AuditLog(
        actor_user_id=actor_user_id,
        actor_username=actor_username,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(row)

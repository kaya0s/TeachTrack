from __future__ import annotations

from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.audit import AuditLog


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

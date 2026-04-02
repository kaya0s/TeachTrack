from __future__ import annotations

from copy import deepcopy
from typing import Any

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.core.config import settings as env_settings
from app.core.logging import configure_logging
from app.db.database import SessionLocal
from app.models.settings import SystemSettings
from app.models.user import User
from app.core import security
from app.services import audit_service


_DEFAULT_SETTINGS: dict[str, Any] = {
    "detection": {
        "detect_interval_seconds": env_settings.DETECT_INTERVAL_SECONDS,
        "detector_heartbeat_timeout_seconds": env_settings.DETECTOR_HEARTBEAT_TIMEOUT_SECONDS,
        "server_camera_enabled": env_settings.SERVER_CAMERA_ENABLED,
        "server_camera_preview": env_settings.SERVER_CAMERA_PREVIEW,
        "server_camera_index": env_settings.SERVER_CAMERA_INDEX,
        "detection_confidence_threshold": env_settings.DETECTION_CONFIDENCE_THRESHOLD,
        "detection_imgsz": env_settings.DETECTION_IMGSZ,
        "alert_cooldown_minutes": getattr(env_settings, "ALERT_COOLDOWN_MINUTES", 5),
    },
    "engagement_weights": {
        "LECTURE": {
            "on_task": env_settings.W_ON_TASK,
            "using_phone": env_settings.W_USING_PHONE,
            "sleeping": env_settings.W_SLEEPING,
            "off_task": env_settings.W_OFF_TASK,
            "not_visible": getattr(env_settings, "W_NOT_VISIBLE", 0.0),
        },
        "STUDY": {
            "on_task": env_settings.W_ON_TASK,
            "using_phone": env_settings.W_USING_PHONE,
            "sleeping": env_settings.W_SLEEPING,
            "off_task": env_settings.W_OFF_TASK * 0.5, 
            "not_visible": getattr(env_settings, "W_NOT_VISIBLE", 0.0),
        },
        "COLLABORATION": {
            "on_task": env_settings.W_ON_TASK,
            "using_phone": env_settings.W_USING_PHONE,
            "sleeping": env_settings.W_SLEEPING,
            "off_task": 0.0, # Zero off_task penalty
            "not_visible": getattr(env_settings, "W_NOT_VISIBLE", 0.0),
        },
        "EXAM": {
            "on_task": env_settings.W_ON_TASK,
            "using_phone": env_settings.W_USING_PHONE * 2.0, # Double phone penalty
            "sleeping": env_settings.W_SLEEPING,
            "off_task": env_settings.W_OFF_TASK * 2.0, # Double off_task penalty
            "not_visible": getattr(env_settings, "W_NOT_VISIBLE", 0.0),
        },
    },
    "exam_proctoring": {
        "phone_count_threshold": 1,
        "off_task_count_threshold": 2,
    },
    "security": {
        "access_token_expire_minutes": env_settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    },
    "admin_ops": {
        "enable_admin_log_stream": getattr(env_settings, "ENABLE_ADMIN_LOG_STREAM", False),
    },
}


_ALLOWED_KEYS = {
    "detection": set(_DEFAULT_SETTINGS["detection"].keys()),
    "engagement_weights": {"LECTURE", "STUDY", "COLLABORATION", "EXAM"},
    "admin_ops": set(_DEFAULT_SETTINGS["admin_ops"].keys()),
    "exam_proctoring": set(_DEFAULT_SETTINGS["exam_proctoring"].keys()),
    "security": set(_DEFAULT_SETTINGS["security"].keys()),
}

_cached_effective: dict[str, Any] | None = None
_last_applied_log_stream: bool | None = None


def _integration_status() -> dict[str, bool]:
    cloudinary_configured = bool(
        env_settings.CLOUDINARY_CLOUD_NAME
        and env_settings.CLOUDINARY_API_KEY
        and env_settings.CLOUDINARY_API_SECRET
    )
    mail_configured = bool(
        env_settings.MAIL_SERVER
        and env_settings.MAIL_FROM
        and env_settings.MAIL_USERNAME
        and env_settings.MAIL_PASSWORD
    )
    return {
        "cloudinary_configured": cloudinary_configured,
        "mail_configured": mail_configured,
    }


def _deep_merge(base: dict[str, Any], overrides: dict[str, Any]) -> dict[str, Any]:
    merged = deepcopy(base)
    for key, value in (overrides or {}).items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


    sanitized: dict[str, Any] = {}
    for section, allowed_keys in _ALLOWED_KEYS.items():
        if section not in payload or not isinstance(payload[section], dict):
            continue
        
        if section == "engagement_weights":
            # For engagement_weights, we allow keys for each ActivityMode
            sanitized[section] = {}
            for mode in allowed_keys:
                if mode in payload[section] and isinstance(payload[section][mode], dict):
                    # Sanitize individual behavior keys within the mode
                    behavior_keys = {"on_task", "using_phone", "sleeping", "off_task", "not_visible"}
                    sanitized[section][mode] = {k: payload[section][mode][k] for k in behavior_keys if k in payload[section][mode]}
            continue

        sanitized[section] = {k: payload[section][k] for k in allowed_keys if k in payload[section]}
    return sanitized


def _validate_effective(effective: dict[str, Any]) -> None:
    detection = effective["detection"]
    if not (1 <= int(detection["detect_interval_seconds"]) <= 60):
        raise ValueError("detect_interval_seconds must be between 1 and 60.")
    if not (5 <= int(detection["detector_heartbeat_timeout_seconds"]) <= 300):
        raise ValueError("detector_heartbeat_timeout_seconds must be between 5 and 300.")
    if not (0 <= int(detection["server_camera_index"]) <= 10):
        raise ValueError("server_camera_index must be between 0 and 10.")
    if not (0.0 <= float(detection["detection_confidence_threshold"]) <= 1.0):
        raise ValueError("detection_confidence_threshold must be between 0.0 and 1.0.")
    if not (320 <= int(detection["detection_imgsz"]) <= 1280):
        raise ValueError("detection_imgsz must be between 320 and 1280.")
    if not (1 <= int(detection["alert_cooldown_minutes"]) <= 120):
        raise ValueError("alert_cooldown_minutes must be between 1 and 120.")

    weights_by_mode = effective["engagement_weights"]
    for mode, weights in weights_by_mode.items():
        if mode not in ("LECTURE", "STUDY", "COLLABORATION", "EXAM"):
            continue
        
        for key in ("on_task", "using_phone", "sleeping", "off_task", "not_visible"):
            value = float(weights.get(key, 0.0))
            if key == "on_task":
                if value <= 0 or value > 10:
                    raise ValueError(f"engagement weight 'on_task' in mode {mode} must be between 0 (exclusive) and 10.")
            else:
                if value < 0 or value > 10:
                    raise ValueError(f"engagement weight '{key}' in mode {mode} must be between 0 and 10.")
        
        if float(weights["on_task"]) <= 0:
            raise ValueError(f"engagement weight 'on_task' in mode {mode} must be greater than 0.")

    admin_ops = effective["admin_ops"]
    if not isinstance(admin_ops["enable_admin_log_stream"], bool):
        raise ValueError("enable_admin_log_stream must be true or false.")

    exam_proctoring = effective["exam_proctoring"]
    if not (1 <= int(exam_proctoring["phone_count_threshold"]) <= 50):
        raise ValueError("phone_count_threshold must be between 1 and 50.")
    if not (1 <= int(exam_proctoring["off_task_count_threshold"]) <= 50):
        raise ValueError("off_task_count_threshold must be between 1 and 50.")

    security = effective["security"]
    if not (5 <= int(security["access_token_expire_minutes"]) <= 43200):
        raise ValueError("access_token_expire_minutes must be between 5 and 43200.")


def _apply_log_stream_setting(enabled: bool) -> None:
    global _last_applied_log_stream
    if _last_applied_log_stream is None or _last_applied_log_stream != enabled:
        configure_logging(env_settings.LOG_LEVEL, enable_admin_log_stream=enabled)
        _last_applied_log_stream = enabled


def _get_row(db: Session) -> SystemSettings | None:
    return db.query(SystemSettings).order_by(SystemSettings.id.asc()).first()


def get_effective_settings(db: Session) -> dict[str, Any]:
    row = _get_row(db)
    overrides = row.config if row and row.config else {}
    effective = _deep_merge(_DEFAULT_SETTINGS, overrides)
    effective["integrations"] = _integration_status()
    _cache_effective(effective)
    _apply_log_stream_setting(effective["admin_ops"]["enable_admin_log_stream"])
    return effective


def update_settings(db: Session, payload: dict[str, Any], actor_user_id: int | None, actor_username: str | None) -> dict[str, Any]:
    reset = bool(payload.get("reset"))
    confirm_password = payload.pop("confirm_password", None)
    if not confirm_password:
        raise HTTPException(status_code=400, detail="confirm_password is required to update settings.")
    if actor_user_id is None:
        raise HTTPException(status_code=401, detail="Invalid actor for settings update.")
    actor = db.query(User).filter(User.id == actor_user_id).first()
    if not actor or not security.verify_password(confirm_password, actor.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid password.")

    row = _get_row(db)
    existing_overrides = row.config if row and row.config else {}
    if reset:
        overrides: dict[str, Any] = {}
    else:
        overrides = _deep_merge(existing_overrides, _sanitize_overrides(payload))

    effective = _deep_merge(_DEFAULT_SETTINGS, overrides)
    try:
        _validate_effective(effective)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if row is None:
        row = SystemSettings(config=overrides, updated_by=actor_user_id)
        db.add(row)
    else:
        row.config = overrides
        row.updated_by = actor_user_id
        db.add(row)

    audit_service.write_audit_log(
        db,
        actor_user_id=actor_user_id,
        actor_username=actor_username,
        action="SETTINGS_UPDATE",
        entity_type="SystemSettings",
        entity_id=row.id if row.id else "system",
        details={"reset": reset, "overrides": overrides},
    )
    db.commit()
    db.refresh(row)

    # If engagement weights were updated, trigger a recalculation of all session engagement caches
    if reset or "engagement_weights" in payload:
        from app.services.admin import sessions_service
        # Recalculate all session engagement based on the new weights
        sessions_service.recalculate_all_sessions_engagement(db)

    effective["integrations"] = _integration_status()
    _cache_effective(effective)
    _apply_log_stream_setting(effective["admin_ops"]["enable_admin_log_stream"])
    return effective


def _cache_effective(effective: dict[str, Any]) -> None:
    global _cached_effective
    _cached_effective = deepcopy(effective)


def get_cached_effective_settings() -> dict[str, Any]:
    global _cached_effective
    if _cached_effective is None:
        db = SessionLocal()
        try:
            _cached_effective = get_effective_settings(db)
        except Exception:
            _cached_effective = deepcopy(_DEFAULT_SETTINGS)
            _cached_effective["integrations"] = _integration_status()
            _apply_log_stream_setting(_cached_effective["admin_ops"]["enable_admin_log_stream"])
        finally:
            db.close()
    return deepcopy(_cached_effective)


def get_engagement_weights(db: Session | None = None, mode: str = "LECTURE") -> dict[str, float]:
    effective = get_cached_effective_settings() if db is None else get_effective_settings(db)
    all_weights = effective["engagement_weights"]
    
    # Fallback logic if mode is missing or invalid
    if mode not in all_weights:
        mode = "LECTURE"
    
    return all_weights[mode]


def get_detection_settings(db: Session | None = None) -> dict[str, Any]:
    if db is None:
        return get_cached_effective_settings()["detection"]
    return get_effective_settings(db)["detection"]


def get_admin_ops_settings(db: Session | None = None) -> dict[str, Any]:
    if db is None:
        return get_cached_effective_settings()["admin_ops"]
    return get_effective_settings(db)["admin_ops"]


def get_proctoring_settings(db: Session | None = None) -> dict[str, Any]:
    if db is None:
        return get_cached_effective_settings()["exam_proctoring"]
    return get_effective_settings(db)["exam_proctoring"]


def get_security_settings(db: Session | None = None) -> dict[str, Any]:
    if db is None:
        return get_cached_effective_settings()["security"]
    return get_effective_settings(db)["security"]


def is_admin_log_stream_enabled() -> bool:
    return bool(get_cached_effective_settings()["admin_ops"]["enable_admin_log_stream"])

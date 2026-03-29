from __future__ import annotations

import hashlib
import time

import httpx
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.constants import MAX_FILE_SIZE_MB
from app.core.config import settings
from app.services import audit_service
from app.utils.file import is_valid_image_extension, sanitize_filename

ALLOWED_MEDIA_ENTITIES = {"college", "department", "major", "subject"}


async def upload_admin_media(
    db: Session,
    file: UploadFile,
    current_user,
    entity: str,
) -> dict[str, str]:
    entity_normalized = (entity or "").strip().lower()
    if entity_normalized not in ALLOWED_MEDIA_ENTITIES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid media entity.")

    if file.filename and not is_valid_image_extension(file.filename):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image file type.")

    cloud_name = settings.CLOUDINARY_CLOUD_NAME
    api_key = settings.CLOUDINARY_API_KEY
    api_secret = settings.CLOUDINARY_API_SECRET
    if not cloud_name or not api_key or not api_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudinary is not configured on the server.",
        )

    file_bytes = await file.read()
    file_size_mb = len(file_bytes) / (1024 * 1024)
    if file_size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image size exceeds {MAX_FILE_SIZE_MB} MB limit.",
        )

    actor_user_id = getattr(current_user, "id", None)
    actor_username = getattr(current_user, "username", None)
    timestamp = int(time.time())
    folder = f"teachtrack/admin/{entity_normalized}s"
    public_id = f"{entity_normalized}_{actor_user_id}_{timestamp}"
    signature_payload = f"folder={folder}&public_id={public_id}&timestamp={timestamp}{api_secret}"
    signature = hashlib.sha1(signature_payload.encode("utf-8")).hexdigest()

    upload_url = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            upload_url,
            data={
                "api_key": api_key,
                "timestamp": timestamp,
                "folder": folder,
                "public_id": public_id,
                "signature": signature,
            },
            files={"file": (sanitize_filename(file.filename or f"{entity_normalized}.jpg"), file_bytes, file.content_type)},
        )

    if response.status_code >= 400:
        message = "Cloudinary upload failed."
        try:
            payload = response.json()
            message = payload.get("error", {}).get("message", message)
        except ValueError:
            pass
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=message)

    payload = response.json()
    secure_url = payload.get("secure_url")
    cloud_public_id = payload.get("public_id")
    if not secure_url or not cloud_public_id:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Cloudinary response missing secure_url/public_id.",
        )

    audit_service.write_audit_log(
        db,
        actor_user_id=actor_user_id,
        actor_username=actor_username,
        action="ADMIN_MEDIA_UPLOAD",
        entity_type="Media",
        entity_id=cloud_public_id,
        details={"entity": entity_normalized, "secure_url": secure_url, "file_name": file.filename},
    )
    db.commit()
    return {"secure_url": secure_url, "public_id": cloud_public_id}

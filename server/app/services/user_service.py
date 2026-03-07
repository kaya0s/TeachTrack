import hashlib
import time
import httpx
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import settings
from app.repositories.user_repository import UserRepository
from app.schemas.user import PasswordChange, UserUpdate
from app.services import audit_service


def update_user_me(db: Session, data: UserUpdate, current_user):
    before = {
        "email": current_user.email,
        "username": current_user.username,
        "profile_picture_url": current_user.profile_picture_url,
    }

    if data.email is not None and data.email != current_user.email:
        existing_email = UserRepository.get_by_email(db, data.email)
        if existing_email:
            raise HTTPException(status_code=400, detail="Email is already in use.")
        current_user.email = data.email

    if data.username is not None and data.username != current_user.username:
        existing_username = UserRepository.get_by_username(db, data.username)
        if existing_username:
            raise HTTPException(status_code=400, detail="Username is already in use.")
        current_user.username = data.username

    if data.profile_picture_url is not None:
        current_user.profile_picture_url = data.profile_picture_url

    db.add(current_user)
    audit_service.write_audit_log(
        db,
        actor_user_id=current_user.id,
        actor_username=getattr(current_user, "username", None),
        action="TEACHER_PROFILE_UPDATE",
        entity_type="User",
        entity_id=current_user.id,
        details={
            "before": before,
            "after": {
                "email": current_user.email,
                "username": current_user.username,
                "profile_picture_url": current_user.profile_picture_url,
            },
        },
    )
    db.commit()
    db.refresh(current_user)
    return current_user


async def upload_profile_picture(db: Session, file: UploadFile, current_user) -> str:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files are allowed.")

    cloud_name = settings.CLOUDINARY_CLOUD_NAME
    api_key = settings.CLOUDINARY_API_KEY
    api_secret = settings.CLOUDINARY_API_SECRET
    if not cloud_name or not api_key or not api_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudinary is not configured on the server.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image size exceeds 5 MB limit.")

    timestamp = int(time.time())
    folder = f"teachtrack/users/{current_user.id}/profile"
    public_id = f"avatar_{current_user.id}_{timestamp}"
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
            files={"file": (file.filename or "profile.jpg", file_bytes, file.content_type)},
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
    if not secure_url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Cloudinary response missing secure_url.",
        )

    # Automatically update user profile picture url
    current_user.profile_picture_url = secure_url
    db.add(current_user)
    audit_service.write_audit_log(
        db,
        actor_user_id=current_user.id,
        actor_username=getattr(current_user, "username", None),
        action="TEACHER_PROFILE_PICTURE_UPLOAD",
        entity_type="User",
        entity_id=current_user.id,
        details={"profile_picture_url": secure_url, "file_name": file.filename},
    )
    db.commit()
    db.refresh(current_user)

    return secure_url


def change_password_me(db: Session, data: PasswordChange, current_user):
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long.")
    if not security.verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    current_user.hashed_password = security.get_password_hash(data.new_password)
    db.add(current_user)
    audit_service.write_audit_log(
        db,
        actor_user_id=current_user.id,
        actor_username=getattr(current_user, "username", None),
        action="TEACHER_PASSWORD_CHANGE",
        entity_type="User",
        entity_id=current_user.id,
        details=None,
    )
    db.commit()
    return {"message": "Password updated successfully."}

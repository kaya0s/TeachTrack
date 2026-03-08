from datetime import datetime, timedelta
import secrets
from typing import Any

from fastapi import HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import settings
from app.core.mail import send_verification_email
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import ForgotPassword, GoogleLogin, ResetPassword, UserCreate, VerifyCode


def login_access_token(db: Session, username: str, password: str) -> dict[str, str]:
    # OAuth2 form field remains named "username", but we now treat it as email-first.
    login_identifier = username.strip()
    user = UserRepository.get_by_email(db, login_identifier)
    if not user:
        user = UserRepository.get_by_username(db, login_identifier)
    if not user or not security.verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(user.id, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}


def register_user(db: Session, user_in: UserCreate) -> User:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Self-registration is disabled. Contact an administrator for account creation.",
    )


def login_google(db: Session, google_in: GoogleLogin) -> dict[str, str]:
    try:
        idinfo = id_token.verify_oauth2_token(
            google_in.id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )

        email = idinfo["email"]
        user = UserRepository.get_by_email(db, email)

        if not user:
            random_password = secrets.token_urlsafe(18)
            username = email.split("@")[0]
            base_username = username
            counter = 1
            while UserRepository.get_by_username(db, username):
                username = f"{base_username}{counter}"
                counter += 1

            user = User(
                firstname=idinfo.get("given_name", username),
                lastname=idinfo.get("family_name", ""),
                email=email,
                username=username,
                hashed_password=security.get_password_hash(random_password),
                role="teacher",
                is_active=True,
            )
            user = UserRepository.create(db, user)

        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")

        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(user.id, expires_delta=access_token_expires)
        return {"access_token": access_token, "token_type": "bearer"}

    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")


async def forgot_password(db: Session, data: ForgotPassword) -> dict[str, str]:
    user = UserRepository.get_by_email(db, data.email)
    if not user:
        return {"message": "If the email exists, a code has been sent."}

    code = security.generate_reset_code()
    user.reset_code = security.hash_reset_code(data.email, code)
    user.reset_code_expires = int(datetime.utcnow().timestamp()) + 600
    db.commit()

    await send_verification_email(data.email, code)
    return {"message": "Verification code sent."}


def verify_reset_code(db: Session, data: VerifyCode) -> dict[str, str]:
    user = UserRepository.get_by_email(db, data.email)
    if not user or not user.reset_code:
        raise HTTPException(status_code=400, detail="Invalid code")
    if not security.verify_reset_code(data.email, data.code, user.reset_code):
        raise HTTPException(status_code=400, detail="Invalid code")

    if not user.reset_code_expires or user.reset_code_expires < int(datetime.utcnow().timestamp()):
        raise HTTPException(status_code=400, detail="Code expired")

    return {"message": "Code verified."}


def reset_password(db: Session, data: ResetPassword) -> dict[str, str]:
    user = UserRepository.get_by_email(db, data.email)
    if not user or not user.reset_code:
        raise HTTPException(status_code=400, detail="Invalid code")
    if not security.verify_reset_code(data.email, data.code, user.reset_code):
        raise HTTPException(status_code=400, detail="Invalid code")

    if not user.reset_code_expires or user.reset_code_expires < int(datetime.utcnow().timestamp()):
        raise HTTPException(status_code=400, detail="Code expired")

    user.hashed_password = security.get_password_hash(data.new_password)
    user.reset_code = None
    user.reset_code_expires = None
    db.commit()

    return {"message": "Password reset successful."}

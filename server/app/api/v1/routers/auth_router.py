from typing import Any

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.user import (
    ForgotPassword,
    GoogleLogin,
    ResetPassword,
    Token,
    VerifyCode,
)
from app.services import auth_service

router = APIRouter()


@router.post("/login/access-token", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    return auth_service.login_access_token(db, form_data.username, form_data.password)


@router.post("/login/google", response_model=Token)
def login_google(
    *,
    db: Session = Depends(get_db),
    google_in: GoogleLogin,
) -> Any:
    return auth_service.login_google(db, google_in)


@router.post("/forgot-password")
async def forgot_password(
    *,
    db: Session = Depends(get_db),
    data: ForgotPassword,
) -> Any:
    return await auth_service.forgot_password(db, data)


@router.post("/verify-reset-code")
def verify_reset_code(
    *,
    db: Session = Depends(get_db),
    data: VerifyCode,
) -> Any:
    return auth_service.verify_reset_code(db, data)


@router.post("/reset-password")
def reset_password(
    *,
    db: Session = Depends(get_db),
    data: ResetPassword,
) -> Any:
    return auth_service.reset_password(db, data)

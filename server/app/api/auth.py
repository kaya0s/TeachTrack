
from datetime import datetime, timedelta
import random
import string
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.core import security
from app.core.config import settings
from app.core.mail import send_verification_email
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import (
    Token, 
    UserCreate, 
    User as UserSchema, 
    ForgotPassword, 
    VerifyCode, 
    ResetPassword,
    GoogleLogin
)

router = APIRouter()

@router.post("/login/access-token", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.username, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }

@router.post("/register", response_model=UserSchema)
def register_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
) -> Any:
    """
    Create new user.
    """
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this user email already exists in the system.",
        )
    user_by_username = db.query(User).filter(User.username == user_in.username).first()
    if user_by_username:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    
    user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=security.get_password_hash(user_in.password),
        is_active=user_in.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login/google", response_model=Token)
def login_google(
    *,
    db: Session = Depends(get_db),
    google_in: GoogleLogin,
) -> Any:
    """
    Login with Google ID Token.
    """
    try:
        # Verify the ID token
        idinfo = id_token.verify_oauth2_token(
            google_in.id_token, 
            google_requests.Request(), 
            settings.GOOGLE_CLIENT_ID
        )

        email = idinfo['email']
        
        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # Create a new user if it doesn't exist
            # Generate a random password for OAuth users (they shouldn't need it if they use Google)
            random_password = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
            username = email.split('@')[0]
            
            # Ensure unique username
            base_username = username
            counter = 1
            while db.query(User).filter(User.username == username).first():
                username = f"{base_username}{counter}"
                counter += 1
                
            user = User(
                email=email,
                username=username,
                hashed_password=security.get_password_hash(random_password),
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")

        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            user.username, expires_delta=access_token_expires
        )
        return {
            "access_token": access_token,
            "token_type": "bearer",
        }
    except ValueError:
        # Invalid token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        )

@router.post("/forgot-password")
async def forgot_password(
    *,
    db: Session = Depends(get_db),
    data: ForgotPassword,
) -> Any:
    """
    Send reset password code to email.
    """
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        # We don't want to reveal if a user exists or not for security reasons, 
        # but in a teacher app it might be okay. Let's return success anyway.
        return {"message": "If the email exists, a code has been sent."}
    
    # Generate 6-digit code
    code = ''.join(random.choices(string.digits, k=6))
    user.reset_code = code
    user.reset_code_expires = int(datetime.utcnow().timestamp()) + 600 # 10 minutes
    
    db.commit()
    
    await send_verification_email(data.email, code)
    
    return {"message": "Verification code sent."}

@router.post("/verify-reset-code")
def verify_reset_code(
    *,
    db: Session = Depends(get_db),
    data: VerifyCode,
) -> Any:
    """
    Verify reset code.
    """
    user = db.query(User).filter(User.email == data.email).first()
    if not user or user.reset_code != data.code:
        raise HTTPException(status_code=400, detail="Invalid code")
    
    if user.reset_code_expires < int(datetime.utcnow().timestamp()):
        raise HTTPException(status_code=400, detail="Code expired")
    
    return {"message": "Code verified."}

@router.post("/reset-password")
def reset_password(
    *,
    db: Session = Depends(get_db),
    data: ResetPassword,
) -> Any:
    """
    Reset password using code.
    """
    user = db.query(User).filter(User.email == data.email).first()
    if not user or user.reset_code != data.code:
        raise HTTPException(status_code=400, detail="Invalid code")
    
    if user.reset_code_expires < int(datetime.utcnow().timestamp()):
        raise HTTPException(status_code=400, detail="Code expired")
    
    user.hashed_password = security.get_password_hash(data.new_password)
    user.reset_code = None
    user.reset_code_expires = None
    db.commit()
    
    return {"message": "Password reset successful."}

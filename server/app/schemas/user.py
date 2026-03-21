
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from app.constants import MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH

# Shared properties
class UserBase(BaseModel):
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    fullname: Optional[str] = None
    age: Optional[int] = Field(default=None, ge=1, le=120)
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = True
    profile_picture_url: Optional[str] = None

# Properties to receive via API on creation
class UserCreate(UserBase):
    firstname: str = Field(min_length=1, max_length=100)
    lastname: str = Field(min_length=1, max_length=100)
    age: int = Field(ge=1, le=120)
    email: EmailStr
    password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH)

class UserUpdate(BaseModel):
    firstname: Optional[str] = Field(default=None, min_length=1, max_length=100)
    lastname: Optional[str] = Field(default=None, min_length=1, max_length=100)
    age: Optional[int] = Field(default=None, ge=1, le=120)
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    profile_picture_url: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH)

# Properties to return via API
class User(UserBase):
    id: int
    is_superuser: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class ForgotPassword(BaseModel):
    email: EmailStr

class VerifyCode(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")

class ResetPassword(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH)

class GoogleLogin(BaseModel):
    id_token: str

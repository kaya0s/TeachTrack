
from typing import Optional
from pydantic import BaseModel, EmailStr

# Shared properties
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    is_active: Optional[bool] = True

# Properties to receive via API on creation
class UserCreate(UserBase):
    email: EmailStr
    username: str
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

# Properties to return via API
class User(UserBase):
    id: int
    is_superuser: bool

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
    code: str

class ResetPassword(BaseModel):
    email: EmailStr
    code: str
    new_password: str

class GoogleLogin(BaseModel):
    id_token: str

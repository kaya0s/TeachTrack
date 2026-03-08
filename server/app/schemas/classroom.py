from __future__ import annotations
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

# --- Section ---
class SectionBase(BaseModel):
    name: str

class SectionCreate(SectionBase):
    subject_id: int

class Section(SectionBase):
    id: int
    subject_id: Optional[int]
    teacher_id: int
    teacher_username: Optional[str] = None
    college_name: Optional[str] = None
    major_name: Optional[str] = None
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

# --- Subject ---
class SubjectBase(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None

class Subject(SubjectBase):
    id: int
    teacher_id: int
    teacher_username: Optional[str] = None
    created_at: Optional[datetime]
    sections: List[Section] = Field(default_factory=list)

    class Config:
        from_attributes = True

class SubjectCoverUploadResponse(BaseModel):
    secure_url: str
    public_id: str

from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# Shared properties
class SubjectBase(BaseModel):
    name: str
    code: Optional[str] = None

class SubjectCreate(SubjectBase):
    pass

class Subject(SubjectBase):
    id: int
    teacher_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Class Section
class SectionBase(BaseModel):
    name: str

class SectionCreate(SectionBase):
    pass

class Section(SectionBase):
    id: int
    teacher_id: int
    created_at: datetime

    class Config:
        from_attributes = True

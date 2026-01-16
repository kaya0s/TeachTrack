from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.db.database import get_db
from app.models.classroom import Subject, ClassSection
from app.schemas.classroom import SubjectCreate, Subject as SubjectSchema, SectionCreate, Section as SectionSchema

router = APIRouter()

# -- Subjects --

@router.get("/subjects", response_model=List[SubjectSchema])
def read_subjects(
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
    skip: int = 0,
    limit: int = 100
) -> Any:
    return db.query(Subject).filter(Subject.teacher_id == current_user.id).offset(skip).limit(limit).all()

@router.post("/subjects", response_model=SubjectSchema)
def create_subject(
    *,
    db: Session = Depends(get_db),
    subject_in: SubjectCreate,
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    subject = Subject(
        **subject_in.dict(),
        teacher_id=current_user.id
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject

# -- Sections --

@router.get("/sections", response_model=List[SectionSchema])
def read_sections(
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
    skip: int = 0,
    limit: int = 100
) -> Any:
    return db.query(ClassSection).filter(ClassSection.teacher_id == current_user.id).offset(skip).limit(limit).all()

@router.post("/sections", response_model=SectionSchema)
def create_section(
    *,
    db: Session = Depends(get_db),
    section_in: SectionCreate,
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    section = ClassSection(
        **section_in.dict(),
        teacher_id=current_user.id
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    return section

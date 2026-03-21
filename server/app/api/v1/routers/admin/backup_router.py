from typing import Any

import anyio
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session

from app.api.v1 import deps
from app.db.database import SessionLocal, get_db
from app.models.user import User as UserModel
from app.schemas.backup import BackupRun as BackupRunSchema
from app.services.admin import backup_service
from app.constants import DEFAULT_PAGE_SIZE

router = APIRouter()


def _run_backup_task_background(backup_id: int) -> None:
    # BackgroundTasks runs in a threadpool, so we create a new DB session here.
    db = SessionLocal()
    try:
        anyio.run(backup_service.run_backup_task, db, backup_id)
    finally:
        db.close()


@router.get("/backups", response_model=list[BackupRunSchema])
def list_backups(
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return backup_service.get_backup_runs(db, skip=skip, limit=limit)


@router.post("/backups", response_model=BackupRunSchema)
def run_backup(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    run = backup_service.create_backup_run(db, current_user)
    background_tasks.add_task(_run_backup_task_background, run.id)
    return run


@router.get("/backups/{backup_id}", response_model=BackupRunSchema)
def get_backup_status(
    backup_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    run = backup_service.get_backup_run(db, backup_id=backup_id)
    if not run:
        raise HTTPException(status_code=404, detail="Backup run not found")
    return run


# Backward-compatible aliases (older API paths)
@router.post("/backup", response_model=BackupRunSchema)
def create_backup(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return run_backup(background_tasks=background_tasks, db=db, current_user=current_user)


@router.get("/backup-runs", response_model=list[BackupRunSchema])
def list_backup_runs(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return list_backups(db=db, current_user=current_user)

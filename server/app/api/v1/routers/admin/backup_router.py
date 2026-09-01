import logging
import sys
import traceback
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1 import deps
from app.db.database import get_db
from app.models.user import User as UserModel
from app.schemas.backup import BackupRun as BackupRunSchema
from app.services.admin import backup_service
from app.constants import DEFAULT_PAGE_SIZE

logger = logging.getLogger(__name__)

router = APIRouter()


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
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    try:
        return backup_service.perform_backup(db, current_user)
    except Exception as e:
        print("\n" + "=" * 60, file=sys.stderr, flush=True)
        print(f"[BACKUP ROUTER ERROR] Backup request failed: {e}", file=sys.stderr, flush=True)
        traceback.print_exc(file=sys.stderr)
        print("=" * 60 + "\n", file=sys.stderr, flush=True)
        sys.stderr.flush()

        logger.error(f"[Backup API] Backup creation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="A server error occurred while processing the backup. Please check the server logs for details.",
        )


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
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return run_backup(db=db, current_user=current_user)


@router.get("/backup-runs", response_model=list[BackupRunSchema])
def list_backup_runs(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    return list_backups(db=db, current_user=current_user)

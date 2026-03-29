import os
import shutil
import subprocess
import gzip
import tempfile
from pathlib import Path
from typing import List, Optional

from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import Session
from google.oauth2.credentials import Credentials
from google.oauth2 import service_account
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

from app.core.config import settings
from app.models.backup import BackupRun
from app.models.user import User
from app.services import audit_service
from app.utils.datetime import utc_now
from app.constants import DEFAULT_PAGE_SIZE
from app.core.pagination import clamp_pagination


def get_backup_runs(db: Session, skip: int = 0, limit: int = DEFAULT_PAGE_SIZE) -> List[BackupRun]:
    skip, limit = clamp_pagination(skip, limit)
    return db.query(BackupRun).order_by(BackupRun.created_at.desc()).offset(skip).limit(limit).all()


def get_backup_run(db: Session, backup_id: int) -> Optional[BackupRun]:
    return db.query(BackupRun).filter(BackupRun.id == backup_id).first()


def create_backup_run(db: Session, created_by_user) -> BackupRun:
    backup_run = BackupRun(
        status="running",
        created_by=created_by_user.id if created_by_user else None
    )
    db.add(backup_run)
    db.commit()
    db.refresh(backup_run)
    
    audit_service.write_audit_log(
        db,
        actor_user_id=created_by_user.id if created_by_user else None,
        actor_username=getattr(created_by_user, "username", None) if created_by_user else "system",
        action="BACKUP_START",
        entity_type="BackupRun",
        entity_id=backup_run.id,
        details={"message": "Manual backup started"}
    )
    
    return backup_run


async def run_backup_task(db: Session, backup_id: int):
    backup_run = get_backup_run(db, backup_id)
    if not backup_run:
        return

    actor_username = "system"
    if backup_run.created_by:
        user = db.query(User).filter(User.id == backup_run.created_by).first()
        if user:
            actor_username = user.username

    try:
        url = make_url(settings.SQLALCHEMY_DATABASE_URL)
        db_name = url.database
        db_user = url.username
        db_password = url.password
        db_host = url.host
        db_port = url.port or 3306

        timestamp = utc_now().strftime("%Y%m%d_%H%M%S")
        filename = f"teachtrack_backup_{timestamp}.sql.gz"
        backup_run.filename = filename
        db.commit()

        with tempfile.TemporaryDirectory() as tmp_dir:
            sql_file = os.path.join(tmp_dir, "dump.sql")
            gz_file = os.path.join(tmp_dir, filename)

            cnf_file = os.path.join(tmp_dir, "my.cnf")
            with open(cnf_file, "w") as f:
                f.write(f"[client]\nuser={db_user}\npassword={db_password}\nhost={db_host}\nport={db_port}\n")

            dump_binary = shutil.which("mysqldump") or shutil.which("mariadb-dump")
            if not dump_binary:
                raise Exception("Backup error: mysqldump executable was not found in PATH.")

            dump_cmd = [
                dump_binary,
                f"--defaults-extra-file={cnf_file}",
                db_name,
                "--result-file=" + sql_file
            ]
            
            process = subprocess.run(dump_cmd, capture_output=True, text=True)
            if process.returncode != 0:
                stderr = (process.stderr or "").strip()
                stdout = (process.stdout or "").strip()
                detail = stderr or stdout or "Unknown mysqldump error."
                raise Exception(f"mysqldump failed: {detail}")

            with open(sql_file, "rb") as f_in:
                with gzip.open(gz_file, "wb") as f_out:
                    shutil.copyfileobj(f_in, f_out)

            file_size = os.path.getsize(gz_file)
            backup_run.file_size_bytes = file_size
            db.commit()

            drive_info = _upload_to_drive(gz_file, filename)
            
            backup_run.drive_file_id = drive_info["id"]
            backup_run.drive_link = drive_info.get("webViewLink")
            backup_run.status = "success"
            backup_run.completed_at = utc_now()
            db.commit()

            audit_service.write_audit_log(
                db,
                actor_user_id=backup_run.created_by,
                actor_username=actor_username,
                action="BACKUP_SUCCESS",
                entity_type="BackupRun",
                entity_id=backup_run.id,
                details={"filename": filename, "size": file_size, "drive_id": drive_info["id"]}
            )

    except Exception as e:
        backup_run.status = "failed"
        backup_run.error_message = str(e)
        backup_run.completed_at = utc_now()
        db.commit()
        
        audit_service.write_audit_log(
            db,
            actor_user_id=backup_run.created_by,
            actor_username=actor_username,
            action="BACKUP_FAILURE",
            entity_type="BackupRun",
            entity_id=backup_id,
            details={"error": str(e)}
        )


def _upload_to_drive(file_path: str, filename: str) -> dict:
    scopes = ["https://www.googleapis.com/auth/drive.file"]
    creds = None

    service_account_path = (settings.GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE or "").strip()
    if service_account_path:
        sa_path = Path(service_account_path)
        if not sa_path.is_absolute():
            candidates = [Path.cwd() / sa_path, Path(__file__).resolve().parents[3] / sa_path]
            sa_path = next((path for path in candidates if path.exists()), candidates[0])
        if not sa_path.exists():
            raise Exception(f"Backup error: service account file not found at '{sa_path}'.")
        creds = service_account.Credentials.from_service_account_file(str(sa_path), scopes=scopes)
    else:
        token_candidates = [
            Path.cwd() / "config" / "token.json",
            Path(__file__).resolve().parents[3] / "config" / "token.json",
        ]
        token_path = next((path for path in token_candidates if path.exists()), None)
        if token_path is None:
            raise Exception(
                "Backup error: Google Drive credentials are missing. "
                "Set GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE or provide config/token.json."
            )
        creds = Credentials.from_authorized_user_file(str(token_path), scopes=scopes)
        if not creds.valid:
            if creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                raise Exception("Backup error: token.json is invalid/expired and cannot be refreshed.")

    service = build('drive', 'v3', credentials=creds, cache_discovery=False)

    file_metadata = {
        'name': filename,
        'parents': [settings.GOOGLE_DRIVE_FOLDER_ID] if settings.GOOGLE_DRIVE_FOLDER_ID else []
    }
    media = MediaFileUpload(file_path, mimetype='application/gzip', resumable=False)
    
    file = service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id, webViewLink'
    ).execute()
    
    return file

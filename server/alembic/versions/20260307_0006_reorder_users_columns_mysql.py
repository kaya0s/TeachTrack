"""Reorder users table columns for MySQL readability.

Revision ID: 20260307_0006
Revises: 20260307_0005
Create Date: 2026-03-07 00:00:01
"""
from alembic import op


revision = "20260307_0006"
down_revision = "20260307_0005"
branch_labels = None
depends_on = None


def _is_mysql() -> bool:
    bind = op.get_bind()
    return bind.dialect.name == "mysql"


def upgrade() -> None:
    # Column order changes are cosmetic; only run on MySQL where AFTER/FIRST is supported.
    if not _is_mysql():
        return

    op.execute(
        """
        ALTER TABLE users
            MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT FIRST,
            MODIFY COLUMN firstname VARCHAR(100) NULL AFTER id,
            MODIFY COLUMN lastname VARCHAR(100) NULL AFTER firstname,
            MODIFY COLUMN fullname VARCHAR(201) NULL AFTER lastname,
            MODIFY COLUMN age INT NULL AFTER fullname,
            MODIFY COLUMN email VARCHAR(255) NULL AFTER age,
            MODIFY COLUMN username VARCHAR(100) NULL AFTER email,
            MODIFY COLUMN hashed_password VARCHAR(255) NULL AFTER username,
            MODIFY COLUMN role VARCHAR(32) NOT NULL DEFAULT 'teacher' AFTER hashed_password,
            MODIFY COLUMN is_active TINYINT(1) NULL AFTER role,
            MODIFY COLUMN is_superuser TINYINT(1) NULL AFTER is_active,
            MODIFY COLUMN reset_code VARCHAR(128) NULL AFTER is_superuser,
            MODIFY COLUMN reset_code_expires INT NULL AFTER reset_code,
            MODIFY COLUMN profile_picture_url VARCHAR(512) NULL AFTER reset_code_expires,
            MODIFY COLUMN created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP AFTER profile_picture_url,
            MODIFY COLUMN updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP AFTER created_at
        """
    )


def downgrade() -> None:
    # Best-effort restore to previous order.
    if not _is_mysql():
        return

    op.execute(
        """
        ALTER TABLE users
            MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT FIRST,
            MODIFY COLUMN email VARCHAR(255) NULL AFTER id,
            MODIFY COLUMN username VARCHAR(100) NULL AFTER email,
            MODIFY COLUMN hashed_password VARCHAR(255) NULL AFTER username,
            MODIFY COLUMN is_active TINYINT(1) NULL AFTER hashed_password,
            MODIFY COLUMN is_superuser TINYINT(1) NULL AFTER is_active,
            MODIFY COLUMN reset_code VARCHAR(128) NULL AFTER is_superuser,
            MODIFY COLUMN reset_code_expires INT NULL AFTER reset_code,
            MODIFY COLUMN profile_picture_url VARCHAR(512) NULL AFTER reset_code_expires,
            MODIFY COLUMN updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP AFTER profile_picture_url,
            MODIFY COLUMN firstname VARCHAR(100) NULL AFTER updated_at,
            MODIFY COLUMN lastname VARCHAR(100) NULL AFTER firstname,
            MODIFY COLUMN fullname VARCHAR(201) NULL AFTER lastname,
            MODIFY COLUMN age INT NULL AFTER fullname,
            MODIFY COLUMN role VARCHAR(32) NOT NULL DEFAULT 'teacher' AFTER age,
            MODIFY COLUMN created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP AFTER role
        """
    )

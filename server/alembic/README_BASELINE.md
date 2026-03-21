# Alembic baseline (`20260220_0000`)

## What it does

`20260220_0000_initial_schema_baseline.py` creates the **full** current schema in one step (colleges, users, majors, subjects, class_sections, session tables, notifications, audit_logs, system_settings, backup_runs, etc.), matching the SQLAlchemy models under `app/models/`.

## Fresh database

From the `server` directory (with your venv activated):

```bash
alembic upgrade head
```

This applies `20260220_0000`, then `20260221_0001` … `20260310_0009`, which **no-op** when the baseline is detected (`migration_helpers.initial_baseline_schema_present`: `colleges.acronym` exists).

## Existing database

If `alembic_version` is already at `20260310_0009` (or any later head), you do **not** need to re-run the baseline; `upgrade head` is a no-op.


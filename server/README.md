# TeachTrack Backend

FastAPI backend for teacher sessions, classroom management, and behavior detection telemetry.

## Stack
- FastAPI
- SQLAlchemy + MySQL
- JWT auth (OAuth2 password flow)
- Alembic migrations

## Prerequisites
- Python 3.10+
- MySQL 8+

## Setup
1. Create environment and install dependencies:
```bash
conda env create -f environment.yml
conda activate capstone
pip install -r requirements.txt
```
2. Configure environment variables:
```bash
cp .env.example .env
```
3. Create database:
```sql
CREATE DATABASE capstone_db;
```
4. Run schema migrations:
```bash
alembic upgrade head
```

## Run
```bash
uvicorn app.main:app --reload
```

## Docs
- Swagger: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## Teacher Mobile App (Capabilities)
- Sign in and view their dashboard overview.
- Select subject/section and start or stop monitoring sessions.
- See live engagement metrics and behavior breakdowns during a session.
- Review session history and subject details.
- Export session summaries to PDF/CSV from the app.
- View available ML models (read-only; model switching is admin-only).

## Notes
- Runtime table auto-creation is disabled by design. Use migrations only.
- `migrate_engagement.py` is legacy and should not be used for new deployments.

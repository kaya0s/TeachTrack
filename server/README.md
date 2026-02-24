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

## Notes
- Runtime table auto-creation is disabled by design. Use migrations only.
- `migrate_engagement.py` is legacy and should not be used for new deployments.

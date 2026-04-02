# TeachTrack

TeachTrack is a Classroom Behavior Detection System designed to help educators monitor student engagement and behavior in real-time. By leveraging machine learning and computer vision, it provides actionable insights through engagement scores, real-time alerts, and comprehensive session summaries.

## Quick Start

Each workspace has its own setup notes. Start here, then follow the detailed READMEs inside `server/`, `client/`, and `admin/` as needed.

### Backend (FastAPI)

From the repository root:

```bash
cd server
python -m pip install -r requirements.txt

# Create your .env from the template, then start the API
# (make sure MySQL + required env vars are configured)
uvicorn app.main:app --reload
```

Smoke test (verifies `app.main` imports cleanly via `server/tests/`):

```bash
cd server
python -m unittest
```

### Database Migrations (Alembic)

Alembic uses `SQLALCHEMY_DATABASE_URL` from `server/.env`.

```bash
cd server
# create .env from the template and update SQLALCHEMY_DATABASE_URL for your MySQL instance
cp .env.example .env
# Windows (PowerShell): Copy-Item .env.example .env
alembic upgrade head
```

## Repository Structure

This is a multi-workspace repository organized as follows:

- **[admin/](./admin)**: A Next.js-based administration portal for managing colleges, majors, subjects, teachers, and system-wide monitoring (including backups, audit logs, and settings).
- **[client/](./client)**: A Flutter mobile and web application used by teachers to conduct sessions, monitor real-time engagement, and review past session metrics.
- **[server/](./server)**: The core FastAPI backend providing RESTful APIs for authentication, classroom management, and real-time data processing.
- **[server/ml_engine/](./server/ml_engine)**: The machine learning component containing the YOLOv8-based(YOLOv11 for final model) detection logic and pre-trained weights for behavior analysis.
- **[docs-site/](./docs-site)**: A dedicated documentation site built with Next.js for project guidelines, setup instructions, and operational manuals.
- **[notebooks/](./notebooks)**: Jupyter notebooks used during the research phase for data exploration, model training experiments, and behavior analysis validation.

## Server Structure (High Level)

Inside `server/app/` the backend follows a layered structure:

- `api/`: FastAPI routers (v1 + admin routes)
- `schemas/`: Pydantic request/response models
- `services/`: business logic (including `services/admin/`)
- `repositories/`: database access and query helpers
- `models/`: SQLAlchemy ORM models
- `core/`: settings, middleware, logging, shared helpers
- `utils/`, `validators/`, `constants.py`: shared utilities and reusable validation/constants

## Tech Stack

The system is built using modern technologies focused on high performance and scalability:

- **AI/ML Engine**: YOLOv8 (Ultralytics) for real-time object detection and behavioral classification.
- **Backend API**: FastAPI (Python) with SQLAlchemy (MySQL) for high-concurrency data management.
- **Admin Portal**: Next.js (React) with Tailwind CSS for a responsive, modern management interface.
- **Teacher Client**: Flutter (Dart) for consistent performance across mobile and web platforms.
- **Database**: MySQL for structured storage of academic data and behavior logs.
- **Media Hosting**: Cloudinary integration for handling subject covers and profile images.

## Engagement Methodology

TeachTrack uses a **Visibility-Based Normalization** model to calculate classroom engagement. This approach provides fair metrics even in environments where the camera's field-of-view (FOV) cannot capture the entire classroom.

### The Formula
Engagement is calculated for every AI snapshot and then averaged over the session duration:

$$\text{Engagement \%} = \left( \frac{\sum (\text{Behavior} \times \text{Weight})}{\text{Total Detected Students}} \right) \times 100$$

### Key Logic
*   **Visibility-Based Normalization**: Unlike traditional models that divide by total class size, TeachTrack divides by the number of students **actually seen** by the AI. This ensures the score reflects the behavior of the "Observed Sample" rather than penalizing the teacher for students sitting in camera blind spots.
*   **Weighted Scoring**: Different behaviors (On-Task, Sleeping, Phone Usage) have configurable weights. On-task behavior contributes positively, while distractions subtract from the potential score.
*   **FOV Adaptive**: The system automatically adjusts its baseline as students move in and out of the camera's frame, maintaining a consistent 0-100% scale regardless of detection count.
*   **Real-time Rollups**: Individual snapshots are aggregated into 1-minute "Metrics Windows" to show trend lines while smoothing out momentary detection jitters.

## Core Features

---

*This project was developed as a Capstone Project.*

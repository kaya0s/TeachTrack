# System Design & Specification: Classroom Behavior Detection System

## 1. Overview
This backend system powers a machine learning-based classroom behavior monitoring tool. It ingests real-time data from a local YOLOv8 script, processes behavior metrics, and provides specific engagement analytics to teachers.

**Constraints:**
- No video/image storage.
- Real-time aggregation (2-3 second intervals).
- Teacher-only access.
- MySQL Database.

## 2. Database Schema (MySQL)

### Tables

#### `users` (Existing)
- `id`: Integer (PK)
- `email`: String (Unique)
- `hashed_password`: String
- `role`: String (Active/Teacher)

#### `subjects`
- `id`: Integer (PK)
- `name`: String (e.g., "Mathematics")
- `code`: String (e.g., "MATH101")
- `teacher_id`: Integer (FK -> users.id)
- `created_at`: Datetime

#### `class_sections`
- `id`: Integer (PK)
- `name`: String (e.g., "Grade 10-A")
- `teacher_id`: Integer (FK -> users.id)
- `created_at`: Datetime

#### `sessions`
- `id`: Integer (PK)
- `teacher_id`: Integer (FK)
- `section_id`: Integer (FK)
- `subject_id`: Integer (FK)
- `start_time`: Datetime
- `end_time`: Datetime (Nullable)
- `is_active`: Boolean
- `total_students_enrolled`: Integer (Snapshot of expected count)

#### `behavior_logs` (Time-Series Data)
- `id`: BigInteger (PK)
- `session_id`: Integer (FK)
- `timestamp`: Datetime
- `raising_hand`: Integer
- `sleeping`: Integer
- `writing`: Integer
- `using_phone`: Integer
- `attentive`: Integer
- `undetected`: Integer (Students absent/out of frame)
- `total_detected`: Integer (Sum of behavior counts)

#### `alerts`
- `id`: Integer (PK)
- `session_id`: Integer (FK)
- `alert_type`: Enum ("SLEEPING", "PHONE", "ENGAGEMENT_DROP")
- `message`: String
- `triggered_at`: Datetime
- `severity`: String ("WARNING", "CRITICAL")
- `is_read`: Boolean

---

## 3. Data Flow

1.  **Start Session**: Teacher POSTs to `/sessions/start`. App creates `sessions` record.
2.  **Ingestion**: ML Script (YOLOv8) POSTs to `/sessions/{id}/log` every 2-3s.
    - Payload: `{ "raising_hand": 2, "sleeping": 1, ... }`
    - Backend:
        a. Validates Session ID and Active User.
        b. Inserts row into `behavior_logs`.
        c. Runs **Alert Logic** (Async/Background check).
3.  **Visualization**: Teacher Frontend polls `/sessions/{id}/metrics` every 5s.
    - Backend aggregates metrics from the last X minutes.
4.  **End Session**: Teacher POSTs to `/sessions/{id}/stop`.
    - Backend calculates final report/summary.

## 4. Alert Logic

Alerts are triggered during the **Ingestion** phase.

### Rules
1.  **Mass Sleeping**:
    - Condition: `sleeping_count` > (30% of `total_detected`) AND `total_detected` > 5.
    - Cooldown: 5 minutes.
2.  **Phone Usage Spike**:
    - Condition: `using_phone_count` > (20% of `total_detected`).
    - Cooldown: 5 minutes.
3.  **Low Engagement**:
    - Condition: (`raising_hand` + `writing` + `attentive`) < (40% of `total_detected`).
    - Cooldown: 10 minutes.

---

## 5. API Endpoints

### Classroom Management
- `GET /subjects`
- `POST /subjects`
- `GET /sections`
- `POST /sections`

### Session Flow
- `POST /sessions/start`: Start monitoring.
- `POST /sessions/{id}/stop`: Stop monitoring.
- `GET /sessions/active`: Get currently running session for user.
- `GET /sessions/history`: List past sessions.

### Data Ingestion (Machine Learning)
- `POST /sessions/{id}/log`: Receive behavior counts.

### Analysis & Metrics
- `GET /sessions/{id}/metrics`: Live graph data.
- `GET /sessions/{id}/alerts`: Recent alerts.

# Database Schema (Actual Server Models)

This document reflects the current SQLAlchemy models under `server/app/models/`.

## 1) `users`
- `id` `INTEGER` PK
- `email` `VARCHAR(255)` unique, indexed
- `username` `VARCHAR(100)` unique, indexed
- `hashed_password` `VARCHAR(255)`
- `is_active` `BOOLEAN` default `true`
- `is_superuser` `BOOLEAN` default `false`
- `reset_code` `VARCHAR(6)` nullable
- `reset_code_expires` `INTEGER` nullable (unix timestamp)
- `updated_at` `DATETIME(timezone=True)` default `now`, auto-update on change

Relationships:
- 1:N with `subjects` via `teacher_id`
- 1:N with `class_sections` via `teacher_id`
- 1:N with `class_sessions` via `teacher_id`

## 2) `subjects`
- `id` `INTEGER` PK
- `name` `VARCHAR(100)` not null
- `code` `VARCHAR(20)` nullable
- `description` `TEXT` nullable
- `cover_image_url` `VARCHAR(500)` nullable
- `teacher_id` `INTEGER` FK -> `users.id`
- `created_at` `DATETIME(timezone=True)` default `now`
- `updated_at` `DATETIME(timezone=True)` default `now`, auto-update on change

Relationships:
- N:1 to `users`
- 1:N to `class_sections`
- 1:N to `class_sessions`

## 3) `class_sections`
- `id` `INTEGER` PK
- `name` `VARCHAR(100)` not null
- `subject_id` `INTEGER` FK -> `subjects.id`
- `teacher_id` `INTEGER` FK -> `users.id`
- `created_at` `DATETIME(timezone=True)` default `now`
- `updated_at` `DATETIME(timezone=True)` default `now`, auto-update on change

Relationships:
- N:1 to `users`
- N:1 to `subjects`
- 1:N to `class_sessions`

## 4) `class_sessions`
- `id` `INTEGER` PK
- `teacher_id` `INTEGER` FK -> `users.id`
- `section_id` `INTEGER` FK -> `class_sections.id`
- `subject_id` `INTEGER` FK -> `subjects.id`
- `start_time` `DATETIME(timezone=True)` default `now`
- `end_time` `DATETIME(timezone=True)` nullable
- `is_active` `BOOLEAN` default `true`
- `created_at` `DATETIME(timezone=True)` default `now`
- `updated_at` `DATETIME(timezone=True)` default `now`, auto-update on change
- `total_students_enrolled` `INTEGER` default `0`

Relationships:
- N:1 to `users`
- N:1 to `class_sections`
- N:1 to `subjects`
- 1:N to `behavior_logs` (cascade delete-orphan)
- 1:N to `alerts` (cascade delete-orphan)

## 5) `behavior_logs`
- `id` `BIGINT` PK
- `session_id` `INTEGER` FK -> `class_sessions.id`
- `timestamp` `DATETIME(timezone=True)` default `now`
- `raising_hand` `INTEGER` default `0`
- `sleeping` `INTEGER` default `0`
- `writing` `INTEGER` default `0`
- `using_phone` `INTEGER` default `0`
- `attentive` `INTEGER` default `0`
- `undetected` `INTEGER` default `0`
- `total_detected` `INTEGER` default `0`

Relationships:
- N:1 to `class_sessions`

## 6) `alerts`
- `id` `INTEGER` PK
- `session_id` `INTEGER` FK -> `class_sessions.id`
- `alert_type` `VARCHAR(50)` (e.g., `SLEEPING`, `PHONE`, `ENGAGEMENT_DROP`)
- `message` `VARCHAR(255)`
- `triggered_at` `DATETIME(timezone=True)` default `now`
- `severity` `VARCHAR(20)` default `WARNING`
- `is_read` `BOOLEAN` default `false`
- `updated_at` `DATETIME(timezone=True)` default `now`, auto-update on change

Relationships:
- N:1 to `class_sessions`

## 7) `session_metrics`
- `id` `BIGINT` PK
- `session_id` `INTEGER` FK -> `class_sessions.id`
- `window_start` `DATETIME(timezone=True)` not null
- `window_end` `DATETIME(timezone=True)` not null
- `total_detected` `INTEGER` not null, default `0`
- `attentive_avg` `DECIMAL(5,2)` not null, default `0`
- `phone_avg` `DECIMAL(5,2)` not null, default `0`
- `sleeping_avg` `DECIMAL(5,2)` not null, default `0`
- `writing_avg` `DECIMAL(5,2)` not null, default `0`
- `raising_hand_avg` `DECIMAL(5,2)` not null, default `0`
- `undetected_avg` `DECIMAL(5,2)` not null, default `0`
- `engagement_score` `DECIMAL(5,2)` not null, default `0`
- `computed_at` `DATETIME(timezone=True)` default `now`

Relationships:
- N:1 to `class_sessions`

## 8) `engagement_events`
- `id` `BIGINT` PK
- `session_id` `INTEGER` FK -> `class_sessions.id`
- `event_time` `DATETIME(timezone=True)` default `now`
- `event_type` `VARCHAR(50)` not null
- `severity` `VARCHAR(20)` not null
- `notes` `VARCHAR(255)` nullable

Relationships:
- N:1 to `class_sessions`

## 9) `session_history`
- `id` `BIGINT` PK
- `session_id` `INTEGER` FK -> `class_sessions.id`
- `changed_at` `DATETIME(timezone=True)` default `now`
- `changed_by` `INTEGER` FK -> `users.id` nullable
- `change_type` `VARCHAR(20)` not null
- `prev_start_time` `DATETIME(timezone=True)` nullable
- `prev_end_time` `DATETIME(timezone=True)` nullable
- `prev_is_active` `BOOLEAN` nullable
- `prev_total_students_enrolled` `INTEGER` nullable

Relationships:
- N:1 to `class_sessions`

## 10) `alerts_history`
- `id` `BIGINT` PK
- `alert_id` `INTEGER` FK -> `alerts.id`
- `changed_at` `DATETIME(timezone=True)` default `now`
- `changed_by` `INTEGER` FK -> `users.id` nullable
- `change_type` `VARCHAR(20)` not null
- `prev_is_read` `BOOLEAN` nullable
- `prev_severity` `VARCHAR(20)` nullable
- `prev_message` `VARCHAR(255)` nullable

Relationships:
- N:1 to `alerts`

---

## Notes
- Table names are exactly from model `__tablename__`.
- This schema is derived from:
  - `server/app/models/user.py`
  - `server/app/models/classroom.py`
  - `server/app/models/session.py`

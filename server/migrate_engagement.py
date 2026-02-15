import os
import re
import pymysql
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("SQLALCHEMY_DATABASE_URL")
if not db_url:
    raise SystemExit("SQLALCHEMY_DATABASE_URL not set")

match = re.search(r"//([^:]+):([^@]+)@([^/]+)/(.+)", db_url)
if not match:
    raise SystemExit("Could not parse SQLALCHEMY_DATABASE_URL")

user, password, host, db = match.groups()

conn = pymysql.connect(host=host, user=user, password=password, database=db)

def table_exists(cursor, table_name: str) -> bool:
    cursor.execute(
        "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=%s AND TABLE_NAME=%s",
        (db, table_name),
    )
    return cursor.fetchone()[0] > 0

def column_exists(cursor, table_name: str, column_name: str) -> bool:
    cursor.execute(
        "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=%s AND TABLE_NAME=%s AND COLUMN_NAME=%s",
        (db, table_name, column_name),
    )
    return cursor.fetchone()[0] > 0

def index_exists(cursor, table_name: str, index_name: str) -> bool:
    cursor.execute(
        "SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=%s AND TABLE_NAME=%s AND INDEX_NAME=%s",
        (db, table_name, index_name),
    )
    return cursor.fetchone()[0] > 0

with conn.cursor() as cursor:
    # New tables
    if not table_exists(cursor, "session_metrics"):
        cursor.execute(
            """
            CREATE TABLE session_metrics (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                session_id INT NOT NULL,
                window_start DATETIME NOT NULL,
                window_end DATETIME NOT NULL,
                total_detected INT NOT NULL,
                on_task_avg DECIMAL(5,2) NOT NULL,
                phone_avg DECIMAL(5,2) NOT NULL,
                sleeping_avg DECIMAL(5,2) NOT NULL,
                writing_avg DECIMAL(5,2) NOT NULL,
                disengaged_posture_avg DECIMAL(5,2) NOT NULL,
                not_visible_avg DECIMAL(5,2) NOT NULL,
                engagement_score DECIMAL(5,2) NOT NULL,
                computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_metrics_session FOREIGN KEY (session_id) REFERENCES class_sessions(id) ON DELETE CASCADE,
                INDEX idx_metrics_session_time (session_id, window_start, window_end)
            ) ENGINE=InnoDB;
            """
        )

    if not table_exists(cursor, "engagement_events"):
        cursor.execute(
            """
            CREATE TABLE engagement_events (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                session_id INT NOT NULL,
                event_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                event_type VARCHAR(50) NOT NULL,
                severity VARCHAR(20) NOT NULL,
                notes VARCHAR(255) NULL,
                CONSTRAINT fk_events_session FOREIGN KEY (session_id) REFERENCES class_sessions(id) ON DELETE CASCADE,
                INDEX idx_events_session_time (session_id, event_time)
            ) ENGINE=InnoDB;
            """
        )

    if not table_exists(cursor, "session_history"):
        cursor.execute(
            """
            CREATE TABLE session_history (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                session_id INT NOT NULL,
                changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                changed_by INT NULL,
                change_type VARCHAR(20) NOT NULL,
                prev_start_time DATETIME NULL,
                prev_end_time DATETIME NULL,
                prev_is_active BOOLEAN NULL,
                CONSTRAINT fk_session_history_session FOREIGN KEY (session_id) REFERENCES class_sessions(id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
            """
        )

    if not table_exists(cursor, "alerts_history"):
        cursor.execute(
            """
            CREATE TABLE alerts_history (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                alert_id INT NOT NULL,
                changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                changed_by INT NULL,
                change_type VARCHAR(20) NOT NULL,
                prev_is_read BOOLEAN NULL,
                prev_severity VARCHAR(20) NULL,
                prev_message VARCHAR(255) NULL,
                CONSTRAINT fk_alert_history_alert FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
            """
        )

    # Add columns if missing
    if not column_exists(cursor, "users", "updated_at"):
        cursor.execute(
            "ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;"
        )

    if not column_exists(cursor, "subjects", "updated_at"):
        cursor.execute(
            "ALTER TABLE subjects ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;"
        )

    if not column_exists(cursor, "class_sections", "updated_at"):
        cursor.execute(
            "ALTER TABLE class_sections ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;"
        )

    if not column_exists(cursor, "class_sessions", "created_at"):
        cursor.execute(
            "ALTER TABLE class_sessions ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;"
        )

    if not column_exists(cursor, "class_sessions", "updated_at"):
        cursor.execute(
            "ALTER TABLE class_sessions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;"
        )
    if not column_exists(cursor, "class_sessions", "students_present"):
        cursor.execute("ALTER TABLE class_sessions ADD COLUMN students_present INT NOT NULL DEFAULT 1;")

    if not column_exists(cursor, "alerts", "severity"):
        cursor.execute(
            "ALTER TABLE alerts ADD COLUMN severity VARCHAR(20) DEFAULT 'WARNING';"
        )
    else:
        cursor.execute("UPDATE alerts SET severity = 'WARNING' WHERE severity IS NULL;")

    if not column_exists(cursor, "alerts", "updated_at"):
        cursor.execute(
            "ALTER TABLE alerts ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;"
        )

    # Behavior logs migration: old labels -> new labels
    if column_exists(cursor, "behavior_logs", "attentive") and not column_exists(cursor, "behavior_logs", "on_task"):
        cursor.execute("ALTER TABLE behavior_logs CHANGE COLUMN attentive on_task INT DEFAULT 0;")
    if column_exists(cursor, "behavior_logs", "undetected") and not column_exists(cursor, "behavior_logs", "not_visible"):
        cursor.execute("ALTER TABLE behavior_logs CHANGE COLUMN undetected not_visible INT DEFAULT 0;")
    if not column_exists(cursor, "behavior_logs", "disengaged_posture"):
        cursor.execute("ALTER TABLE behavior_logs ADD COLUMN disengaged_posture INT DEFAULT 0;")

    # Session metrics migration
    if column_exists(cursor, "session_metrics", "attentive_avg") and not column_exists(cursor, "session_metrics", "on_task_avg"):
        cursor.execute("ALTER TABLE session_metrics CHANGE COLUMN attentive_avg on_task_avg DECIMAL(5,2) NOT NULL DEFAULT 0;")
    if column_exists(cursor, "session_metrics", "raising_hand_avg") and not column_exists(cursor, "session_metrics", "disengaged_posture_avg"):
        cursor.execute("ALTER TABLE session_metrics CHANGE COLUMN raising_hand_avg disengaged_posture_avg DECIMAL(5,2) NOT NULL DEFAULT 0;")
    if column_exists(cursor, "session_metrics", "undetected_avg") and not column_exists(cursor, "session_metrics", "not_visible_avg"):
        cursor.execute("ALTER TABLE session_metrics CHANGE COLUMN undetected_avg not_visible_avg DECIMAL(5,2) NOT NULL DEFAULT 0;")

    # Remove legacy columns no longer used by the application
    if column_exists(cursor, "class_sessions", "total_students_enrolled"):
        cursor.execute("ALTER TABLE class_sessions DROP COLUMN total_students_enrolled;")
    if column_exists(cursor, "behavior_logs", "raising_hand"):
        cursor.execute("ALTER TABLE behavior_logs DROP COLUMN raising_hand;")
    if column_exists(cursor, "behavior_logs", "attentive"):
        cursor.execute("ALTER TABLE behavior_logs DROP COLUMN attentive;")
    if column_exists(cursor, "behavior_logs", "undetected"):
        cursor.execute("ALTER TABLE behavior_logs DROP COLUMN undetected;")
    if column_exists(cursor, "session_metrics", "attentive_avg"):
        cursor.execute("ALTER TABLE session_metrics DROP COLUMN attentive_avg;")
    if column_exists(cursor, "session_metrics", "raising_hand_avg"):
        cursor.execute("ALTER TABLE session_metrics DROP COLUMN raising_hand_avg;")
    if column_exists(cursor, "session_metrics", "undetected_avg"):
        cursor.execute("ALTER TABLE session_metrics DROP COLUMN undetected_avg;")

    if column_exists(cursor, "session_history", "prev_total_students_enrolled"):
        cursor.execute("ALTER TABLE session_history DROP COLUMN prev_total_students_enrolled;")

conn.commit()
conn.close()
print("Migration completed successfully.")

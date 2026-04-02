"""One-time script to backfill the average_engagement cache column for existing sessions.
Run this from the /server directory: python scripts/backfill_engagement.py
"""
import sys
import os
from sqlalchemy.orm import Session

# Add the current directory to sys.path so we can import app modules
sys.path.append(os.getcwd())

from app.db.database import SessionLocal
from app.models.session import ClassSession
from app.services.engagement_service import _avg_engagement_from_snapshot_logs
from app.services.admin import settings_service

def backfill_engagement():
    db: Session = SessionLocal()
    try:
        # Fetch all sessions that need their cache updated
        sessions = db.query(ClassSession).all()
        print(f"Found {len(sessions)} sessions. Calculating engagement scores...")

        weights = settings_service.get_engagement_weights(db)
        updated_count = 0

        for session in sessions:
            # Use the accurate per-log snapshot logic to compute the true average
            avg_score = _avg_engagement_from_snapshot_logs(
                db, 
                session.id, 
                session.students_present, 
                weights
            )
            
            # Update the cache column
            session.average_engagement = avg_score
            db.add(session)
            updated_count += 1
            
            if updated_count % 10 == 0:
                print(f"Processed {updated_count}/{len(sessions)}...")

        db.commit()
        print(f"Successfully updated cache for {updated_count} sessions!")
    except Exception as e:
        print(f"Error during backfill: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    backfill_engagement()

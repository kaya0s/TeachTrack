#!/usr/bin/env python3
"""
Simple Session Seeder
Creates sessions for all class assignments in the database.
Each session: 1 minute long with logs every 3 seconds.
"""

import sys
import os
from datetime import datetime, timedelta
import random

# Add the server directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.db.database import get_db, engine
from app.models.classroom import SectionSubjectAssignment
from app.models.session import ClassSession, BehaviorLog

def create_behavior_data():
    """Generate realistic behavior data"""
    total = random.randint(15, 35)
    on_task = int(total * random.uniform(0.6, 0.9))
    sleeping = int(total * random.uniform(0.0, 0.15))
    using_phone = int(total * random.uniform(0.05, 0.25))
    off_task = int(total * random.uniform(0.05, 0.2))
    not_visible = max(0, total - on_task - sleeping - using_phone - off_task)
    
    return {
        'on_task': on_task,
        'sleeping': sleeping,
        'using_phone': using_phone,
        'off_task': off_task,
        'not_visible': not_visible,
        'total_detected': total
    }

def main():
    print("🌱 Starting session seeder...")
    
    db = next(get_db())
    
    try:
        assignments = db.query(SectionSubjectAssignment).all()
        print(f"📋 Found {len(assignments)} class assignments")
        
        if not assignments:
            print("❌ No assignments found!")
            return
        
        now = datetime.now()
        sessions = 0
        logs = 0
        
        for assignment in assignments:
            # Create 1-2 sessions per assignment
            for i in range(random.randint(1, 2)):
                start = now - timedelta(hours=random.randint(1, 24))
                
                session = ClassSession(
                    teacher_id=assignment.teacher_id or 1,
                    section_id=assignment.section_id,
                    subject_id=assignment.subject_id,
                    students_present=random.randint(15, 35),
                    start_time=start,
                    end_time=start + timedelta(minutes=1),
                    is_active=False
                )
                db.add(session)
                db.flush()
                
                # Create 20 logs (every 3 seconds for 1 minute)
                for j in range(20):
                    log_time = start + timedelta(seconds=j * 3)
                    behavior = create_behavior_data()
                    
                    log = BehaviorLog(
                        session_id=session.id,
                        timestamp=log_time,
                        **behavior
                    )
                    db.add(log)
                    logs += 1
                
                sessions += 1
                print(f"✅ Session {sessions}: {assignment.section.name} - {assignment.subject.name}")
        
        db.commit()
        print(f"\n🎉 Done! Created {sessions} sessions with {logs} behavior logs")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()

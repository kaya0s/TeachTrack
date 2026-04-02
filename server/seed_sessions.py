#!/usr/bin/env python3
"""
Seed Sessions Script
Creates sessions for all class assignments in the database.
Each session will be 1 minute long with behavior logs every 3 seconds.
"""

import random
import sys
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.db.database import get_db, engine
from app.models.classroom import SectionSubjectAssignment
from app.models.session import ClassSession, BehaviorLog
from app.models.user import User

def create_realistic_behavior_log():
    """Generate realistic behavior data for a single log entry"""
    total_students = random.randint(15, 35)
    
    # Base counts with some randomness
    on_task = int(total_students * random.uniform(0.6, 0.9))
    sleeping = int(total_students * random.uniform(0.0, 0.15))
    using_phone = int(total_students * random.uniform(0.05, 0.25))
    off_task = int(total_students * random.uniform(0.05, 0.2))
    not_visible = total_students - on_task - sleeping - using_phone - off_task
    
    # Ensure non-negative
    not_visible = max(0, not_visible)
    
    return {
        'on_task': on_task,
        'sleeping': sleeping,
        'using_phone': using_phone,
        'off_task': off_task,
        'not_visible': not_visible,
        'total_detected': total_students
    }

def create_session_for_assignment(db: Session, assignment: SectionSubjectAssignment, start_time: datetime):
    """Create a 1-minute session with logs every 3 seconds for a class assignment"""
    
    # Create the session
    session = ClassSession(
        teacher_id=assignment.teacher_id or 1,  # Default to teacher 1 if no teacher assigned
        section_id=assignment.section_id,
        subject_id=assignment.subject_id,
        students_present=random.randint(15, 35),
        start_time=start_time,
        end_time=start_time + timedelta(minutes=1),
        is_active=False  # Session is completed
    )
    
    db.add(session)
    db.flush()  # Get the session ID
    
    # Create behavior logs every 3 seconds (20 logs for 1 minute session)
    logs = []
    for i in range(20):  # 0, 3, 6, 9, ..., 57 seconds
        log_time = start_time + timedelta(seconds=i * 3)
        behavior_data = create_realistic_behavior_log()
        
        log = BehaviorLog(
            session_id=session.id,
            timestamp=log_time,
            **behavior_data
        )
        logs.append(log)
    
    db.add_all(logs)
    return session

def main():
    """Main function to seed sessions for all class assignments"""
    print("🚀 Starting session seeding...")
    
    # Create database session
    db = next(get_db())
    
    try:
        # Get all class assignments
        assignments = db.query(SectionSubjectAssignment).all()
        print(f"📊 Found {len(assignments)} class assignments")
        
        if not assignments:
            print("❌ No class assignments found. Please create some class assignments first.")
            return
        
        # Get current time
        now = datetime.now()
        
        # Create sessions for each assignment
        sessions_created = 0
        total_logs = 0
        
        for i, assignment in enumerate(assignments):
            # Stagger session start times to avoid all sessions starting at exactly the same time
            start_time_offset = random.randint(-7, 7) * 24  # Random offset within ±7 days
            start_time = now + timedelta(hours=start_time_offset)
            
            # Create 1-3 sessions per assignment for more realistic data
            num_sessions = random.randint(1, 3)
            
            for j in range(num_sessions):
                session_start = start_time + timedelta(hours=j * 2)  # 2 hours between sessions
                session = create_session_for_assignment(db, assignment, session_start)
                sessions_created += 1
                total_logs += 20  # 20 logs per session
                
                print(f"✅ Created session #{sessions_created}: {assignment.section.name} - {assignment.subject.name}")
        
        # Commit all changes
        db.commit()
        
        print(f"\n🎉 Session seeding completed successfully!")
        print(f"📈 Statistics:")
        print(f"   • Class assignments processed: {len(assignments)}")
        print(f"   • Sessions created: {sessions_created}")
        print(f"   • Behavior logs created: {total_logs}")
        print(f"   • Average logs per session: 20")
        print(f"   • Session duration: 1 minute each")
        print(f"   • Log interval: 3 seconds")
        
    except Exception as e:
        print(f"❌ Error during session seeding: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()


import sys
import os

# Add the project root to the Python path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(ROOT_DIR)
os.chdir(ROOT_DIR)

from app.db.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

def seed_admin():
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin_user = db.query(User).filter(User.username == "admin").first()
        if admin_user:
            print("Admin user already exists!")
            return

        # Create new admin user
        new_admin = User(
            firstname="Admin",
            lastname="User",
            email="admin@teachtrack.com",
            username="admin",
            hashed_password=get_password_hash("admin123"),
            role="admin",
            is_active=True,
            is_superuser=True
        )
        
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        print(f"Admin user created successfully!")
        print(f"Username: {new_admin.username}")
        print(f"Password: admin123")
        
    except Exception as e:
        print(f"Error seeding admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()

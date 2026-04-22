import os
import logging
import sys

# Setup basics
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add current directory to path to allow imports
sys.path.append(os.getcwd())

try:
    from database import SessionLocal
    from models import User
    from core.security import get_password_hash
except ImportError as e:
    logger.error(f"Import failed: {e}. Make sure to run this from the 'backend' directory.")
    sys.exit(1)

def create_user():
    email = os.getenv("SUPER_ADMIN_EMAIL")
    password = os.getenv("SUPER_ADMIN_PASSWORD")
    
    if not email or not password:
        logger.error("SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD environment variables not set.")
        sys.exit(1)
        
    logger.info(f"Synchronizing Super Admin: {email}")
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        
        if user:
            logger.info(f"User '{email}' found. Synchronizing password and role...")
            user.hashed_password = get_password_hash(password)
            user.role = "super_admin"
            user.is_active = True
            db.commit()
            logger.info("User details updated and synchronized with environment variables.")
        else:
            logger.info(f"User '{email}' not found. Creating from environment variables...")
            new_user = User(
                email=email,
                hashed_password=get_password_hash(password),
                full_name="Super Admin",
                role="super_admin",
                is_active=True
            )
            db.add(new_user)
            db.commit()
            logger.info(f"Super Admin '{email}' created successfully.")
            
    except Exception as e:
        logger.error(f"Error during synchronization: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_user()

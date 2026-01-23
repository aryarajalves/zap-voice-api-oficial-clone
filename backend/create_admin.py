
import logging
import sys

# Setup basics
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fallback path if needed
sys.path.append('/app')

try:
    from database import SessionLocal
    from models import User
    from core.security import get_password_hash
except ImportError as e:
    logger.error(f"Import failed: {e}")
    sys.exit(1)

def create_user():
    email = "aryarajunity@gmail.com"
    password = "123" # Temporary password for testing
    
    logger.info(f"Checking user: {email}")
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        
        if user:
            logger.info("User exists. Updating password to '123'...")
            user.hashed_password = get_password_hash(password)
            user.is_active = True
            db.commit()
            logger.info("User updated.")
        else:
            logger.info("User NOT found. Creating...")
            new_user = User(
                email=email,
                hashed_password=get_password_hash(password),
                full_name="Admin",
                is_active=True,
                is_superuser=True,
                client_id=1 # Assuming multi-tenant
            )
            db.add(new_user)
            db.commit()
            logger.info("User created.")
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_user()

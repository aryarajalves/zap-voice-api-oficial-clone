import logging
import sys
from sqlalchemy import text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

sys.path.append('/app')

try:
    from database import engine
except ImportError as e:
    logger.error(f"Import failed: {e}")
    sys.exit(1)

def migrate_users_weight():
    logger.info("Checking 'users' table for 'seller_weight' column...")
    
    with engine.connect() as connection:
        # Check column existence based on dialect
        if engine.dialect.name == 'sqlite':
            # Simples pragma table_info
            result = connection.execute(text("PRAGMA table_info(users)"))
            cols = [row[1] for row in result.fetchall()]
            has_col = 'seller_weight' in cols
        else:
            result = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='seller_weight'"))
            has_col = result.fetchone() is not None

        if has_col:
            logger.info("'seller_weight' already exists in 'users' table.")
        else:
            logger.info("Adding 'seller_weight' column to 'users' table...")
            try:
                connection.execute(text("ALTER TABLE users ADD COLUMN seller_weight INTEGER DEFAULT 1 NOT NULL"))
                connection.commit()
                logger.info("Success: 'seller_weight' added.")
            except Exception as e:
                logger.error(f"Failed to add column: {e}")
                pass

if __name__ == "__main__":
    migrate_users_weight()


import logging
import sys
from sqlalchemy import text

# Setup basics
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fallback path if needed
sys.path.append('/app')

try:
    from database import engine
except ImportError as e:
    logger.error(f"Import failed: {e}")
    sys.exit(1)

def migrate_users_table():
    logger.info("Checking 'users' table for 'client_id' column...")
    
    with engine.connect() as connection:
        # PostgreSQL specific check
        result = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='client_id'"))
        if result.fetchone():
            logger.info("'client_id' already exists in 'users' table.")
        else:
            logger.info("Adding 'client_id' column to 'users' table...")
            try:
                # Add column first
                connection.execute(text("ALTER TABLE users ADD COLUMN client_id INTEGER DEFAULT 1"))
                # Add foreign key constraint
                connection.execute(text("ALTER TABLE users ADD CONSTRAINT fk_users_client FOREIGN KEY (client_id) REFERENCES clients(id)"))
                connection.commit()
                logger.info("Success: 'client_id' added.")
            except Exception as e:
                 logger.error(f"Failed to add column: {e}")
                 # Try to rollback or ignore if it was a partial issue
                 pass

if __name__ == "__main__":
    migrate_users_table()

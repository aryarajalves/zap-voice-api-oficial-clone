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

def migrate_trigger_processed_data():
    logger.info("Checking 'scheduled_triggers' table for 'processed_data' column...")
    
    with engine.connect() as connection:
        # Check column existence based on dialect
        if engine.dialect.name == 'sqlite':
            result = connection.execute(text("PRAGMA table_info(scheduled_triggers)"))
            cols = [row[1] for row in result.fetchall()]
            has_col = 'processed_data' in cols
        else:
            result = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='scheduled_triggers' AND column_name='processed_data'"))
            has_col = result.fetchone() is not None

        if has_col:
            logger.info("'processed_data' already exists in 'scheduled_triggers' table.")
        else:
            logger.info("Adding 'processed_data' column to 'scheduled_triggers' table...")
            try:
                if engine.dialect.name == 'sqlite':
                    connection.execute(text("ALTER TABLE scheduled_triggers ADD COLUMN processed_data TEXT DEFAULT '{}'"))
                else:
                    connection.execute(text("ALTER TABLE scheduled_triggers ADD COLUMN processed_data JSONB DEFAULT '{}'::jsonb"))
                connection.commit()
                logger.info("Success: 'processed_data' added.")
            except Exception as e:
                logger.error(f"Failed to add column: {e}")
                pass

if __name__ == "__main__":
    migrate_trigger_processed_data()

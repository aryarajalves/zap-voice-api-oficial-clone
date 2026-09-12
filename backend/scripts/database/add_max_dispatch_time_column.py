import logging
import sys
from sqlalchemy import text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

sys.path.append('/app')
sys.path.append('.')

try:
    from database import engine
except ImportError as e:
    logger.error(f"Import failed: {e}")
    sys.exit(1)

def migrate_max_dispatch_time():
    logger.info("Checking 'scheduled_triggers' table for 'max_dispatch_time' column...")
    
    with engine.connect() as connection:
        if engine.dialect.name == 'sqlite':
            result = connection.execute(text("PRAGMA table_info(scheduled_triggers)"))
            cols = [row[1] for row in result.fetchall()]
            has_col = 'max_dispatch_time' in cols
        else:
            result = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='scheduled_triggers' AND column_name='max_dispatch_time'"))
            has_col = result.fetchone() is not None

        if has_col:
            logger.info("'max_dispatch_time' already exists in 'scheduled_triggers' table.")
        else:
            logger.info("Adding 'max_dispatch_time' column to 'scheduled_triggers' table...")
            try:
                if engine.dialect.name == 'sqlite':
                    connection.execute(text("ALTER TABLE scheduled_triggers ADD COLUMN max_dispatch_time DATETIME"))
                else:
                    connection.execute(text("ALTER TABLE scheduled_triggers ADD COLUMN max_dispatch_time TIMESTAMP WITH TIME ZONE"))
                connection.commit()
                logger.info("Success: 'max_dispatch_time' added.")
            except Exception as e:
                logger.error(f"Failed to add column: {e}")
                raise e

if __name__ == "__main__":
    migrate_max_dispatch_time()

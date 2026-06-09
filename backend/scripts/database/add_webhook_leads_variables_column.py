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

def migrate_webhook_leads_variables():
    logger.info("Checking 'webhook_leads' table for 'variables' column...")
    
    with engine.connect() as connection:
        # Check column existence based on dialect
        if engine.dialect.name == 'sqlite':
            result = connection.execute(text("PRAGMA table_info(webhook_leads)"))
            cols = [row[1] for row in result.fetchall()]
            has_col = 'variables' in cols
        else:
            result = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='webhook_leads' AND column_name='variables'"))
            has_col = result.fetchone() is not None

        if has_col:
            logger.info("'variables' already exists in 'webhook_leads' table.")
        else:
            logger.info("Adding 'variables' column to 'webhook_leads' table...")
            try:
                if engine.dialect.name == 'sqlite':
                    connection.execute(text("ALTER TABLE webhook_leads ADD COLUMN variables TEXT DEFAULT '{}'"))
                else:
                    connection.execute(text("ALTER TABLE webhook_leads ADD COLUMN variables JSONB DEFAULT '{}'::jsonb"))
                connection.commit()
                logger.info("Success: 'variables' added.")
            except Exception as e:
                logger.error(f"Failed to add column: {e}")
                pass

if __name__ == "__main__":
    migrate_webhook_leads_variables()

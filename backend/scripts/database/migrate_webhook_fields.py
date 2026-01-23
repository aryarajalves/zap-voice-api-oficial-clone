from dotenv import load_dotenv
import os
load_dotenv()
# Force localhost for local migration script execution outside docker
os.environ["DATABASE_URL"] = os.getenv("DATABASE_URL").replace("zapvoice-postgres", "localhost")

from database import engine, SessionLocal
from sqlalchemy import text
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Migration")

def run_migration():
    logger.info("🚀 Starting migration for Meta Webhook fields...")
    
    with engine.connect() as conn:
        # 1. Update scheduled_triggers table
        try:
            logger.info("Checking scheduled_triggers table...")
            conn.execute(text("ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS total_read INTEGER DEFAULT 0"))
            conn.execute(text("ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS total_interactions INTEGER DEFAULT 0"))
            logger.info("✅ scheduled_triggers updated.")
        except Exception as e:
            logger.error(f"Error updating scheduled_triggers: {e}")

        # 2. Update message_status table
        try:
            logger.info("Checking message_status table...")
            conn.execute(text("ALTER TABLE message_status ADD COLUMN IF NOT EXISTS failure_reason VARCHAR"))
            conn.execute(text("ALTER TABLE message_status ADD COLUMN IF NOT EXISTS is_interaction BOOLEAN DEFAULT FALSE"))
            logger.info("✅ message_status updated.")
        except Exception as e:
            logger.error(f"Error updating message_status: {e}")
            
        conn.commit()
    
    logger.info("🎉 Migration completed successfully!")

if __name__ == "__main__":
    run_migration()

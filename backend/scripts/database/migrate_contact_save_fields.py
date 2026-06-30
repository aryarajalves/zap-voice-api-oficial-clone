from dotenv import load_dotenv
import os
load_dotenv()
if not os.path.exists("/.dockerenv"):
    os.environ["DATABASE_URL"] = os.getenv("DATABASE_URL").replace("zapvoice-postgres", "localhost").replace("5432", "5435")

from database import engine
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Migration")

def run_migration():
    logger.info("🚀 Migration: contact_save_fields in trigger_mappings...")
    with engine.connect() as conn:
        try:
            conn.execute(text(
                "ALTER TABLE webhook_event_mappings ADD COLUMN IF NOT EXISTS contact_save_fields JSONB"
            ))
            conn.commit()
            logger.info("✅ Coluna contact_save_fields adicionada a trigger_mappings.")
        except Exception as e:
            logger.error(f"Erro: {e}")
    logger.info("🎉 Migration concluída.")

if __name__ == "__main__":
    run_migration()

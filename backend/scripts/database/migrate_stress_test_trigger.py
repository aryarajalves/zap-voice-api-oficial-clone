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
    logger.info("🚀 Migration: is_stress_test in scheduled_triggers...")
    with engine.connect() as conn:
        try:
            conn.execute(text(
                "ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS is_stress_test BOOLEAN DEFAULT FALSE"
            ))
            conn.commit()
            logger.info("✅ Coluna is_stress_test adicionada a scheduled_triggers.")
        except Exception as e:
            logger.error(f"Erro: {e}")
    logger.info("🎉 Migration concluída.")

if __name__ == "__main__":
    run_migration()

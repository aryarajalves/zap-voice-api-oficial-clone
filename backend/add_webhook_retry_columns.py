"""
Migracao: adicionar colunas de retry na tabela chat_messages
Executar no servidor de producao apos o deploy da versao que inclui o webhook_retry_worker.
"""
import sys
import os
from sqlalchemy import text
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from database import engine, SessionLocal
from core.logger import setup_logger

logger = setup_logger("Migration.WebhookRetry")

def run_migration():
    logger.info("Iniciando migracao para adicionar colunas de retry de webhook na tabela chat_messages...")

    db = SessionLocal()
    try:
        dialect = engine.dialect.name
        logger.info(f"Banco de dados detectado: {dialect}")

        if dialect == "sqlite":
            result = db.execute(text("PRAGMA table_info(chat_messages)")).fetchall()
            existing = [row[1] for row in result]

            if "agentflow_retry_count" not in existing:
                db.execute(text("ALTER TABLE chat_messages ADD COLUMN agentflow_retry_count INTEGER DEFAULT 0"))
                logger.info("Coluna 'agentflow_retry_count' adicionada no SQLite.")
            else:
                logger.info("Coluna 'agentflow_retry_count' ja existe no SQLite.")

            if "agentflow_retry_at" not in existing:
                db.execute(text("ALTER TABLE chat_messages ADD COLUMN agentflow_retry_at TIMESTAMP"))
                logger.info("Coluna 'agentflow_retry_at' adicionada no SQLite.")
            else:
                logger.info("Coluna 'agentflow_retry_at' ja existe no SQLite.")

        else:
            # PostgreSQL suporta ADD COLUMN IF NOT EXISTS
            db.execute(text(
                "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS agentflow_retry_count INTEGER DEFAULT 0"
            ))
            db.execute(text(
                "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS agentflow_retry_at TIMESTAMPTZ"
            ))
            logger.info("Colunas de retry adicionadas ou ja existentes no PostgreSQL.")

        db.commit()
        logger.info("Migracao concluida com sucesso.")

    except Exception as e:
        db.rollback()
        logger.error(f"Erro na migracao: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()

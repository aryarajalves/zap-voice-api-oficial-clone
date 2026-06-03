"""
Migração: Criação da tabela backup_metadata

Esta tabela armazena metadados de backups no S3 (como se está pinado e qual a tag).

Execute com:
    python backend/migrations/add_backup_metadata_table.py
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from sqlalchemy import text
from database import engine
from core.logger import logger


def run_migration():
    logger.info("🔧 [MIGRATION] Criando tabela backup_metadata...")

    with engine.connect() as conn:
        # Verifica se a tabela já existe
        result = conn.execute(text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'backup_metadata')"
        ))
        exists = result.scalar()

        if exists:
            logger.info("✅ [MIGRATION] Tabela backup_metadata já existe. Pulando.")
            return

        conn.execute(text("""
            CREATE TABLE backup_metadata (
                filename VARCHAR(255) PRIMARY KEY,
                is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
                tag VARCHAR(100),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        conn.commit()
        logger.info("✅ [MIGRATION] Tabela backup_metadata criada com sucesso!")


if __name__ == "__main__":
    run_migration()

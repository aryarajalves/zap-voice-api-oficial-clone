"""
Migração: Adição da coluna s3_folder à tabela backup_config

Esta coluna armazena o caminho ou prefixo da pasta no S3 onde
os backups do banco de dados serão armazenados.

Execute com:
    python backend/migrations/add_s3_folder_to_backup_config.py
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
    logger.info("🔧 [MIGRATION] Verificando e adicionando coluna s3_folder à tabela backup_config...")

    with engine.connect() as conn:
        # Verifica se a tabela existe antes
        table_result = conn.execute(text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'backup_config')"
        ))
        table_exists = table_result.scalar()

        if not table_exists:
            logger.warning("⚠️ [MIGRATION] Tabela backup_config não existe. Pulando.")
            return

        # Verifica se a coluna s3_folder já existe
        column_result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'backup_config' AND column_name = 's3_folder'
            )
        """))
        column_exists = column_result.scalar()

        if column_exists:
            logger.info("✅ [MIGRATION] Coluna s3_folder já existe na tabela backup_config. Pulando.")
            return

        # Adiciona a coluna s3_folder com valor default 'backups/'
        conn.execute(text("""
            ALTER TABLE backup_config 
            ADD COLUMN s3_folder VARCHAR(255) NOT NULL DEFAULT 'backups/'
        """))
        conn.commit()
        logger.info("✅ [MIGRATION] Coluna s3_folder adicionada com sucesso à tabela backup_config!")


if __name__ == "__main__":
    run_migration()

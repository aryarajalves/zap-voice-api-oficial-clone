"""
add_status_column_to_chat_messages.py
Script de migração para adicionar a coluna 'status' (VARCHAR) e índice na tabela 'chat_messages'.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL
from core.logger import setup_logger

logger = setup_logger("Migration.ChatMessageStatus")

def run_migration():
    if not SQLALCHEMY_DATABASE_URL:
        logger.error("❌ DATABASE_URL não configurada.")
        return

    logger.info("🚀 Iniciando migração para adicionar coluna 'status' na tabela 'chat_messages'...")
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    with engine.connect() as conn:
        dialect = engine.dialect.name
        logger.info(f"📊 Dialeto detectado: {dialect}")

        if dialect == "postgresql":
            # 1. Adiciona coluna status se não existir
            sql_col = "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'sent';"
            logger.info(f"Executando: {sql_col}")
            conn.execute(text(sql_col))

            # 2. Cria índice na coluna status
            sql_idx = "CREATE INDEX IF NOT EXISTS idx_chat_messages_status ON chat_messages (status);"
            logger.info(f"Executando: {sql_idx}")
            conn.execute(text(sql_idx))

            # 3. Preenche mensagens antigas onde status é nulo
            sql_update = "UPDATE chat_messages SET status = COALESCE(meta_data->>'status', 'sent') WHERE status IS NULL;"
            conn.execute(text(sql_update))

            conn.commit()
            logger.info("✅ Coluna 'status' e índice criados com sucesso no PostgreSQL.")

        elif dialect == "sqlite":
            # Verificar se a coluna já existe no SQLite
            check_col = conn.execute(text("PRAGMA table_info(chat_messages);")).fetchall()
            col_names = [col[1] for col in check_col]
            if "status" not in col_names:
                conn.execute(text("ALTER TABLE chat_messages ADD COLUMN status VARCHAR(50) DEFAULT 'sent';"))
                logger.info("✅ Coluna 'status' adicionada ao SQLite.")
            
            try:
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_chat_messages_status ON chat_messages (status);"))
            except Exception as e_idx:
                logger.warning(f"Aviso ao criar índice no SQLite: {e_idx}")

            conn.commit()
            logger.info("✅ Migração concluída no SQLite.")

if __name__ == "__main__":
    run_migration()

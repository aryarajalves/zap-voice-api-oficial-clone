import sys
import os
from sqlalchemy import text
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from database import engine, SessionLocal
from core.logger import setup_logger

logger = setup_logger("Migration.CompositeChatIndex")

def run_migration():
    logger.info("🎬 Iniciando migração para adicionar índice composto idx_chat_messages_convo_time...")
    
    db = SessionLocal()
    try:
        dialect = engine.dialect.name
        logger.info(f"💾 Banco de dados detectado: {dialect}")
        
        # O comando CREATE INDEX IF NOT EXISTS funciona tanto para SQLite (desde a versão 3.3.0) quanto para PostgreSQL
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_chat_messages_convo_time ON chat_messages (conversation_id, timestamp)"))
        logger.info("✅ Índice composto idx_chat_messages_convo_time criado ou já existente com sucesso!")
        
        db.commit()
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro na migração: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()

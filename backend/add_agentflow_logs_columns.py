import sys
import os
from sqlalchemy import text
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from database import engine, SessionLocal
from core.logger import setup_logger

logger = setup_logger("Migration.AgentFlowLogs")

def run_migration():
    logger.info("🎬 Iniciando migração para adicionar colunas do AgentFlow na tabela chat_messages...")
    
    db = SessionLocal()
    try:
        # Verifica o dialeto
        dialect = engine.dialect.name
        logger.info(f"💾 Banco de dados detectado: {dialect}")
        
        # SQL de alteração
        if dialect == "sqlite":
            result = db.execute(text("PRAGMA table_info(chat_messages)")).fetchall()
            columns = [row[1] for row in result]
            
            if "agentflow_webhook_status" not in columns:
                db.execute(text("ALTER TABLE chat_messages ADD COLUMN agentflow_webhook_status VARCHAR"))
                logger.info("✅ Coluna 'agentflow_webhook_status' adicionada com sucesso no SQLite!")
            else:
                logger.info("ℹ️ Coluna 'agentflow_webhook_status' já existe no SQLite.")
                
            if "agentflow_webhook_error" not in columns:
                db.execute(text("ALTER TABLE chat_messages ADD COLUMN agentflow_webhook_error VARCHAR"))
                logger.info("✅ Coluna 'agentflow_webhook_error' adicionada com sucesso no SQLite!")
            else:
                logger.info("ℹ️ Coluna 'agentflow_webhook_error' já existe no SQLite.")
        else:
            # PostgreSQL
            db.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS agentflow_webhook_status VARCHAR"))
            db.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS agentflow_webhook_error VARCHAR"))
            logger.info("✅ Colunas do AgentFlow adicionadas ou já existentes no PostgreSQL!")
            
        db.commit()
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro na migração: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()

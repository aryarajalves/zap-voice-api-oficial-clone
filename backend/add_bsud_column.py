import sys
import os
from sqlalchemy import text
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from database import engine, SessionLocal
from core.logger import setup_logger

logger = setup_logger("Migration.BSUD")

def run_migration():
    logger.info("🎬 Iniciando migração para adicionar coluna 'bsud'...")
    
    db = SessionLocal()
    try:
        # Verifica o dialeto
        dialect = engine.dialect.name
        logger.info(f"💾 Banco de dados detectado: {dialect}")
        
        # SQL de alteração
        if dialect == "sqlite":
            # SQLite não suporta IF NOT EXISTS em ADD COLUMN em algumas versões, 
            # verificamos primeiro se a coluna existe
            result = db.execute(text("PRAGMA table_info(webhook_leads)")).fetchall()
            columns = [row[1] for row in result]
            if "bsud" not in columns:
                db.execute(text("ALTER TABLE webhook_leads ADD COLUMN bsud VARCHAR(255)"))
                logger.info("✅ Coluna 'bsud' adicionada com sucesso no SQLite!")
            else:
                logger.info("ℹ️ Coluna 'bsud' já existe no SQLite.")
        else:
            # PostgreSQL
            db.execute(text("ALTER TABLE webhook_leads ADD COLUMN IF NOT EXISTS bsud VARCHAR(255)"))
            logger.info("✅ Coluna 'bsud' adicionada ou já existente no PostgreSQL!")
            
        db.commit()
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro na migração: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()

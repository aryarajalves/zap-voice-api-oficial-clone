import os
import sys

# Adicionar pasta raiz do backend ao sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)

from database import engine
from sqlalchemy import text
from core.logger import logger

def add_bg_image_url_column():
    logger.info("Verificando se a coluna 'bg_image_url' existe na tabela 'capture_page_configs'...")
    with engine.connect() as conn:
        try:
            # SQL para adicionar a coluna se ela não existir
            conn.execute(text("""
                ALTER TABLE capture_page_configs 
                ADD COLUMN IF NOT EXISTS bg_image_url TEXT NULL;
            """))
            conn.commit()
            logger.info("✅ Coluna 'bg_image_url' verificada/adicionada com sucesso!")
        except Exception as e:
            logger.error(f"❌ Erro ao adicionar coluna 'bg_image_url': {e}")

if __name__ == "__main__":
    add_bg_image_url_column()

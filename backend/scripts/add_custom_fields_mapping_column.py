import os
import sys
from dotenv import load_dotenv

# Adiciona o diretório inicial ao path e carrega variáveis
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

from database import SessionLocal
from sqlalchemy import text
from core.logger import logger

def add_column():
    db = SessionLocal()
    try:
        # Check if column exists
        result = db.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='webhook_integrations' AND column_name='custom_fields_mapping'"
        ))
        
        if result.fetchone():
            logger.info("Column 'custom_fields_mapping' already exists in 'webhook_integrations'.")
            return

        print("Adicionando coluna 'custom_fields_mapping' na tabela 'webhook_integrations'...")
        db.execute(text("ALTER TABLE webhook_integrations ADD COLUMN custom_fields_mapping JSONB;"))
        db.commit()
        print("Coluna adicionada com sucesso!")
        logger.info("Successfully added 'custom_fields_mapping' to 'webhook_integrations'")

    except Exception as e:
        db.rollback()
        print(f"Erro ao adicionar coluna: {e}")
        logger.error(f"Error adding column to webhook_integrations: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_column()

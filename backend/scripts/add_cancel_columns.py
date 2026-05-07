import os
import sys
from dotenv import load_dotenv

# Adiciona o diretório inicial ao path e carrega variáveis
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

from database import SessionLocal
from sqlalchemy import text
from core.logger import logger

def add_columns():
    db = SessionLocal()
    try:
        # Check if cancel_pending_on_trigger exists
        result = db.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='webhook_event_mappings' AND column_name='cancel_pending_on_trigger'"
        ))
        
        if result.fetchone():
            print("Coluna 'cancel_pending_on_trigger' já existe.")
        else:
            print("Adicionando coluna 'cancel_pending_on_trigger'...")
            db.execute(text("ALTER TABLE webhook_event_mappings ADD COLUMN cancel_pending_on_trigger BOOLEAN DEFAULT FALSE;"))
            print("Coluna 'cancel_pending_on_trigger' adicionada.")

        # Check if cancel_event_types exists
        result = db.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='webhook_event_mappings' AND column_name='cancel_event_types'"
        ))
        
        if result.fetchone():
            print("Coluna 'cancel_event_types' já existe.")
        else:
            print("Adicionando coluna 'cancel_event_types'...")
            db.execute(text("ALTER TABLE webhook_event_mappings ADD COLUMN cancel_event_types JSONB;"))
            print("Coluna 'cancel_event_types' adicionada.")

        db.commit()
        print("Migração concluída com sucesso!")
        logger.info("Successfully added cancellation columns to 'webhook_event_mappings'")

    except Exception as e:
        db.rollback()
        print(f"Erro ao adicionar colunas: {e}")
        logger.error(f"Error adding columns to webhook_event_mappings: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_columns()

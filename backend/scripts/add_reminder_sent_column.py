import sys
import os
from sqlalchemy import create_engine, text

# Adicionar pasta backend ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SQLALCHEMY_DATABASE_URL

def migrate():
    print(f"Iniciando migração no banco de dados...")
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE webhook_leads ADD COLUMN google_calendar_reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;"))
            conn.commit()
            print("✅ Coluna 'google_calendar_reminder_sent' adicionada com sucesso na tabela webhook_leads!")
        except Exception as e:
            conn.rollback()
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("ℹ️ A coluna 'google_calendar_reminder_sent' já existe. Nenhuma alteração feita.")
            else:
                print(f"❌ Erro ao adicionar coluna: {e}")
                sys.exit(1)

if __name__ == "__main__":
    migrate()

import sys
import os
from sqlalchemy import create_engine, text

# Adicionar pasta backend ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SQLALCHEMY_DATABASE_URL

def migrate():
    print(f"Iniciando migração no banco de dados...")
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    is_postgres = "postgresql" in SQLALCHEMY_DATABASE_URL
    
    # 1. google_calendar_link
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE webhook_leads ADD COLUMN google_calendar_link VARCHAR(1024) NULL;"))
            conn.commit()
            print("✅ Coluna 'google_calendar_link' adicionada com sucesso na tabela webhook_leads!")
        except Exception as e:
            conn.rollback()
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("ℹ️ A coluna 'google_calendar_link' já existe. Nenhuma alteração feita.")
            else:
                print(f"❌ Erro ao adicionar coluna google_calendar_link: {e}")
                sys.exit(1)

    # 2. event_datetime
    with engine.connect() as conn:
        try:
            if is_postgres:
                conn.execute(text("ALTER TABLE webhook_leads ADD COLUMN event_datetime TIMESTAMP WITH TIME ZONE NULL;"))
            else:
                conn.execute(text("ALTER TABLE webhook_leads ADD COLUMN event_datetime TIMESTAMP NULL;"))
            conn.commit()
            print("✅ Coluna 'event_datetime' adicionada com sucesso na tabela webhook_leads!")
        except Exception as e:
            conn.rollback()
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("ℹ️ A coluna 'event_datetime' já existe. Nenhuma alteração feita.")
            else:
                print(f"❌ Erro ao adicionar coluna event_datetime: {e}")
                sys.exit(1)

if __name__ == "__main__":
    migrate()

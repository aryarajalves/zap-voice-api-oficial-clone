import os
from sqlalchemy import create_engine, text
from database import engine

def migrate():
    with engine.connect() as conn:
        print("🚀 Alterando coluna chatwoot_label para JSONB...")
        # Primeiro renomeia a antiga
        conn.execute(text("ALTER TABLE webhook_event_mappings ALTER COLUMN chatwoot_label TYPE JSONB USING chatwoot_label::jsonb"))
        conn.commit()
        print("✅ Coluna alterada com sucesso!")

if __name__ == "__main__":
    migrate()

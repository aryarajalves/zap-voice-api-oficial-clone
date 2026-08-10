import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import SessionLocal

def migrate():
    db = SessionLocal()
    try:
        print("Adicionando coluna manychat_custom_field na tabela webhook_event_mappings se não existir...")
        db.execute(text("ALTER TABLE webhook_event_mappings ADD COLUMN IF NOT EXISTS manychat_custom_field VARCHAR DEFAULT 'telefone_whatsapp';"))
        db.commit()
        print("Coluna manychat_custom_field criada/verificada com sucesso!")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()

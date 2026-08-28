import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from sqlalchemy import text

def migrate():
    print("🚀 [MIGRATION] Iniciando migração para pinned_message_id e is_starred...")
    db = SessionLocal()
    try:
        # Coluna pinned_message_id em chat_conversations
        try:
            db.execute(text("ALTER TABLE chat_conversations ADD COLUMN pinned_message_id INTEGER REFERENCES chat_messages(id) ON DELETE SET NULL;"))
            db.commit()
            print("✅ Coluna 'pinned_message_id' adicionada com sucesso em chat_conversations.")
        except Exception as e:
            db.rollback()
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower() or "existe" in str(e).lower():
                print("ℹ️ Coluna 'pinned_message_id' já existe em chat_conversations.")
            else:
                print(f"❌ Erro ao adicionar coluna 'pinned_message_id': {e}")

        # Coluna is_starred em chat_messages
        try:
            db.execute(text("ALTER TABLE chat_messages ADD COLUMN is_starred BOOLEAN DEFAULT FALSE;"))
            db.commit()
            print("✅ Coluna 'is_starred' adicionada com sucesso em chat_messages.")
        except Exception as e:
            db.rollback()
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower() or "existe" in str(e).lower():
                print("ℹ️ Coluna 'is_starred' já existe em chat_messages.")
            else:
                print(f"❌ Erro ao adicionar coluna 'is_starred': {e}")

    finally:
        db.close()
    print("✅ [MIGRATION] Sincronização concluída.")

if __name__ == "__main__":
    migrate()

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from sqlalchemy import text

def migrate():
    print("🚀 [MIGRATION] Iniciando migração para chat_conversations...")
    db = SessionLocal()
    try:
        # Coluna pinned
        try:
            db.execute(text("ALTER TABLE chat_conversations ADD COLUMN pinned BOOLEAN DEFAULT FALSE;"))
            db.commit()
            print("✅ Coluna 'pinned' adicionada com sucesso.")
        except Exception as e:
            db.rollback()
            if "already exists" in str(e) or "duplicate" in str(e) or "existe" in str(e):
                print("ℹ️ Coluna 'pinned' já existe.")
            else:
                print(f"❌ Erro ao adicionar coluna 'pinned': {e}")

        # Coluna private_note
        try:
            db.execute(text("ALTER TABLE chat_conversations ADD COLUMN private_note TEXT;"))
            db.commit()
            print("✅ Coluna 'private_note' adicionada com sucesso.")
        except Exception as e:
            db.rollback()
            if "already exists" in str(e) or "duplicate" in str(e) or "existe" in str(e):
                print("ℹ️ Coluna 'private_note' já existe.")
            else:
                print(f"❌ Erro ao adicionar coluna 'private_note': {e}")
                
    finally:
        db.close()
    print("✅ [MIGRATION] Sincronização concluída.")

if __name__ == "__main__":
    migrate()

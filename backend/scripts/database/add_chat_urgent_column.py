import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from database import SessionLocal
from sqlalchemy import text

def migrate():
    print("🚀 [MIGRATION] Adicionando coluna 'urgent' à tabela 'chat_conversations'...")
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS urgent BOOLEAN DEFAULT FALSE;"))
        db.commit()
        print("✅ Coluna 'urgent' verificada/adicionada com sucesso.")
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao adicionar coluna 'urgent': {e}")
    finally:
        db.close()
    print("✅ [MIGRATION] Sincronização concluída.")

if __name__ == "__main__":
    migrate()

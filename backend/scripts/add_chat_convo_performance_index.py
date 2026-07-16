import sys
import os
sys.path.append('/app')

from database import SessionLocal
from sqlalchemy import text

def upgrade():
    db = SessionLocal()
    print("🚀 Iniciando criação de índice composto de performance na tabela 'chat_conversations'...")
    try:
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_chat_convo_client_status_time 
            ON chat_conversations (client_id, status, last_message_at DESC NULLS LAST)
        """))
        db.commit()
        print("✅ Índice composto 'idx_chat_convo_client_status_time' criado com sucesso!")
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao criar índice em chat_conversations: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    upgrade()

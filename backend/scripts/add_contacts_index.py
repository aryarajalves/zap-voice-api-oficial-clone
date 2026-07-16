import sys
import os
sys.path.append('/app')

from database import SessionLocal
from sqlalchemy import text
from config_loader import get_setting

def upgrade():
    db = SessionLocal()
    # Ler o nome da tabela de contatos monitorados
    sync_table_raw = get_setting("SYNC_CONTACTS_TABLE", "contatos_monitorados")
    safe_table = "".join(c for c in sync_table_raw if c.isalnum() or c == '_')
    
    print(f"🚀 Iniciando criação de índice de performance na tabela '{safe_table}'...")
    try:
        # Criar índice para last_interaction_at
        db.execute(text(f"""
            CREATE INDEX IF NOT EXISTS idx_{safe_table}_last_interaction 
            ON {safe_table} (last_interaction_at DESC NULLS LAST)
        """))
        db.commit()
        print(f"✅ Índice 'idx_{safe_table}_last_interaction' criado com sucesso!")
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao criar índice: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    upgrade()

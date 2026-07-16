import sys
import os
sys.path.append('/app')

from database import SessionLocal
from sqlalchemy import text
from config_loader import get_setting

def upgrade():
    db = SessionLocal()
    print("🚀 Iniciando aplicação de índices de performance consolidados...")
    
    # 1. Índice composto na tabela 'chat_conversations' (Listagem Lateral do Chat)
    try:
        print("⚡ Criando índice composto para 'chat_conversations'...")
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_chat_convo_client_status_time 
            ON chat_conversations (client_id, status, last_message_at DESC NULLS LAST)
        """))
        db.commit()
        print("✅ Índice 'idx_chat_convo_client_status_time' criado/validado com sucesso!")
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao criar índice em chat_conversations: {e}")

    # 2. Índice na tabela customizada de contatos (Aba Contatos)
    sync_table_raw = get_setting("SYNC_CONTACTS_TABLE", "contatos_monitorados")
    safe_table = "".join(c for c in sync_table_raw if c.isalnum() or c == '_')
    try:
        print(f"⚡ Criando índice de ordenação para a tabela '{safe_table}'...")
        db.execute(text(f"""
            CREATE INDEX IF NOT EXISTS idx_{safe_table}_last_interaction 
            ON {safe_table} (last_interaction_at DESC NULLS LAST)
        """))
        db.commit()
        print(f"✅ Índice 'idx_{safe_table}_last_interaction' criado/validado com sucesso!")
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao criar índice em {safe_table}: {e}")

    # 3. Índice na tabela 'scheduled_triggers' (Histórico de Disparos)
    try:
        print("⚡ Criando índice composto de performance para a tabela 'scheduled_triggers'...")
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_scheduled_triggers_perf_list 
            ON scheduled_triggers (client_id, parent_id, created_at DESC)
        """))
        db.commit()
        print("✅ Índice 'idx_scheduled_triggers_perf_list' criado/validado com sucesso!")
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao criar índice composto em scheduled_triggers: {e}")
        
    db.close()
    print("🎉 Aplicação de índices de performance finalizada!")

if __name__ == "__main__":
    upgrade()

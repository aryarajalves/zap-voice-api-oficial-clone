"""
Script de Migração e Conversão de Colunas JSON para JSONB no PostgreSQL
Converte todas as 24 colunas restantes do formato de texto para binário indexável.

Uso: python backend/scripts/migrate_json_to_jsonb.py
"""

import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text

# Ajusta path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from database import SQLALCHEMY_DATABASE_URL

COLUMNS_TO_JSONB = [
    ("chat_conversations", "labels"),
    ("chat_messages", "meta_data"),
    ("email_dispatches", "contacts_list"),
    ("funnels", "allowed_phones"),
    ("funnels", "blocked_phones"),
    ("funnels", "business_hours_days"),
    ("funnels", "steps"),
    ("product_status", "last_payload"),
    ("recurring_triggers", "direct_message_params"),
    ("scheduled_triggers", "contacts_list"),
    ("scheduled_triggers", "direct_message_params"),
    ("scheduled_triggers", "pending_contacts"),
    ("scheduled_triggers", "processed_contacts"),
    ("scheduled_triggers", "template_components"),
    ("webhook_configs", "field_mapping"),
    ("webhook_configs", "last_payload"),
    ("webhook_event_mappings", "template_components"),
    ("webhook_event_mappings", "variables_mapping"),
    ("webhook_events", "headers"),
    ("webhook_events", "payload"),
    ("webhook_events", "processed_data"),
    ("webhook_history", "payload"),
    ("webhook_history", "processed_data"),
    ("whatsapp_template_cache", "components"),
]


def apply_jsonb_migration():
    if not SQLALCHEMY_DATABASE_URL:
        print("[ERRO] DATABASE_URL não configurada.")
        return 1

    print("=" * 70)
    print("🚀 INICIANDO MIGRAÇÃO DE COLUNAS JSON PARA JSONB NO POSTGRESQL")
    print("=" * 70)

    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    with engine.begin() as conn:
        for table_name, col_name in COLUMNS_TO_JSONB:
            try:
                # Verifica se a tabela e a coluna existem e se o tipo atual é 'json'
                col_info = conn.execute(text("""
                    SELECT data_type FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                      AND table_name = :tbl 
                      AND column_name = :col;
                """), {"tbl": table_name, "col": col_name}).scalar()

                if not col_info:
                    print(f"⚠️  Coluna {table_name}.{col_name} não encontrada. Pulando.")
                    continue

                if col_info == "jsonb":
                    print(f"ℹ️  {table_name}.{col_name} já é do tipo JSONB.")
                    continue

                sql = f'ALTER TABLE "{table_name}" ALTER COLUMN "{col_name}" TYPE jsonb USING "{col_name}"::jsonb;'
                conn.execute(text(sql))
                print(f"✅ {table_name}.{col_name} convertido com sucesso para JSONB!")
            except Exception as e:
                print(f"❌ Erro ao converter {table_name}.{col_name}: {e}")

        # Índices GIN
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_chat_conversations_labels_gin ON chat_conversations USING gin (labels);"))
            print("✅ Índice GIN 'idx_chat_conversations_labels_gin' criado em chat_conversations(labels).")
        except Exception as e:
            print(f"❌ Erro ao criar índice GIN em chat_conversations: {e}")

        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_chat_messages_metadata_gin ON chat_messages USING gin (meta_data);"))
            print("✅ Índice GIN 'idx_chat_messages_metadata_gin' criado em chat_messages(meta_data).")
        except Exception as e:
            print(f"❌ Erro ao criar índice GIN em chat_messages: {e}")

    print("=" * 70)
    print("🎉 SUCESSO: Todas as colunas foram migradas para JSONB!")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(apply_jsonb_migration())

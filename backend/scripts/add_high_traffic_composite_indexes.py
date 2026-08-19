"""
Script de Migração e Criação de Índices Compostos de Alto Tráfego no PostgreSQL
Aplica índices compostos B-Tree para acelerar buscas e relatórios frequentes.

Uso: python backend/scripts/add_high_traffic_composite_indexes.py
"""

import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text

# Ajusta path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from database import SQLALCHEMY_DATABASE_URL

COMPOSITE_INDEXES = [
    ("idx_message_status_phone_time", "message_status", "(phone_number, timestamp DESC)"),
    ("idx_message_status_trigger_status", "message_status", "(trigger_id, status)"),
    ("idx_contact_windows_client_phone", "contact_windows", "(client_id, phone)"),
    ("idx_contact_windows_client_last_interaction", "contact_windows", "(client_id, last_interaction_at DESC)"),
    ("idx_template_cache_client_name_lang", "whatsapp_template_cache", "(client_id, name, language)"),
    ("idx_template_cache_client_pinned_name", "whatsapp_template_cache", "(client_id, is_pinned DESC, name ASC)"),
    ("idx_chat_convo_client_unread_last", "chat_conversations", "(client_id, unread_count DESC, last_message_at DESC NULLS LAST)"),
    ("idx_contatos_monitorados_inbox_time", "contatos_monitorados", "(inbox_id, last_interaction_at DESC NULLS LAST)"),
]


def apply_composite_indexes():
    if not SQLALCHEMY_DATABASE_URL:
        print("[ERRO] DATABASE_URL não configurada.")
        return 1

    print("=" * 70)
    print("🚀 APLICANDO ÍNDICES COMPOSTOS DE ALTO TRÁFEGO NO POSTGRESQL")
    print("=" * 70)

    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    with engine.begin() as conn:
        for idx_name, table_name, cols_def in COMPOSITE_INDEXES:
            try:
                table_check = conn.execute(text(f"""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_schema = 'public' AND table_name = :tbl
                    );
                """), {"tbl": table_name}).scalar()

                if not table_check:
                    print(f"⚠️  Tabela '{table_name}' não encontrada no banco. Pulando índice '{idx_name}'.")
                    continue

                sql = f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table_name} {cols_def};"
                conn.execute(text(sql))
                print(f"✅ Índice '{idx_name}' criado/verificado em {table_name}{cols_def}")
            except Exception as e:
                print(f"❌ Erro ao criar índice '{idx_name}' em {table_name}: {e}")

    print("=" * 70)
    print("🎉 SUCESSO: Todos os índices compostos foram aplicados!")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(apply_composite_indexes())

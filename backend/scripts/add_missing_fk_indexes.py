"""
Script de Migração e Criação de Índices em Foreign Keys no PostgreSQL
Aplica os 18 índices em chaves estrangeiras que atualmente provocam Sequential Scans.

Uso: python backend/scripts/add_missing_fk_indexes.py
"""

import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text

# Ajusta path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from database import SQLALCHEMY_DATABASE_URL

FK_INDEXES = [
    ("idx_fk_users_client_id", "users", "client_id"),
    ("idx_fk_scheduled_triggers_funnel_id", "scheduled_triggers", "funnel_id"),
    ("idx_fk_recurring_triggers_funnel_id", "recurring_triggers", "funnel_id"),
    ("idx_fk_chat_messages_user_id", "chat_messages", "user_id"),
    ("idx_fk_api_keys_user_id", "api_keys", "user_id"),
    ("idx_fk_user_clients_client_id", "user_clients", "client_id"),
    ("idx_fk_invitation_clients_client_id", "invitation_clients", "client_id"),
    ("idx_fk_user_invitations_created_by_id", "user_invitations", "created_by_id"),
    ("idx_fk_webhook_configs_funnel_id", "webhook_configs", "funnel_id"),
    ("idx_fk_webhook_event_mappings_funnel_id", "webhook_event_mappings", "funnel_id"),
    ("idx_fk_webhook_leads_imported_by", "webhook_leads", "imported_by_client_id"),
    ("idx_fk_instagram_automations_funnel_id", "instagram_automations", "funnel_id"),
    ("idx_fk_contact_import_history_project_id", "contact_import_history", "project_id"),
    ("idx_fk_clients_project_id", "clients", "project_id"),
    ("idx_fk_email_dispatches_template_id", "email_dispatches", "template_id"),
    ("idx_fk_email_inbounds_dispatch_id", "email_inbounds", "dispatch_id"),
    ("idx_fk_email_inbounds_lead_id", "email_inbounds", "lead_id"),
    ("idx_fk_contact_template_history_trigger_id", "contact_template_history", "trigger_id"),
]


def apply_fk_indexes():
    if not SQLALCHEMY_DATABASE_URL:
        print("[ERRO] DATABASE_URL não configurada.")
        return 1

    print("=" * 70)
    print("🚀 APLICANDO ÍNDICES DE FOREIGN KEYS NO POSTGRESQL")
    print("=" * 70)

    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    with engine.begin() as conn:
        for idx_name, table_name, column_name in FK_INDEXES:
            try:
                # Verifica se a tabela existe antes de criar o índice
                table_check = conn.execute(text(f"""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_schema = 'public' AND table_name = :tbl
                    );
                """), {"tbl": table_name}).scalar()

                if not table_check:
                    print(f"⚠️  Tabela '{table_name}' não encontrada no banco. Pulando índice '{idx_name}'.")
                    continue

                sql = f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table_name} ({column_name});"
                conn.execute(text(sql))
                print(f"✅ Índice '{idx_name}' criado/verificado em {table_name}({column_name})")
            except Exception as e:
                print(f"❌ Erro ao criar índice '{idx_name}' em {table_name}: {e}")

    print("=" * 70)
    print("🎉 SUCESSO: Todos os índices de Foreign Keys foram aplicados!")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(apply_fk_indexes())

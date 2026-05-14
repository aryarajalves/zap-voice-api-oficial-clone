import os
import sys
from sqlalchemy import text
from database import engine
from core.logger import logger

def fix_webhook_columns():
    """
    Script robusto para adicionar colunas faltantes na tabela webhook_event_mappings.
    """
    # Lista de colunas para garantir que existam
    columns_to_add = [
        ("cancel_pending_on_trigger", "BOOLEAN DEFAULT FALSE"),
        ("cancel_event_types", "JSONB DEFAULT '[]'"),
        ("chatwoot_label", "JSONB DEFAULT '[]'"),
        ("internal_tags", "VARCHAR"),
        ("publish_external_event", "BOOLEAN DEFAULT FALSE"),
        ("send_as_free_message", "BOOLEAN DEFAULT FALSE"),
        ("trigger_once", "BOOLEAN DEFAULT FALSE"),
        ("manychat_active", "BOOLEAN DEFAULT FALSE"),
        ("manychat_name", "VARCHAR"),
        ("manychat_phone", "VARCHAR"),
        ("manychat_tag", "VARCHAR"),
        ("manychat_tag_automation", "BOOLEAN DEFAULT FALSE"),
        ("manychat_tag_include_date", "BOOLEAN DEFAULT TRUE"),
        ("manychat_tag_prefix", "VARCHAR"),
        ("manychat_tag_rotation_time", "VARCHAR DEFAULT '08:00'"),
        ("manychat_tag_rotation_day", "INTEGER DEFAULT 4"),
        ("cost_per_message", "FLOAT DEFAULT 0.0")
    ]

    try:
        logger.info("🚀 Iniciando verificação de colunas no Banco de Dados...")
        
        with engine.connect() as conn:
            # Pegar todas as colunas da tabela alvo de forma robusta
            query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'webhook_event_mappings'
            """)
            result = conn.execute(query)
            existing_columns = [row[0].lower() for row in result.fetchall()]
            
            if not existing_columns:
                logger.warning("⚠️ Tabela 'webhook_event_mappings' não encontrada ou vazia.")
            
            changes_made = 0
            for col_name, col_type in columns_to_add:
                if col_name.lower() not in existing_columns:
                    logger.info(f"➕ Adicionando coluna: {col_name}...")
                    try:
                        conn.execute(text(f"ALTER TABLE webhook_event_mappings ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                        logger.info(f"✅ {col_name} adicionada.")
                        changes_made += 1
                    except Exception as e_col:
                        logger.error(f"❌ Erro ao adicionar {col_name}: {e_col}")
                else:
                    # logger.info(f"ℹ️ {col_name} já existe.")
                    pass
            
            if changes_made > 0:
                logger.info(f"🎉 Migração de webhook_event_mappings finalizada! {changes_made} colunas adicionadas.")
            else:
                logger.info("✨ A tabela 'webhook_event_mappings' já está atualizado.")

            # --- VERIFICAR TABELA webhook_integrations ---
            logger.info("🔍 Verificando tabela 'webhook_integrations'...")
            query_int = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'webhook_integrations'
            """)
            result_int = conn.execute(query_int)
            existing_columns_int = [row[0].lower() for row in result_int.fetchall()]

            if "custom_slug" not in existing_columns_int:
                logger.info("➕ Adicionando coluna custom_slug à tabela webhook_integrations...")
                conn.execute(text("ALTER TABLE webhook_integrations ADD COLUMN custom_slug VARCHAR"))
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_webhook_integrations_custom_slug ON webhook_integrations (custom_slug)"))
                conn.commit()
                logger.info("✅ Coluna custom_slug adicionada com sucesso.")
            else:
                logger.info("✨ A coluna 'custom_slug' já existe.")
            
    except Exception as e:
        logger.error(f"💥 Erro fatal na migração: {e}")
        sys.exit(1)

if __name__ == "__main__":
    fix_webhook_columns()

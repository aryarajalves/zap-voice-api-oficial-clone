
import os
import psycopg2
import sys
from urllib.parse import urlparse
from sqlalchemy import text

# Adiciona o diretório atual e a pasta backend ao path para importar database e models
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import engine, Base
import models # Garante que todos os modelos sejam registrados

def update_schema():
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@zapvoice-postgres:5432/zapvoice")
    if database_url:
        database_url = database_url.strip('"').strip("'")
    print(f"Connecting to {database_url}...")
    
    # 1. Criação automática de tabelas novas via SQLAlchemy
    try:
        print("Sincronizando tabelas via SQLAlchemy Models...")
        Base.metadata.create_all(bind=engine)
        print("Tabelas sincronizadas.")
    except Exception as e:
        print(f"Erro ao sincronizar tabelas: {e}")

    # 2. Atualizações manuais de colunas para tabelas existentes (Migrations manuais)
    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        # List of columns to add to scheduled_triggers
        columns_to_add = [
            ("current_node_id", "VARCHAR"),
            ("processed_contacts", "JSON"),
            ("pending_contacts", "JSON"),
            ("cost_per_unit", "FLOAT DEFAULT 0.0"),
            ("total_cost", "FLOAT DEFAULT 0.0"),
            ("total_delivered", "INTEGER DEFAULT 0"),
            ("total_read", "INTEGER DEFAULT 0"),
            ("total_interactions", "INTEGER DEFAULT 0"),
            ("total_blocked", "INTEGER DEFAULT 0"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE"),
            ("private_message", "VARCHAR"),
            ("private_message_delay", "INTEGER DEFAULT 5"),
            ("private_message_concurrency", "INTEGER DEFAULT 1"),
            ("template_language", "VARCHAR DEFAULT 'pt_BR'"),
            ("template_components", "JSON"),
            ("direct_message", "VARCHAR"),
            ("direct_message_params", "JSON"),
            ("current_step_index", "INTEGER DEFAULT 0"),
            ("failure_reason", "VARCHAR"),
            ("product_name", "VARCHAR"),
            ("event_type", "VARCHAR"),
            ("integration_id", "VARCHAR"),
            ("sent_as", "VARCHAR")
        ]
        
        # webhook_event_mappings cost field
        try:
            cur.execute("ALTER TABLE webhook_event_mappings ADD COLUMN IF NOT EXISTS cost_per_message FLOAT DEFAULT 0.0;")
            conn.commit()
            print("✅ Column cost_per_message added to webhook_event_mappings.")
        except Exception as e:
            conn.rollback()
            print(f"⚠️ Erro ao adicionar cost_per_message: {e}")

        for col_name, col_type in columns_to_add:
            try:
                cur.execute(f"ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                conn.commit()
                # print(f"✅ Column {col_name} checked/added to scheduled_triggers.")
            except Exception as e:
                conn.rollback()
                print(f"❌ Error adding column {col_name}: {e}")

        # Update MessageStatus table
        ms_columns = [
            ("pending_private_note", "VARCHAR"),
            ("message_type", "VARCHAR"),
            ("private_note_posted", "BOOLEAN DEFAULT FALSE"),
            ("failure_reason", "VARCHAR"),
            ("is_interaction", "BOOLEAN DEFAULT FALSE"),
            ("content", "TEXT"),
            ("meta_price_category", "VARCHAR"),
            ("meta_price_brl", "FLOAT")
        ]
        
        for col_name, col_type in ms_columns:
            try:
                cur.execute(f"ALTER TABLE message_status ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                conn.commit()
                # print(f"✅ Column {col_name} checked/added to message_status.")
            except Exception as e:
                conn.rollback()
                print(f"❌ Error adding column {col_name} to message_status: {e}")

        # 3. Add processed_data to WebhookHistory
        try:
            cur.execute("ALTER TABLE webhook_history ADD COLUMN IF NOT EXISTS processed_data JSON;")
            conn.commit()
            print("✅ Column processed_data added to webhook_history.")
        except Exception as e:
            conn.rollback()
            # Se a tabela não existir ainda, ela será criada corretamente pelo create_all
            pass

        # 4. Upgrade WebhookEventMapping
        try:
            cur.execute("ALTER TABLE webhook_event_mappings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();")
            cur.execute("ALTER TABLE webhook_event_mappings ADD COLUMN IF NOT EXISTS private_note VARCHAR;")
            cur.execute("ALTER TABLE webhook_event_mappings ADD COLUMN IF NOT EXISTS variables_mapping JSON;")
            cur.execute("ALTER TABLE webhook_event_mappings ADD COLUMN IF NOT EXISTS template_name VARCHAR;")
            cur.execute("ALTER TABLE webhook_event_mappings ADD COLUMN IF NOT EXISTS template_language VARCHAR DEFAULT 'pt_BR';")
            cur.execute("ALTER TABLE webhook_event_mappings ADD COLUMN IF NOT EXISTS template_components JSON;")
            cur.execute("ALTER TABLE webhook_event_mappings ADD COLUMN IF NOT EXISTS funnel_id INTEGER;")
            cur.execute("ALTER TABLE webhook_event_mappings ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;")
            cur.execute("ALTER TABLE webhook_event_mappings ADD COLUMN IF NOT EXISTS cancel_events JSON;")
            # Garantir que template_id seja BIGINT
            cur.execute("ALTER TABLE webhook_event_mappings ALTER COLUMN template_id TYPE BIGINT;")
            conn.commit()
            print("✅ WebhookEventMapping columns updated.")
        except Exception as e:
            conn.rollback()
            print(f"⚠️ Erro ao atualizar webhook_event_mappings: {e}")

        # 5. Upgrade WebhookIntegrations
        try:
            cur.execute("ALTER TABLE webhook_integrations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();")
            conn.commit()
            print("✅ WebhookIntegrations columns updated.")
        except Exception as e:
            conn.rollback()
            print(f"⚠️ Erro ao atualizar webhook_integrations: {e}")

        # 6. Upgrade WhatsAppTemplateCache
        try:
            cur.execute("ALTER TABLE whatsapp_template_cache ALTER COLUMN id TYPE BIGINT;")
            cur.execute("ALTER TABLE whatsapp_template_cache ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();")
            cur.execute("ALTER TABLE whatsapp_template_cache ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();")
            conn.commit()
            print("[SUCCESS] whatsapp_template_cache columns/types updated.")
        except Exception as e:
            conn.rollback()
            print(f"[ERROR] whatsapp_template_cache update failed: {e}")

        # 7. Upgrade Funnels
        try:
            cur.execute("ALTER TABLE funnels ADD COLUMN IF NOT EXISTS blocked_phones JSON;")
            cur.execute("ALTER TABLE funnels ADD COLUMN IF NOT EXISTS allowed_phones JSON;")
            cur.execute("ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR;")
            conn.commit()
            print("✅ funnels/triggers columns updated (blocked_phones, allowed_phones, idempotency_key).")
        except Exception as e:
            conn.rollback()
            print(f"⚠️ Erro ao atualizar funnels: {e}")

        # 8. Upgrade Recurring Triggers (day_of_month conversion)
        try:
            # Check current type of day_of_month
            cur.execute("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'recurring_triggers' AND column_name = 'day_of_month';
            """)
            res = cur.fetchone()
            if res and (res[0] != 'jsonb' and res[0] != 'json'):
                print(f"🔄 Migrating recurring_triggers.day_of_month from {res[0]} to JSONB...")
                cur.execute("""
                    ALTER TABLE recurring_triggers 
                    ALTER COLUMN day_of_month TYPE JSONB 
                    USING CASE 
                        WHEN day_of_month IS NULL THEN NULL
                        ELSE jsonb_build_array(day_of_month::int)
                    END;
                """)
                conn.commit()
                print("✅ Migration successful!")
            else:
                # Force cleanup of any records that might be JSONB BUT still single integers (non-array)
                # Pydantic expects List[int], so they must be arrays.
                print("🔍 Checking for non-array day_of_month records in JSONB...")
                cur.execute("""
                    UPDATE recurring_triggers 
                    SET day_of_month = jsonb_build_array(day_of_month) 
                    WHERE jsonb_typeof(day_of_month) = 'number';
                """)
                
                # ALSO: Fix days_of_week if it's a list of ints instead of list of dicts
                # Pydantic expects List[dict] like [{"day": 0, "time": "09:00"}]
                print("🔍 Checking for legacy days_of_week (List[int]) to convert to List[dict]...")
                cur.execute("""
                    UPDATE recurring_triggers 
                    SET days_of_week = (
                        SELECT jsonb_agg(
                            jsonb_build_object('day', elem::int, 'time', COALESCE(scheduled_time, '09:00'))
                        )
                        FROM jsonb_array_elements(days_of_week) AS elem
                    )
                    WHERE jsonb_typeof(days_of_week) = 'array' 
                      AND jsonb_array_length(days_of_week) > 0
                      AND jsonb_typeof(days_of_week->0) = 'number';
                """)
                conn.commit()
                print("✅ Migration checks for recurring_triggers completed.")
        except Exception as e:
            conn.rollback()
            print(f"⚠️ Erro ao atualizar recurring_triggers: {e}")

        # 9. Upgrade RecurringTriggers - direct_message fields
        try:
            cur.execute("ALTER TABLE recurring_triggers ADD COLUMN IF NOT EXISTS direct_message VARCHAR;")
            cur.execute("ALTER TABLE recurring_triggers ADD COLUMN IF NOT EXISTS direct_message_params JSON;")
            conn.commit()
            print("✅ recurring_triggers columns updated (direct_message, direct_message_params).")
        except Exception as e:
            conn.rollback()
            print(f"⚠️ Erro ao atualizar recurring_triggers direct_message: {e}")

        # 4. VERIFICAÇÃO FINAL (Health Check)
        print("🔍 Iniciando verificação final do esquema...")
        critical_checks = [
            ("scheduled_triggers", "total_delivered"),
            ("message_status", "content"),
            ("app_config", "client_id"),
            ("funnels", "steps")
        ]
        
        errors = 0
        for table, col in critical_checks:
            try:
                cur.execute(f"SELECT {col} FROM {table} LIMIT 1;")
                # print(f"  OK: {table}.{col} está acessível.")
            except Exception as e:
                conn.rollback()
                print(f"  ❌ ERRO CRÍTICO: Não foi possível acessar {table}.{col}: {e}")
                errors += 1
        
        if errors > 0:
            print(f"🚨 Falha na verificação final! {errors} componentes ausentes.")
            sys.exit(1)
            
        print("✅ Verificação de integridade concluída com sucesso!")
        
        cur.close()
        conn.close()
        print("Ready to start!")
        
    except Exception as e:
        print(f"❌ Database Error during update/verify: {e}")
        sys.exit(1)

if __name__ == "__main__":
    update_schema()

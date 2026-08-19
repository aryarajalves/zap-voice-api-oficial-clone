"""
setup_postgres_listen_notify.py
Script para configurar triggers e canais de LISTEN / NOTIFY (Fase 6 do Roadmap PostgreSQL)
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL
from core.logger import setup_logger

logger = setup_logger("Migration.Realtime")

def run_migration():
    if not SQLALCHEMY_DATABASE_URL:
        logger.error("❌ DATABASE_URL não configurada.")
        return

    logger.info("🚀 Configurando Triggers de Realtime (LISTEN / NOTIFY)...")
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    with engine.connect() as conn:
        dialect = engine.dialect.name
        if dialect == "postgresql":
            # 1. Função PL/pgSQL
            conn.execute(text("""
            CREATE OR REPLACE FUNCTION notify_zapvoice_event() RETURNS trigger AS $$
            DECLARE
                payload JSON;
                v_client_id INT;
            BEGIN
                IF TG_TABLE_NAME = 'chat_messages' THEN
                    SELECT client_id INTO v_client_id FROM chat_conversations WHERE id = NEW.conversation_id;
                    payload = json_build_object(
                        'event_source', 'postgres_trigger',
                        'table', TG_TABLE_NAME,
                        'operation', TG_OP,
                        'id', NEW.id,
                        'conversation_id', NEW.conversation_id,
                        'client_id', v_client_id
                    );
                ELSE
                    payload = json_build_object(
                        'event_source', 'postgres_trigger',
                        'table', TG_TABLE_NAME,
                        'operation', TG_OP,
                        'id', NEW.id,
                        'client_id', NEW.client_id
                    );
                END IF;
                PERFORM pg_notify('zapvoice_realtime_events', payload::text);
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            """))

            # 2. Triggers
            conn.execute(text("""
            DROP TRIGGER IF EXISTS trg_realtime_webhook_leads ON webhook_leads;
            CREATE TRIGGER trg_realtime_webhook_leads
            AFTER INSERT OR UPDATE ON webhook_leads
            FOR EACH ROW EXECUTE FUNCTION notify_zapvoice_event();
            """))

            conn.execute(text("""
            DROP TRIGGER IF EXISTS trg_realtime_chat_messages ON chat_messages;
            CREATE TRIGGER trg_realtime_chat_messages
            AFTER INSERT ON chat_messages
            FOR EACH ROW EXECUTE FUNCTION notify_zapvoice_event();
            """))

            conn.execute(text("""
            DROP TRIGGER IF EXISTS trg_realtime_scheduled_triggers ON scheduled_triggers;
            CREATE TRIGGER trg_realtime_scheduled_triggers
            AFTER UPDATE OF status ON scheduled_triggers
            FOR EACH ROW EXECUTE FUNCTION notify_zapvoice_event();
            """))

            conn.commit()
            logger.info("✨ Triggers de LISTEN / NOTIFY configurados com sucesso no PostgreSQL!")
        else:
            logger.info("ℹ️ Dialeto SQLite detectado. Triggers PL/pgSQL ignorados (apenas PostgreSQL).")

if __name__ == "__main__":
    run_migration()

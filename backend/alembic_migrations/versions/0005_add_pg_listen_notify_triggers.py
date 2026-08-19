"""add_pg_listen_notify_triggers

Revision ID: 0005_pg_realtime
Revises: 0004_add_trigram_indexes
Create Date: 2026-08-17 15:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0005_pg_realtime'
down_revision: Union[str, None] = '0004_add_trigram_indexes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Cria função PL/pgSQL para emitir NOTIFY no canal 'zapvoice_realtime_events'
    op.execute("""
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
    """)

    # 2. Cria Trigger em webhook_leads
    op.execute("""
    DROP TRIGGER IF EXISTS trg_realtime_webhook_leads ON webhook_leads;
    CREATE TRIGGER trg_realtime_webhook_leads
    AFTER INSERT OR UPDATE ON webhook_leads
    FOR EACH ROW EXECUTE FUNCTION notify_zapvoice_event();
    """)

    # 3. Cria Trigger em chat_messages
    op.execute("""
    DROP TRIGGER IF EXISTS trg_realtime_chat_messages ON chat_messages;
    CREATE TRIGGER trg_realtime_chat_messages
    AFTER INSERT ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION notify_zapvoice_event();
    """)

    # 4. Cria Trigger em scheduled_triggers
    op.execute("""
    DROP TRIGGER IF EXISTS trg_realtime_scheduled_triggers ON scheduled_triggers;
    CREATE TRIGGER trg_realtime_scheduled_triggers
    AFTER UPDATE OF status ON scheduled_triggers
    FOR EACH ROW EXECUTE FUNCTION notify_zapvoice_event();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_realtime_webhook_leads ON webhook_leads;")
    op.execute("DROP TRIGGER IF EXISTS trg_realtime_chat_messages ON chat_messages;")
    op.execute("DROP TRIGGER IF EXISTS trg_realtime_scheduled_triggers ON scheduled_triggers;")
    op.execute("DROP FUNCTION IF EXISTS notify_zapvoice_event();")

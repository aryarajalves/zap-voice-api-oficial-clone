"""migrate_json_to_jsonb

Revision ID: 0008_migrate_jsonb
Revises: 0007_high_traffic_indexes
Create Date: 2026-08-19 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0008_migrate_jsonb'
down_revision: Union[str, None] = '0007_high_traffic_indexes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

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


def upgrade() -> None:
    conn = op.get_bind()
    for table_name, col_name in COLUMNS_TO_JSONB:
        conn.execute(sa.text(f"""
            ALTER TABLE {table_name} 
            ALTER COLUMN {col_name} TYPE jsonb 
            USING {col_name}::jsonb;
        """))

    # Criação de índices GIN em colunas JSONB de alta consulta
    conn.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS idx_chat_conversations_labels_gin 
        ON chat_conversations USING gin (labels);
    """))
    conn.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS idx_chat_messages_metadata_gin 
        ON chat_messages USING gin (meta_data);
    """))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DROP INDEX IF EXISTS idx_chat_conversations_labels_gin;"))
    conn.execute(sa.text("DROP INDEX IF EXISTS idx_chat_messages_metadata_gin;"))

    for table_name, col_name in COLUMNS_TO_JSONB:
        conn.execute(sa.text(f"""
            ALTER TABLE {table_name} 
            ALTER COLUMN {col_name} TYPE json 
            USING {col_name}::json;
        """))

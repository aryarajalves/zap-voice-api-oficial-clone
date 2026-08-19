"""add_high_traffic_composite_indexes

Revision ID: 0007_high_traffic_indexes
Revises: 0006_add_missing_fk_indexes
Create Date: 2026-08-19 12:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0007_high_traffic_indexes'
down_revision: Union[str, None] = '0006_add_missing_fk_indexes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Lista de índices compostos de alto tráfego
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


def upgrade() -> None:
    conn = op.get_bind()
    for idx_name, table_name, cols_def in COMPOSITE_INDEXES:
        conn.execute(sa.text(f"""
            CREATE INDEX IF NOT EXISTS {idx_name} ON {table_name} {cols_def};
        """))


def downgrade() -> None:
    conn = op.get_bind()
    for idx_name, _, _ in COMPOSITE_INDEXES:
        conn.execute(sa.text(f"""
            DROP INDEX IF EXISTS {idx_name};
        """))

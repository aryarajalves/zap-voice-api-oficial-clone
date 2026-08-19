"""add_missing_fk_indexes

Revision ID: 0006_add_missing_fk_indexes
Revises: 0005_pg_realtime
Create Date: 2026-08-19 12:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0006_add_missing_fk_indexes'
down_revision: Union[str, None] = '0005_pg_realtime'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Lista de índices de Foreign Keys para criar
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


def upgrade() -> None:
    conn = op.get_bind()
    for idx_name, table_name, column_name in FK_INDEXES:
        conn.execute(sa.text(f"""
            CREATE INDEX IF NOT EXISTS {idx_name} ON {table_name} ({column_name});
        """))


def downgrade() -> None:
    conn = op.get_bind()
    for idx_name, _, _ in FK_INDEXES:
        conn.execute(sa.text(f"""
            DROP INDEX IF EXISTS {idx_name};
        """))

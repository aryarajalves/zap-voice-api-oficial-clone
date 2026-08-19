"""add_high_performance_composite_indexes

Revision ID: 0002_add_high_performance_composite_indexes
Revises: 0001_initial_baseline
Create Date: 2026-08-17 15:23:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0002_perf_indexes'
down_revision: Union[str, None] = '0001_initial_baseline'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. scheduled_triggers
    op.execute("CREATE INDEX IF NOT EXISTS ix_scheduled_triggers_client_status_time ON scheduled_triggers (client_id, status, scheduled_time);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_scheduled_triggers_client_created ON scheduled_triggers (client_id, created_at);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_scheduled_triggers_client_is_bulk ON scheduled_triggers (client_id, is_bulk);")

    # 2. webhook_leads
    op.execute("CREATE INDEX IF NOT EXISTS ix_webhook_leads_client_phone ON webhook_leads (client_id, phone);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_webhook_leads_project_phone ON webhook_leads (project_id, phone);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_webhook_leads_client_last_event_at ON webhook_leads (client_id, last_event_at);")

    # 3. webhook_integrations
    op.execute("CREATE INDEX IF NOT EXISTS ix_webhook_integrations_client_status ON webhook_integrations (client_id, status);")

    # 4. webhook_history
    op.execute("CREATE INDEX IF NOT EXISTS ix_webhook_history_integration_created ON webhook_history (integration_id, created_at);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_webhook_history_integration_status ON webhook_history (integration_id, status);")

    # 5. webhook_events
    op.execute("CREATE INDEX IF NOT EXISTS ix_webhook_events_webhook_status ON webhook_events (webhook_id, status);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_webhook_events_webhook_external ON webhook_events (webhook_id, external_id);")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_scheduled_triggers_client_status_time;")
    op.execute("DROP INDEX IF EXISTS ix_scheduled_triggers_client_created;")
    op.execute("DROP INDEX IF EXISTS ix_scheduled_triggers_client_is_bulk;")
    op.execute("DROP INDEX IF EXISTS ix_webhook_leads_client_phone;")
    op.execute("DROP INDEX IF EXISTS ix_webhook_leads_project_phone;")
    op.execute("DROP INDEX IF EXISTS ix_webhook_leads_client_last_event_at;")
    op.execute("DROP INDEX IF EXISTS ix_webhook_integrations_client_status;")
    op.execute("DROP INDEX IF EXISTS ix_webhook_history_integration_created;")
    op.execute("DROP INDEX IF EXISTS ix_webhook_history_integration_status;")
    op.execute("DROP INDEX IF EXISTS ix_webhook_events_webhook_status;")
    op.execute("DROP INDEX IF EXISTS ix_webhook_events_webhook_external;")

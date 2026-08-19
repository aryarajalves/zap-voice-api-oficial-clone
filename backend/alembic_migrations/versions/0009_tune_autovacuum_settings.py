"""tune_autovacuum_settings

Revision ID: 0009_tune_autovacuum
Revises: 0008_migrate_jsonb
Create Date: 2026-08-19 13:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0009_tune_autovacuum'
down_revision: Union[str, None] = '0008_migrate_jsonb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TARGET_TABLES = [
    "message_status",
    "webhook_events",
    "chat_messages",
    "scheduled_triggers",
    "contact_windows",
    "waba_payment_checks",
]


def upgrade() -> None:
    conn = op.get_bind()
    for table_name in TARGET_TABLES:
        conn.execute(sa.text(f"""
            ALTER TABLE {table_name} SET (
                autovacuum_vacuum_scale_factor = 0.05,
                autovacuum_vacuum_threshold = 50,
                autovacuum_analyze_scale_factor = 0.02,
                autovacuum_analyze_threshold = 25
            );
        """))


def downgrade() -> None:
    conn = op.get_bind()
    for table_name in TARGET_TABLES:
        conn.execute(sa.text(f"""
            ALTER TABLE {table_name} RESET (
                autovacuum_vacuum_scale_factor,
                autovacuum_vacuum_threshold,
                autovacuum_analyze_scale_factor,
                autovacuum_analyze_threshold
            );
        """))

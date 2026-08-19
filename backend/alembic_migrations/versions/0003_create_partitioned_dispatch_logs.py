"""create_partitioned_dispatch_logs

Revision ID: 0003_create_partitioned_dispatch_logs
Revises: 0002_add_high_performance_composite_indexes
Create Date: 2026-08-17 15:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0003_dispatch_logs'
down_revision: Union[str, None] = '0002_perf_indexes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Cria tabela mestre particionada por RANGE em created_at (PostgreSQL)
    op.execute("""
    CREATE TABLE IF NOT EXISTS dispatch_logs (
        id BIGSERIAL,
        client_id INTEGER NOT NULL,
        trigger_id INTEGER,
        channel VARCHAR(50) NOT NULL DEFAULT 'whatsapp_official',
        recipient VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'sent',
        response_payload JSONB DEFAULT '{}'::jsonb,
        error_message TEXT,
        cost FLOAT DEFAULT 0.0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id, created_at)
    ) PARTITION BY RANGE (created_at);
    """)

    # 2. Cria partições mensais dedicadas
    op.execute("""
    CREATE TABLE IF NOT EXISTS dispatch_logs_2026_08 PARTITION OF dispatch_logs
    FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS dispatch_logs_2026_09 PARTITION OF dispatch_logs
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS dispatch_logs_2026_10 PARTITION OF dispatch_logs
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS dispatch_logs_default PARTITION OF dispatch_logs DEFAULT;
    """)

    # 3. Índices na tabela particionada
    op.execute("CREATE INDEX IF NOT EXISTS ix_dispatch_logs_client_created ON dispatch_logs (client_id, created_at);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_dispatch_logs_status_created ON dispatch_logs (status, created_at);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_dispatch_logs_trigger_created ON dispatch_logs (trigger_id, created_at);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS dispatch_logs CASCADE;")

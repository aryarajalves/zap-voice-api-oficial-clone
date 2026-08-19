"""add_trigram_indexes

Revision ID: 0004_add_trigram_indexes
Revises: 0003_dispatch_logs
Create Date: 2026-08-17 15:31:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0004_add_trigram_indexes'
down_revision: Union[str, None] = '0003_dispatch_logs'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Habilita extensão pg_trgm no PostgreSQL
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

    # 2. Índices Trigram GIN em webhook_leads (nome, telefone, email)
    op.execute("CREATE INDEX IF NOT EXISTS trgm_idx_leads_name ON webhook_leads USING gin (name gin_trgm_ops);")
    op.execute("CREATE INDEX IF NOT EXISTS trgm_idx_leads_phone ON webhook_leads USING gin (phone gin_trgm_ops);")
    op.execute("CREATE INDEX IF NOT EXISTS trgm_idx_leads_email ON webhook_leads USING gin (email gin_trgm_ops);")

    # 3. Índices Trigram GIN em chat_messages (conteúdo)
    op.execute("CREATE INDEX IF NOT EXISTS trgm_idx_chat_messages_content ON chat_messages USING gin (content gin_trgm_ops);")

    # 4. Índices Trigram GIN em chat_conversations (nome do contato, telefone)
    op.execute("CREATE INDEX IF NOT EXISTS trgm_idx_chat_conversations_name ON chat_conversations USING gin (contact_name gin_trgm_ops);")
    op.execute("CREATE INDEX IF NOT EXISTS trgm_idx_chat_conversations_phone ON chat_conversations USING gin (phone gin_trgm_ops);")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS trgm_idx_leads_name;")
    op.execute("DROP INDEX IF EXISTS trgm_idx_leads_phone;")
    op.execute("DROP INDEX IF EXISTS trgm_idx_leads_email;")
    op.execute("DROP INDEX IF EXISTS trgm_idx_chat_messages_content;")
    op.execute("DROP INDEX IF EXISTS trgm_idx_chat_conversations_name;")
    op.execute("DROP INDEX IF EXISTS trgm_idx_chat_conversations_phone;")

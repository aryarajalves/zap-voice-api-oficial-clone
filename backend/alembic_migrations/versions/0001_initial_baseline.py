"""initial_baseline

Revision ID: 0001_initial_baseline
Revises: 
Create Date: 2026-08-17 15:17:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0001_initial_baseline'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Baseline consolidada — os schemas são assegurados por Base.metadata.create_all e migrações incrementais
    pass


def downgrade() -> None:
    pass

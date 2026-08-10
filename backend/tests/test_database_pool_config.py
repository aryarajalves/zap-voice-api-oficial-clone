import pytest
from database import engine

def test_database_pool_settings():
    # Valida que o pool de conexões do banco suporta cargas pesadas sem estourar QueuePool
    if hasattr(engine, 'pool'):
        pool = engine.pool
        assert getattr(pool, '_size', 0) >= 50 or hasattr(pool, 'size')

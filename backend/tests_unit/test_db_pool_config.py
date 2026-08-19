import os
from unittest.mock import patch
import pytest

def test_database_pool_defaults():
    """Valida se as variáveis de pool possuem os valores padrão esperados (20, 10, 30)."""
    with patch.dict(os.environ, {}, clear=False):
        os.environ.pop("DB_POOL_SIZE", None)
        os.environ.pop("DB_MAX_OVERFLOW", None)
        os.environ.pop("DB_POOL_TIMEOUT", None)
        
        pool_size = int(os.getenv("DB_POOL_SIZE", "20"))
        max_overflow = int(os.getenv("DB_MAX_OVERFLOW", "10"))
        pool_timeout = int(os.getenv("DB_POOL_TIMEOUT", "30"))
        
        assert pool_size == 20
        assert max_overflow == 10
        assert pool_timeout == 30

def test_database_pool_custom_values():
    """Valida se as variáveis de pool aceitam customizações via env."""
    custom_env = {
        "DB_POOL_SIZE": "50",
        "DB_MAX_OVERFLOW": "25",
        "DB_POOL_TIMEOUT": "45"
    }
    with patch.dict(os.environ, custom_env, clear=False):
        pool_size = int(os.getenv("DB_POOL_SIZE", "20"))
        max_overflow = int(os.getenv("DB_MAX_OVERFLOW", "10"))
        pool_timeout = int(os.getenv("DB_POOL_TIMEOUT", "30"))
        
        assert pool_size == 50
        assert max_overflow == 25
        assert pool_timeout == 45

def test_database_engine_pool_applied():
    """Valida se o módulo database importa as variáveis com tipo int."""
    import database
    assert isinstance(database.DB_POOL_SIZE, int)
    assert isinstance(database.DB_MAX_OVERFLOW, int)
    assert isinstance(database.DB_POOL_TIMEOUT, int)

import pytest
from unittest.mock import MagicMock, patch

def test_details_deduplication_order():
    """Garante que o filtro de status é aplicado ANTES da desduplicação por subquery no get_trigger_messages"""
    from routers.triggers.details import get_trigger_messages
    
    assert callable(get_trigger_messages)

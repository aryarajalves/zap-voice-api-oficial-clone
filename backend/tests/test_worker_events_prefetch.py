import os
import pytest
from core.worker.base import EVENTS_PREFETCH_COUNT

def test_events_prefetch_count_default():
    # Verifica que o padrão do prefetch para whatsapp_events é no mínimo 100
    assert EVENTS_PREFETCH_COUNT >= 100

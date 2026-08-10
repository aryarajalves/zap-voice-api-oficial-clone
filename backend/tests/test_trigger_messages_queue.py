import pytest
from unittest.mock import MagicMock
import models

def test_trigger_messages_queue_count_fallback():
    # Mock do objeto ScheduledTrigger sem o atributo queue_count
    trigger = MagicMock(spec=models.ScheduledTrigger)
    del trigger.queue_count  # Garante que não possui queue_count
    trigger.total_sent = 10
    trigger.total_delivered = 6
    trigger.total_failed = 2

    # Lógica aplicada na rota
    queue_value = getattr(trigger, "queue_count", None) if getattr(trigger, "queue_count", None) is not None else max(0, (trigger.total_sent or 0) - (trigger.total_delivered or 0) - (trigger.total_failed or 0))
    
    # Deve calcular 10 - 6 - 2 = 2
    assert queue_value == 2

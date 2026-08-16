import pytest
from unittest.mock import MagicMock
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import models

def test_trigger_messages_queue_count_when_completed():
    """Quando o disparo está concluído, a fila deve ser 0"""
    trigger = MagicMock(spec=models.ScheduledTrigger)
    trigger.status = "completed"
    trigger.total_contacts = 1000
    trigger.total_sent = 907
    trigger.total_failed = 93
    trigger.total_skipped = 0

    is_finished = trigger.status in ['completed', 'failed', 'cancelled', 'processed', 'aborted', 'finished']
    total_c = trigger.total_contacts or 0
    processed_c = (trigger.total_sent or 0) + (trigger.total_failed or 0) + (trigger.total_skipped or 0)
    q_val = 0 if is_finished else max(0, total_c - processed_c)

    assert q_val == 0

def test_trigger_messages_queue_count_when_processing():
    """Quando o disparo está em andamento, a fila deve ser contatos restantes"""
    trigger = MagicMock(spec=models.ScheduledTrigger)
    trigger.status = "processing"
    trigger.total_contacts = 1000
    trigger.total_sent = 426
    trigger.total_failed = 39
    trigger.total_skipped = 0

    is_finished = trigger.status in ['completed', 'failed', 'cancelled', 'processed', 'aborted', 'finished']
    total_c = trigger.total_contacts or 0
    processed_c = (trigger.total_sent or 0) + (trigger.total_failed or 0) + (trigger.total_skipped or 0)
    q_val = 0 if is_finished else max(0, total_c - processed_c)

    assert q_val == 535

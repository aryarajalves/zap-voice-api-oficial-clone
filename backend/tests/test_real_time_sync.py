import sys
import os
from datetime import datetime, timezone
import pytest
from unittest.mock import MagicMock

# Adiciona o diretório backend ao path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock do ambiente para evitar erro de banco de dados no import
os.environ["DATABASE_URL"] = "postgresql://user:pass@localhost:5432/db"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"
os.environ["RABBITMQ_URL"] = "amqp://guest:guest@localhost:5672/"

# Mock rabbitmq_client before engine imports it
from unittest.mock import MagicMock
sys.modules["rabbitmq_client"] = MagicMock()
sys.modules["core.logger"] = MagicMock()
sys.modules["config_loader"] = MagicMock()
sys.modules["database"] = MagicMock()

from services.engine import trigger_to_dict

def test_trigger_to_dict_all_fields():
    # Mock do ScheduledTrigger
    mock_trigger = MagicMock()
    mock_trigger.id = 123
    mock_trigger.client_id = 1
    mock_trigger.integration_id = "550e8400-e29b-41d4-a716-446655440000"
    mock_trigger.funnel_id = 456
    mock_trigger.status = "processing"
    mock_trigger.contact_name = "João Silva"
    mock_trigger.contact_phone = "5511999999999"
    mock_trigger.event_type = "compra_aprovada"
    mock_trigger.template_name = "venda_realizada_v2"
    mock_trigger.product_name = "Curso de IA"
    mock_trigger.is_bulk = False
    mock_trigger.is_interaction = True
    mock_trigger.sent_as = "TEMPLATE"
    mock_trigger.total_sent = 1
    mock_trigger.total_delivered = 0
    mock_trigger.total_read = 0
    mock_trigger.total_failed = 0
    mock_trigger.total_interactions = 0
    mock_trigger.total_blocked = 0
    mock_trigger.total_cost = 0.05
    mock_trigger.total_memory_sent = 0
    mock_trigger.execution_history = [{"node": "start", "time": "now"}]
    mock_trigger.failure_reason = None
    mock_trigger.created_at = datetime(2026, 4, 21, 10, 0, 0, tzinfo=timezone.utc)
    mock_trigger.scheduled_time = datetime(2026, 4, 21, 10, 5, 0, tzinfo=timezone.utc)

    result = trigger_to_dict(mock_trigger)

    assert result["id"] == 123
    assert result["client_id"] == 1
    assert result["integration_id"] == "550e8400-e29b-41d4-a716-446655440000"
    assert result["status"] == "processing"
    assert result["contact_name"] == "João Silva"
    assert result["event_type"] == "compra_aprovada"
    assert result["template_name"] == "venda_realizada_v2"
    assert result["total_sent"] == 1
    assert result["total_cost"] == 0.05
    assert result["is_interaction"] is True
    assert result["created_at"] == "2026-04-21T10:00:00+00:00"
    assert "updated_at" in result
    print("OK: Teste trigger_to_dict passou com todos os campos!")

if __name__ == "__main__":
    test_trigger_to_dict_all_fields()

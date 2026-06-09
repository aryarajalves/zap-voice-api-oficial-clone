import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from unittest.mock import MagicMock, patch

# Mock rabbitmq_client e config_loader antes de outros imports
sys.modules['rabbitmq_client'] = MagicMock()
sys.modules['rabbitmq_client'].rabbitmq = MagicMock()
sys.modules['config_loader'] = MagicMock()

import pytest
from datetime import datetime, timezone, timedelta
import core.engine.nodes.business_hours
# Monkey patch log_node_execution para evitar consultas de banco mockadas complexas
core.engine.nodes.business_hours.log_node_execution = MagicMock()

from core.engine.nodes.business_hours import handle_business_hours_node
from core.engine.utils import BRAZIL_TZ

class MockTrigger:
    def __init__(self):
        self.status = 'pending'
        self.scheduled_time = None
        self.current_node_id = None
        self.client_id = 1
        self.funnel = MagicMock()

class MockDB:
    def __init__(self):
        self.is_committed = False
        
    def commit(self):
        self.is_committed = True
        
    def rollback(self):
        pass

@pytest.mark.asyncio
async def test_business_hours_node_open_period_1():
    db = MockDB()
    trigger = MockTrigger()
    
    # 2026-06-03 10:00:00 (Quarta-feira, 10h - dentro do período 1: 08h às 12h)
    mocked_time = datetime(2026, 6, 3, 10, 0, 0, tzinfo=BRAZIL_TZ)
    
    node = {
        "id": "node-bh-1",
        "type": "businessHoursNode",
        "data": {
            "waitUntilOpen": False,
            "schedule": {
                "2": {
                    "open": True, 
                    "periods": [
                        {"start": "08:00", "end": "12:00"},
                        {"start": "15:00", "end": "20:00"}
                    ]
                }
            }
        }
    }
    edges = [
        {"source": "node-bh-1", "target": "node-open", "sourceHandle": "aberto"}
    ]
    
    with patch("core.engine.nodes.business_hours.datetime") as mock_datetime:
        mock_datetime.now.return_value = mocked_time
        res = await handle_business_hours_node(db, trigger, node, edges, trigger.funnel)
        assert res == "aberto"

@pytest.mark.asyncio
async def test_business_hours_node_open_period_2():
    db = MockDB()
    trigger = MockTrigger()
    
    # 2026-06-03 17:00:00 (Quarta-feira, 17h - dentro do período 2: 15h às 20h)
    mocked_time = datetime(2026, 6, 3, 17, 0, 0, tzinfo=BRAZIL_TZ)
    
    node = {
        "id": "node-bh-2",
        "type": "businessHoursNode",
        "data": {
            "waitUntilOpen": False,
            "schedule": {
                "2": {
                    "open": True, 
                    "periods": [
                        {"start": "08:00", "end": "12:00"},
                        {"start": "15:00", "end": "20:00"}
                    ]
                }
            }
        }
    }
    edges = [
        {"source": "node-bh-2", "target": "node-open", "sourceHandle": "aberto"}
    ]
    
    with patch("core.engine.nodes.business_hours.datetime") as mock_datetime:
        mock_datetime.now.return_value = mocked_time
        res = await handle_business_hours_node(db, trigger, node, edges, trigger.funnel)
        assert res == "aberto"

@pytest.mark.asyncio
async def test_business_hours_node_closed_between_periods():
    db = MockDB()
    trigger = MockTrigger()
    
    # 2026-06-03 13:00:00 (Quarta-feira, 13h - intervalo de almoço entre os períodos)
    mocked_time = datetime(2026, 6, 3, 13, 0, 0, tzinfo=BRAZIL_TZ)
    
    node = {
        "id": "node-bh-3",
        "type": "businessHoursNode",
        "data": {
            "waitUntilOpen": False,
            "schedule": {
                "2": {
                    "open": True, 
                    "periods": [
                        {"start": "08:00", "end": "12:00"},
                        {"start": "15:00", "end": "20:00"}
                    ]
                }
            }
        }
    }
    edges = [
        {"source": "node-bh-3", "target": "node-closed", "sourceHandle": "fechado"}
    ]
    
    with patch("core.engine.nodes.business_hours.datetime") as mock_datetime:
        mock_datetime.now.return_value = mocked_time
        res = await handle_business_hours_node(db, trigger, node, edges, trigger.funnel)
        assert res == "fechado"

@pytest.mark.asyncio
async def test_business_hours_node_wait_next_period_same_day():
    db = MockDB()
    trigger = MockTrigger()
    
    # 2026-06-03 13:00:00 (Quarta-feira, 13h - fechado, espera até abrir às 15h)
    mocked_time = datetime(2026, 6, 3, 13, 0, 0, tzinfo=BRAZIL_TZ)
    
    node = {
        "id": "node-bh-4",
        "type": "businessHoursNode",
        "data": {
            "waitUntilOpen": True,
            "schedule": {
                "2": {
                    "open": True, 
                    "periods": [
                        {"start": "08:00", "end": "12:00"},
                        {"start": "15:00", "end": "20:00"}
                    ]
                }
            }
        }
    }
    edges = [
        {"source": "node-bh-4", "target": "node-open", "sourceHandle": "aberto"}
    ]
    
    with patch("core.engine.nodes.business_hours.datetime") as mock_datetime:
        mock_datetime.now.return_value = mocked_time
        res = await handle_business_hours_node(db, trigger, node, edges, trigger.funnel)
        assert res == "break"
        assert trigger.status == "queued"
        
        # Deve agendar para o próximo período do mesmo dia às 15:00
        expected_dt = datetime(2026, 6, 3, 15, 0, 0, tzinfo=BRAZIL_TZ).astimezone(timezone.utc)
        assert trigger.scheduled_time == expected_dt

@pytest.mark.asyncio
async def test_business_hours_node_legacy_fallback():
    db = MockDB()
    trigger = MockTrigger()
    
    # 2026-06-03 10:00:00 (Quarta-feira, 10h)
    mocked_time = datetime(2026, 6, 3, 10, 0, 0, tzinfo=BRAZIL_TZ)
    
    # Nó configurado com a estrutura legada (start e end)
    node = {
        "id": "node-bh-5",
        "type": "businessHoursNode",
        "data": {
            "waitUntilOpen": False,
            "schedule": {
                "2": {"open": True, "start": "08:00", "end": "18:00"}
            }
        }
    }
    edges = [
        {"source": "node-bh-5", "target": "node-open", "sourceHandle": "aberto"}
    ]
    
    with patch("core.engine.nodes.business_hours.datetime") as mock_datetime:
        mock_datetime.now.return_value = mocked_time
        res = await handle_business_hours_node(db, trigger, node, edges, trigger.funnel)
        assert res == "aberto"

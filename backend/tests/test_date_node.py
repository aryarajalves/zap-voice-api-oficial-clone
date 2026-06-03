import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from unittest.mock import MagicMock

# Mock rabbitmq_client e config_loader antes de outros imports
sys.modules['rabbitmq_client'] = MagicMock()
sys.modules['rabbitmq_client'].rabbitmq = MagicMock()
sys.modules['config_loader'] = MagicMock()

import pytest
from datetime import datetime, timezone, timedelta
import core.engine.nodes.date
# Monkey patch log_node_execution para evitar consultas de banco mockadas complexas
core.engine.nodes.date.log_node_execution = MagicMock()

from core.engine.nodes.date import handle_date_node
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
async def test_date_node_past_date_immediate():
    db = MockDB()
    trigger = MockTrigger()
    
    # Nó configurado para uma data no passado (ex: 2000-01-01)
    node = {
        "id": "node-date-1",
        "type": "dateNode",
        "data": {
            "mode": "date",
            "dateValue": "2000-01-01"
        }
    }
    edges = [{"source": "node-date-1", "target": "node-next", "sourceHandle": "default"}]
    
    res = await handle_date_node(db, trigger, node, edges, trigger.funnel)
    assert res == "default"
    assert trigger.status == 'pending'  # Não pausou o fluxo (continua imediatamente)

@pytest.mark.asyncio
async def test_date_node_future_date_scheduling():
    db = MockDB()
    trigger = MockTrigger()
    
    # Nó configurado para uma data no futuro
    future_date = (datetime.now(BRAZIL_TZ) + timedelta(days=2)).strftime("%Y-%m-%d")
    node = {
        "id": "node-date-2",
        "type": "dateNode",
        "data": {
            "mode": "date",
            "dateValue": future_date
        }
    }
    edges = [{"source": "node-date-2", "target": "node-next", "sourceHandle": "default"}]
    
    res = await handle_date_node(db, trigger, node, edges, trigger.funnel)
    assert res == "stop"  # Pausou a execução
    assert trigger.status == 'queued'
    assert trigger.current_node_id == 'node-next'
    assert trigger.scheduled_time is not None
    assert db.is_committed is True

@pytest.mark.asyncio
async def test_date_node_time_past_today_immediate():
    db = MockDB()
    trigger = MockTrigger()
    
    # Horário de 1 hora atrás
    past_hour = (datetime.now(BRAZIL_TZ) - timedelta(hours=1)).strftime("%H:%M")
    node = {
        "id": "node-date-3",
        "type": "dateNode",
        "data": {
            "mode": "time",
            "timeValue": past_hour
        }
    }
    edges = [{"source": "node-date-3", "target": "node-next", "sourceHandle": "default"}]
    
    res = await handle_date_node(db, trigger, node, edges, trigger.funnel)
    assert res == "default"
    assert trigger.status == 'pending'

@pytest.mark.asyncio
async def test_date_node_time_future_today_scheduling():
    db = MockDB()
    trigger = MockTrigger()
    
    # Horário de 1 hora no futuro
    future_hour = (datetime.now(BRAZIL_TZ) + timedelta(hours=1)).strftime("%H:%M")
    node = {
        "id": "node-date-4",
        "type": "dateNode",
        "data": {
            "mode": "time",
            "timeValue": future_hour
        }
    }
    edges = [{"source": "node-date-4", "target": "node-next", "sourceHandle": "default"}]
    
    res = await handle_date_node(db, trigger, node, edges, trigger.funnel)
    assert res == "stop"
    assert trigger.status == 'queued'
    assert trigger.current_node_id == 'node-next'
    assert db.is_committed is True

@pytest.mark.asyncio
async def test_date_node_late_bypass_within_limit():
    db = MockDB()
    trigger = MockTrigger()
    
    # 1 hora no passado, tolerância de 2 horas (dentro do limite)
    past_datetime = (datetime.now(BRAZIL_TZ) - timedelta(hours=1))
    past_date = past_datetime.strftime("%Y-%m-%d")
    past_time = past_datetime.strftime("%H:%M")
    
    node = {
        "id": "node-date-5",
        "type": "dateNode",
        "data": {
            "mode": "datetime",
            "dateValue": past_date,
            "timeValue": past_time,
            "enableLateBypass": True,
            "maxDelayValue": 2,
            "maxDelayUnit": "hours"
        }
    }
    edges = [
        {"source": "node-date-5", "target": "node-next-default", "sourceHandle": "default"},
        {"source": "node-date-5", "target": "node-next-late", "sourceHandle": "late"}
    ]
    
    res = await handle_date_node(db, trigger, node, edges, trigger.funnel)
    assert res == "default"

@pytest.mark.asyncio
async def test_date_node_late_bypass_outside_limit_connected():
    db = MockDB()
    trigger = MockTrigger()
    
    # 4 horas no passado, tolerância de 3 horas (excedeu limite)
    past_datetime = (datetime.now(BRAZIL_TZ) - timedelta(hours=4))
    past_date = past_datetime.strftime("%Y-%m-%d")
    past_time = past_datetime.strftime("%H:%M")
    
    node = {
        "id": "node-date-6",
        "type": "dateNode",
        "data": {
            "mode": "datetime",
            "dateValue": past_date,
            "timeValue": past_time,
            "enableLateBypass": True,
            "maxDelayValue": 3,
            "maxDelayUnit": "hours"
        }
    }
    edges = [
        {"source": "node-date-6", "target": "node-next-default", "sourceHandle": "default"},
        {"source": "node-date-6", "target": "node-next-late", "sourceHandle": "late"}
    ]
    
    res = await handle_date_node(db, trigger, node, edges, trigger.funnel)
    assert res == "late"

@pytest.mark.asyncio
async def test_date_node_late_bypass_outside_limit_not_connected():
    db = MockDB()
    trigger = MockTrigger()
    
    # 45 minutos no passado, tolerância de 30 minutos (excedeu limite em minutos)
    past_datetime = (datetime.now(BRAZIL_TZ) - timedelta(minutes=45))
    past_date = past_datetime.strftime("%Y-%m-%d")
    past_time = past_datetime.strftime("%H:%M")
    
    node = {
        "id": "node-date-7",
        "type": "dateNode",
        "data": {
            "mode": "datetime",
            "dateValue": past_date,
            "timeValue": past_time,
            "enableLateBypass": True,
            "maxDelayValue": 30,
            "maxDelayUnit": "minutes"
        }
    }
    edges = [
        {"source": "node-date-7", "target": "node-next-default", "sourceHandle": "default"}
        # 'late' não está conectado nas edges
    ]
    
    res = await handle_date_node(db, trigger, node, edges, trigger.funnel)
    assert res == "stop"


@pytest.mark.asyncio
async def test_date_node_time_late_bypass_outside_limit():
    db = MockDB()
    trigger = MockTrigger()
    
    # 15 minutos no passado, tolerância de 5 minutos (excedeu limite no modo time)
    past_datetime = (datetime.now(BRAZIL_TZ) - timedelta(minutes=15))
    past_time = past_datetime.strftime("%H:%M")
    
    node = {
        "id": "node-date-8",
        "type": "dateNode",
        "data": {
            "mode": "time",
            "timeValue": past_time,
            "enableLateBypass": True,
            "maxDelayValue": 5,
            "maxDelayUnit": "minutes"
        }
    }
    edges = [
        {"source": "node-date-8", "target": "node-next-default", "sourceHandle": "default"},
        {"source": "node-date-8", "target": "node-next-late", "sourceHandle": "late"}
    ]
    
    res = await handle_date_node(db, trigger, node, edges, trigger.funnel)
    assert res == "late"



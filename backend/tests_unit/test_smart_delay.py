import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta
from core.engine.utils import BRAZIL_TZ
from core.engine.nodes.delay import handle_delay_node

class MockTrigger:
    def __init__(self):
        self.status = "processing"
        self.scheduled_time = None
        self.current_node_id = "node-delay"

@pytest.mark.asyncio
async def test_smart_delay_no_adjust():
    db = MagicMock()
    trigger = MockTrigger()
    node = {
        "id": "node-delay",
        "data": {
            "time": 10,
            "unit": "seconds",
            "smartHourAdjust": False
        }
    }
    edges = []
    funnel = MagicMock()

    with patch("asyncio.sleep") as mock_sleep, \
         patch("core.engine.nodes.delay.log_node_execution") as mock_log:
        res = await handle_delay_node(db, trigger, node, edges, funnel)
        assert res == "default"
        mock_sleep.assert_called_once_with(10)

@pytest.mark.asyncio
async def test_smart_delay_skip_when_past_limit():
    db = MagicMock()
    trigger = MockTrigger()
    node = {
        "id": "node-delay",
        "data": {
            "time": 60,
            "unit": "minutes",
            "smartHourAdjust": True,
            "limitHour": "18:00",
            "proximityMargin": 30,
            "pastAction": "skip"
        }
    }
    edges = []
    funnel = MagicMock()

    # Mockar a hora atual como 18:30 (já passou do limite de 18:00)
    mock_now = datetime(2026, 5, 29, 18, 30, tzinfo=BRAZIL_TZ)
    
    with patch("core.engine.nodes.delay.datetime") as mock_dt, \
         patch("asyncio.sleep") as mock_sleep, \
         patch("core.engine.nodes.delay.log_node_execution") as mock_log:
        
        mock_dt.now.return_value = mock_now
        
        res = await handle_delay_node(db, trigger, node, edges, funnel)
        assert res == "past"
        # O delay deve ter sido zerado
        mock_sleep.assert_not_called()

@pytest.mark.asyncio
async def test_smart_delay_reduce_when_approaching_limit():
    db = MagicMock()
    trigger = MockTrigger()
    node = {
        "id": "node-delay",
        "data": {
            "time": 2,
            "unit": "hours",
            "smartHourAdjust": True,
            "limitHour": "18:00",
            "proximityMargin": 30,
            "approachAction": "reduce",
            "approachReducedTime": 5,
            "approachReducedUnit": "seconds"
        }
    }
    edges = []
    funnel = MagicMock()

    # Mockar a hora atual como 17:45 (dentro da margem de 30 min de 18:00)
    mock_now = datetime(2026, 5, 29, 17, 45, tzinfo=BRAZIL_TZ)
    
    with patch("core.engine.nodes.delay.datetime") as mock_dt, \
         patch("asyncio.sleep") as mock_sleep, \
         patch("core.engine.nodes.delay.log_node_execution") as mock_log:
        
        mock_dt.now.return_value = mock_now
        
        res = await handle_delay_node(db, trigger, node, edges, funnel)
        assert res == "approach"
        # O delay deve ter sido reduzido de 2 horas para 5 segundos
        mock_sleep.assert_called_once_with(5)

@pytest.mark.asyncio
async def test_smart_delay_postpone_when_past_limit():
    db = MagicMock()
    trigger = MockTrigger()
    node = {
        "id": "node-delay",
        "data": {
            "time": 2,
            "unit": "hours",
            "smartHourAdjust": True,
            "limitHour": "18:00",
            "proximityMargin": 30,
            "pastAction": "postpone",
            "pastPostponeHour": "09:00"
        }
    }
    edges = [
        {"source": "node-delay", "target": "node-next"}
    ]
    funnel = MagicMock()

    # Mockar a hora atual como 19:00 (já passou de 18:00)
    mock_now = datetime(2026, 5, 29, 19, 0, tzinfo=BRAZIL_TZ)
    
    with patch("core.engine.nodes.delay.datetime") as mock_dt, \
         patch("core.engine.nodes.delay.log_node_execution") as mock_log:
        
        mock_dt.now.return_value = mock_now
        
        # Como o postpone vai agendar para amanhã às 09:00, o delay_sec vai ser > 30s,
        # portanto ele deve retornar "stop" e agendar no banco.
        res = await handle_delay_node(db, trigger, node, edges, funnel)
        assert res == "stop"
        assert trigger.status == "queued"
        # scheduled_time deve ser amanha às 09:00 em UTC (que é 12:00 UTC se fuso for -3)
        scheduled_br = trigger.scheduled_time.astimezone(BRAZIL_TZ)
        assert scheduled_br.hour == 9
        assert scheduled_br.minute == 0
        assert scheduled_br.day == 30 # Dia seguinte (29 -> 30)

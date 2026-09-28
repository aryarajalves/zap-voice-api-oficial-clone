import pytest
import zoneinfo
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from core.engine.nodes.condition import handle_condition_node

@pytest.mark.asyncio
async def test_condition_datetime_range_wait_before():
    tz = zoneinfo.ZoneInfo('America/Sao_Paulo')
    now = datetime.now(tz)
    start_dt = now + timedelta(hours=2)
    end_dt = now + timedelta(hours=5)

    node = {
        "id": "cond_range_1",
        "data": {
            "conditionType": "datetime_range",
            "startDateTime": start_dt.strftime("%Y-%m-%dT%H:%M"),
            "endDateTime": end_dt.strftime("%Y-%m-%dT%H:%M"),
            "beforeAction": "wait",
            "betweenAction": "follow",
            "afterAction": "stop"
        }
    }

    edges = [
        {"source": "cond_range_1", "sourceHandle": "between", "target": "msg_during_1"},
        {"source": "cond_range_1", "sourceHandle": "after", "target": "msg_after_1"}
    ]

    mock_db = MagicMock()
    mock_trigger = MagicMock()
    mock_trigger.status = "processing"
    mock_trigger.current_node_id = "cond_range_1"
    mock_trigger.execution_history = []

    res = await handle_condition_node(
        db=mock_db,
        trigger=mock_trigger,
        node=node,
        chatwoot=None,
        contact_phone="5585998259497",
        edges=edges
    )

    assert res == "stop"
    assert mock_trigger.status == "queued"
    assert mock_trigger.current_node_id == "msg_during_1"
    assert mock_db.commit.called

import pytest
from pydantic import ValidationError
from schemas import ScheduledTrigger
from datetime import datetime, timezone

def test_scheduled_trigger_schema_accepts_none_for_is_pinned():
    # Deve aceitar None e converter para False
    data = {
        "id": 1,
        "created_at": datetime.now(timezone.utc),
        "status": "pending",
        "is_pinned": None
    }
    
    trigger = ScheduledTrigger.model_validate(data)
    assert trigger.is_pinned is False

def test_scheduled_trigger_schema_accepts_boolean_for_is_pinned():
    data_true = {
        "id": 2,
        "created_at": datetime.now(timezone.utc),
        "status": "completed",
        "is_pinned": True
    }
    trigger_true = ScheduledTrigger.model_validate(data_true)
    assert trigger_true.is_pinned is True

    data_false = {
        "id": 3,
        "created_at": datetime.now(timezone.utc),
        "status": "failed",
        "is_pinned": False
    }
    trigger_false = ScheduledTrigger.model_validate(data_false)
    assert trigger_false.is_pinned is False

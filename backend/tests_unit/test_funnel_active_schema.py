import pytest
from pydantic import ValidationError
from schemas import Funnel
from datetime import datetime, timezone

def test_funnel_schema_accepts_is_active():
    data = {
        "id": 1,
        "name": "Funil Teste",
        "description": "Descrição do Funil",
        "steps": [],
        "is_active": True,
        "is_archived": False,
        "is_pinned": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    funnel = Funnel.model_validate(data)
    assert funnel.is_active is True

def test_funnel_schema_defaults_is_active_to_true():
    data = {
        "id": 2,
        "name": "Funil Sem Active Explicit",
        "steps": [],
        "is_archived": False,
        "is_pinned": False
    }
    
    funnel = Funnel.model_validate(data)
    assert funnel.is_active is True

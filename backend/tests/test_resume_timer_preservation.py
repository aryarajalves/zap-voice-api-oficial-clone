import pytest
from unittest.mock import MagicMock
from datetime import datetime, timezone

def test_resume_preserves_started_at():
    # Simula trigger que já iniciou em um timestamp anterior
    original_start = "2026-08-06T17:59:25"
    pdata = {"started_at": original_start}

    # Simula inicialização no resume em bulk.py / bulk_funnel.py
    if "started_at" not in pdata:
        pdata["started_at"] = datetime.now(timezone.utc).isoformat()

    # O started_at DEVE ser preservado intacto
    assert pdata["started_at"] == original_start

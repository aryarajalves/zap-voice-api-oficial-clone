import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock
from services.bulk_errors import translate_meta_error
from services.bulk_dispatch_helpers import (
    sanitize_and_deduplicate_contacts,
    check_initial_deadline_expiration,
    extract_contact_vars,
    build_progress_payload,
)
from services.bulk_dynamic_labels import refresh_dynamic_label_contacts


def test_translate_meta_error():
    assert "132015" in translate_meta_error("Error 132015 template paused")
    assert "131049" in translate_meta_error("Erro 131049 healthy ecosystem engagement")
    assert "131026" in translate_meta_error("Message undeliverable 131026")
    assert "(#2)" in translate_meta_error("service temporarily unavailable (#2)")
    assert "(#80007)" in translate_meta_error("rate limit reached, too many requests")
    assert translate_meta_error("Erro customizado") == "Erro customizado"
    assert translate_meta_error("") == ""


def test_sanitize_and_deduplicate_contacts():
    contacts = [
        "5511999990001",
        "5511999990001",  # Duplicado
        {"phone": "5511999990002", "name": "Maria"},
        {"phone": "123"},  # Inválido (<8 dígitos)
        "+55 (11) 99999-0001",  # Duplicado com formatação
        "5511999990003"
    ]
    unique, dup_count, inv_count = sanitize_and_deduplicate_contacts(contacts, trigger_id=99)
    assert len(unique) == 3
    assert dup_count == 2
    assert inv_count == 1


def test_extract_contact_vars():
    c = {
        "name": "Arya",
        "1": "Arya Alves",
        "2": "Plano VIP",
        "components": [
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "Arya Alves"},
                    {"type": "text", "text": "Plano VIP"},
                    {"type": "text", "text": "R$ 197,00"}
                ]
            }
        ]
    }
    vars_extracted = extract_contact_vars(c, "Arya")
    assert vars_extracted["var1"] == "Arya Alves"
    assert vars_extracted["var2"] == "Plano VIP"
    assert vars_extracted["var3"] == "R$ 197,00"
    assert vars_extracted["var4"] == ""


def test_check_initial_deadline_expiration_not_expired():
    init_trig = MagicMock()
    init_trig.max_dispatch_time = datetime.now(timezone.utc) + timedelta(hours=2)
    mock_db = MagicMock()
    is_expired = check_initial_deadline_expiration(init_trig, ["5511999990001"], "tmpl", mock_db, 100)
    assert is_expired is False


def test_check_initial_deadline_expiration_expired():
    init_trig = MagicMock()
    init_trig.max_dispatch_time = datetime.now(timezone.utc) - timedelta(hours=2)
    init_trig.current_node_id = "DELIVERY"
    mock_db = MagicMock()
    is_expired = check_initial_deadline_expiration(init_trig, ["5511999990001"], "tmpl", mock_db, 100)
    assert is_expired is True
    assert init_trig.status == "aborted"
    assert init_trig.total_failed == 1


def test_build_progress_payload():
    mock_trig = MagicMock()
    mock_trig.status = "processing"
    mock_trig.total_sent = 10
    mock_trig.total_failed = 2
    mock_trig.total_delivered = 8
    mock_trig.total_read = 5
    mock_trig.total_interactions = 3
    mock_trig.total_blocked = 1
    mock_trig.total_skipped = 0
    mock_trig.total_cost = 0.55
    mock_trig.total_paid_templates = 10

    payload = build_progress_payload(trigger_id=1, c_id=2, current_trig=mock_trig, total_contacts=20)
    assert payload["trigger_id"] == 1
    assert payload["client_id"] == 2
    assert payload["sent"] == 10
    assert payload["failed"] == 2
    assert payload["queue_count"] == 2
    assert payload["total"] == 20


@pytest.mark.asyncio
async def test_refresh_dynamic_label_contacts_returns_none_if_not_dynamic():
    mock_trig = MagicMock()
    mock_trig.is_dynamic_label = False
    result = await refresh_dynamic_label_contacts(mock_trig)
    assert result is None

import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch
import models
from database import SessionLocal
from main import app
from core.deps import get_db, get_current_user, get_validated_client_id
from services.scheduler.cleanup_tasks import run_stale_triggers_cleanup
from services.bulk import process_bulk_send

mock_user = models.User(id=1, email="test@test.com", client_id=1, is_active=True)

def mock_get_current_user():
    return mock_user

def mock_get_validated_client_id():
    return 1

@pytest.mark.asyncio
async def test_reserve_and_schedule_bulk_with_max_dispatch_time(client, db_session):
    """Testa que os endpoints de reserve e schedule aceitam e persistem max_dispatch_time."""
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_validated_client_id] = mock_get_validated_client_id

    limit_time = (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat()

    try:
        # 1. Teste /api/bulk-send/reserve
        reserve_payload = {
            "template_name": "teste_template",
            "contacts_list": [{"phone": "5511999991111"}],
            "max_dispatch_time": limit_time
        }
        res_reserve = client.post("/api/bulk-send/reserve", json=reserve_payload, headers={"X-Client-Id": "1"})
        assert res_reserve.status_code == 200
        data_reserve = res_reserve.json()
        assert "id" in data_reserve
        
        trig_res = db_session.query(models.ScheduledTrigger).get(data_reserve["id"])
        assert trig_res is not None
        assert trig_res.max_dispatch_time is not None

        # 2. Teste /api/bulk-send/schedule
        schedule_time = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        schedule_payload = {
            "schedule_at": schedule_time,
            "template_name": "teste_template",
            "contacts_list": [{"phone": "5511999992222"}],
            "max_dispatch_time": limit_time
        }
        res_schedule = client.post("/api/bulk-send/schedule", json=schedule_payload, headers={"X-Client-Id": "1"})
        assert res_schedule.status_code == 200
        data_schedule = res_schedule.json()
        assert "id" in data_schedule
        
        trig_sched = db_session.query(models.ScheduledTrigger).get(data_schedule["id"])
        assert trig_sched is not None
        assert trig_sched.max_dispatch_time is not None
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_validated_client_id, None)

@pytest.mark.asyncio
async def test_process_bulk_send_aborts_if_max_dispatch_time_expired(db_session):
    """Testa que se o disparo já iniciar com o max_dispatch_time ultrapassado, aborta imediatamente."""
    past_limit = datetime.now(timezone.utc) - timedelta(minutes=10)
    
    trig = models.ScheduledTrigger(
        client_id=1,
        template_name="template_expirado",
        status="processing",
        is_bulk=True,
        scheduled_time=datetime.now(timezone.utc) - timedelta(hours=1),
        max_dispatch_time=past_limit,
        contacts_list=[{"phone": "5511999993333"}, {"phone": "5511999994444"}],
        total_contacts=2
    )
    db_session.add(trig)
    db_session.commit()
    trig_id = trig.id
    
    contacts = [{"phone": "5511999993333"}, {"phone": "5511999994444"}]
    await process_bulk_send(trig_id, "template_expirado", contacts, delay=1, concurrency=1, db=db_session)
    
    assert trig.status == "aborted"
    assert "Prazo limite de envio já expirado" in (trig.failure_reason or "")
    assert trig.total_failed == 2

@pytest.mark.asyncio
async def test_cleanup_tasks_aborts_stale_queue_messages_after_max_dispatch(db_session):
    """Testa que o reaper aborta mensagens em sent na fila da Meta após o max_dispatch_time do disparo."""
    past_limit = datetime.now(timezone.utc) - timedelta(minutes=5)
    
    trig = models.ScheduledTrigger(
        client_id=1,
        template_name="template_fila",
        status="completed",
        is_bulk=True,
        max_dispatch_time=past_limit
    )
    db_session.add(trig)
    db_session.commit()
    
    # Mensagem presa na fila da Meta (sent há 10 minutos, mas com max_dispatch_time expirado há 5 minutos)
    msg = models.MessageStatus(
        trigger_id=trig.id,
        message_id="msg_queue_test_123",
        phone_number="5511999995555",
        status="sent",
        delivered_counted=False,
        read_counted=False,
        timestamp=datetime.now(timezone.utc) - timedelta(minutes=10)
    )
    db_session.add(msg)
    db_session.commit()
    
    # Executa a limpeza
    await run_stale_triggers_cleanup(db_session=db_session)
    
    db_session.refresh(msg)
    assert msg.status == "failed"
    assert "prazo" in (msg.failure_reason or "").lower() or "limite" in (msg.failure_reason or "").lower()

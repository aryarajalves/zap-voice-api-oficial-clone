import pytest
from unittest.mock import MagicMock
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import models

def test_trigger_messages_queue_count_when_completed():
    """Quando o disparo está concluído, a fila deve ser 0"""
    trigger = MagicMock(spec=models.ScheduledTrigger)
    trigger.status = "completed"
    trigger.total_contacts = 1000
    trigger.total_sent = 907
    trigger.total_failed = 93
    trigger.total_skipped = 0

    is_finished = trigger.status in ['completed', 'failed', 'cancelled', 'processed', 'aborted', 'finished']
    total_c = trigger.total_contacts or 0
    processed_c = (trigger.total_sent or 0) + (trigger.total_failed or 0) + (trigger.total_skipped or 0)
    q_val = 0 if is_finished else max(0, total_c - processed_c)

    assert q_val == 0

def test_trigger_messages_queue_count_when_processing():
    """Quando o disparo está em andamento, a fila deve ser contatos restantes"""
    trigger = MagicMock(spec=models.ScheduledTrigger)
    trigger.status = "processing"
    trigger.total_contacts = 1000
    trigger.total_sent = 426
    trigger.total_failed = 39
    trigger.total_skipped = 0

    is_finished = trigger.status in ['completed', 'failed', 'cancelled', 'processed', 'aborted', 'finished']
    total_c = trigger.total_contacts or 0
    processed_c = (trigger.total_sent or 0) + (trigger.total_failed or 0) + (trigger.total_skipped or 0)
    q_val = 0 if is_finished else max(0, total_c - processed_c)

    assert q_val == 535


@pytest.mark.asyncio
async def test_trigger_messages_failure_fallback_logic(db_session):
    """
    Valida que quando um ScheduledTrigger em massa tem total_failed > 0
    mas os registros de MessageStatus foram apagados do banco, a lógica de busca
    usa o contacts_list como fallback virtual e retorna o contato com status 'failed'.
    """
    from routers.triggers.details import get_trigger_messages

    # Criar cliente e usuário
    client = models.Client(name="Client Fallback Test", is_active=True)
    db_session.add(client)
    db_session.commit()

    user = models.User(
        email="user_fb@test.com",
        hashed_password="hash",
        role="admin",
        client_id=client.id
    )
    db_session.add(user)
    db_session.commit()

    # Trigger com 1 contato falho e SEM nenhum MessageStatus no banco
    contact_phone = "5585998259497"
    trigger = models.ScheduledTrigger(
        client_id=client.id,
        is_bulk=True,
        template_name="teste_02",
        status="completed",
        total_contacts=1,
        total_sent=0,
        total_failed=1,
        failure_reason="Business eligibility payment issue",
        contacts_list=[{"phone": contact_phone, "nome": "Contato Falha"}]
    )
    db_session.add(trigger)
    db_session.commit()

    res = await get_trigger_messages(
        trigger_id=trigger.id,
        skip=0,
        limit=50,
        status_filter="failed",
        client_id=client.id,
        db=db_session,
        current_user=user
    )

    assert res["total"] == 1
    assert len(res["items"]) == 1
    assert res["items"][0]["phone_number"] == contact_phone
    assert res["items"][0]["status"] == "failed"
    assert "Business eligibility payment issue" in res["items"][0]["failure_reason"]

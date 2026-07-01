import pytest
from models import Client, ScheduledTrigger, MessageStatus
from services.triggers_service import reconcile_trigger_stats_logic
from datetime import datetime, timezone

@pytest.mark.asyncio
async def test_reconcile_failure_reason_sync(db_session):
    # 1. Criar cliente
    client = Client(name="ReconcileFailClient")
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)

    # 2. Criar trigger com status completed (simulando que processou com sucesso)
    trigger = ScheduledTrigger(
        client_id=client.id,
        status="completed",
        scheduled_time=datetime.now(timezone.utc)
    )
    db_session.add(trigger)
    db_session.commit()
    db_session.refresh(trigger)

    # 3. Criar status de mensagem com falha
    msg = MessageStatus(
        trigger_id=trigger.id,
        message_id="wamid_fail_test",
        phone_number="5585996123586",
        status="failed",
        failure_reason="Erro Meta 131026: Message undeliverable",
        timestamp=datetime.now(timezone.utc)
    )
    db_session.add(msg)
    db_session.commit()

    # 4. Executar reconciliação de estatísticas
    await reconcile_trigger_stats_logic(trigger.id, client.id, db_session)
    db_session.refresh(trigger)

    # 5. Assert: a razão da falha deve ter sido copiada para o trigger e total_failed deve ser 1
    assert trigger.total_failed == 1
    assert trigger.failure_reason == "Erro Meta 131026: Message undeliverable"

    # Cleanup
    db_session.delete(msg)
    db_session.delete(trigger)
    db_session.delete(client)
    db_session.commit()

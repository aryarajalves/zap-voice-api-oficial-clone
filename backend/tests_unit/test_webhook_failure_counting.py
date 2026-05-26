import pytest
from sqlalchemy.orm import Session
import models
from worker import handle_whatsapp_event
from services.bulk import process_bulk_funnel
from datetime import datetime, timezone
import uuid
import asyncio
from unittest.mock import patch, MagicMock

@pytest.mark.asyncio
async def test_whatsapp_status_update_failed_increments_total_failed_and_extracts_reason(db_session):
    orig_execute = db_session.execute
    def mock_execute(statement, params=None, *args, **kwargs):
        if "pg_advisory_xact_lock" in str(statement):
            from unittest.mock import MagicMock
            return MagicMock()
        return orig_execute(statement, params, *args, **kwargs)
    db_session.execute = mock_execute

    with patch("core.worker.handlers.whatsapp.SessionLocal", return_value=db_session):
        # 1. Criar trigger e mensagem
        trigger = models.ScheduledTrigger(
            client_id=1,
            template_name="Test Template Failure",
            status="active",
            total_failed=0
        )
        db_session.add(trigger)
        db_session.commit()
        db_session.refresh(trigger)

        msg_id = f"test_{uuid.uuid4()}"
        message = models.MessageStatus(
            trigger_id=trigger.id,
            message_id=msg_id,
            phone_number="5511999999999",
            status="sent"
        )
        db_session.add(message)
        db_session.commit()

        # 2. Simular evento 'failed' da Meta com erro
        failed_event = {
            "entry": [{
                "changes": [{
                    "value": {
                        "statuses": [{
                            "id": f"wamid.{msg_id}",
                            "status": "failed",
                            "recipient_id": "5511999999999",
                            "errors": [{
                                "code": 131026,
                                "title": "Message undeliverable",
                                "message": "Message undeliverable"
                            }]
                        }]
                    }
                }]
            }]
        }
        
        await handle_whatsapp_event(failed_event)
        db_session.commit()

        # 3. Validar se atualizou status, extraiu erro e incrementou total_failed
        message = db_session.query(models.MessageStatus).filter_by(message_id=msg_id).first()
        trigger = db_session.query(models.ScheduledTrigger).filter_by(id=trigger.id).first()

        assert message.status == "failed"
        assert message.failure_reason == "Erro Meta 131026: Message undeliverable"
        assert trigger.total_failed == 1

        # 4. Validar Idempotência (receber mesmo evento novamente não deve incrementar total_failed)
        await handle_whatsapp_event(failed_event)
        db_session.commit()
        
        trigger = db_session.query(models.ScheduledTrigger).filter_by(id=trigger.id).first()
        assert trigger.total_failed == 1


@pytest.mark.asyncio
async def test_process_bulk_funnel_increments_total_failed_in_loop(db_session):
    client = db_session.query(models.Client).first()
    if not client:
        client = models.Client(name="Test Client Failure Counting")
        db_session.add(client)
        db_session.commit()
        db_session.refresh(client)

    funnel = models.Funnel(
        client_id=client.id,
        name="Temp Funnel for Test",
        steps={"nodes": [], "edges": []}
    )
    db_session.add(funnel)
    db_session.commit()
    db_session.refresh(funnel)

    # Criar trigger de bulk
    trigger = models.ScheduledTrigger(
        client_id=client.id,
        is_bulk=True,
        funnel_id=funnel.id,
        status="pending",
        total_failed=0
    )
    db_session.add(trigger)
    db_session.commit()
    db_session.refresh(trigger)

    trigger_id = trigger.id
    funnel_id = funnel.id
    contacts = [{"phone": "5511999999999", "name": "Contato Falho"}]

    # Mock execute_funnel para levantar exceção (causar falha no loop)
    with patch("services.bulk.execute_funnel", side_effect=Exception("Simulated Loop Crash")):
        with patch("services.bulk.SessionLocal", return_value=db_session):
            await process_bulk_funnel(trigger_id, funnel_id, contacts, 0, 1)

    db_session.commit()

    # O total_failed deve ter sido incrementado em tempo real no loop para 1
    trigger_db = db_session.query(models.ScheduledTrigger).filter_by(id=trigger_id).first()
    assert trigger_db.total_failed == 1

    # Cleanup
    fail_record = db_session.query(models.MessageStatus).filter_by(trigger_id=trigger_id, status='failed').first()
    if fail_record:
        db_session.delete(fail_record)
        
    trigger_db = db_session.query(models.ScheduledTrigger).filter_by(id=trigger_id).first()
    if trigger_db:
        db_session.delete(trigger_db)
        
    funnel_db = db_session.query(models.Funnel).filter_by(id=funnel_id).first()
    if funnel_db:
        db_session.delete(funnel_db)
        
    db_session.commit()

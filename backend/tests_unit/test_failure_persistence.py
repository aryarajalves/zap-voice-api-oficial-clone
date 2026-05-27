import pytest
from sqlalchemy.orm import Session
import models
from services.bulk import process_bulk_send, process_bulk_funnel
from unittest.mock import MagicMock, patch


class NoCloseSession:
    """Wrapper que delega tudo ao db_session mas ignora close(), 
    evitando que o process_bulk_send feche a sessão do teste."""
    def __init__(self, session):
        self._session = session

    def __getattr__(self, name):
        return getattr(self._session, name)

    def close(self):
        # Ignora o close para manter a sessão de teste ativa
        pass


def make_session_factory(db_session):
    """Retorna um callable que sempre devolve um NoCloseSession wrapper."""
    def factory(*args, **kwargs):
        return NoCloseSession(db_session)
    return factory


@pytest.mark.asyncio
async def test_failure_reporting_persistence(db_session):
    client = db_session.query(models.Client).first()
    if not client:
        client = models.Client(name="Test Client Failure Persistence")
        db_session.add(client)
        db_session.commit()
        db_session.refresh(client)
    
    # 1. Test process_bulk_send failure recording
    trigger = models.ScheduledTrigger(
        client_id=client.id,
        is_bulk=True,
        template_name="test_template",
        status="pending"
    )
    db_session.add(trigger)
    db_session.commit()
    db_session.refresh(trigger)
    trigger_id = trigger.id
    
    contacts = [{"phone": "5511999999999", "name": "Test Contact"}]
    
    # Mock send_smart_message to fail with error string
    with patch("services.bulk.send_smart_message", return_value={"error": "Meta API Error 400", "success": False}):
        with patch("services.bulk.SessionLocal", side_effect=make_session_factory(db_session)):
            await process_bulk_send(trigger_id, "test_template", contacts, 0, 1)
        
    trigger = db_session.query(models.ScheduledTrigger).filter_by(id=trigger_id).first()
    assert trigger.total_failed == 1
    
    # Check if MessageStatus failure was recorded with string error
    fail_record = db_session.query(models.MessageStatus).filter_by(trigger_id=trigger_id, status='failed').first()
    assert fail_record is not None
    assert "Meta API Error 400" in fail_record.failure_reason
    db_session.delete(fail_record)
    db_session.commit()

    # Reset trigger for second test
    trigger.total_failed = 0
    trigger.processed_contacts = []
    trigger.pending_contacts = []
    db_session.commit()

    # Mock send_smart_message to fail with error=True and detail="Meta API Error 400"
    with patch("services.bulk.send_smart_message", return_value={"error": True, "detail": "Meta API Error 400", "success": False}):
        with patch("services.bulk.SessionLocal", side_effect=make_session_factory(db_session)):
            await process_bulk_send(trigger_id, "test_template", contacts, 0, 1)

    trigger = db_session.query(models.ScheduledTrigger).filter_by(id=trigger_id).first()
    assert trigger.total_failed == 1

    # Check if MessageStatus failure was recorded with the detail string instead of boolean true
    fail_record = db_session.query(models.MessageStatus).filter_by(trigger_id=trigger_id, status='failed').first()
    assert fail_record is not None
    assert fail_record.failure_reason == "Meta API Error 400"
    db_session.delete(fail_record)
    db_session.commit()
    
    # 2. Test process_bulk_funnel failure recording
    funnel = db_session.query(models.Funnel).first()
    if not funnel:
        funnel = models.Funnel(
            client_id=client.id,
            name="Temp Funnel for Test",
            steps={"nodes": [], "edges": []}
        )
        db_session.add(funnel)
        db_session.commit()
        db_session.refresh(funnel)

    trigger_f = models.ScheduledTrigger(
        client_id=client.id,
        is_bulk=True,
        funnel_id=funnel.id,
        status="pending"
    )
    db_session.add(trigger_f)
    db_session.commit()
    db_session.refresh(trigger_f)
    trigger_f_id = trigger_f.id
    
    # Mock execute_funnel to raise exception
    with patch("services.bulk.execute_funnel", side_effect=Exception("Funnel Engine Crash")):
        with patch("services.bulk.SessionLocal", side_effect=make_session_factory(db_session)):
            await process_bulk_funnel(trigger_f_id, funnel.id, contacts, 0, 1)
        
    trigger_f = db_session.query(models.ScheduledTrigger).filter_by(id=trigger_f_id).first()
    assert trigger_f.total_failed == 1
    
    fail_record_f = db_session.query(models.MessageStatus).filter_by(trigger_id=trigger_f_id, status='failed').first()
    assert fail_record_f is not None
    assert "Funnel Engine Crash" in fail_record_f.failure_reason

    # Cleanup
    db_session.delete(fail_record_f)
    if trigger_f:
        db_session.delete(trigger_f)
    trigger = db_session.query(models.ScheduledTrigger).filter_by(id=trigger_id).first()
    if trigger:
        db_session.delete(trigger)
    db_session.commit()

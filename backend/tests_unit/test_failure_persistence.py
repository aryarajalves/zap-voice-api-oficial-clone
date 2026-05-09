from database import SessionLocal
import models
from services.bulk import process_bulk_send, process_bulk_funnel
from unittest.mock import MagicMock, patch

async def test_failure_reporting_persistence():
    db = SessionLocal()
    client = db.query(models.Client).first()
    
    # 1. Test process_bulk_send failure recording
    trigger = models.ScheduledTrigger(
        client_id=client.id,
        is_bulk=True,
        template_name="test_template",
        status="pending"
    )
    db.add(trigger)
    db.commit()
    db.refresh(trigger)
    
    contacts = [{"phone": "5511999999999", "name": "Test Contact"}]
    
    # Mock send_smart_message to fail
    with patch("services.bulk.send_smart_message", return_value={"error": "Meta API Error 400", "success": False}):
        await process_bulk_send(trigger.id, "test_template", contacts, 0, 1)
        
    db.refresh(trigger)
    assert trigger.total_failed == 1
    
    # Check if MessageStatus failure was recorded
    fail_record = db.query(models.MessageStatus).filter_by(trigger_id=trigger.id, status='failed').first()
    assert fail_record is not None
    assert "Meta API Error" in fail_record.failure_reason
    
    # 2. Test process_bulk_funnel failure recording
    funnel = db.query(models.Funnel).first()
    if not funnel:
        print("⚠️ Pulando teste de funil: Nenhum funil encontrado no banco.")
    else:
        trigger_f = models.ScheduledTrigger(
            client_id=client.id,
            is_bulk=True,
            funnel_id=funnel.id,
            status="pending"
        )
        db.add(trigger_f)
        db.commit()
        db.refresh(trigger_f)
        
        # Mock execute_funnel to raise exception
        with patch("services.bulk.execute_funnel", side_effect=Exception("Funnel Engine Crash")):
            await process_bulk_funnel(trigger_f.id, funnel.id, contacts, 0, 1)
            
        db.refresh(trigger_f)
        assert trigger_f.total_failed == 1
        
        fail_record_f = db.query(models.MessageStatus).filter_by(trigger_id=trigger_f.id, status='failed').first()
        assert fail_record_f is not None
        assert "Funnel Engine Crash" in fail_record_f.failure_reason
        db.delete(fail_record_f)
        db.delete(trigger_f)

    # Cleanup
    db.delete(fail_record)
    db.delete(fail_record_f)
    db.delete(trigger)
    db.delete(trigger_f)
    db.commit()
    db.close()
    print("✅ Teste de persistência de falhas concluído com sucesso!")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_failure_reporting_persistence())

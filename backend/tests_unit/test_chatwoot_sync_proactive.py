import asyncio
import os
import sys
from datetime import datetime, timezone
from unittest.mock import MagicMock, AsyncMock, patch

# Adiciona o diretório atual ao path para importar corretamente
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models
from core.engine.nodes.message import handle_message_node
from core.engine.executor import execute_funnel

def get_or_create_client(db):
    client = db.query(models.Client).first()
    created = False
    if not client:
        client = models.Client(
            name="Client Test Auto",
            is_active=True
        )
        db.add(client)
        db.commit()
        db.refresh(client)
        created = True
    return client, created

async def test_proactive_chatwoot_sync():
    print("--- 🔍 Testing Proactive Chatwoot Sync ---")
    db = SessionLocal()
    
    client, created_client = get_or_create_client(db)
    client_id = client.id
    
    # Create a mock funnel in DB
    funnel = models.Funnel(
        client_id=client_id,
        name="Test Proactive Funnel",
        steps={"nodes": [], "edges": []}
    )
    db.add(funnel)
    db.commit()
    db.refresh(funnel)
    
    # 1. Setup a test trigger
    trigger = models.ScheduledTrigger(
        client_id=client_id,
        funnel_id=funnel.id,
        contact_phone="5511999999999",
        contact_name="Test User",
        status="processing",
        conversation_id=None # Simulates cold webhook execution (no existing Chatwoot convo ID)
    )
    db.add(trigger)
    db.commit()
    db.refresh(trigger)
    
    node = {
        "id": "node_test_message",
        "data": {
            "content": "Olá, esta é uma mensagem de teste para o funil!",
            "onlyBusinessHours": False
        }
    }
    
    # Mock the ChatwootClient
    chatwoot_mock = MagicMock()
    
    # Mock send_text_official to succeed
    chatwoot_mock.send_text_official = AsyncMock(return_value={
        "messages": [{"id": "wamid.test_msg_id"}]
    })
    
    # Mock ensure_conversation to return a conversation_id
    chatwoot_mock.ensure_conversation = AsyncMock(return_value={
        "conversation_id": 9999,
        "id": 9999
    })
    
    # Mock send_message to succeed
    chatwoot_mock.send_message = AsyncMock(return_value={
        "id": 8888
    })
    
    apply_vars_func = lambda x: x
    
    try:
        # 2. Run handle_message_node
        res = await handle_message_node(
            db=db,
            trigger=trigger,
            node=node,
            chatwoot=chatwoot_mock,
            conversation_id=None,
            contact_phone="5511999999999",
            apply_vars_func=apply_vars_func,
            funnel=funnel
        )
        
        # 3. VERIFICATIONS:
        db.refresh(trigger)
        
        # 3.1. send_text_official should have been called (direct Meta send)
        chatwoot_mock.send_text_official.assert_called_once_with("5511999999999", "Olá, esta é uma mensagem de teste para o funil!")
        
        # 3.2. ensure_conversation should have been called to pro-actively create/resolve the convo
        chatwoot_mock.ensure_conversation.assert_called_once()
        
        # 3.3. send_message should have been called to post a copy of the message to Chatwoot
        chatwoot_mock.send_message.assert_called_once_with(9999, "Olá, esta é uma mensagem de teste para o funil!")
        
        # 3.4. trigger.conversation_id should have been updated to 9999 in the database!
        assert trigger.conversation_id == 9999
        
        print("✅ SUCCESS: Proactive Chatwoot Sync tested & verified perfectly!")
        
    finally:
        # Cleanup
        db.delete(trigger)
        db.delete(funnel)
        if created_client:
            db.delete(client)
        db.commit()
        db.close()

async def test_execute_funnel_recovery():
    print("--- 🔍 Testing execute_funnel Fallback Recovery ---")
    db = SessionLocal()
    
    client, created_client = get_or_create_client(db)
    client_id = client.id
    
    # Create the funnel first
    funnel = models.Funnel(
        client_id=client_id,
        name="Test Recovery Funnel",
        steps={"nodes": [], "edges": []}
    )
    db.add(funnel)
    db.commit()
    db.refresh(funnel)
    
    # 1. Setup a test trigger with no conversation_id, referring to the valid funnel
    trigger = models.ScheduledTrigger(
        client_id=client_id,
        funnel_id=funnel.id,
        contact_phone="5511999999999",
        contact_name="Test User",
        status="processing",
        conversation_id=None
    )
    db.add(trigger)
    
    # 2. Setup ContactWindow with a conversation_id
    window = models.ContactWindow(
        client_id=client_id,
        phone="5511999999999",
        chatwoot_conversation_id=7777,
        last_interaction_at=datetime.now(timezone.utc)
    )
    db.add(window)
    db.commit()
    
    try:
        # We patch execute_graph_funnel and execute_legacy_funnel so we don't run the actual funnel graph logic
        with patch("core.engine.executor.execute_graph_funnel", new_callable=AsyncMock) as mock_graph, \
             patch("core.engine.executor.execute_legacy_funnel", new_callable=AsyncMock) as mock_legacy, \
             patch("core.engine.executor.ChatwootClient") as mock_client:
            
            # Setup mock client
            mock_client_inst = mock_client.return_value
            mock_client_inst.add_label_to_conversation = AsyncMock()
            
            # Run orchestrator
            await execute_funnel(
                funnel_id=funnel.id,
                conversation_id=None,
                trigger_id=trigger.id,
                contact_phone="5511999999999",
                db=db
            )
            
            # Verify database record updated
            db.refresh(trigger)
            
            # trigger.conversation_id should have been recovered from ContactWindow!
            assert trigger.conversation_id == 7777
            print("✅ SUCCESS: execute_funnel conversation recovery tested & verified perfectly!")
            
    finally:
        # Cleanup
        db.delete(trigger)
        db.delete(window)
        try:
            db.delete(funnel)
        except: pass
        if created_client:
            db.delete(client)
        db.commit()
        db.close()

async def run_all():
    await test_proactive_chatwoot_sync()
    await test_execute_funnel_recovery()

if __name__ == "__main__":
    asyncio.run(run_all())

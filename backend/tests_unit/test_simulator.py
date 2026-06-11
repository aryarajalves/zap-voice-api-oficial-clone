import asyncio
import os
import json
from unittest.mock import MagicMock, AsyncMock, patch
import pytest
from database import SessionLocal
import models

def get_or_create_client(db):
    client = db.query(models.Client).first()
    created = False
    if not client:
        client = models.Client(
            name="Client Test Simulator Auto",
            is_active=True
        )
        db.add(client)
        db.commit()
        db.refresh(client)
        created = True
    return client, created

@pytest.mark.asyncio
async def test_simulate_funnel_interaction_button(db_session):
    print("--- 🔍 Testing Simulated Interaction on Suspended Trigger ---")
    db = db_session
    
    # Setup mocks
    db.close = MagicMock()
    
    client, created_client = get_or_create_client(db)
    client_id = client.id
    
    funnel_steps = {
        "nodes": [
            {
                "id": "node_msg",
                "type": "messageNode",
                "data": {"buttons": ["Sim", "Não"], "content": "Deseja prosseguir?"}
            }
        ],
        "edges": []
    }
    
    funnel = models.Funnel(
        client_id=client_id,
        name="Simulator Test Funnel",
        steps=funnel_steps,
        is_active=True
    )
    db.add(funnel)
    db.commit()
    db.refresh(funnel)
    
    trigger = models.ScheduledTrigger(
        client_id=client_id,
        funnel_id=funnel.id,
        contact_phone="5511999990001",
        contact_name="Simulado Contato Teste",
        status="suspended",
        current_node_id="node_msg"
    )
    db.add(trigger)
    db.commit()
    db.refresh(trigger)
    
    try:
        from core.engine.simulator import simulate_funnel_interaction
        
        with patch('core.engine.simulator.rabbitmq', new_callable=AsyncMock) as mock_rabbitmq, \
             patch('core.engine.simulator.SessionLocal', return_value=db), \
             patch('os.getenv', return_value="true"):
            
            # Executar a simulação (curto tempo de espera mockado se possível, ou rodar direto)
            # Para testar sem esperar 2-5 segundos reais no teste unitário, podemos mockar o asyncio.sleep
            with patch('asyncio.sleep', new_callable=AsyncMock) as mock_sleep:
                await simulate_funnel_interaction(trigger.id)
                mock_sleep.assert_called_once()
                
            # Verificar se publicou o evento simulado na fila whatsapp_events
            mock_rabbitmq.publish.assert_called_once()
            called_queue = mock_rabbitmq.publish.call_args[0][0]
            called_payload = mock_rabbitmq.publish.call_args[0][1]
            
            assert called_queue == "whatsapp_events"
            assert "messages" in called_payload["entry"][0]["changes"][0]["value"]
            message = called_payload["entry"][0]["changes"][0]["value"]["messages"][0]
            assert message["type"] == "interactive"
            assert message["interactive"]["button_reply"]["title"] in ["Sim", "Não"]
            assert message["from"] == "5511999990001"
            
            print("✅ SUCCESS: Simulated interaction verified (Click generated and enqueued)!")
            
    finally:
        # Cleanup
        db.delete(trigger)
        db.delete(funnel)
        if created_client:
            db.delete(client)
        db.commit()

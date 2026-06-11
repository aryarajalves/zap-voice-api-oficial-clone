import asyncio
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
import models
from core.engine.graph_executor import execute_graph_funnel

@pytest.mark.asyncio
async def test_execute_graph_funnel_node_failure(db_session):
    print("--- 🔍 Testing Node Failure Logging in Graph Funnel ---")
    db = db_session
    
    # Setup Client
    client = db.query(models.Client).first()
    created_client = False
    if not client:
        client = models.Client(name="Client Test Failure Auto", is_active=True)
        db.add(client)
        db.commit()
        db.refresh(client)
        created_client = True
        
    client_id = client.id
    
    # Criar um funil com nó de mensagem configurado
    funnel_steps = {
        "nodes": [
            {
                "id": "node_to_fail",
                "type": "messageNode",
                "data": {"content": "Esse nó vai falhar"}
            }
        ],
        "edges": []
    }
    
    funnel = models.Funnel(
        client_id=client_id,
        name="Failure Test Funnel",
        steps=funnel_steps,
        is_active=True
    )
    db.add(funnel)
    db.commit()
    db.refresh(funnel)
    
    # Criar ScheduledTrigger para o funil
    trigger = models.ScheduledTrigger(
        client_id=client_id,
        funnel_id=funnel.id,
        contact_phone="5511999990002",
        contact_name="Simulado Contato Falha",
        status="processing",
        current_node_id="node_to_fail"
    )
    db.add(trigger)
    db.commit()
    db.refresh(trigger)
    
    # Mock do ChatwootClient que lança uma exceção ao tentar enviar
    mock_chatwoot = AsyncMock()
    mock_chatwoot.get_best_conversation = AsyncMock(return_value=123)
    mock_chatwoot.is_window_open_strict = AsyncMock(return_value=True)
    # Fazer handle_message_node lançar exceção ao chamar send_message ou levantar erro diretamente
    # Vamos simular que send_message lança exceção
    mock_chatwoot.send_message = AsyncMock(side_effect=Exception("Chatwoot indisponível simulado"))
    
    try:
        # Executar a função
        with patch('core.engine.graph_executor.logger'), \
             patch('core.engine.graph_executor.get_setting', return_value="ZAPVOICE"), \
             patch('core.engine.nodes.message.get_best_conversation', return_value=123), \
             patch('core.engine.nodes.message.is_window_open_strict', return_value=True):
            
            try:
                await execute_graph_funnel(
                    trigger=trigger,
                    graph_data=funnel_steps,
                    chatwoot=mock_chatwoot,
                    conversation_id=123,
                    contact_phone="5511999990002",
                    db=db,
                    apply_vars_func=lambda x: x
                )
            except Exception as e:
                assert "Chatwoot indisponível simulado" in str(e)
                
        # Recarregar do banco de dados e verificar histórico de execução
        db.refresh(trigger)
        
        # Verificar se o status foi para failed
        assert trigger.status == "failed"
        
        # Verificar se o histórico de execução registrou a falha no nó "node_to_fail"
        history = trigger.execution_history
        assert history is not None
        node_fail_log = next((item for item in history if item["node_id"] == "node_to_fail"), None)
        assert node_fail_log is not None
        assert node_fail_log["status"] == "failed"
        assert "Erro no nó" in node_fail_log["details"]
        
        print("✅ SUCCESS: Execution node failure logged with correct node ID!")
        
    finally:
        db.delete(trigger)
        db.delete(funnel)
        if created_client:
            db.delete(client)
        db.commit()

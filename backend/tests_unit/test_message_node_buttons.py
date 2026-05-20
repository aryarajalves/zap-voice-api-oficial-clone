import asyncio
import os
import sys
from datetime import datetime, timezone
from unittest.mock import MagicMock, AsyncMock, patch
import pytest

# Adiciona o diretório atual ao path para importar corretamente
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models
from core.engine.nodes.message import handle_message_node
from core.worker.handlers.whatsapp import handle_whatsapp_event

def get_or_create_client(db):
    client = db.query(models.Client).first()
    created = False
    if not client:
        client = models.Client(
            name="Client Test Buttons Auto",
            is_active=True
        )
        db.add(client)
        db.commit()
        db.refresh(client)
        created = True
    return client, created

@pytest.mark.asyncio
async def test_message_node_with_buttons_session_window(db_session):
    print("--- 🔍 Testing Message Node with Buttons (Inside 24h Session Window) ---")
    db = db_session
    
    client, created_client = get_or_create_client(db)
    client_id = client.id
    
    funnel = models.Funnel(
        client_id=client_id,
        name="Test Buttons Funnel",
        steps={"nodes": [], "edges": []}
    )
    db.add(funnel)
    db.commit()
    db.refresh(funnel)
    
    trigger = models.ScheduledTrigger(
        client_id=client_id,
        funnel_id=funnel.id,
        contact_phone="5511999999999",
        contact_name="Test Buttons User",
        status="processing",
        conversation_id=9999
    )
    db.add(trigger)
    db.commit()
    db.refresh(trigger)
    
    node = {
        "id": "node_test_message_buttons",
        "type": "messageNode",
        "data": {
            "content": "Escolha uma das opções abaixo:",
            "buttons": ["Sim", "Não"],
            "onlyBusinessHours": False
        }
    }
    
    chatwoot_mock = MagicMock()
    chatwoot_mock.send_interactive_buttons = AsyncMock(return_value={
        "messages": [{"id": "wamid.interactive_test_id"}]
    })
    chatwoot_mock.send_private_note = AsyncMock(return_value={"id": 12345})
    
    apply_vars_func = lambda x: x
    
    try:
        with patch('core.engine.nodes.message.is_window_open_strict', new_callable=AsyncMock) as mock_window, \
             patch('core.engine.nodes.message.get_best_conversation', new_callable=AsyncMock) as mock_get_best_conv, \
             patch('core.engine.nodes.message.wait_for_delivery_sync', new_callable=AsyncMock) as mock_wait_delivery:
            mock_window.return_value = True
            mock_get_best_conv.return_value = 9999
            mock_wait_delivery.return_value = ("completed", "delivered")
            
            res = await handle_message_node(
                db=db,
                trigger=trigger,
                node=node,
                chatwoot=chatwoot_mock,
                conversation_id=9999,
                contact_phone="5511999999999",
                apply_vars_func=apply_vars_func,
                funnel=funnel
            )
            
            # Executado com botões deve retornar "stop"
            assert res == "stop"
            
            # A trigger deve estar "suspended" no nó atual
            db.refresh(trigger)
            assert trigger.status == "suspended"
            assert trigger.current_node_id == "node_test_message_buttons"
            
            # Verifications
            chatwoot_mock.send_interactive_buttons.assert_called_once_with(
                "5511999999999", "Escolha uma das opções abaixo:", ["Sim", "Não"]
            )
            
            chatwoot_mock.send_private_note.assert_called_once_with(
                9999, "Escolha uma das opções abaixo:\n\n🔘 [Botões]: [Sim], [Não]"
            )
            
            # Check message status was saved
            msg_status = db.query(models.MessageStatus).filter_by(trigger_id=trigger.id).first()
            assert msg_status is not None
            assert msg_status.content == "Escolha uma das opções abaixo:"
            
            print("✅ SUCCESS: Message Node with Buttons inside session window verified (Returned stop & suspended)!")
            
    finally:
        # Cleanup
        db.delete(trigger)
        db.delete(funnel)
        if created_client:
            db.delete(client)
        db.commit()

@pytest.mark.asyncio
async def test_message_node_with_buttons_direct_meta(db_session):
    print("--- 🔍 Testing Message Node with Buttons (Direct Meta - No conversation_id) ---")
    db = db_session
    
    client, created_client = get_or_create_client(db)
    client_id = client.id
    
    funnel = models.Funnel(
        client_id=client_id,
        name="Test Buttons Direct Funnel",
        steps={"nodes": [], "edges": []}
    )
    db.add(funnel)
    db.commit()
    db.refresh(funnel)
    
    trigger = models.ScheduledTrigger(
        client_id=client_id,
        funnel_id=funnel.id,
        contact_phone="5511999999999",
        contact_name="Test Buttons User Direct",
        status="processing",
        conversation_id=None
    )
    db.add(trigger)
    db.commit()
    db.refresh(trigger)
    
    node = {
        "id": "node_test_message_buttons_direct",
        "type": "messageNode",
        "data": {
            "content": "Escolha direta:",
            "buttons": ["Opcao A", "Opcao B"],
            "onlyBusinessHours": False
        }
    }
    
    chatwoot_mock = MagicMock()
    chatwoot_mock.send_interactive_buttons = AsyncMock(return_value={
        "messages": [{"id": "wamid.interactive_direct_test_id"}]
    })
    chatwoot_mock.ensure_conversation = AsyncMock(return_value={"conversation_id": 8888, "id": 8888})
    chatwoot_mock.send_private_note = AsyncMock(return_value={"id": 54321})
    
    apply_vars_func = lambda x: x
    
    try:
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
        
        # Deve suspender e retornar "stop"
        assert res == "stop"
        
        db.refresh(trigger)
        assert trigger.status == "suspended"
        assert trigger.current_node_id == "node_test_message_buttons_direct"
        
        # Verifications
        chatwoot_mock.send_interactive_buttons.assert_called_once_with(
            "5511999999999", "Escolha direta:", ["Opcao A", "Opcao B"]
        )
        chatwoot_mock.ensure_conversation.assert_called_once()
        chatwoot_mock.send_private_note.assert_called_once_with(
            8888, "Escolha direta:\n\n🔘 [Botões]: [Opcao A], [Opcao B]"
        )
        
        print("✅ SUCCESS: Message Node with Buttons direct meta verified (Returned stop & suspended)!")
        
    finally:
        # Cleanup
        db.delete(trigger)
        db.delete(funnel)
        if created_client:
            db.delete(client)
        db.commit()

@pytest.mark.asyncio
async def test_webhook_resume_on_button_click(db_session):
    print("--- 🔍 Testing Webhook Resume on Button Click ---")
    db = db_session
    
    # Evita que o fechamento da sessão no handler desvincule as instâncias
    db.close = MagicMock()
    
    # Mock para pg_try_advisory_xact_lock no SQLite de teste
    orig_execute = db.execute
    def mock_execute(statement, params=None, *args, **kwargs):
        if "pg_try_advisory_xact_lock" in str(statement):
            mock_res = MagicMock()
            mock_res.scalar.return_value = True
            return mock_res
        return orig_execute(statement, params, *args, **kwargs)
    db.execute = mock_execute
    
    client, created_client = get_or_create_client(db)
    client_id = client.id
    
    funnel_steps = {
        "nodes": [
            {
                "id": "node_msg",
                "type": "messageNode",
                "data": {"buttons": ["Sim", "Não"], "content": "Deseja continuar?"}
            },
            {
                "id": "node_yes_path",
                "type": "messageNode",
                "data": {"content": "Você clicou em Sim!"}
            }
        ],
        "edges": [
            {
                "source": "node_msg",
                "sourceHandle": "button_0", # Índice 0: "Sim"
                "target": "node_yes_path"
            }
        ]
    }
    
    funnel = models.Funnel(
        client_id=client_id,
        name="Webhook Resume Funnel",
        steps=funnel_steps,
        is_active=True,
        trigger_phrase="iniciar_testes"
    )
    db.add(funnel)
    db.commit()
    db.refresh(funnel)
    
    trigger = models.ScheduledTrigger(
        client_id=client_id,
        funnel_id=funnel.id,
        contact_phone="5511999999999",
        status="suspended",
        current_node_id="node_msg",
        conversation_id=8888
    )
    db.add(trigger)
    db.commit()
    db.refresh(trigger)
    
    # Criar configuração de telefone para evitar que caia no ID=1 hardcoded
    app_config = models.AppConfig(
        client_id=client_id,
        key="WA_PHONE_NUMBER_ID",
        value="123456789"
    )
    db.add(app_config)
    db.commit()
    db.refresh(app_config)
    
    payload = {
        "entry": [{
            "changes": [{
                "value": {
                    "metadata": {
                        "phone_number_id": "123456789"
                    },
                    "messages": [{
                        "from": "5511999999999",
                        "id": "wamid.click_event_id",
                        "timestamp": "1672531199",
                        "type": "interactive",
                        "interactive": {
                            "type": "button_reply",
                            "button_reply": {
                                "id": "btn_yes",
                                "title": "Sim"
                            }
                        }
                    }],
                    "contacts": [{"wa_id": "5511999999999", "profile": {"name": "Test User"}}]
                }
            }]
        }]
    }
    
    try:
        mock_cw_instance = MagicMock()
        mock_cw_instance.ensure_conversation = AsyncMock(return_value={"id": 8888})
        
        with patch('core.worker.handlers.whatsapp.rabbitmq', new_callable=AsyncMock) as mock_rabbitmq, \
             patch('core.worker.handlers.whatsapp.ChatwootClient', return_value=mock_cw_instance), \
             patch('core.worker.handlers.whatsapp.SessionLocal', return_value=db):
            await handle_whatsapp_event(payload)
            
            db.refresh(trigger)
            # A trigger deve ter sido avançada para o nó "node_yes_path" e o status mudado para "processing"
            assert trigger.status == "processing"
            assert trigger.current_node_id == "node_yes_path"
            
            # Deve ter publicado no RabbitMQ para retomar a execução
            mock_rabbitmq.publish.assert_called_once()
            call_args = mock_rabbitmq.publish.call_args[0]
            assert call_args[0] == "zapvoice_funnel_executions"
            assert call_args[1]["trigger_id"] == trigger.id
            assert call_args[1]["funnel_id"] == funnel.id
            
            print("✅ SUCCESS: Webhook Resume on Button Click verified (Resumed and enqueued)!")
            
    finally:
        # Cleanup
        db.delete(app_config)
        db.delete(trigger)
        db.delete(funnel)
        if created_client:
            db.delete(client)
        db.commit()

@pytest.mark.asyncio
async def test_webhook_resume_on_default_fallback(db_session):
    print("--- 🔍 Testing Webhook Resume on Default Fallback (Any message) ---")
    db = db_session
    
    # Evita que o fechamento da sessão no handler desvincule as instâncias
    db.close = MagicMock()
    
    # Mock para pg_try_advisory_xact_lock no SQLite de teste
    orig_execute = db.execute
    def mock_execute(statement, params=None, *args, **kwargs):
        if "pg_try_advisory_xact_lock" in str(statement):
            mock_res = MagicMock()
            mock_res.scalar.return_value = True
            return mock_res
        return orig_execute(statement, params, *args, **kwargs)
    db.execute = mock_execute
    
    client, created_client = get_or_create_client(db)
    client_id = client.id
    
    funnel_steps = {
        "nodes": [
            {
                "id": "node_msg",
                "type": "messageNode",
                "data": {"buttons": ["Sim", "Não"], "content": "Deseja continuar?"}
            },
            {
                "id": "node_fallback_path",
                "type": "messageNode",
                "data": {"content": "Resposta desconhecida!"}
            }
        ],
        "edges": [
            {
                "source": "node_msg",
                "sourceHandle": None, # Sem conector (caminho padrão)
                "target": "node_fallback_path"
            }
        ]
    }
    
    funnel = models.Funnel(
        client_id=client_id,
        name="Webhook Fallback Funnel",
        steps=funnel_steps,
        is_active=True,
        trigger_phrase="iniciar_testes"
    )
    db.add(funnel)
    db.commit()
    db.refresh(funnel)
    
    trigger = models.ScheduledTrigger(
        client_id=client_id,
        funnel_id=funnel.id,
        contact_phone="5511999999999",
        status="suspended",
        current_node_id="node_msg",
        conversation_id=8888
    )
    db.add(trigger)
    db.commit()
    db.refresh(trigger)
    
    # Criar configuração de telefone para evitar que caia no ID=1 hardcoded
    app_config = models.AppConfig(
        client_id=client_id,
        key="WA_PHONE_NUMBER_ID",
        value="123456789"
    )
    db.add(app_config)
    db.commit()
    db.refresh(app_config)
    
    # Usuário envia uma mensagem de texto arbitrária ("Talvez") que não é um botão
    payload = {
        "entry": [{
            "changes": [{
                "value": {
                    "metadata": {
                        "phone_number_id": "123456789"
                    },
                    "messages": [{
                        "from": "5511999999999",
                        "id": "wamid.text_reply_id",
                        "timestamp": "1672531199",
                        "type": "text",
                        "text": {"body": "Talvez"}
                    }],
                    "contacts": [{"wa_id": "5511999999999", "profile": {"name": "Test User"}}]
                }
            }]
        }]
    }
    
    try:
        mock_cw_instance = MagicMock()
        mock_cw_instance.ensure_conversation = AsyncMock(return_value={"id": 8888})
        
        with patch('core.worker.handlers.whatsapp.rabbitmq', new_callable=AsyncMock) as mock_rabbitmq, \
             patch('core.worker.handlers.whatsapp.ChatwootClient', return_value=mock_cw_instance), \
             patch('core.worker.handlers.whatsapp.SessionLocal', return_value=db):
            await handle_whatsapp_event(payload)
            
            db.refresh(trigger)
            # Deve ter avançado para o fallback padrão "node_fallback_path"
            assert trigger.status == "processing"
            assert trigger.current_node_id == "node_fallback_path"
            
            # Deve ter enfileirado a execução
            mock_rabbitmq.publish.assert_called_once()
            print("✅ SUCCESS: Webhook Resume on Default Fallback verified!")
            
    finally:
        # Cleanup
        db.delete(app_config)
        db.delete(trigger)
        db.delete(funnel)
        if created_client:
            db.delete(client)
        db.commit()

@pytest.mark.asyncio
async def test_webhook_resume_outside_business_hours(db_session):
    print("--- 🔍 Testing Webhook Resume Outside Business Hours ---")
    db = db_session
    
    # Evita que o fechamento da sessão no handler desvincule as instâncias
    db.close = MagicMock()
    
    # Mock para pg_try_advisory_xact_lock no SQLite de teste
    orig_execute = db.execute
    def mock_execute(statement, params=None, *args, **kwargs):
        if "pg_try_advisory_xact_lock" in str(statement):
            mock_res = MagicMock()
            mock_res.scalar.return_value = True
            return mock_res
        return orig_execute(statement, params, *args, **kwargs)
    db.execute = mock_execute
    
    client, created_client = get_or_create_client(db)
    client_id = client.id
    
    funnel_steps = {
        "nodes": [
            {
                "id": "node_msg",
                "type": "messageNode",
                "data": {"buttons": ["Sim", "Não"], "content": "Deseja continuar?"}
            },
            {
                "id": "node_yes_path",
                "type": "messageNode",
                "data": {"content": "Você clicou em Sim!", "onlyBusinessHours": True}
            }
        ],
        "edges": [
            {
                "source": "node_msg",
                "sourceHandle": "button_0", # Índice 0: "Sim"
                "target": "node_yes_path"
            }
        ]
    }
    
    funnel = models.Funnel(
        client_id=client_id,
        name="Webhook Business Hours Funnel",
        steps=funnel_steps,
        is_active=True,
        trigger_phrase="iniciar_testes"
    )
    db.add(funnel)
    db.commit()
    db.refresh(funnel)
    
    trigger = models.ScheduledTrigger(
        client_id=client_id,
        funnel_id=funnel.id,
        contact_phone="5511999999999",
        status="suspended",
        current_node_id="node_msg",
        conversation_id=8888
    )
    db.add(trigger)
    db.commit()
    db.refresh(trigger)
    
    # Criar configuração de telefone para evitar que caia no ID=1 hardcoded
    app_config = models.AppConfig(
        client_id=client_id,
        key="WA_PHONE_NUMBER_ID",
        value="123456789"
    )
    db.add(app_config)
    db.commit()
    db.refresh(app_config)
    
    payload = {
        "entry": [{
            "changes": [{
                "value": {
                    "metadata": {
                        "phone_number_id": "123456789"
                    },
                    "messages": [{
                        "from": "5511999999999",
                        "id": "wamid.click_event_id_business",
                        "timestamp": "1672531199",
                        "type": "interactive",
                        "interactive": {
                            "type": "button_reply",
                            "button_reply": {
                                "id": "btn_yes",
                                "title": "Sim"
                            }
                        }
                    }],
                    "contacts": [{"wa_id": "5511999999999", "profile": {"name": "Test User"}}]
                }
            }]
        }]
    }
    
    try:
        mock_cw_instance = MagicMock()
        mock_cw_instance.ensure_conversation = AsyncMock(return_value={"id": 8888})
        
        with patch('core.worker.handlers.whatsapp.rabbitmq', new_callable=AsyncMock) as mock_rabbitmq, \
             patch('core.worker.handlers.whatsapp.ChatwootClient', return_value=mock_cw_instance), \
             patch('core.worker.handlers.whatsapp.is_within_business_hours', return_value=False), \
             patch('core.worker.handlers.whatsapp.SessionLocal', return_value=db):
            await handle_whatsapp_event(payload)
            
            db.refresh(trigger)
            # A trigger deve ter sido avançada para o nó "node_yes_path" e o status mudado para "queued"
            assert trigger.status == "queued"
            assert trigger.current_node_id == "node_yes_path"
            assert trigger.scheduled_time is not None
            
            # Não deve ter publicado no RabbitMQ (foi agendado diretamente no banco)
            mock_rabbitmq.publish.assert_not_called()
            
            print("✅ SUCCESS: Webhook Resume Outside Business Hours verified (Queued successfully)!")
            
    finally:
        # Cleanup
        db.delete(app_config)
        db.delete(trigger)
        db.delete(funnel)
        if created_client:
            db.delete(client)
        db.commit()

@pytest.mark.asyncio
async def test_orchestrator_preserves_suspended_status(db_session):
    print("--- 🔍 Testing Orchestrator Preserves Suspended Status on Button Nodes ---")
    db = db_session
    
    client, created_client = get_or_create_client(db)
    client_id = client.id
    
    funnel = models.Funnel(
        client_id=client_id,
        name="Test Orchestrator Status Funnel",
        steps={
            "nodes": [
                {
                    "id": "start",
                    "type": "messageNode",
                    "data": {
                        "content": "Clique em um dos botões abaixo:",
                        "buttons": ["Opção 1", "Opção 2"],
                        "onlyBusinessHours": False
                    }
                }
            ],
            "edges": []
        }
    )
    db.add(funnel)
    db.commit()
    db.refresh(funnel)
    
    trigger = models.ScheduledTrigger(
        client_id=client_id,
        funnel_id=funnel.id,
        contact_phone="5511999999999",
        contact_name="Test Orchestrator Status User",
        status="processing",
        conversation_id=9999
    )
    db.add(trigger)
    db.commit()
    db.refresh(trigger)
    
    chatwoot_mock = MagicMock()
    chatwoot_mock.send_interactive_buttons = AsyncMock(return_value={
        "messages": [{"id": "wamid.interactive_status_test_id"}]
    })
    chatwoot_mock.send_private_note = AsyncMock(return_value={"id": 12345})
    
    try:
        from core.engine.executor import execute_funnel
        
        with patch('core.engine.nodes.message.is_window_open_strict', new_callable=AsyncMock) as mock_window, \
             patch('core.engine.nodes.message.get_best_conversation', new_callable=AsyncMock) as mock_get_best_conv, \
             patch('core.engine.nodes.message.wait_for_delivery_sync', new_callable=AsyncMock) as mock_wait_delivery, \
             patch('core.engine.executor.ChatwootClient', return_value=chatwoot_mock), \
             patch('rabbitmq_client.rabbitmq.publish_event', new_callable=AsyncMock) as mock_publish_event:
            
            mock_window.return_value = True
            mock_get_best_conv.return_value = 9999
            mock_wait_delivery.return_value = ("completed", "delivered")
            
            await execute_funnel(
                funnel_id=funnel.id,
                conversation_id=9999,
                trigger_id=trigger.id,
                contact_phone="5511999999999",
                db=db,
                skip_block_check=True
            )
            
            db.refresh(trigger)
            # A trigger deve ter status "suspended", e NÃO "completed"
            assert trigger.status == "suspended", f"Trigger status was overwritten to {trigger.status}!"
            assert trigger.current_node_id == "start"
            
            print("✅ SUCCESS: Orchestrator preserves suspended status verified!")
            
    finally:
        # Cleanup
        db.delete(trigger)
        db.delete(funnel)
        if created_client:
            db.delete(client)
        db.commit()

async def run_all():
    db = SessionLocal()
    try:
        await test_message_node_with_buttons_session_window(db)
        await test_message_node_with_buttons_direct_meta(db)
        await test_webhook_resume_on_button_click(db)
        await test_webhook_resume_on_default_fallback(db)
        await test_webhook_resume_outside_business_hours(db)
        await test_orchestrator_preserves_suspended_status(db)
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_all())

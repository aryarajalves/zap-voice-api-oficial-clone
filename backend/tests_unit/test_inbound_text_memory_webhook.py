import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from core.worker.handlers.whatsapp_inbound import handle_whatsapp_inbound_messages

@pytest.mark.asyncio
async def test_whatsapp_inbound_text_message_does_not_dispatch_memory_webhook():
    """
    Testa que ao receber uma mensagem de texto comum do usuário (inbound),
    o sistema NÃO agenda o envio do webhook de memória chamando notify_agent_memory_webhook.
    """
    db_mock = MagicMock()
    db_mock.bind = MagicMock()
    db_mock.bind.dialect.name = "sqlite"

    # Criar mock do chat_convo retornado pela query local do DB
    mock_chat_convo = MagicMock()
    mock_chat_convo.id = 31
    db_mock.query.return_value.filter.return_value.first.return_value = mock_chat_convo

    messages = [
        {
            "from": "5511999998888",
            "id": "wamid.HBgMNTUxMTk5OTk5ODg4OAI",
            "timestamp": "1719920000",
            "type": "text",
            "text": {"body": "Estou com problema para entrar no curso"}
        }
    ]
    
    value = {
        "messaging_product": "whatsapp",
        "metadata": {"display_phone_number": "5511999998888", "phone_number_id": "123456"},
        "contacts": [{"wa_id": "5511999998888", "profile": {"name": "Edramos User"}}],
        "messages": messages
    }
    
    metadata = {"phone_number_id": "123456"}

    # Mock de configurações
    def mock_get_setting(key, default="", client_id=1):
        if key == "AGENT_MEMORY_WEBHOOK_URL":
            return "https://agentebacktarcira.aryaraj.shop/webhooks/memory/memoria"
        if key == "CHAT_MESSAGES_WEBHOOK_URL":
            return "" # Diferente para não pular por duplicata
        return default

    # Mocks do ChatwootClient
    mock_cw = MagicMock()
    mock_cw.ensure_conversation = AsyncMock(return_value={"conversation_id": 55})

    with patch("config_loader.get_setting", side_effect=mock_get_setting), \
         patch("core.worker.handlers.whatsapp.ChatwootClient", return_value=mock_cw), \
         patch("core.worker.handlers.whatsapp_inbound.wah.ChatwootClient", return_value=mock_cw), \
         patch("services.ai_memory.notify_agent_memory_webhook", new_callable=AsyncMock) as mock_notify_webhook:
         
        await handle_whatsapp_inbound_messages(db_mock, messages, value, metadata)
        
        # Como roda via asyncio.create_task, aguardamos o event loop processar a task em background
        await asyncio.sleep(0.1)
        
        # Garante que notify_agent_memory_webhook NÃO foi chamado para a mensagem comum de texto
        mock_notify_webhook.assert_not_called()


@pytest.mark.asyncio
async def test_whatsapp_inbound_button_message_dispatches_memory_webhook():
    """
    Testa que ao receber um clique de botão (inbound),
    o sistema agenda o envio do webhook de memória.
    """
    db_mock = MagicMock()
    db_mock.bind = MagicMock()
    db_mock.bind.dialect.name = "sqlite"

    # Criar mock do chat_convo retornado pela query local do DB
    mock_chat_convo = MagicMock()
    mock_chat_convo.id = 31
    db_mock.query.return_value.filter.return_value.first.return_value = mock_chat_convo

    messages = [
        {
            "from": "5511999998888",
            "id": "wamid.HBgMNTUxMTk5OTk5ODg4T1I",
            "timestamp": "1719920000",
            "type": "button",
            "button": {"text": "Quero entrar na aula"}
        }
    ]
    
    value = {
        "messaging_product": "whatsapp",
        "metadata": {"display_phone_number": "5511999998888", "phone_number_id": "123456"},
        "contacts": [{"wa_id": "5511999998888", "profile": {"name": "Edramos User"}}],
        "messages": messages
    }
    
    metadata = {"phone_number_id": "123456"}

    # Mock de configurações
    def mock_get_setting(key, default="", client_id=1):
        if key == "AGENT_MEMORY_WEBHOOK_URL":
            return "https://agentebacktarcira.aryaraj.shop/webhooks/memory/memoria"
        if key == "CHAT_MESSAGES_WEBHOOK_URL":
            return "" # Diferente para não pular por duplicata
        return default

    # Mocks do ChatwootClient
    mock_cw = MagicMock()
    mock_cw.ensure_conversation = AsyncMock(return_value={"conversation_id": 55})

    with patch("config_loader.get_setting", side_effect=mock_get_setting), \
         patch("core.worker.handlers.whatsapp.ChatwootClient", return_value=mock_cw), \
         patch("core.worker.handlers.whatsapp_inbound.wah.ChatwootClient", return_value=mock_cw), \
         patch("services.ai_memory.notify_agent_memory_webhook", new_callable=AsyncMock) as mock_notify_webhook:
         
        await handle_whatsapp_inbound_messages(db_mock, messages, value, metadata)
        
        # Como roda via asyncio.create_task, aguardamos o event loop processar a task em background
        await asyncio.sleep(0.1)
        
        # Garante que notify_agent_memory_webhook foi chamado para o clique de botão
        mock_notify_webhook.assert_called_once()
        call_kwargs = mock_notify_webhook.call_args.kwargs
        assert call_kwargs["phone"] == "5511999998888"
        assert call_kwargs["content"] == "Quero entrar na aula"
        assert call_kwargs["template_name"] == "Clique de Botão"
        assert call_kwargs["dono"] == "usuario"
        assert call_kwargs["is_button_click"] is True

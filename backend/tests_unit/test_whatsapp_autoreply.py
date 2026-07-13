import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone

# Força o import
import os
import sys
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from core.worker.handlers.whatsapp_inbound import handle_whatsapp_inbound_messages

@pytest.mark.asyncio
async def test_whatsapp_inbound_auto_reply_trigger():
    """
    Testa que ao receber uma mensagem de entrada do WhatsApp,
    se o auto-reply estiver habilitado nas configurações do cliente,
    a mensagem de auto-reply configurada é enviada de volta ao contato.
    """
    db_mock = MagicMock()
    # Mock do bind/dialect para passar a validação de lock do postgres
    db_mock.bind = MagicMock()
    db_mock.bind.dialect.name = "sqlite"

    messages = [
        {
            "from": "5511999998888",
            "id": "wamid.HBgMNTUxMTk5OTk5ODg4OAI",
            "timestamp": "1719920000",
            "type": "text",
            "text": {"body": "Oi, estou interessado!"}
        }
    ]
    
    value = {
        "messaging_product": "whatsapp",
        "metadata": {"display_phone_number": "5511999998888", "phone_number_id": "123456"},
        "contacts": [{"wa_id": "5511999998888", "profile": {"name": "Test User"}}],
        "messages": messages
    }
    
    metadata = {"phone_number_id": "123456"}

    # Mock do get_setting em whatsapp_inbound para simular as configurações ativas do cliente
    def mock_get_setting(key, default="", client_id=1):
        if key == "WA_AUTO_REPLY_ENABLED":
            return "true"
        if key == "WA_AUTO_REPLY_MESSAGE":
            return "Olá! Este número é apenas para comunicados."
        if key == "WA_AUTO_REPLY_DELAY":
            return "0.01"
        return default

    # Mocks do ChatwootClient para passar os envios de sincronização sem erros
    mock_cw = MagicMock()
    mock_cw.ensure_conversation = AsyncMock(return_value={"conversation_id": 55})

    with patch("core.worker.handlers.whatsapp.get_setting", side_effect=mock_get_setting), \
         patch("core.worker.handlers.whatsapp.ChatwootClient", return_value=mock_cw), \
         patch("core.worker.handlers.whatsapp_inbound.wah.ChatwootClient", return_value=mock_cw), \
         patch("core.worker.handlers.whatsapp_inbound.wah.get_setting", side_effect=mock_get_setting), \
         patch("core.clients.whatsapp.client.WhatsAppClient.send_text_official", new_callable=AsyncMock) as mock_send:
         
        await handle_whatsapp_inbound_messages(db_mock, messages, value, metadata)
        
        # Como o auto-reply roda via asyncio.create_task,
        # aguardamos uma fração de segundo para que o event loop execute a task em background
        await asyncio.sleep(0.1)
        
        # Verifica se o método de envio foi chamado corretamente com o telefone normalizado e a mensagem
        mock_send.assert_called_once_with("5511999998888", "Olá! Este número é apenas para comunicados.")

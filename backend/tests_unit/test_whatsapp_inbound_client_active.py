import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock

import os
import sys
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from core.worker.handlers.whatsapp_inbound import handle_whatsapp_inbound_messages
import models

@pytest.mark.asyncio
async def test_whatsapp_inbound_client_inactive_ignored():
    """
    Testa que se o cliente resolvido pelo phone_number_id (ou pelo fallback)
    estiver inativo (is_active == False), a mensagem inbound é ignorada e não processada.
    """
    db_mock = MagicMock()
    db_mock.bind = MagicMock()
    db_mock.bind.dialect.name = "sqlite"

    # Mock do Client inativo
    mock_client = models.Client(id=1, name="Cliente Inativo", is_active=False)
    
    # Mock do db.query para retornar o cliente inativo
    db_mock.query.return_value.filter.return_value.first.return_value = mock_client
    
    # Configurar query.join(models.Client).filter(...).all() para retornar configs vazias,
    # fazendo com que caia no client_id padrão (1), que mockamos acima como inativo.
    db_mock.query.return_value.join.return_value.filter.return_value.all.return_value = []

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
    import core.worker.handlers.whatsapp as wah
    wah.GLOBAL_PROCESSING_LOCKS.clear()

    with patch("core.worker.handlers.whatsapp_inbound.logger") as mock_logger:
        await handle_whatsapp_inbound_messages(db_mock, messages, value, metadata)
        
        # Verifica se gerou o log de aviso dizendo que a mensagem foi ignorada
        mock_logger.warning.assert_any_call("🚫 [INBOUND] Mensagem ignorada. O cliente ID 1 está inativo ou não existe.")

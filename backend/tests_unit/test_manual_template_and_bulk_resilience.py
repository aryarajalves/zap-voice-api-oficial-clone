import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timezone

import os
import sys
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import models
from core.worker.handlers.whatsapp_status import handle_whatsapp_statuses

@pytest.mark.asyncio
async def test_resilient_wamid_matching_in_statuses():
    """
    Valida que handle_whatsapp_statuses consegue localizar com sucesso um registro de MessageStatus
    tanto por ID limpo quanto pelo ID completo contendo o prefixo 'wamid.'.
    """
    db_mock = MagicMock()
    
    # 1. Mock do MessageStatus
    msg_status = models.MessageStatus(
        id=999,
        trigger_id=111,
        message_id="HBgLNTU4NTk2MTIzNTg2FQIAERgSRTk5Qjg1NzI2MjhBNTIxMzc1OAA=", # ID limpo no banco
        phone_number="558596123586",
        status="sent"
    )
    
    trigger = models.ScheduledTrigger(
        id=111,
        client_id=1,
        template_name="mensagem_nova_teste",
        is_bulk=False,
        total_sent=1
    )
    
    # Setup queries
    # Retorna o trigger quando buscado por get
    def mock_get(model_class, ident):
        if ident == 111:
            return trigger
        return None
        
    db_mock.query.return_value.get.side_effect = lambda ident: mock_get(None, ident)
    
    # Configura o filtro da query para retornar nosso msg_status
    db_mock.query.return_value.filter.return_value.first.return_value = msg_status
    
    statuses_payload = [
        {
            "id": "wamid.HBgLNTU4NTk2MTIzNTg2FQIAERgSRTk5Qjg1NzI2MjhBNTIxMzc1OAA=", # ID com wamid.
            "status": "delivered",
            "recipient_id": "558596123586"
        }
    ]
    
    # Mock do event client e sleep
    mock_rabbitmq = AsyncMock()
    
    with patch("core.worker.handlers.whatsapp_status.wah.SessionLocal", return_value=db_mock), \
         patch("rabbitmq_client.rabbitmq", mock_rabbitmq), \
         patch("core.worker.handlers.whatsapp_status.asyncio.sleep", AsyncMock()), \
         patch("services.triggers_service.reconcile_trigger_stats_logic", AsyncMock()):
        
        await handle_whatsapp_statuses(db_mock, statuses_payload, {})
        
        # O status deve ter sido atualizado para 'delivered'
        assert msg_status.status == "delivered"
        assert db_mock.commit.called

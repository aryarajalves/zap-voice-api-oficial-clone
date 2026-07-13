import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone

import os
import sys
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import models
from core.worker.handlers.whatsapp_status import handle_deferred_post_delivery

@pytest.mark.asyncio
async def test_whatsapp_delivery_chat_sync_on_delivered():
    """
    Testa que ao receber a confirmação de entrega (status 'delivered')
    de uma mensagem de template enviada pelo WhatsApp, a conversa local
    e a mensagem correspondente no chat local são criadas e transmitidas via WS.
    """
    db_mock = MagicMock()
    db_mock.bind = MagicMock()
    db_mock.bind.dialect.name = "sqlite"

    # Criando Mocks de models
    trigger = models.ScheduledTrigger(
        id=123,
        client_id=1,
        template_name="mensagem_nova_teste",
        contact_phone="558596123586",
        contact_name="Test User",
        status="sent",
        is_bulk=False
    )
    
    msg_status = models.MessageStatus(
        id=456,
        trigger_id=123,
        message_id="wamid.test_delivery_123",
        phone_number="558596123586",
        status="sent",
        message_type="TEMPLATE",
        content="Conteúdo real do template",
        var5="http://media.link/video.mp4" # URL da mídia salva no var5
    )

    # Configurando o comportamento de busca no banco de dados mockado
    def mock_get(ident):
        # Como o query(Model) retorna a mesma query mockada, vamos checar qual model está no mock
        # Para simplificar, retornamos baseado no ident
        if ident == 123:
            return trigger
        if ident == 456:
            return msg_status
        return None

    # Garante que db.query(Model).get(id) retorne o objeto correto
    db_mock.query.return_value.get.side_effect = mock_get

    # Simulando a ausência de mensagem de chat local pré-existente
    db_mock.query.return_value.filter.return_value.first.return_value = None

    # Mocks para o publish_event e cliente de websocket
    mock_rabbitmq = AsyncMock()
    
    # Executa a função pós-entrega simulada
    with patch("core.worker.handlers.whatsapp_status.wah.SessionLocal", return_value=db_mock), \
         patch("rabbitmq_client.rabbitmq", mock_rabbitmq), \
         patch("core.worker.handlers.whatsapp_status.asyncio.sleep", AsyncMock()): # Pular o sleep de 7s no teste
        
        await handle_deferred_post_delivery(
            trigger_id=123,
            message_id=456,
            status="delivered",
            msg_id="wamid.test_delivery_123",
            phone="558596123586"
        )
        
        # Validações
        # 1. Deve ter adicionado a nova mensagem e a conversa local à sessão do banco de dados
        assert db_mock.add.call_count >= 2  # Conversa criada + ChatMessage criada
        
        # 2. Deve ter chamado o commit
        assert db_mock.commit.called
        
        # 3. Deve ter publicado no WebSocket/RabbitMQ os eventos de conversa e nova mensagem
        assert mock_rabbitmq.publish_event.call_count >= 2

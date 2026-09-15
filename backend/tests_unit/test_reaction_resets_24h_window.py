import os
import sys
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch, AsyncMock
import pytest

# Adiciona o diretório backend ao path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import models
from core.worker.handlers.whatsapp_inbound.chat_recorder import handle_reaction_message


@pytest.mark.asyncio
async def test_reaction_resets_24h_window_and_updates_message():
    """
    Testa se o envio de um emoji por parte do contato reseta a janela de 24 horas
    (last_contact_message_at) e atualiza a mensagem com a reação correspondente.
    """
    mock_db = MagicMock()

    # Conversa com janela antiga (20 horas atrás) e fechada
    old_time = datetime.now(timezone.utc) - timedelta(hours=20)
    chat_convo = models.ChatConversation(
        id=1243,
        client_id=1,
        phone="5511999999999",
        contact_name="Babi G",
        status="resolved",
        unread_count=0,
        last_contact_message_at=old_time,
        last_message_at=old_time
    )

    # Mensagem alvo onde o contato reagiu
    target_msg = models.ChatMessage(
        id=555,
        conversation_id=chat_convo.id,
        sender_type="agent",
        message_type="text",
        content="Oi, tudo bem?",
        wa_message_id="wamid.HBgLM...",
        meta_data={"reactions": []}
    )

    # Configurar mock de query do banco
    mock_db.query.return_value.filter.return_value.first.return_value = target_msg

    # Payload recebido via webhook do WhatsApp
    msg_webhook = {
        "id": "ABEG...",
        "type": "reaction",
        "reaction": {
            "message_id": "wamid.HBgLM...",
            "emoji": "👍"
        }
    }

    with patch("rabbitmq_client.rabbitmq.publish_event", new_callable=AsyncMock) as mock_publish:
        res = await handle_reaction_message(mock_db, chat_convo, msg_webhook)

        assert res is True
        # Janela de 24h resetada para o horário atual
        assert chat_convo.last_contact_message_at > old_time
        assert (datetime.now(timezone.utc) - chat_convo.last_contact_message_at).total_seconds() < 5
        # Status reaberto
        assert chat_convo.status == "open"
        # Mensagem atualizada com a reação do contato
        assert target_msg.meta_data["reactions"] == [{"emoji": "👍", "sender": "contact"}]
        # Commit chamado
        mock_db.commit.assert_called_once()
        # Evento WebSocket despachado
        mock_publish.assert_called_once()


@pytest.mark.asyncio
async def test_reaction_removal_removes_from_meta():
    """
    Testa se o envio de emoji vazio remove a reação anterior do contato.
    """
    mock_db = MagicMock()

    chat_convo = models.ChatConversation(
        id=1243,
        client_id=1,
        phone="5511999999999",
        status="open"
    )

    target_msg = models.ChatMessage(
        id=555,
        conversation_id=chat_convo.id,
        wa_message_id="wamid.123",
        meta_data={"reactions": [{"emoji": "👍", "sender": "contact"}, {"emoji": "❤️", "sender": "agent"}]}
    )

    mock_db.query.return_value.filter.return_value.first.return_value = target_msg

    # Payload de remoção de reação
    msg_webhook = {
        "type": "reaction",
        "reaction": {
            "message_id": "wamid.123",
            "emoji": ""
        }
    }

    with patch("rabbitmq_client.rabbitmq.publish_event", new_callable=AsyncMock) as mock_publish:
        res = await handle_reaction_message(mock_db, chat_convo, msg_webhook)

        assert res is True
        # Apenas a reação do agente permanece
        assert target_msg.meta_data["reactions"] == [{"emoji": "❤️", "sender": "agent"}]
        mock_db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_reaction_resets_window_even_if_target_msg_not_found():
    """
    Se o contato enviou reação a uma mensagem que não existe mais ou não está no banco local,
    a janela de 24 horas da conversa ainda assim deve ser renovada pela interação.
    """
    mock_db = MagicMock()

    old_time = datetime.now(timezone.utc) - timedelta(hours=22)
    chat_convo = models.ChatConversation(
        id=1243,
        client_id=1,
        phone="5511999999999",
        status="resolved",
        last_contact_message_at=old_time
    )

    # Nenhuma mensagem encontrada
    mock_db.query.return_value.filter.return_value.first.return_value = None

    msg_webhook = {
        "type": "reaction",
        "reaction": {
            "message_id": "wamid.inexistente",
            "emoji": "🔥"
        }
    }

    with patch("rabbitmq_client.rabbitmq.publish_event", new_callable=AsyncMock) as mock_publish:
        res = await handle_reaction_message(mock_db, chat_convo, msg_webhook)

        assert res is True
        # A janela de 24h foi resetada
        assert chat_convo.last_contact_message_at > old_time
        assert chat_convo.status == "open"
        mock_db.commit.assert_called_once()


import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from worker import handle_bulk_send, handle_funnel_execution, handle_chatwoot_private_message
import asyncio
import models

@pytest.fixture
def mock_rabbitmq():
    with patch("worker.rabbitmq") as mock:
        yield mock

@pytest.mark.asyncio
async def test_handle_bulk_send_funnel(db_session, mock_rabbitmq):
    """Testa que handle_bulk_send despacha corretamente um job de funil em massa."""
    # Cria um trigger no banco de teste para que o lock check passe
    trigger = models.ScheduledTrigger(
        id=8001,
        client_id=1,
        status='queued',
        is_bulk=True,
    )
    db_session.add(trigger)
    db_session.commit()

    data = {
        "trigger_id": 8001,
        "type": "funnel_bulk",
        "funnel_id": 10,
        "contacts": ["5585999999999"],
        "delay": 5,
        "concurrency": 2
    }

    with patch("core.worker.handlers.bulk.process_bulk_funnel", new_callable=AsyncMock) as mock_process:
        await handle_bulk_send(data)
        mock_process.assert_called_once_with(
            trigger_id=8001,
            funnel_id=10,
            contacts=["5585999999999"],
            delay=5,
            concurrency=2
        )

@pytest.mark.asyncio
async def test_handle_bulk_send_template(db_session, mock_rabbitmq):
    """Testa que handle_bulk_send despacha corretamente um job de envio de template em massa."""
    trigger = models.ScheduledTrigger(
        id=8002,
        client_id=1,
        status='queued',
        is_bulk=True,
    )
    db_session.add(trigger)
    db_session.commit()

    data = {
        "trigger_id": 8002,
        "template_name": "hello_world",
        "contacts": ["5585999999999"],
        "delay": 10,
        "concurrency": 3,
        "language": "en_US"
    }

    with patch("core.worker.handlers.bulk.process_bulk_send", new_callable=AsyncMock) as mock_process:
        await handle_bulk_send(data)
        mock_process.assert_called_once_with(
            trigger_id=8002,
            template_name="hello_world",
            contacts=["5585999999999"],
            delay=10,
            concurrency=3,
            language="en_US",
            components=None,
            direct_message=None,
            direct_message_params=None
        )

@pytest.mark.asyncio
async def test_handle_chatwoot_private_message_success(db_session):
    """Testa que handle_chatwoot_private_message envia uma nota privada corretamente."""
    data = {
        "client_id": 1,
        "phone": "5585999999999",
        "message": "Test private note",
        "trigger_id": 123,
        "delay": 0  # Evita asyncio.sleep(5) no handler
    }

    with patch("core.worker.handlers.chatwoot.ChatwootClient") as MockClient:
        mock_client_inst = MockClient.return_value
        mock_client_inst.get_default_whatsapp_inbox = AsyncMock(return_value=1)
        mock_client_inst.ensure_conversation = AsyncMock(return_value={"conversation_id": 1000})
        mock_client_inst.is_within_24h_window = AsyncMock(return_value=True)
        mock_client_inst.create_private_note = AsyncMock(return_value={"id": 1})

        await handle_chatwoot_private_message(data)

        mock_client_inst.get_default_whatsapp_inbox.assert_called_once()
        mock_client_inst.ensure_conversation.assert_called_once()
        mock_client_inst.create_private_note.assert_called_once_with(1000, "Test private note")

@pytest.mark.asyncio
async def test_handle_funnel_execution_success(db_session):
    """Testa que handle_funnel_execution executa o funil quando o trigger existe."""
    trigger = models.ScheduledTrigger(
        id=8003,
        client_id=1,
        status='processing',
        is_bulk=False,
        funnel_id=10,
    )
    db_session.add(trigger)
    db_session.commit()

    data = {
        "trigger_id": 8003,
        "contact_phone": "5585999999999",
        "conversation_id": 1000,
        "funnel_id": 10
    }

    with patch("core.worker.handlers.funnel.execute_funnel", new_callable=AsyncMock) as mock_execute:
        with patch("core.worker.handlers.funnel.ChatwootClient"):
            await handle_funnel_execution(data)
            mock_execute.assert_called_once()

@pytest.mark.asyncio
async def test_handle_funnel_execution_suppression(db_session):
    """Testa que handle_funnel_execution ignora triggers já em estado final (completed)."""
    trigger = models.ScheduledTrigger(
        id=8004,
        client_id=1,
        status='completed',
        is_bulk=False,
        funnel_id=10,
    )
    db_session.add(trigger)
    db_session.commit()

    data = {
        "trigger_id": 8004,
        "contact_phone": "5585999999999",
        "conversation_id": 1000
    }

    with patch("core.worker.handlers.funnel.execute_funnel", new_callable=AsyncMock) as mock_execute:
        with patch("core.worker.handlers.funnel.ChatwootClient"):
            await handle_funnel_execution(data)

            # Trigger já concluído deve ser pulado — execute_funnel NÃO deve ser chamado
            mock_execute.assert_not_called()

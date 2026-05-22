import pytest
import os
import sys
from unittest.mock import AsyncMock, patch, MagicMock

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

from core.engine.events import publish_node_external_event


@pytest.mark.asyncio
@patch("core.engine.events.get_setting", return_value="https://webhook.example.com/memory")
@patch("core.engine.events.notify_agent_memory_webhook", new_callable=AsyncMock)
async def test_publish_node_external_event_always_when_configured(mock_notify, mock_setting):
    """
    Agora a memória é enviada automaticamente se o webhook estiver configurado,
    independente do campo publishExternalEvent no nó.
    """
    mock_trigger = MagicMock()
    mock_trigger.id = 123
    mock_trigger.client_id = 1
    mock_trigger.contact_name = "Test User"

    # Mesmo com publishExternalEvent=False, deve enviar se o webhook estiver configurado
    mock_node_data = {
        "publishExternalEvent": False,
        "content": "Hello world"
    }

    await publish_node_external_event(
        db=MagicMock(),
        trigger=mock_trigger,
        data=mock_node_data,
        content="Hello world",
        contact_phone="5511999999999",
        node_id="node_1"
    )

    mock_notify.assert_called_once()
    call_kwargs = mock_notify.call_args.kwargs
    assert call_kwargs["phone"] == "5511999999999"
    assert call_kwargs["content"] == "Hello world"
    assert call_kwargs["trigger_id"] == 123
    assert call_kwargs["node_id"] == "node_1"


@pytest.mark.asyncio
@patch("core.engine.events.get_setting", return_value="https://webhook.example.com/memory")
@patch("core.engine.events.notify_agent_memory_webhook", new_callable=AsyncMock)
async def test_publish_node_external_event_with_toggle_true_also_sends(mock_notify, mock_setting):
    """
    Com publishExternalEvent=True e webhook configurado, também deve enviar.
    """
    mock_trigger = MagicMock()
    mock_trigger.id = 456
    mock_trigger.client_id = 1
    mock_trigger.contact_name = "Outro Usuário"

    mock_node_data = {
        "publishExternalEvent": True,
        "content": "Mensagem de funil"
    }

    await publish_node_external_event(
        db=MagicMock(),
        trigger=mock_trigger,
        data=mock_node_data,
        content="Mensagem de funil",
        contact_phone="5511988888888",
        node_id="node_2"
    )

    mock_notify.assert_called_once()


@pytest.mark.asyncio
@patch("core.engine.events.get_setting", return_value="")
@patch("core.engine.events.notify_agent_memory_webhook", new_callable=AsyncMock)
async def test_publish_node_external_event_not_sent_when_not_configured(mock_notify, mock_setting):
    """
    Se o webhook de memória NÃO estiver configurado, não deve enviar nada.
    """
    mock_trigger = MagicMock()
    mock_trigger.client_id = 1

    mock_node_data = {
        "publishExternalEvent": True,  # Mesmo com toggle True, sem webhook não envia
        "content": "Qualquer mensagem"
    }

    await publish_node_external_event(
        db=MagicMock(),
        trigger=mock_trigger,
        data=mock_node_data,
        content="Qualquer mensagem",
        contact_phone="5511977777777",
        node_id="node_3"
    )

    mock_notify.assert_not_called()


@pytest.mark.asyncio
@patch("core.engine.events.get_setting", return_value="https://webhook.example.com/memory")
@patch("core.engine.events.notify_agent_memory_webhook", new_callable=AsyncMock)
async def test_publish_node_external_event_audio_type(mock_notify, mock_setting):
    """
    Nós de áudio também devem enviar memória automaticamente.
    """
    mock_trigger = MagicMock()
    mock_trigger.id = 789
    mock_trigger.client_id = 1
    mock_trigger.contact_name = "Usuário Áudio"

    mock_node_data = {
        "mediaUrl": "https://example.com/audio.mp3"
    }

    await publish_node_external_event(
        db=MagicMock(),
        trigger=mock_trigger,
        data=mock_node_data,
        content="https://example.com/audio.mp3",
        contact_phone="5511966666666",
        node_id="audio_node",
        event_type="funnel_audio_sent"
    )

    mock_notify.assert_called_once()
    call_kwargs = mock_notify.call_args.kwargs
    assert call_kwargs["content"] == "https://example.com/audio.mp3"
    assert call_kwargs["phone"] == "5511966666666"

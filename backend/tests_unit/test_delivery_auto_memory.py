import pytest
import os
import sys
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Mock DB SessionLocal
mock_db_session = MagicMock()

@pytest.fixture(autouse=True)
def setup_mocks():
    with patch("core.worker.handlers.whatsapp.SessionLocal", return_value=mock_db_session):
        yield

@pytest.mark.asyncio
@patch("services.ai_memory.notify_agent_memory_webhook", new_callable=AsyncMock)
@patch("core.worker.handlers.whatsapp.handle_deferred_post_delivery", new_callable=AsyncMock)
async def test_handle_whatsapp_event_dispatches_memory_for_webhook(mock_deferred, mock_notify):
    """
    Testa se o webhook de status 'delivered' chama notify_agent_memory_webhook
    quando publish_external_event=True (disparo de integração), mesmo sendo is_bulk=False.
    """
    # Configurar mock de dados da mensagem e do trigger
    mock_trigger = MagicMock()
    mock_trigger.id = 101
    mock_trigger.client_id = 1
    mock_trigger.contact_name = "Maria Silva"
    mock_trigger.template_name = "followup_template"
    mock_trigger.is_bulk = False
    mock_trigger.publish_external_event = True  # Ativo!
    
    mock_msg = MagicMock()
    mock_msg.trigger_id = 101
    mock_msg.status = "sent"
    mock_msg.delivered_counted = False
    mock_msg.phone_number = "5511999999999"
    mock_msg.template_name = "followup_template"
    mock_msg.content = "Olá Maria"
    
    # Simular queries do DB
    mock_db_session.query.return_value.filter.return_value.first.return_value = mock_msg
    mock_db_session.query.return_value.get.return_value = mock_trigger
    
    data = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "statuses": [
                                {
                                    "id": "wamid.123456",
                                    "status": "delivered",
                                    "recipient_id": "5511999999999",
                                    "pricing": {"category": "marketing", "billable": True}
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }
    
    from core.worker.handlers.whatsapp import handle_whatsapp_event
    await handle_whatsapp_event(data)
    
    # Deve chamar notify_agent_memory_webhook
    mock_notify.assert_called_once()
    call_kwargs = mock_notify.call_args.kwargs
    assert call_kwargs["client_id"] == mock_trigger.client_id
    assert call_kwargs["phone"] == "5511999999999"
    assert call_kwargs["template_name"] == "followup_template"


@pytest.mark.asyncio
@patch("services.ai_memory.notify_agent_memory_webhook", new_callable=AsyncMock)
@patch("core.worker.handlers.whatsapp.handle_deferred_post_delivery", new_callable=AsyncMock)
async def test_handle_whatsapp_event_no_memory_when_both_false(mock_deferred, mock_notify):
    """
    Testa se notify_agent_memory_webhook NÃO é chamado quando
    tanto is_bulk quanto publish_external_event são falsos.
    """
    mock_trigger = MagicMock()
    mock_trigger.id = 102
    mock_trigger.client_id = 1
    mock_trigger.contact_name = "Maria Silva"
    mock_trigger.is_bulk = False
    mock_trigger.publish_external_event = False  # Desativado
    
    mock_msg = MagicMock()
    mock_msg.trigger_id = 102
    mock_msg.status = "sent"
    mock_msg.delivered_counted = False
    mock_msg.phone_number = "5511999999999"
    mock_msg.template_name = "followup_template"
    mock_msg.content = "Olá Maria"
    
    mock_db_session.query.return_value.filter.return_value.first.return_value = mock_msg
    mock_db_session.query.return_value.get.return_value = mock_trigger
    
    data = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "statuses": [
                                {
                                    "id": "wamid.7890",
                                    "status": "delivered",
                                    "recipient_id": "5511999999999",
                                    "pricing": {"category": "marketing", "billable": True}
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }
    
    from core.worker.handlers.whatsapp import handle_whatsapp_event
    await handle_whatsapp_event(data)
    
    # Não deve chamar notify_agent_memory_webhook
    mock_notify.assert_not_called()

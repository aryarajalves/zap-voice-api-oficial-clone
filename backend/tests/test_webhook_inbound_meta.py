import sys
import os
import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import Request

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routers.webhooks_inbound.meta import meta_webhook_handler, GLOBAL_META_LOCKS

@pytest.mark.anyio
async def test_meta_webhook_handler_post_success(caplog):
    """
    Valida que o webhook da Meta processa payload JSON corretamente
    e não emite mais o dump bruto json.dumps [META_PAYLOAD] no log.
    """
    GLOBAL_META_LOCKS.clear()
    
    mock_payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "123456789",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "5511999999999",
                                "phone_number_id": "999888777"
                            },
                            "statuses": [
                                {
                                    "id": "wamid.test12345",
                                    "status": "delivered",
                                    "recipient_id": "5511988887777"
                                }
                            ]
                        },
                        "field": "messages"
                    }
                ]
            }
        ]
    }
    
    body_bytes = json.dumps(mock_payload).encode("utf-8")
    
    mock_request = MagicMock(spec=Request)
    mock_request.method = "POST"
    mock_request.body = AsyncMock(return_value=body_bytes)
    mock_request.headers = {}
    
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = None
    mock_db.query.return_value.join.return_value.filter.return_value.all.return_value = []
    
    with patch("routers.webhooks_inbound.meta.rabbitmq.publish", new_callable=AsyncMock) as mock_pub:
        with patch("routers.webhooks_inbound.meta.verify_meta_signature", return_value=True):
            response = await meta_webhook_handler(request=mock_request, db=mock_db, slug=None)
            
            assert response == {"status": "ok"}
            assert mock_pub.called
            
            # Garantir que o log poluído [META_PAYLOAD] NÃO está nos logs
            assert "📦 [META_PAYLOAD]" not in caplog.text

@pytest.mark.anyio
async def test_meta_webhook_handler_duplicate_ignored():
    """
    Valida que o atomic lock previne execução duplicada em menos de 5 segundos.
    """
    GLOBAL_META_LOCKS.clear()
    
    mock_payload = {"object": "whatsapp_business_account", "entry": []}
    body_bytes = json.dumps(mock_payload).encode("utf-8")
    
    mock_request = MagicMock(spec=Request)
    mock_request.method = "POST"
    mock_request.body = AsyncMock(return_value=body_bytes)
    mock_request.headers = {}
    
    mock_db = MagicMock()
    
    with patch("routers.webhooks_inbound.meta.rabbitmq.publish", new_callable=AsyncMock):
        with patch("routers.webhooks_inbound.meta.verify_meta_signature", return_value=True):
            res1 = await meta_webhook_handler(request=mock_request, db=mock_db, slug=None)
            assert res1 == {"status": "ok"}
            
            # Segunda chamada imediata com o mesmo payload deve ser ignorada
            res2 = await meta_webhook_handler(request=mock_request, db=mock_db, slug=None)
            assert res2.get("status") == "ignored"
            assert res2.get("reason") == "duplicate_meta_payload"

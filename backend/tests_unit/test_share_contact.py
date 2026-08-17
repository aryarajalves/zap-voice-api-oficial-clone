import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from main import app
from core.deps import get_db, get_current_user
import models

client = TestClient(app)

@pytest.fixture
def mock_current_user():
    return models.User(id=1, email="admin@zapvoice.com", role="super_admin", client_id=11)

@pytest.mark.asyncio
async def test_share_contact_official_meta_request():
    from core.clients.whatsapp.client import WhatsAppClient
    
    wa = WhatsAppClient(client_id=11)
    
    with patch.object(wa, "_meta_request", new_callable=AsyncMock) as mock_req:
        mock_req.return_value = {"messages": [{"id": "wamid.HBgLMTAw"}]}
        
        res = await wa.send_contact_official(
            to_phone="5585996123586",
            contact_name="Luana Ribeiro",
            contact_phone="554431421236"
        )
        
        assert "messages" in res
        mock_req.assert_called_once()
        call_args = mock_req.call_args
        assert call_args[0][0] == "POST"
        assert call_args[0][1] == "messages"
        json_payload = call_args[1]["json"]
        assert json_payload["type"] == "contacts"
        assert json_payload["to"] == "5585996123586"
        assert json_payload["contacts"][0]["name"]["formatted_name"] == "Luana Ribeiro"
        assert json_payload["contacts"][0]["phones"][0]["phone"] == "+554431421236"

def test_share_contact_route(mock_current_user):
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    
    mock_db = MagicMock()
    app.dependency_overrides[get_db] = lambda: mock_db
    
    mock_convo = models.ChatConversation(
        id=20,
        client_id=11,
        phone="5585996123586",
        contact_name="Aryaraj Fernandes",
        last_contact_message_at=datetime.now(timezone.utc)
    )
    
    mock_db.query.return_value.filter.return_value.first.return_value = mock_convo
    
    with patch("routers.chat.share_contact_routes.WhatsAppClient") as mock_get_wa:
        mock_wa_instance = MagicMock()
        mock_wa_instance.send_contact_official = AsyncMock(return_value={"messages": [{"id": "wamid.TEST_123"}]})
        mock_get_wa.return_value = mock_wa_instance
        
        with patch("rabbitmq_client.rabbitmq.publish_event", new_callable=AsyncMock):
            response = client.post(
                "/api/chat/conversations/share-contact",
                headers={"X-Client-ID": "11"},
                json={
                    "target_conversation_ids": [20],
                    "contact_name": "Luana Ribeiro",
                    "contact_phone": "554431421236",
                    "contact_id": 10
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["sent_count"] == 1
            assert len(data["messages"]) == 1
            assert data["messages"][0]["message_type"] == "contact"
            assert "Luana Ribeiro" in data["messages"][0]["content"]

    app.dependency_overrides.clear()

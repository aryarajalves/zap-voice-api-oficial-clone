import os
import pytest
import asyncio
from unittest.mock import MagicMock, patch

# Mock environment before imports to avoid database connection errors
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["CHATWOOT_API_TOKEN"] = "test_token"
os.environ["CHATWOOT_ACCOUNT_ID"] = "1"
os.environ["CHATWOOT_API_URL"] = "http://localhost"

from core.clients.chatwoot.client import ChatwootClient
from core.clients.whatsapp.client import WhatsAppClient
from chatwoot_client import ChatwootClient as FacadeClient

@pytest.mark.asyncio
async def test_chatwoot_client_modular_init():
    """Testa se o cliente modular inicializa corretamente."""
    with patch("core.clients.chatwoot.base.get_settings", return_value={"CHATWOOT_API_TOKEN": "test_token"}):
        client = ChatwootClient(account_id="123", client_id=1)
        assert client.account_id == "123"
        assert client.api_token == "test_token"
        assert "api_access_token" in client.headers

@pytest.mark.asyncio
async def test_facade_delegation():
    """Testa se a fachada delega corretamente as chamadas."""
    with patch("core.clients.chatwoot.base.get_settings", return_value={"CHATWOOT_API_TOKEN": "test_token"}):
        facade = FacadeClient(account_id="123", client_id=1)
        
        # Mocking the internal clients
        facade._cw.send_message = MagicMock(return_value=asyncio.Future())
        facade._cw.send_message.return_value.set_result({"success": True})
        
        facade._wa.send_template = MagicMock(return_value=asyncio.Future())
        facade._wa.send_template.return_value.set_result({"success": True})
        
        # Test Chatwoot delegation
        res_cw = await facade.send_message(1, "hello")
        assert res_cw["success"] is True
        facade._cw.send_message.assert_called_once_with(1, "hello")
        
        # Test WhatsApp delegation
        res_wa = await facade.send_template("5585999999999", "test_tpl")
        assert res_wa["success"] is True
        facade._wa.send_template.assert_called_once_with("5585999999999", "test_tpl")

@pytest.mark.asyncio
async def test_whatsapp_client_init():
    """Testa a inicialização do WhatsAppClient."""
    client = WhatsAppClient(client_id=1)
    assert client.client_id == 1

if __name__ == "__main__":
    pytest.main([__file__])

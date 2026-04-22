import unittest
from unittest.mock import MagicMock, patch
import asyncio
import json
from chatwoot_client import ChatwootClient

class TestChatwootAgents(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        # Mock settings to avoid DB connection during initialization
        self.patcher = patch('config_loader.get_settings')
        self.mock_get_settings = self.patcher.start()
        self.mock_get_settings.return_value = {
            "CHATWOOT_API_TOKEN": "test_token",
            "CHATWOOT_API_URL": "https://chatwoot.example.com",
            "CHATWOOT_ACCOUNT_ID": "1"
        }
        self.client = ChatwootClient(client_id=1)

    def tearDown(self):
        self.patcher.stop()

    @patch('httpx.AsyncClient.request')
    async def test_create_agent_success(self, mock_request):
        # Mock successful response from Chatwoot
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": 123, "name": "Test Agent", "email": "test@example.com"}
        mock_request.return_value = mock_response

        result = await self.client.create_agent(name="Test Agent", email="test@example.com")
        
        self.assertEqual(result["id"], 123)
        self.assertEqual(result["name"], "Test Agent")
        
        # Verify request details
        args, kwargs = mock_request.call_args
        self.assertEqual(args[0], "POST")
        self.assertTrue("agents" in args[1])
        self.assertEqual(kwargs["json"]["name"], "Test Agent")
        self.assertNotIn("availability", kwargs["json"])
        self.assertEqual(kwargs["headers"]["api_access_token"], "test_token")

    async def test_create_agent_no_token(self):
        # Setup client with no token
        self.client.api_token = ""
        
        with self.assertRaises(ValueError) as cm:
            await self.client.create_agent(name="Test", email="test@ex.com")
        
        self.assertEqual(str(cm.exception), "Chatwoot API Token não configurado.")

    @patch('httpx.AsyncClient.request')
    async def test_create_agent_error(self, mock_request):
        # Mock error response from Chatwoot
        mock_response = MagicMock()
        mock_response.status_code = 422
        mock_response.text = "Email already exists"
        mock_request.return_value = mock_response
        
        from httpx import HTTPStatusError, Request
        mock_response.raise_for_status.side_effect = HTTPStatusError(
            "Error", request=Request("POST", "url"), response=mock_response
        )

        with self.assertRaises(HTTPStatusError):
            await self.client.create_agent(name="Test", email="test@ex.com")

if __name__ == '__main__':
    unittest.main()

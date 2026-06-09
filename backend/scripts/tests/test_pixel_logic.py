import unittest
from unittest.mock import AsyncMock, patch, MagicMock
import sys
import os

# Adiciona o diretório do backend ao sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from core.engine.nodes.pixel import handle_pixel_node

class TestPixelNode(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        self.db_mock = MagicMock()
        self.trigger_mock = MagicMock()
        self.trigger_mock.contact_name = "Arya Stark"

    @patch("httpx.AsyncClient.post")
    async def test_pixel_node_success(self, mock_post):
        # Mock do retorno da API do Facebook
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"fbtrace_id": "xyz123"}
        mock_post.return_value = mock_response

        node = {
            "id": "node_pixel_test",
            "data": {
                "pixelId": "999999999",
                "accessToken": "EAABtest_token",
                "eventName": "Purchase",
                "value": "97.50",
                "currency": "USD"
            }
        }

        # Executa a função do nó de pixel
        result = await handle_pixel_node(self.db_mock, self.trigger_mock, node, "5585999999999")

        # Verifica se o fluxo continua na porta default
        self.assertEqual(result, "default")
        # Garante que a requisição post foi chamada
        mock_post.assert_called_once()
        
        # Valida os argumentos passados para o post
        args, kwargs = mock_post.call_args
        self.assertIn("999999999/events", args[0])
        self.assertEqual(kwargs["params"]["access_token"], "EAABtest_token")
        
        payload = kwargs["json"]
        self.assertEqual(len(payload["data"]), 1)
        event = payload["data"][0]
        self.assertEqual(event["event_name"], "Purchase")
        self.assertEqual(event["custom_data"]["value"], 97.50)
        self.assertEqual(event["custom_data"]["currency"], "USD")
        self.assertIn("ph", event["user_data"])
        self.assertIn("fn", event["user_data"])

    async def test_pixel_node_ignored_when_missing_config(self):
        node = {
            "id": "node_pixel_test",
            "data": {
                "pixelId": "",
                "accessToken": "",
                "eventName": "Lead"
            }
        }

        result = await handle_pixel_node(self.db_mock, self.trigger_mock, node, "5585999999999")
        self.assertEqual(result, "default")

if __name__ == "__main__":
    unittest.main()

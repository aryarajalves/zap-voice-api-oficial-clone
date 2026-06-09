import unittest
from unittest.mock import AsyncMock, patch, MagicMock
import sys
import os

# Adiciona o diretório do backend ao sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from core.engine.nodes.send_template import handle_send_template_node

class TestSendTemplateNode(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        self.db_mock = MagicMock()
        self.trigger_mock = MagicMock()
        self.trigger_mock.client_id = 1
        self.trigger_mock.is_bulk = False
        self.chatwoot_mock = AsyncMock()
        self.apply_vars_func = lambda x: x

    @patch("core.engine.nodes.send_template.wait_for_delivery_sync")
    async def test_send_template_success(self, mock_wait_sync):
        # Configura o retorno de sucesso do chatwoot
        self.chatwoot_mock.send_template.return_value = {
            "messages": [{"id": "wamid.test_msg_id"}]
        }
        
        mock_wait_sync.return_value = ("delivered", "Entregue")

        node = {
            "id": "node_send_tpl_test",
            "data": {
                "templateName": "boas_vindas",
                "language": "pt_BR",
                "mappings": [
                    {"paramIndex": 1, "value": "João"},
                    {"paramIndex": 2, "value": "12345"}
                ]
            }
        }

        result = await handle_send_template_node(
            self.db_mock, self.trigger_mock, node, self.chatwoot_mock, 
            "5585999999999", self.apply_vars_func
        )

        self.assertEqual(result, "success")
        
        # Garante que os parâmetros do template foram ordenados e formatados
        self.chatwoot_mock.send_template.assert_called_once_with(
            "5585999999999", "boas_vindas", "pt_BR",
            [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": "João"},
                        {"type": "text", "text": "12345"}
                    ]
                }
            ]
        )

    async def test_send_template_with_quick_reply_buttons(self):
        db = MagicMock()
        trigger = MagicMock()
        trigger.client_id = 1
        trigger.is_bulk = False
        trigger.total_sent = 0
        node = {"id": "node_send_template_1", "data": {"templateName": "my_tpl", "language": "pt_BR"}}
        chatwoot = AsyncMock()
        chatwoot.send_template.return_value = {"messages": [{"id": "wamid.12345"}]}
        contact_phone = "5585999999999"
        apply_vars_func = lambda x: x

        # Mocking WhatsAppTemplateCache lookup to simulate template with QUICK_REPLY buttons
        mock_tpl = MagicMock()
        mock_tpl.body = "Hello"
        mock_tpl.components = [
            {"type": "BUTTONS", "buttons": [{"type": "QUICK_REPLY", "text": "Yes"}]}
        ]

        with patch("core.engine.nodes.send_template.wait_for_delivery_sync", new_callable=AsyncMock) as mock_wait, \
             patch("core.engine.nodes.send_template.log_node_execution") as mock_log:
            mock_wait.return_value = ("completed", "delivered")
            db.query().filter().first.return_value = mock_tpl

            res = await handle_send_template_node(db, trigger, node, chatwoot, contact_phone, apply_vars_func)
            self.assertEqual(res, "stop")
            self.assertEqual(trigger.status, "suspended")
            db.commit.assert_called()

    async def test_send_template_api_failure(self):
        # Caso a API retorne erro
        self.chatwoot_mock.send_template.return_value = {
            "error": "TemplateNotFound",
            "detail": "Template boas_vindas não existe"
        }

        node = {
            "id": "node_send_tpl_test",
            "data": {
                "templateName": "boas_vindas",
                "language": "pt_BR",
                "mappings": []
            }
        }

        result = await handle_send_template_node(
            self.db_mock, self.trigger_mock, node, self.chatwoot_mock, 
            "5585999999999", self.apply_vars_func
        )

        self.assertEqual(result, "fail")

if __name__ == "__main__":
    unittest.main()

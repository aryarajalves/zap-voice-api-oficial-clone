import unittest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone, timedelta
from core.engine.nodes.input_data import handle_input_data_node
import models

class TestInputDataNode(unittest.IsolatedAsyncioTestCase):
    @patch("core.engine.nodes.input_data.get_best_conversation")
    @patch("core.engine.nodes.input_data.is_window_open_strict")
    async def test_input_data_node_first_time_suspends(self, mock_window, mock_best_conv):
        mock_window.return_value = True
        mock_best_conv.return_value = 123
        db = MagicMock()
        trigger = MagicMock()
        trigger.client_id = 1
        trigger.created_at = datetime.now(timezone.utc)
        trigger.execution_history = []
        node = {
            "id": "node_input_1",
            "data": {
                "collectionType": "traditional",
                "varName": "email_cliente",
                "validationRule": "email",
                "timeoutValue": 2,
                "timeoutUnit": "hours",
                "errorMessage": "Email inválido. Digite novamente."
            }
        }
        chatwoot = AsyncMock()
        contact_phone = "5585999999999"
        apply_vars_func = lambda x: x
        funnel = MagicMock()

        res = await handle_input_data_node(db, trigger, node, chatwoot, 123, contact_phone, apply_vars_func, funnel)
        self.assertEqual(res["status"], "stop")
        self.assertEqual(trigger.status, "suspended")
        self.assertIsNotNone(trigger.scheduled_time)
        db.commit.assert_called()

    @patch("core.engine.nodes.input_data.get_best_conversation")
    @patch("core.engine.nodes.input_data.is_window_open_strict")
    async def test_input_data_node_sends_question(self, mock_window, mock_best_conv):
        mock_window.return_value = True
        mock_best_conv.return_value = 123
        db = MagicMock()
        db.query.return_value.filter_by.return_value.first.return_value = None
        trigger = MagicMock()
        trigger.client_id = 1
        trigger.created_at = datetime.now(timezone.utc)
        trigger.execution_history = []
        trigger.total_sent = 0
        node = {
            "id": "node_input_1",
            "data": {
                "collectionType": "traditional",
                "varName": "email_cliente",
                "validationRule": "email",
                "timeoutValue": 2,
                "timeoutUnit": "hours",
                "question": "Qual seu email?"
            }
        }
        chatwoot = AsyncMock()
        chatwoot.send_message.return_value = {"source_id": "test_msg_123"}
        contact_phone = "5585999999999"
        apply_vars_func = lambda x: x
        funnel = MagicMock()

        res = await handle_input_data_node(db, trigger, node, chatwoot, 123, contact_phone, apply_vars_func, funnel)
        self.assertEqual(res["status"], "stop")
        chatwoot.send_message.assert_called_once_with(123, "Qual seu email?")
        db.add.assert_called_once()  # MessageStatus saved

    @patch("core.engine.nodes.input_data.get_best_conversation")
    @patch("core.engine.nodes.input_data.is_window_open_strict")
    async def test_input_data_node_expired_timeout(self, mock_window, mock_best_conv):
        mock_window.return_value = True
        mock_best_conv.return_value = 123
        db = MagicMock()
        trigger = MagicMock()
        trigger.client_id = 1
        trigger.created_at = datetime.now(timezone.utc) - timedelta(hours=3)
        two_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        trigger.execution_history = [
            {"node_id": "node_input_1", "status": "suspended", "timestamp": two_hours_ago}
        ]
        node = {
            "id": "node_input_1",
            "data": {
                "collectionType": "traditional",
                "varName": "email_cliente",
                "validationRule": "email",
                "timeoutValue": 1,
                "timeoutUnit": "hours"
            }
        }
        chatwoot = AsyncMock()
        contact_phone = "5585999999999"
        apply_vars_func = lambda x: x
        funnel = MagicMock()

        res = await handle_input_data_node(db, trigger, node, chatwoot, 123, contact_phone, apply_vars_func, funnel)
        self.assertEqual(res, "timeout")

    def test_traditional_validation_logic(self):
        # Testando Regex de E-mail
        import re
        extracted_val = "Meu email é teste@gmail.com por favor salve"
        match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", extracted_val)
        self.assertIsNotNone(match)
        self.assertEqual(match.group(0), "teste@gmail.com")

        # Testando CPF
        extracted_val_cpf = "Meu cpf é 123.456.789-00"
        nums = re.sub(r"\D", "", extracted_val_cpf)
        self.assertEqual(nums, "12345678900")

    @patch("core.engine.nodes.input_data.get_best_conversation")
    @patch("core.engine.nodes.input_data.is_window_open_strict")
    @patch("core.engine.nodes.input_data.log_node_execution")
    @patch("core.engine.nodes.input_data.datetime")
    async def test_input_data_node_timezone_formatting(self, mock_datetime, mock_log_execution, mock_window, mock_best_conv):
        mock_window.return_value = True
        mock_best_conv.return_value = 123
        
        # Configurar mock de datetime
        fake_now = datetime(2026, 6, 8, 10, 44, 48, tzinfo=timezone.utc)
        mock_datetime.now.return_value = fake_now
        mock_datetime.fromisoformat = datetime.fromisoformat
        
        db = MagicMock()
        trigger = MagicMock()
        trigger.client_id = 1
        trigger.created_at = fake_now
        trigger.execution_history = []
        node = {
            "id": "node_input_1",
            "data": {
                "collectionType": "traditional",
                "varName": "email_cliente",
                "validationRule": "email",
                "timeoutValue": 2,
                "timeoutUnit": "hours"
            }
        }
        chatwoot = AsyncMock()
        contact_phone = "5585999999999"
        apply_vars_func = lambda x: x
        funnel = MagicMock()

        res = await handle_input_data_node(db, trigger, node, chatwoot, 123, contact_phone, apply_vars_func, funnel)
        self.assertEqual(res["status"], "stop")
        
        # Expiration time is fake_now + 2 hours = 2026-06-08T12:44:48+00:00 UTC.
        # Brasília time = 2026-06-08T09:44:48-03:00.
        # Formatted = "08/06/26 09:44"
        mock_log_execution.assert_called_with(
            db, trigger, "node_input_1", "suspended",
            "⏳ Aguardando entrada de dados do contato por até 2 hours (Prazo: 08/06/26 09:44)."
        )



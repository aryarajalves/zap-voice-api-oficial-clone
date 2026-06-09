import unittest
from unittest.mock import AsyncMock, patch, MagicMock
import sys
import os

# Adiciona o diretório do backend ao sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from core.engine.nodes.crm_actions import handle_crm_actions_node

class TestCrmActionsNode(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        self.db_mock = MagicMock()
        self.trigger_mock = MagicMock()
        self.trigger_mock.contact_name = "Arya Stark"
        self.chatwoot_mock = AsyncMock()
        self.apply_vars_func = lambda x: x

    async def test_chatwoot_labels_bulk(self):
        node = {
            "id": "node_crm_test",
            "data": {
                "platform": "chatwoot",
                "action": "chatwoot_label",
                "label": "cliente-vip, lead-quente",
                "remove_label": "lead-frio"
            }
        }
        
        self.chatwoot_mock.search_contact.return_value = {
            "payload": [{"id": 1234}]
        }

        result = await handle_crm_actions_node(
            self.db_mock, self.trigger_mock, node, self.chatwoot_mock, 
            "5585999999999", "777", self.apply_vars_func
        )

        self.assertEqual(result, "default")
        self.chatwoot_mock.add_label_to_conversation.assert_called_once_with("777", ["cliente-vip", "lead-quente"])
        self.chatwoot_mock.add_label_to_contact.assert_called_once_with(1234, ["cliente-vip", "lead-quente"])
        self.chatwoot_mock.remove_label_from_conversation.assert_called_once_with("777", ["lead-frio"])
        self.chatwoot_mock.remove_label_from_contact.assert_called_once_with(1234, ["lead-frio"])

    async def test_chatwoot_update_contact_manual(self):
        node = {
            "id": "node_crm_test",
            "data": {
                "platform": "chatwoot",
                "action": "update_contact",
                "nameType": "fixed",
                "newName": "Jon Snow"
            }
        }
        
        self.chatwoot_mock.search_contact.return_value = {
            "payload": [{"id": 1234}]
        }

        result = await handle_crm_actions_node(
            self.db_mock, self.trigger_mock, node, self.chatwoot_mock, 
            "5585999999999", "777", self.apply_vars_func
        )

        self.assertEqual(result, "default")
        self.chatwoot_mock.update_contact.assert_called_once_with(1234, {"name": "Jon Snow"})

    async def test_chatwoot_add_private_note(self):
        node = {
            "id": "node_crm_test",
            "data": {
                "platform": "chatwoot",
                "action": "add_private_note",
                "value": "Nota de teste do ZapVoice"
            }
        }

        result = await handle_crm_actions_node(
            self.db_mock, self.trigger_mock, node, self.chatwoot_mock, 
            "5585999999999", "777", self.apply_vars_func
        )

        self.assertEqual(result, "default")
        self.chatwoot_mock.send_private_note.assert_called_once_with("777", "Nota de teste do ZapVoice")

    async def test_chatwoot_change_assignee(self):
        node = {
            "id": "node_crm_test",
            "data": {
                "platform": "chatwoot",
                "action": "change_assignee",
                "value": "45"
            }
        }

        result = await handle_crm_actions_node(
            self.db_mock, self.trigger_mock, node, self.chatwoot_mock, 
            "5585999999999", "777", self.apply_vars_func
        )

        self.assertEqual(result, "default")
        self.chatwoot_mock.assign_agent_to_conversation.assert_called_once_with("777", 45)

if __name__ == "__main__":
    unittest.main()

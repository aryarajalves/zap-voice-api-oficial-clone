import unittest
from unittest.mock import AsyncMock, MagicMock, patch
from core.engine.nodes.check_window import handle_check_window_node

class TestCheckWindowNode(unittest.IsolatedAsyncioTestCase):
    async def test_check_window_open(self):
        db = MagicMock()
        trigger = MagicMock()
        trigger.client_id = 1
        node = {"id": "node_check_1", "data": {}}
        chatwoot = AsyncMock()
        contact_phone = "5585999999999"
        conversation_id = 123

        with patch("core.engine.nodes.check_window.is_window_open_strict", new_callable=AsyncMock) as mock_is_open:
            mock_is_open.return_value = True

            res = await handle_check_window_node(db, trigger, node, chatwoot, contact_phone, conversation_id)
            self.assertEqual(res, "open")
            mock_is_open.assert_called_once_with(
                client_id=1,
                phone=contact_phone,
                current_conversation_id=conversation_id,
                db=db,
                chatwoot=chatwoot
            )

    async def test_check_window_closed(self):
        db = MagicMock()
        trigger = MagicMock()
        trigger.client_id = 1
        node = {"id": "node_check_1", "data": {}}
        chatwoot = AsyncMock()
        contact_phone = "5585999999999"
        conversation_id = 123

        with patch("core.engine.nodes.check_window.is_window_open_strict", new_callable=AsyncMock) as mock_is_open:
            mock_is_open.return_value = False

            res = await handle_check_window_node(db, trigger, node, chatwoot, contact_phone, conversation_id)
            self.assertEqual(res, "closed")

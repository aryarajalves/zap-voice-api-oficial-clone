import unittest
from unittest.mock import MagicMock, patch, AsyncMock
import asyncio

class TestInboundAsyncioFix(unittest.IsolatedAsyncioTestCase):
    @patch('core.worker.handlers.whatsapp.normalize_phone_inbound', return_value="5551998295665")
    @patch('core.worker.handlers.whatsapp.GLOBAL_PROCESSING_LOCKS', {})
    @patch('services.triggers_service.cancel_pending_followups_for_phone')
    @patch('core.worker.handlers.whatsapp.ChatwootClient')
    async def test_asyncio_not_shadowed(self, mock_cw, mock_cancel, mock_norm):
        from core.worker.handlers.whatsapp_inbound import handle_whatsapp_inbound_messages
        
        db = MagicMock()
        db.bind = None
        db.query.return_value.filter.return_value.all.return_value = []
        db.query.return_value.filter.return_value.first.return_value = None
        db.query.return_value.get.return_value = None

        messages = [{
            "id": "wamid.123",
            "from": "5551998295665",
            "type": "button",
            "button": {"text": "Confirmo!"}
        }]
        value = {"contacts": [{"wa_id": "5551998295665"}]}
        metadata = {"phone_number_id": "123456"}

        # Não deve lançar UnboundLocalError: cannot access local variable 'asyncio'
        try:
            await handle_whatsapp_inbound_messages(db, messages, value, metadata)
            success = True
        except UnboundLocalError as e:
            success = False
            self.fail(f"UnboundLocalError lançado: {e}")

        self.assertTrue(success)

if __name__ == "__main__":
    unittest.main()

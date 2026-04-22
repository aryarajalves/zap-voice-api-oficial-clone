import sys
import os
import unittest
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timezone

# Adicionar o diretório backend ao PYTHONPATH
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Mock rabbitmq_client ANTES de importar worker para evitar conflitos com pacotes instalados
import sys
from unittest.mock import MagicMock
sys.modules['rabbitmq_client'] = MagicMock()
sys.modules['rabbitmq_client'].rabbitmq = MagicMock()

import models
from worker import handle_whatsapp_event

class TestDuplicationFix(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        # Mocks para DB
        self.db = MagicMock()
        self.mock_session_local = patch('worker.SessionLocal', return_value=self.db)
        self.mock_session_local.start()

        # Mock para RabbitMQ
        self.mock_rabbitmq = patch('worker.rabbitmq', new_callable=AsyncMock)
        self.mock_rabbitmq.start()

        # Mock para AI Memory
        self.mock_ai_memory = patch('worker.notify_ai_memory', new_callable=AsyncMock)
        self.mock_ai_memory.start()

        # Mock para Config Loader
        self.mock_get_setting = patch('worker.get_setting', return_value="")
        self.mock_get_setting.start()

    def tearDown(self):
        patch.stopall()

    @patch('chatwoot_client.ChatwootClient')
    async def test_session_message_skips_sync(self, MockChatwootClient):
        # Configurar Mock do Chatwoot
        mock_cw = MagicMock() # Will wrap methods as AsyncMocks
        mock_cw.get_default_whatsapp_inbox = AsyncMock(return_value=1)
        mock_cw.ensure_conversation = AsyncMock(return_value={"conversation_id": 123, "account_id": 1})
        mock_cw.send_message = AsyncMock()
        MockChatwootClient.return_value = mock_cw

        # Mock do MessageStatus como FREE_MESSAGE
        mock_trigger = MagicMock(
            id=102, 
            client_id=1, 
            conversation_id=None, 
            label_added=False, 
            is_bulk=False,
            total_sent=1,
            total_delivered=0,
            total_failed=0,
            total_read=0,
            total_interactions=0,
            total_blocked=0,
            total_cost=0.0,
            total_memory_sent=0,
            cost_per_unit=0.0,
            contacts_list=[],
            processed_contacts=[],
            pending_contacts=[]
        )
        mock_message = MagicMock(
            message_id="abc123session",
            phone_number="558596123586",
            status="sent",
            message_type="FREE_MESSAGE",
            content="Mensagem de Sessao",
            trigger=mock_trigger,
            meta_price_brl=0.0
        )

        # Mock da Query do SQLAlchemy
        self.db.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = mock_message
        self.db.query.return_value.filter.return_value.first.return_value = None

        # Dados do Webhook (Status Delivered)
        webhook_data = {
            "entry": [{
                "changes": [{
                    "value": {
                        "statuses": [{
                            "id": "wamid.abc123session",
                            "status": "delivered",
                            "recipient_id": "558596123586",
                            "timestamp": "1713626644"
                        }]
                    }
                }]
            }]
        }

        # Executar handler
        await handle_whatsapp_event(webhook_data)

        # VERIFICACOES
        mock_cw.send_message.assert_not_called()
        print("Done: Sync de FREE_MESSAGE foi pulado como esperado.")

    @patch('chatwoot_client.ChatwootClient')
    async def test_template_message_performs_sync(self, MockChatwootClient):
        # Configurar Mock do Chatwoot
        mock_cw = MagicMock()
        mock_cw.get_default_whatsapp_inbox = AsyncMock(return_value=1)
        mock_cw.ensure_conversation = AsyncMock(return_value={"conversation_id": 456, "account_id": 1})
        mock_cw.send_message = AsyncMock()
        MockChatwootClient.return_value = mock_cw

        # Mock do MessageStatus como TEMPLATE
        mock_trigger = MagicMock(
            id=103, 
            client_id=1, 
            conversation_id=None, 
            label_added=False, 
            is_bulk=False,
            total_sent=1,
            total_delivered=0,
            total_failed=0,
            total_read=0,
            total_interactions=0,
            total_blocked=0,
            total_cost=0.0,
            total_memory_sent=0,
            cost_per_unit=0.0,
            contacts_list=[],
            processed_contacts=[],
            pending_contacts=[]
        )
        mock_message = MagicMock(
            message_id="abc123template",
            phone_number="558596123586",
            status="sent",
            message_type="TEMPLATE",
            content="Ola, este e um template",
            trigger=mock_trigger,
            meta_price_brl=0.0
        )

        # Mock da Query do SQLAlchemy
        self.db.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = mock_message
        self.db.query.return_value.filter.return_value.first.return_value = None

        # Dados do Webhook (Status Delivered)
        webhook_data = {
            "entry": [{
                "changes": [{
                    "value": {
                        "statuses": [{
                            "id": "wamid.abc123template",
                            "status": "delivered",
                            "recipient_id": "558596123586",
                            "timestamp": "1713626644"
                        }]
                    }
                }]
            }]
        }

        # Executar handler
        await handle_whatsapp_event(webhook_data)

        # VERIFICACOES
        mock_cw.send_message.assert_called_once_with(456, "Ola, este e um template", message_type="outgoing")
        print("Done: Sync de TEMPLATE foi executado como esperado.")

if __name__ == "__main__":
    unittest.main()

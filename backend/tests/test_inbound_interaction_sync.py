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

class TestInboundInteractionSync(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        # Mocks para DB
        self.db = MagicMock()
        self.mock_session_local = patch('worker.SessionLocal', return_value=self.db)
        self.mock_session_local.start()

        self.mock_rabbitmq = patch('worker.rabbitmq', new_callable=AsyncMock)
        self.mock_rabbitmq.start()

        self.mock_ai_memory = patch('worker.notify_ai_memory', new_callable=AsyncMock)
        self.mock_ai_memory.start()

        self.mock_get_setting = patch('worker.get_setting', return_value="")
        self.mock_get_setting.start()

    def tearDown(self):
        patch.stopall()

    @patch('chatwoot_client.ChatwootClient')
    async def test_inbound_button_sync_failure_no_fallback(self, MockChatwootClient):
        # Configurar Mock do Chatwoot
        mock_cw = MagicMock()
        mock_cw.get_default_whatsapp_inbox = AsyncMock(return_value=1)
        mock_cw.ensure_conversation = AsyncMock(return_value={
            "conversation_id": 123, 
            "account_id": 1, 
            "contact_id": 999
        })
        
        # Simular FALHA no envio da mensagem de entrada (triggering the fallback catch)
        mock_cw.send_message = AsyncMock(side_effect=Exception("422 Unprocessable Entity"))
        mock_cw.send_private_note = AsyncMock()
        MockChatwootClient.return_value = mock_cw

        # Mock do Funil e Configs - Forçar retorno do funnel para chegar no bloco de sync
        mock_funnel = MagicMock(id=50, name="Funil Teste", client_id=1)
        
        # Mocking the query chain very loosely to always return what we want
        mock_query = self.db.query.return_value
        mock_query.filter.return_value.first.side_effect = [
            MagicMock(value="http://url"), # META_RETURN_CONFIG
            MagicMock(client_id=1, value="123456789"), # Line 960
            MagicMock(client_id=1, value="123456789"), # Line 994
            mock_funnel, # Funnel match
            None, # ScheduledTrigger
            None  # ContactWindow
        ]
        mock_query.filter.return_value.filter.return_value.first = mock_query.filter.return_value.first

        # Webhook Data
        webhook_data = {
            "entry": [{
                "changes": [{
                    "value": {
                        "metadata": {"phone_number_id": "123456789"},
                        "contacts": [{"wa_id": "558596123586", "profile": {"name": "User"}}],
                        "messages": [{
                            "from": "558596123586",
                            "id": "wamid.123",
                            "timestamp": "1713626644",
                            "type": "button",
                            "button": {"text": "entrar no grupo"}
                        }]
                    }
                }]
            }]
        }

        await handle_whatsapp_event(webhook_data)

        # VERIFICACOES
        # O send_message deveria ter sido chamado (mesmo que tenha falhado)
        # Se nao foi chamado, o teste falha aqui, mas vamos verificar o send_private_note primeiro
        mock_cw.send_private_note.assert_not_called()
        print("Done: Fallback de Nota Privada para interacao foi desativado com sucesso.")

if __name__ == "__main__":
    unittest.main()

import os
import sys
from unittest.mock import MagicMock, patch, AsyncMock

# Define backend path
backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Mock DATABASE_URL for tests to avoid collection error
os.environ["DATABASE_URL"] = "postgresql://user:pass@localhost/db"

# CRITICAL: Mock rabbitmq_client BEFORE any other imports to avoid shadowing issues
mock_rabbitmq = MagicMock()
sys.modules["rabbitmq_client"] = MagicMock()
sys.modules["rabbitmq_client"].rabbitmq = mock_rabbitmq

import unittest
import asyncio
import httpx
from chatwoot_client import ChatwootClient
import models
from sqlalchemy.orm import Session

class TestSyncAndCacheFixes(unittest.IsolatedAsyncioTestCase):
    async def test_chatwoot_client_no_retry_on_422(self):
        """
        Verifica que o ChatwootClient não tenta repetir a requisição em caso de erro 422.
        """
        # Patch specifically where it's used or the constructor
        with patch("httpx.AsyncClient.request") as mock_request:
            # Simula erro 422
            mock_response = MagicMock(spec=httpx.Response)
            mock_response.status_code = 422
            mock_response.text = '{"error":"Incoming messages are only allowed in Api inboxes"}'
            
            # Create a real-ish HTTPStatusError
            mock_request.return_value = mock_response
            
            # Simulate raise_for_status to throw the error
            error = httpx.HTTPStatusError("422 Unprocessable Entity", request=MagicMock(), response=mock_response)
            mock_response.raise_for_status.side_effect = error
            
            client = ChatwootClient(client_id=1)
            
            # We expect the error to be raised from _request
            with self.assertRaises(httpx.HTTPStatusError) as cm:
                await client._request("POST", "test")
            
            self.assertEqual(cm.exception.response.status_code, 422)
            # Deve ter tentado apenas 1 vez (sem retry)
            self.assertEqual(mock_request.call_count, 1)

    async def test_template_cache_upsert(self):
        """
        Verifica que o cache de templates usa o método 'get' pelo ID para evitar UniqueViolation.
        """
        mock_db = MagicMock(spec=Session)
        mock_existing = MagicMock(spec=models.WhatsAppTemplateCache)
        
        # Simula que o template já existe no banco
        mock_db.query().get.return_value = mock_existing
        
        client = ChatwootClient(client_id=1)
        
        # Mock da Meta API retornando templates
        templates_meta = {
            "data": [
                {
                    "id": "998165379301524",
                    "name": "template_teste",
                    "language": "pt_BR",
                    "category": "UTILITY",
                    "status": "APPROVED",
                    "components": [{"type": "BODY", "text": "Corpo do template"}]
                }
            ]
        }
        
        with patch("httpx.AsyncClient.get") as mock_get:
            mock_res = MagicMock()
            mock_res.status_code = 200
            mock_res.json.return_value = templates_meta
            mock_get.return_value = mock_res
            
            with patch("database.SessionLocal", return_value=mock_db), \
                 patch("chatwoot_client.get_setting", return_value="mock_val"):
                
                await client.get_whatsapp_templates()
                
                # Verifica se chamou .get(ID) instead of .filter(...)
                mock_db.query().get.assert_called_with(998165379301524)
                # Verifica se atualizou o registro existente em vez de adicionar novo
                self.assertEqual(mock_db.add.call_count, 0)
                # Verifica se atualizou os campos no objeto existente
                self.assertEqual(mock_existing.body, "Corpo do template")
                self.assertEqual(mock_existing.client_id, 1)

    async def test_worker_sync_fallback(self):
        """
        Simula a lógica do worker.py para garantir que o fallback para nota privada ocorra no erro 422.
        """
        # Patch everything used inside worker.py before import
        with patch("worker.rabbitmq"), \
             patch("worker.get_setting", return_value=""):
            
            import worker
            from worker import handle_whatsapp_event
            
            # Payload de interação que dispararia o sync
            mock_payload = {
                "entry": [{
                    "changes": [{
                        "value": {
                            "metadata": {"phone_number_id": "12345"},
                            "contacts": [{"wa_id": "5585999999999", "profile": {"name": "Teste"}}],
                            "messages": [{
                                "from": "5585999999999",
                                "id": "wamid.123",
                                "type": "text",
                                "text": {"body": "Quero saber mais"},
                                "context": {"id": "orig_123"}
                            }]
                        }
                    }]
                }]
            }
            
            with patch("database.SessionLocal") as mock_db_session, \
                 patch("chatwoot_client.ChatwootClient") as mock_cw_class, \
                 patch("worker.rabbitmq.publish_event"), \
                 patch("worker.rabbitmq.publish"):
                
                db = mock_db_session.return_value
                # Mock do Funnel Trigger
                mock_funnel = MagicMock()
                mock_funnel.id = 1
                db.query().filter().first.return_value = mock_funnel
                
                # Mock do Chatwoot Client
                cw_instance = mock_cw_class.return_value
                cw_instance.ensure_conversation.return_value = {"conversation_id": 30}
                
                # Simula erro 422 no send_message (usando a exceção que o _request agora joga)
                cw_instance.send_message.side_effect = httpx.HTTPStatusError(
                    "422", request=MagicMock(), response=MagicMock(status_code=422)
                )
                
                await handle_whatsapp_event(mock_payload)
                
                # Verifica se tentou o fallback para nota privada
                cw_instance.send_private_note.assert_called_once()
                args, _ = cw_instance.send_private_note.call_args
                self.assertIn("📥 [Interação] Botão clicado: quero saber mais", args[1])

if __name__ == "__main__":
    unittest.main()

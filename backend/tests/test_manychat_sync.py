import sys
import os
import unittest
import asyncio
from unittest.mock import MagicMock, patch, AsyncMock
import uuid

# Adiciona o diretório backend ao path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# ⚠️ OBRIGATÓRIO: Definir DATABASE_URL antes de importar models/database
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

# Mock RabbitMQ
sys.modules['rabbitmq_client'] = MagicMock()
import rabbitmq_client
rabbitmq_client.rabbitmq = AsyncMock()

import models
from database import SessionLocal, engine
from services.manychat import sync_to_manychat, sync_to_manychat_and_update_history

# Cria as tabelas necessárias se estiver usando SQLite
if str(engine.url).startswith("sqlite"):
    models.Base.metadata.create_all(bind=engine)

class TestManyChatSync(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.client_id = 999
        self.integration_id = uuid.uuid4()
        
        # Cria registros mock no banco para testar
        self.webhook_history = models.WebhookHistory(
            integration_id=self.integration_id,
            processed_data={},
            payload={}
        )
        self.db.add(self.webhook_history)
        self.db.commit()
        self.db.refresh(self.webhook_history)

    def tearDown(self):
        self.db.query(models.WebhookHistory).delete()
        self.db.commit()
        self.db.close()

    @patch('services.manychat.get_settings')
    @patch('httpx.AsyncClient')
    async def test_sync_to_manychat_email_deep_scan(self, mock_client, mock_get_settings):
        """
        Verifica se o Deep Scan localiza o contato via E-mail quando a criação direta
        retorna 400 (already exists).
        """
        print("\n--- Testando Deep Scan por E-mail no ManyChat ---")
        
        mock_get_settings.return_value = {"MANYCHAT_API_KEY": "fake_key_123"}
        
        # Mocks para as requisições HTTPX
        mock_instance = mock_client.return_value.__aenter__.return_value
        
        # 1. Post para criar contato: retorna 400 informando que já existe
        mock_resp_create = MagicMock()
        mock_resp_create.status_code = 400
        mock_resp_create.text = "Subscriber already exists"
        
        # 2. Get para findBySystemField por email: retorna o subscriber_id
        mock_resp_email = MagicMock()
        mock_resp_email.status_code = 200
        mock_resp_email.json.return_value = {"data": [{"id": 1234567}]}
        
        # 3. Post para criar/garantir Tag
        mock_resp_tag_create = MagicMock()
        mock_resp_tag_create.status_code = 200
        
        # 4. Post para aplicar Tag
        mock_resp_tag_apply = MagicMock()
        mock_resp_tag_apply.status_code = 200
        
        # Configura as respostas sequenciais do Mock HTTPX
        mock_instance.post.side_effect = [mock_resp_create, mock_resp_tag_create, mock_resp_tag_apply]
        mock_instance.get.side_effect = [mock_resp_email]
        
        result = await sync_to_manychat(
            client_id=self.client_id,
            name="Test User",
            phone="5511999999999",
            tag="TagTeste",
            email="test@example.com"
        )
        
        # Asserções
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["contact"]["status"], "existed")
        self.assertEqual(result["contact"]["id"], 1234567)
        self.assertEqual(result["tag"]["status"], "applied")
        print("OK: Teste de Deep Scan por E-mail no ManyChat passou!")

    @patch('services.manychat.get_settings')
    @patch('httpx.AsyncClient')
    async def test_sync_to_manychat_rabbitmq_uuid_serialization(self, mock_client, mock_get_settings):
        """
        Verifica se a tarefa de sincronização publica eventos no WebSocket/RabbitMQ sem dar erro de
        serialização com UUIDs.
        """
        print("\n--- Testando Serialização de UUID no RabbitMQ ---")
        
        mock_get_settings.return_value = {"MANYCHAT_API_KEY": "fake_key_123"}
        
        # Mock para as requisições HTTPX
        mock_instance = mock_client.return_value.__aenter__.return_value
        
        mock_resp_create = MagicMock()
        mock_resp_create.status_code = 200
        mock_resp_create.json.return_value = {"data": {"id": 8888}}
        
        mock_resp_tag_create = MagicMock()
        mock_resp_tag_create.status_code = 200
        mock_resp_tag_apply = MagicMock()
        mock_resp_tag_apply.status_code = 200
        
        mock_instance.post.side_effect = [mock_resp_create, mock_resp_tag_create, mock_resp_tag_apply]
        
        # Zera os mocks do RabbitMQ antes de testar
        rabbitmq_client.rabbitmq.publish_event.reset_mock()
        
        # Executa a tarefa em background que gerencia o fluxo completo e envia eventos ao WS
        await sync_to_manychat_and_update_history(
            client_id=self.client_id,
            name="Test User WS",
            phone="5511888888888",
            tag="TagWS",
            email="testws@example.com",
            history_id=self.webhook_history.id
        )
        
        # Espera um curto período de tempo já que publish_event é chamado em uma task assíncrona separada
        await asyncio.sleep(0.1)
        
        # Verifica se o RabbitMQ foi chamado
        self.assertTrue(rabbitmq_client.rabbitmq.publish_event.called)
        
        # Verifica se os payloads contêm apenas tipos JSON serializáveis (sem UUIDs brutos)
        for call in rabbitmq_client.rabbitmq.publish_event.call_args_list:
            event_name, payload = call[0]
            self.assertIsInstance(payload["integration_id"], str)
            self.assertIsInstance(payload["history_id"], int)
            
        print("OK: Teste de Serialização de UUID no RabbitMQ passou!")

    @patch('services.manychat.get_settings')
    @patch('httpx.AsyncClient')
    async def test_sync_to_manychat_email_permission_denied_retry(self, mock_client, mock_get_settings):
        """
        Verifica se a criação de contato re-tenta sem o campo de e-mail quando a resposta inicial
        retorna 400 (Permission denied to import email).
        """
        print("\n--- Testando Retry sem E-mail no ManyChat ---")
        
        mock_get_settings.return_value = {"MANYCHAT_API_KEY": "fake_key_123"}
        mock_instance = mock_client.return_value.__aenter__.return_value
        
        # 1. Primeira chamada de criação retorna 400 com erro de permissão de e-mail
        mock_resp_create_failed = MagicMock()
        mock_resp_create_failed.status_code = 400
        mock_resp_create_failed.text = "Permission denied to import email"
        
        # 2. Segunda chamada de criação (retry sem e-mail) retorna 200 (sucesso)
        mock_resp_create_retry = MagicMock()
        mock_resp_create_retry.status_code = 200
        mock_resp_create_retry.json.return_value = {"data": {"id": 99991}}
        
        # 3. Criar tag
        mock_resp_tag_create = MagicMock()
        mock_resp_tag_create.status_code = 200
        
        # 4. Aplicar tag
        mock_resp_tag_apply = MagicMock()
        mock_resp_tag_apply.status_code = 200
        
        # Configura chamadas de post ordenadas
        mock_instance.post.side_effect = [
            mock_resp_create_failed, 
            mock_resp_create_retry, 
            mock_resp_tag_create, 
            mock_resp_tag_apply
        ]
        
        result = await sync_to_manychat(
            client_id=self.client_id,
            name="Retry User",
            phone="5511777777777",
            tag="TagRetry",
            email="retry@example.com"
        )
        
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["contact"]["status"], "created")
        self.assertEqual(result["contact"]["id"], 99991)
        self.assertEqual(result["tag"]["status"], "applied")
        
        # Garante que a primeira chamada continha e-mail no payload
        first_call_args = mock_instance.post.call_args_list[0]
        self.assertIn("email", first_call_args[1]["json"])
        
        # Garante que a segunda chamada NÃO continha e-mail no payload
        second_call_args = mock_instance.post.call_args_list[1]
        self.assertNotIn("email", second_call_args[1]["json"])
        
        print("OK: Teste de Retry sem E-mail no ManyChat passou!")

    @patch('services.manychat.get_settings')
    @patch('httpx.AsyncClient')
    async def test_sync_to_manychat_delete_and_recreate_fallback(self, mock_client, mock_get_settings):
        """
        Verifica se o contato é excluído e recriado com sucesso quando localizado via
        e-mail mas sem correspondência direta de telefone.
        """
        print("\n--- Testando Fallback de Deleção e Re-criação no ManyChat ---")
        
        mock_get_settings.return_value = {"MANYCHAT_API_KEY": "fake_key_123"}
        mock_instance = mock_client.return_value.__aenter__.return_value
        
        # 1. Post de criação falha (already exists)
        mock_resp_create_fail = MagicMock()
        mock_resp_create_fail.status_code = 400
        mock_resp_create_fail.text = "Subscriber already exists"
        
        # 2. Get de busca por e-mail localiza o ID 12345
        mock_resp_email = MagicMock()
        mock_resp_email.status_code = 200
        mock_resp_email.json.return_value = {"data": [{"id": 12345}]}
        
        # 3. Post de criação de tag retorna 200
        mock_resp_tag_create = MagicMock()
        mock_resp_tag_create.status_code = 200
        
        # 4. Post de aplicação de tag falha no contato existente
        mock_resp_tag_apply_fail = MagicMock()
        mock_resp_tag_apply_fail.status_code = 400
        mock_resp_tag_apply_fail.text = "Receiver is not active"
        
        # 5. Post de deleção (deleteSubscriber) retorna 200
        mock_resp_delete = MagicMock()
        mock_resp_delete.status_code = 200
        
        # 6. Post de recriação do contato retorna 200 com novo ID 67890
        mock_resp_recreate = MagicMock()
        mock_resp_recreate.status_code = 200
        mock_resp_recreate.json.return_value = {"data": {"id": 67890}}
        
        # 7. Post de aplicação de tag no novo contato recriado retorna 200
        mock_resp_tag_apply_success = MagicMock()
        mock_resp_tag_apply_success.status_code = 200
        
        # Configurar retornos
        mock_instance.post.side_effect = [
            mock_resp_create_fail,
            mock_resp_tag_create,
            mock_resp_tag_apply_fail,
            mock_resp_delete,
            mock_resp_recreate,
            mock_resp_tag_apply_success
        ]
        mock_instance.get.side_effect = [mock_resp_email]
        
        result = await sync_to_manychat(
            client_id=self.client_id,
            name="Delete and Recreate User",
            phone="5511666666666",
            tag="TagDeleteRecria",
            email="delete_recria@example.com"
        )
        
        # Asserções
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["contact"]["status"], "created")
        self.assertEqual(result["contact"]["id"], 67890)
        self.assertEqual(result["tag"]["status"], "applied")
        
        # Verificar se as chamadas corretas foram feitas
        # 6 posts foram executados no total
        self.assertEqual(mock_instance.post.call_count, 6)
        self.assertEqual(mock_instance.get.call_count, 1)
        
        # O quarto post deve ter sido para a url de deletar contato
        delete_call = mock_instance.post.call_args_list[3]
        self.assertIn("deleteSubscriber", delete_call[0][0])
        self.assertEqual(delete_call[1]["json"]["subscriber_id"], 12345)
        
        # O quinto post deve ter sido para recriar o contato
        recreate_call = mock_instance.post.call_args_list[4]
        self.assertIn("createSubscriber", recreate_call[0][0])
        self.assertEqual(recreate_call[1]["json"]["whatsapp_phone"], "5511666666666")
        
        print("OK: Teste de Fallback de Deleção e Re-criação no ManyChat passou!")

if __name__ == "__main__":
    unittest.main()

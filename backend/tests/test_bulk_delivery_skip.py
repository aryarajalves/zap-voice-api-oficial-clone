
import sys
import os
import unittest
import asyncio
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timezone, timedelta

# Adiciona o diretório backend ao path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# ⚠️ OBRIGATÓRIO: Definir DATABASE_URL antes de importar models/database
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

# Mock RabbitMQ to avoid connection errors
sys.modules['rabbitmq_client'] = MagicMock()
import rabbitmq_client
rabbitmq_client.rabbitmq = AsyncMock()

import models
from database import SessionLocal, engine
from services.engine import execute_graph_funnel

# Cria as tabelas necessárias se estiver usando SQLite
if str(engine.url).startswith("sqlite"):
    models.Base.metadata.create_all(bind=engine)

class TestBulkDeliverySkip(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.client_id = 888
        # Limpa dados de teste
        self.db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.client_id == self.client_id).delete()
        self.db.commit()

    def tearDown(self):
        self.db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.client_id == self.client_id).delete()
        self.db.commit()
        self.db.close()

    @patch('services.engine.wait_for_delivery_sync', new_callable=AsyncMock)
    @patch('asyncio.sleep', new_callable=AsyncMock)
    @patch('chatwoot_client.ChatwootClient')
    async def test_bulk_skips_delivery_wait(self, mock_chatwoot, mock_sleep, mock_wait_delivery):
        """
        Verifica se um disparo em massa (is_bulk=True) pula a espera de entrega e estabilizacao.
        """
        print("\n--- Testando Skip de Entrega para Bulk ---")
        
        # Mock Chatwoot and helper functions
        mock_cw_instance = mock_chatwoot.return_value
        mock_cw_instance.send_message = AsyncMock(return_value={"id": 123, "source_id": "wamid.test123"})
        mock_cw_instance.is_within_24h_window = AsyncMock(return_value=True)

        def mock_apply_vars(text): return text

        # 1. Criar trigger bulk
        trigger = models.ScheduledTrigger(
            client_id=self.client_id,
            contact_phone="5585999999999",
            status='processing',
            is_bulk=True,
            execution_history=[]
        )
        self.db.add(trigger)
        self.db.commit()
        self.db.refresh(trigger)

        # 2. Definir um grafo simples (START -> MessageNode)
        graph_data = {
            "nodes": [
                {"id": "start", "type": "start", "data": {}},
                {"id": "node_1", "type": "messageNode", "data": {"content": "Ola Bulk"}}
            ],
            "edges": [
                {"source": "start", "target": "node_1"}
            ]
        }
        
        # 3. Executar o funil
        await execute_graph_funnel(
            trigger=trigger,
            graph_data=graph_data,
            chatwoot=mock_cw_instance,
            conversation_id=10,
            contact_phone="5585999999999",
            db=self.db,
            apply_vars=mock_apply_vars
        )

        # 4. Verificacoes
        print(f"  [TEST] wait_for_delivery_sync called count: {mock_wait_delivery.call_count}")
        
        # Nao deve chamar wait_for_delivery_sync
        self.assertEqual(mock_wait_delivery.call_count, 0, "wait_for_delivery_sync nao deveria ser chamado para bulk")
        
        # Nao deve chamar o sleep de 10s (estabilizacao)
        sleep_durations = [c.args[0] for c in mock_sleep.call_args_list]
        self.assertNotIn(10, sleep_durations, "O sleep de 10s de estabilizacao nao deveria ocorrer")

        print("OK: Teste de BULK SKIP PASSOU!")

    @patch('services.engine.wait_for_delivery_sync', new_callable=AsyncMock)
    @patch('asyncio.sleep', new_callable=AsyncMock)
    @patch('chatwoot_client.ChatwootClient')
    async def test_non_bulk_does_not_skip_delivery_wait(self, mock_chatwoot, mock_sleep, mock_wait_delivery):
        """
        Verifica se uma integracao normal (is_bulk=False) AINDA executa a espera de entrega.
        """
        print("\n--- Testando Manutencao de Entrega para Webhook (Nao-Bulk) ---")
        
        # Mock responses
        mock_cw_instance = mock_chatwoot.return_value
        mock_cw_instance.send_message = AsyncMock(return_value={"id": 456, "source_id": "wamid.test456"})
        mock_cw_instance.is_within_24h_window = AsyncMock(return_value=True)
        
        mock_wait_delivery.return_value = ("delivered", "Entrega confirmada")

        def mock_apply_vars(text): return text

        # 1. Criar trigger nao-bulk
        trigger = models.ScheduledTrigger(
            client_id=self.client_id,
            contact_phone="5585988887777",
            status='processing',
            is_bulk=False,
            execution_history=[]
        )
        self.db.add(trigger)
        self.db.commit()
        self.db.refresh(trigger)

        graph_data = {
            "nodes": [
                {"id": "start", "type": "start", "data": {}},
                {"id": "node_1", "type": "messageNode", "data": {"content": "Ola Webhook"}}
            ],
            "edges": [
                {"source": "start", "target": "node_1"}
            ]
        }
        
        # 2. Executar
        await execute_graph_funnel(
            trigger=trigger,
            graph_data=graph_data,
            chatwoot=mock_cw_instance,
            conversation_id=20,
            contact_phone="5585988887777",
            db=self.db,
            apply_vars=mock_apply_vars
        )

        # 3. Verificacoes
        print(f"  [TEST] wait_for_delivery_sync called count: {mock_wait_delivery.call_count}")
        
        # DEVE chamar wait_for_delivery_sync
        self.assertEqual(mock_wait_delivery.call_count, 1, "wait_for_delivery_sync DEVERIA ser chamado para nao-bulk")
        
        # DEVE chamar o sleep de 10s
        sleep_durations = [c.args[0] for c in mock_sleep.call_args_list]
        self.assertIn(10, sleep_durations, "O sleep de 10s de estabilizacao DEVERIA ocorrer para integracao normal")

        print("OK: Teste de WEBHOOK MAINTENANCE PASSOU!")

if __name__ == "__main__":
    unittest.main()

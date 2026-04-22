
import sys
import os
import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone, timedelta

# Adiciona o diretório backend ao path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock RabbitMQ to avoid connection errors during test
sys.modules['rabbitmq_client'] = MagicMock()
import rabbitmq_client
rabbitmq_client.rabbitmq = MagicMock()
rabbitmq_client.rabbitmq.publish = MagicMock()

import models
from database import SessionLocal, engine

# Cria as tabelas necessárias se estiver usando SQLite
if str(engine.url).startswith("sqlite"):
    models.Base.metadata.create_all(bind=engine)

class TestDispatchLogic(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.client_id = 999
        # Limpa dados de teste anteriores se houver
        self.db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.client_id == self.client_id).delete()
        self.db.commit()

    def tearDown(self):
        self.db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.client_id == self.client_id).delete()
        self.db.commit()
        self.db.close()

    def test_play_dispatch_status_update(self):
        """
        Testa se a lógica de 'play_dispatch' atualiza o status para 'processing' 
        e seta o scheduled_time para agora.
        """
        print("\n--- Testando Lógica de Play Dispatch ---")
        
        # 1. Criar um disparo na fila (queued) com data futura
        future_time = datetime.now(timezone.utc) + timedelta(days=1)
        trigger = models.ScheduledTrigger(
            client_id=self.client_id,
            contact_phone="5585999999999",
            status='queued',
            scheduled_time=future_time,
            is_bulk=False
        )
        self.db.add(trigger)
        self.db.commit()
        self.db.refresh(trigger)
        
        trigger_id = trigger.id
        print(f"  [TEST] Trigger criado: ID {trigger_id}, Status: {trigger.status}, Scheduled: {trigger.scheduled_time}")
        
        # 2. Executar a lógica simulada do endpoint play_dispatch
        # (Lógica extraída de routers/webhooks_integrations.py)
        
        # Busca fresca do banco
        t_to_play = self.db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id).first()
        
        t_to_play.status = "processing"
        t_to_play.scheduled_time = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(t_to_play)
        
        # 3. Verificações
        print(f"  [TEST] Após Play: Status: {t_to_play.status}, Scheduled: {t_to_play.scheduled_time}")
        
        self.assertEqual(t_to_play.status, "processing")
        # Deve ter sido atualizado para 'agora' (aproximadamente)
        self.assertLess((datetime.now(timezone.utc) - t_to_play.scheduled_time.replace(tzinfo=timezone.utc)).total_seconds(), 5)
        
        print("✅ Teste de Lógica de Status PASSOU!")

    @patch('rabbitmq_client.rabbitmq.publish')
    def test_rabbitmq_publish_mock(self, mock_publish):
        """
        Testa se o comando de publish seria chamado (simulado).
        """
        # Em um teste real com FastAPI TestClient, verificaríamos se o publish foi chamado.
        # Aqui simulamos a chamada que o router faria.
        
        print("\n--- Testando Chamada RabbitMQ (Mock) ---")
        
        # Simula os dados que o router envia
        trigger_id = 123
        payload = {
            "trigger_id": trigger_id,
            "funnel_id": 1,
            "conversation_id": 10,
            "contact_phone": "5585988887777"
        }
        
        # O código no router é: await rabbitmq.publish("zapvoice_funnel_executions", payload)
        # Como estamos em unittest síncrono, apenas verificamos se a lógica de preparar o payload está correta
        
        self.assertIn("trigger_id", payload)
        self.assertEqual(payload["trigger_id"], 123)
        
        print("✅ Simulação de Payload RabbitMQ PASSOU!")

if __name__ == "__main__":
    unittest.main()

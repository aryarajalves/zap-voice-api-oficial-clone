import sys
import os
import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

# Configura banco de dados SQLite para testes
os.environ["DATABASE_URL"] = "sqlite:///./test_manual_recurrence.db"

# Adiciona o diretório backend ao path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock RabbitMQ
sys.modules['rabbitmq_client'] = MagicMock()
import rabbitmq_client
rabbitmq_client.rabbitmq = MagicMock()

import models
import schemas
from database import SessionLocal, engine

# Ensure tables exist
models.Base.metadata.create_all(bind=engine)

class TestManualRecurrence(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.client_id = 777
        # Cleanup
        self.db.query(models.RecurringTrigger).filter(models.RecurringTrigger.client_id == self.client_id).delete()
        self.db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.client_id == self.client_id).delete()
        self.db.query(models.WebhookLead).filter(models.WebhookLead.client_id == self.client_id).delete()
        self.db.commit()

        # Create Recurring Trigger
        self.rt = models.RecurringTrigger(
            client_id=self.client_id,
            frequency='weekly',
            template_name='Test Template',
            contacts_list=[{'phone': '5511999999999', 'name': 'Static User'}],
            is_active=True,
            next_run_at=datetime.now(timezone.utc)
        )
        self.db.add(self.rt)
        self.db.commit()
        self.db.refresh(self.rt)

    def tearDown(self):
        self.db.close()

    def test_trigger_manual_static_list(self):
        """Valida que o gatilho manual cria um ScheduledTrigger com a lista estática"""
        from routers.schedules import trigger_recurring_manual
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        res = trigger_recurring_manual(
            rt_id=self.rt.id,
            x_client_id=str(self.client_id),
            db=self.db,
            current_user=mock_user
        )

        self.assertEqual(res["message"], "Disparo manual agendado com sucesso!")
        
        # Verify in DB
        st = self.db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == res["trigger_id"]).first()
        self.assertIsNotNone(st)
        self.assertEqual(st.status, 'queued')
        self.assertEqual(len(st.contacts_list), 1)
        self.assertEqual(st.contacts_list[0]['phone'], '5511999999999')
        self.assertEqual(st.template_name, 'Test Template')

    def test_trigger_manual_tag_based(self):
        """Valida que o gatilho manual resolve contatos por tag"""
        from routers.schedules import trigger_recurring_manual
        
        # Update RT to use tag
        self.rt.tag = 'vip'
        self.rt.contacts_list = None
        self.db.commit()

        # Create some leads
        self.db.add_all([
            models.WebhookLead(client_id=self.client_id, name="Lead 1", phone="5511111111111", tags="vip, lead"),
            models.WebhookLead(client_id=self.client_id, name="Lead 2", phone="5511222222222", tags="lead"),
            models.WebhookLead(client_id=self.client_id, name="Lead 3", phone="5511333333333", tags="vip")
        ])
        self.db.commit()

        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        res = trigger_recurring_manual(
            rt_id=self.rt.id,
            x_client_id=str(self.client_id),
            db=self.db,
            current_user=mock_user
        )

        st = self.db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == res["trigger_id"]).first()
        self.assertEqual(len(st.contacts_list), 2)
        phones = {c['phone'] for c in st.contacts_list}
        self.assertIn("5511111111111", phones)
        self.assertIn("5511333333333", phones)

if __name__ == "__main__":
    unittest.main()

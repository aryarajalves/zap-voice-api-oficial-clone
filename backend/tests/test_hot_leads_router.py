import sys
import os
import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime

# Configure SQLite DB for tests
os.environ["DATABASE_URL"] = "sqlite:////tmp/test_hot_leads_router.db"
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock RabbitMQ
sys.modules['rabbitmq_client'] = MagicMock()
import rabbitmq_client
rabbitmq_client.rabbitmq = MagicMock()

import models
import schemas
from database import SessionLocal, engine
from models.trigger import HotLead
from models.auth import User

# Recreate tables to ensure schema matches
models.Base.metadata.create_all(bind=engine)

class TestHotLeadsRouter(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.client_id = 777
        
        # Clean up existing test data
        self.db.query(HotLead).filter(HotLead.client_id == self.client_id).delete()
        self.db.query(User).filter(User.client_id == self.client_id).delete()
        self.db.commit()

        # Create test users
        self.seller_1 = User(
            client_id=self.client_id,
            email="seller1@test.com",
            full_name="Seller One",
            role="vendedor",
            is_active=True
        )
        self.seller_2 = User(
            client_id=self.client_id,
            email="seller2@test.com",
            full_name="Seller Two",
            role="vendedor",
            is_active=True
        )
        self.admin_user = User(
            client_id=self.client_id,
            email="admin@test.com",
            full_name="Admin User",
            role="admin",
            is_active=True
        )
        
        self.db.add_all([self.seller_1, self.seller_2, self.admin_user])
        self.db.commit()
        self.db.refresh(self.seller_1)
        self.db.refresh(self.seller_2)
        self.db.refresh(self.admin_user)

        # Create hot leads:
        # 1. Assigned to Seller 1
        self.lead_assigned_to_1 = HotLead(
            client_id=self.client_id,
            contact_name="Lead 1",
            contact_phone="5585911111111",
            alert_name="Alert A",
            priority="Alta",
            assigned_user_id=self.seller_1.id
        )
        # 2. Assigned to Seller 2
        self.lead_assigned_to_2 = HotLead(
            client_id=self.client_id,
            contact_name="Lead 2",
            contact_phone="5585922222222",
            alert_name="Alert B",
            priority="Média",
            assigned_user_id=self.seller_2.id
        )
        # 3. Unassigned
        self.lead_unassigned = HotLead(
            client_id=self.client_id,
            contact_name="Lead 3",
            contact_phone="5585933333333",
            alert_name="Alert C",
            priority="Baixa",
            assigned_user_id=None
        )

        self.db.add_all([self.lead_assigned_to_1, self.lead_assigned_to_2, self.lead_unassigned])
        self.db.commit()

    def tearDown(self):
        self.db.query(HotLead).filter(HotLead.client_id == self.client_id).delete()
        self.db.query(User).filter(User.client_id == self.client_id).delete()
        self.db.commit()
        self.db.close()

    def test_list_hot_leads_as_admin(self):
        """Valida que administradores enxergam todos os leads do cliente"""
        from routers.hot_leads import list_hot_leads
        
        res = list_hot_leads(
            x_client_id=self.client_id,
            db=self.db,
            current_user=self.admin_user
        )
        
        self.assertEqual(res.total, 3)
        names = [item.contact_name for item in res.items]
        self.assertIn("Lead 1", names)
        self.assertIn("Lead 2", names)
        self.assertIn("Lead 3", names)

    def test_list_hot_leads_as_seller(self):
        """Valida que vendedores só enxergam seus próprios leads ou leads não atribuídos"""
        from routers.hot_leads import list_hot_leads
        
        res = list_hot_leads(
            x_client_id=self.client_id,
            db=self.db,
            current_user=self.seller_1
        )
        
        # Deve retornar 2 leads: o atribuído ao Seller 1 e o não atribuído
        self.assertEqual(res.total, 2)
        names = [item.contact_name for item in res.items]
        self.assertIn("Lead 1", names)
        self.assertNotIn("Lead 2", names) # Atribuído ao Seller 2
        self.assertIn("Lead 3", names) # Não atribuído

if __name__ == "__main__":
    unittest.main()

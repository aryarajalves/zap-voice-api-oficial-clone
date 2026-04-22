import sys
import os
import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime

# Configura banco de dados SQLite para testes ANTES de qualquer importação de models/database
os.environ["DATABASE_URL"] = "sqlite:///./test_leads_edit.db"

# Adiciona o diretório backend ao path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock RabbitMQ to avoid connection errors
sys.modules['rabbitmq_client'] = MagicMock()
import rabbitmq_client
rabbitmq_client.rabbitmq = MagicMock()

import models
import schemas
from database import SessionLocal, engine

# Ensure tables exist for tests
models.Base.metadata.create_all(bind=engine)

class TestLeadsEdit(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.client_id = 888
        # Limpar dados de teste anteriores
        self.db.query(models.WebhookLead).filter(models.WebhookLead.client_id == self.client_id).delete()
        self.db.commit()

        # Criar lead de teste
        self.lead = models.WebhookLead(
            client_id=self.client_id,
            name="Original Name",
            phone="5511999999999",
            email="original@example.com",
            tags="tag1, tag2",
            product_name="Product X",
            last_event_type="purchase"
        )
        self.db.add(self.lead)
        self.db.commit()
        self.db.refresh(self.lead)
        self.lead_id = self.lead.id

    def tearDown(self):
        self.db.query(models.WebhookLead).filter(models.WebhookLead.client_id == self.client_id).delete()
        self.db.commit()
        self.db.close()

    def test_update_lead_success(self):
        """Valida se a atualização de um lead funciona corretamente"""
        from routers.leads import update_lead
        
        # Mock do usuário
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        # Dados para atualização
        update_in = schemas.WebhookLeadUpdate(
            name="Updated Name",
            email="updated@example.com",
            phone="5511888888888",
            tags="tag_new, tag_edit"
        )

        res = update_lead(
            lead_id=self.lead_id,
            lead_in=update_in,
            x_client_id=self.client_id,
            db=self.db,
            current_user=mock_user
        )

        self.assertEqual(res.name, "Updated Name")
        self.assertEqual(res.email, "updated@example.com")
        self.assertEqual(res.phone, "5511888888888")
        self.assertEqual(res.tags, "tag_new, tag_edit")

        # Verificar no banco
        db_lead = self.db.query(models.WebhookLead).filter(models.WebhookLead.id == self.lead_id).first()
        self.assertEqual(db_lead.name, "Updated Name")

    def test_update_lead_partial(self):
        """Valida se a atualização parcial preserva campos não enviados"""
        from routers.leads import update_lead
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        # Atualizar apenas o nome
        update_in = schemas.WebhookLeadUpdate(name="Only Name Changed")

        res = update_lead(
            lead_id=self.lead_id,
            lead_in=update_in,
            x_client_id=self.client_id,
            db=self.db,
            current_user=mock_user
        )

        self.assertEqual(res.name, "Only Name Changed")
        self.assertEqual(res.email, "original@example.com") # Deve manter o original
        self.assertEqual(res.phone, "5511999999999") # Deve manter o original

    def test_update_lead_unauthorized(self):
        """Valida se um cliente não pode atualizar lead de outro cliente"""
        from routers.leads import update_lead
        from fastapi import HTTPException
        
        # Usuário de outro cliente (999)
        mock_user = MagicMock()
        mock_user.client_id = 999

        update_in = schemas.WebhookLeadUpdate(name="Hacker Name")

        with self.assertRaises(HTTPException) as cm:
            update_lead(
                lead_id=self.lead_id,
                lead_in=update_in,
                x_client_id=999,
                db=self.db,
                current_user=mock_user
            )
        
        self.assertEqual(cm.exception.status_code, 404)

if __name__ == "__main__":
    unittest.main()

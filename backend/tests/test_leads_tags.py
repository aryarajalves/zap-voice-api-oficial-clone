import sys
import os
import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime

# Configura banco de dados SQLite para testes ANTES de qualquer importação de models/database
os.environ["DATABASE_URL"] = "sqlite:///./test_leads.db"

# Adiciona o diretório backend ao path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock RabbitMQ to avoid connection errors
sys.modules['rabbitmq_client'] = MagicMock()
import rabbitmq_client
rabbitmq_client.rabbitmq = MagicMock()

import models
from database import SessionLocal, engine

# Ensure tables exist for tests
models.Base.metadata.create_all(bind=engine)

class TestLeadsTags(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.client_id = 999
        # Limpar dados de teste anteriores
        self.db.query(models.WebhookLead).filter(models.WebhookLead.client_id == self.client_id).delete()
        self.db.commit()

        # Criar leads de teste com etiquetas
        self.l1 = models.WebhookLead(
            client_id=self.client_id,
            name="Lead Com Tag 1",
            phone="5511000000001",
            tags="tag_teste_1, urgente",
            product_name="Sistema A"
        )
        self.l2 = models.WebhookLead(
            client_id=self.client_id,
            name="Lead Com Tag 2",
            phone="5511000000002",
            tags="tag_teste_2, urgente",
            product_name="Sistema B"
        )
        self.db.add_all([self.l1, self.l2])
        self.db.commit()

    def tearDown(self):
        self.db.query(models.WebhookLead).filter(models.WebhookLead.client_id == self.client_id).delete()
        self.db.commit()
        self.db.close()

    def test_filter_leads_by_tag(self):
        """Valida se a listagem de leads filtra corretamente por etiqueta"""
        from routers.leads import list_leads
        
        # Mock do usuário
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        # Filtrar por tag_teste_1 (deve vir 1 lead)
        res1 = list_leads(tag="tag_teste_1", x_client_id=self.client_id, db=self.db, current_user=mock_user)
        self.assertEqual(res1["total"], 1)
        self.assertEqual(res1["items"][0].name, "Lead Com Tag 1")

        # Filtrar por 'urgente' (deve vir 2 leads)
        res2 = list_leads(tag="urgente", x_client_id=self.client_id, db=self.db, current_user=mock_user)
        self.assertEqual(res2["total"], 2)

    def test_get_available_tags_filter(self):
        """Valida se o endpoint de filtros retorna a lista única de etiquetas"""
        from routers.leads import get_lead_filters
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        res = get_lead_filters(x_client_id=self.client_id, db=self.db, current_user=mock_user)
        
        self.assertIn("tag_teste_1", res["tags"])
        self.assertIn("tag_teste_2", res["tags"])
        self.assertIn("urgente", res["tags"])
        self.assertEqual(len(res["tags"]), 3)

    def test_export_csv_with_tag_filter(self):
        """Valida se a exportação CSV aceita o filtro de etiquetas e retorna o objeto de resposta"""
        from routers.leads import export_leads_csv
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        # Chamada para exportar com filtro
        response = export_leads_csv(tag="tag_teste_1", x_client_id=self.client_id, db=self.db, current_user=mock_user)
        
        # StreamingResponse deve estar presente
        self.assertIsNotNone(response)
        self.assertEqual(response.media_type, "text/csv; charset=utf-8")

if __name__ == "__main__":
    unittest.main()

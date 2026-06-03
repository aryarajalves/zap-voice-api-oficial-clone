import sys
import os
import unittest
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timezone, timedelta

# Configura banco de dados SQLite para testes
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

# Adiciona o diretório backend ao path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock RabbitMQ
sys.modules['rabbitmq_client'] = MagicMock()
import rabbitmq_client
rabbitmq_client.rabbitmq = MagicMock()

import models
from database import SessionLocal, engine

# Ensure tables exist
models.Base.metadata.create_all(bind=engine)

class TestTemplateOrdering(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.db = SessionLocal()
        self.client_id = 999
        self.db.query(models.WhatsAppTemplateCache).filter(
            models.WhatsAppTemplateCache.client_id == self.client_id
        ).delete()
        self.db.commit()

        # Criar templates com datas de criação diferentes
        # t1: antigo, t2: mais recente, t3: fixado (pinned) antigo
        self.t1 = models.WhatsAppTemplateCache(
            id=11,
            client_id=self.client_id,
            name="old_template",
            language="pt_BR",
            is_pinned=False,
            created_at=datetime.now(timezone.utc) - timedelta(days=2)
        )
        self.t2 = models.WhatsAppTemplateCache(
            id=22,
            client_id=self.client_id,
            name="new_template",
            language="pt_BR",
            is_pinned=False,
            created_at=datetime.now(timezone.utc)
        )
        self.t3 = models.WhatsAppTemplateCache(
            id=33,
            client_id=self.client_id,
            name="pinned_old",
            language="pt_BR",
            is_pinned=True,
            created_at=datetime.now(timezone.utc) - timedelta(days=5)
        )
        self.db.add_all([self.t1, self.t2, self.t3])
        self.db.commit()

    async def asyncTearDown(self):
        self.db.query(models.WhatsAppTemplateCache).filter(
            models.WhatsAppTemplateCache.client_id == self.client_id
        ).delete()
        self.db.commit()
        self.db.close()

    @patch('routers.whatsapp.ChatwootClient')
    async def test_list_templates_ordering_newest_first(self, mock_chatwoot_client_class):
        """Valida que o list_templates ordena por is_pinned, depois por created_at decrescente"""
        from routers.whatsapp import list_templates
        
        mock_client = MagicMock()
        mock_client.get_whatsapp_templates = AsyncMock(return_value=[
            {"id": "11", "name": "old_template", "language": "pt_BR", "category": "MARKETING", "status": "APPROVED", "components": []},
            {"id": "22", "name": "new_template", "language": "pt_BR", "category": "MARKETING", "status": "APPROVED", "components": []},
            {"id": "33", "name": "pinned_old", "language": "pt_BR", "category": "MARKETING", "status": "APPROVED", "components": []}
        ])
        mock_chatwoot_client_class.return_value = mock_client

        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        res = await list_templates(x_client_id=self.client_id, current_user=mock_user, db=self.db)

        # Ordem esperada:
        # 1. pinned_old (is_pinned = True)
        # 2. new_template (created_at é o mais recente)
        # 3. old_template (created_at é o antigo)
        self.assertEqual(res[0]["name"], "pinned_old")
        self.assertEqual(res[1]["name"], "new_template")
        self.assertEqual(res[2]["name"], "old_template")
        
        # Verificar que a data de criação está incluída e mapeada
        self.assertIsNotNone(res[1]["created_at"])

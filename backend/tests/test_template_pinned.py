import sys
import os
import unittest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi import HTTPException

# Configura banco de dados SQLite para testes
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

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

class TestTemplatePinned(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.db = SessionLocal()
        self.client_id = 777
        # Limpar dados de teste anteriores
        self.db.query(models.WhatsAppTemplateCache).filter(
            models.WhatsAppTemplateCache.client_id == self.client_id
        ).delete()
        self.db.commit()

        # Criar 4 templates de teste no cache local
        self.t1 = models.WhatsAppTemplateCache(
            id=1111111111,
            client_id=self.client_id,
            name="template_teste_1",
            language="pt_BR",
            body="Olá {{1}}",
            components=[],
            is_pinned=False
        )
        self.t2 = models.WhatsAppTemplateCache(
            id=2222222222,
            client_id=self.client_id,
            name="template_teste_2",
            language="pt_BR",
            body="Seu código é {{1}}",
            components=[],
            is_pinned=False
        )
        self.t3 = models.WhatsAppTemplateCache(
            id=3333333333,
            client_id=self.client_id,
            name="template_teste_3",
            language="pt_BR",
            body="Terceiro template",
            components=[],
            is_pinned=False
        )
        self.t4 = models.WhatsAppTemplateCache(
            id=4444444444,
            client_id=self.client_id,
            name="template_teste_4",
            language="pt_BR",
            body="Quarto template",
            components=[],
            is_pinned=False
        )
        self.db.add_all([self.t1, self.t2, self.t3, self.t4])
        self.db.commit()

    async def asyncTearDown(self):
        self.db.query(models.WhatsAppTemplateCache).filter(
            models.WhatsAppTemplateCache.client_id == self.client_id
        ).delete()
        self.db.commit()
        self.db.close()

    async def test_pin_template_success(self):
        """Valida que podemos fixar um template com sucesso"""
        from routers.whatsapp import pin_template
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        res = await pin_template(
            template_id="1111111111",
            payload={"is_pinned": True},
            x_client_id=self.client_id,
            db=self.db,
            current_user=mock_user
        )
        
        self.assertTrue(res["success"])
        self.assertTrue(res["is_pinned"])
        
        # Verificar banco
        db_tpl = self.db.query(models.WhatsAppTemplateCache).filter(models.WhatsAppTemplateCache.id == 1111111111).first()
        self.assertTrue(db_tpl.is_pinned)

    async def test_pin_template_limit_reached(self):
        """Valida que tentar fixar o 4º template lança erro 400 (limite máximo de 3)"""
        from routers.whatsapp import pin_template
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        # Fixar os 3 primeiros templates
        self.t1.is_pinned = True
        self.t2.is_pinned = True
        self.t3.is_pinned = True
        self.db.commit()

        # Tentar fixar o 4º template deve lançar erro
        with self.assertRaises(HTTPException) as ctx:
            await pin_template(
                template_id="4444444444",
                payload={"is_pinned": True},
                x_client_id=self.client_id,
                db=self.db,
                current_user=mock_user
            )
        
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Você só pode fixar até 3 templates no topo", ctx.exception.detail)

    async def test_pin_template_limit_with_archived(self):
        """Valida que templates arquivados são desconsiderados no limite de 3 pins"""
        from routers.whatsapp import pin_template
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        # Fixar os 3 primeiros templates
        self.t1.is_pinned = True
        self.t2.is_pinned = True
        self.t3.is_pinned = True
        
        # Arquivar um deles
        self.t3.is_archived = True
        self.db.commit()

        # Tentar fixar o 4º template deve funcionar, pois o 3º está arquivado
        res = await pin_template(
            template_id="4444444444",
            payload={"is_pinned": True},
            x_client_id=self.client_id,
            db=self.db,
            current_user=mock_user
        )
        self.assertTrue(res["success"])
        self.assertTrue(res["is_pinned"])

    @patch('routers.whatsapp.ChatwootClient')
    async def test_list_templates_ordering_pinned_first(self, mock_chatwoot_client_class):
        """Valida que templates fixados aparecem no topo na listagem de templates"""
        from routers.whatsapp import list_templates
        
        # Configurar mock do ChatwootClient para retornar todos os 4 templates
        mock_client = MagicMock()
        mock_client.get_whatsapp_templates = AsyncMock(return_value=[
            {"id": "1111111111", "name": "template_teste_1", "language": "pt_BR", "category": "MARKETING", "status": "APPROVED", "body_text": "Olá {{1}}", "components": []},
            {"id": "2222222222", "name": "template_teste_2", "language": "pt_BR", "category": "MARKETING", "status": "APPROVED", "body_text": "Seu código é {{1}}", "components": []},
            {"id": "3333333333", "name": "template_teste_3", "language": "pt_BR", "category": "MARKETING", "status": "APPROVED", "body_text": "Terceiro template", "components": []},
            {"id": "4444444444", "name": "template_teste_4", "language": "pt_BR", "category": "MARKETING", "status": "APPROVED", "body_text": "Quarto template", "components": []}
        ])
        mock_chatwoot_client_class.return_value = mock_client

        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        # Fixar apenas o Template 3
        self.t3.is_pinned = True
        self.db.commit()

        res = await list_templates(x_client_id=self.client_id, current_user=mock_user, db=self.db)
        
        # O Template 3 deve vir em primeiro lugar
        self.assertEqual(res[0]["id"], "3333333333")
        self.assertTrue(res[0]["is_pinned"])
        
        # Os outros devem vir depois e em ordem alfabética: template_teste_1, template_teste_2, template_teste_4
        self.assertEqual(res[1]["id"], "1111111111")
        self.assertEqual(res[2]["id"], "2222222222")
        self.assertEqual(res[3]["id"], "4444444444")

    async def test_archive_pinned_template_fails(self):
        """Valida que tentar arquivar um template fixado lança erro 400"""
        from routers.whatsapp import archive_template
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        # Fixar o template t1
        self.t1.is_pinned = True
        self.db.commit()

        with self.assertRaises(HTTPException) as ctx:
            await archive_template(
                template_name="template_teste_1",
                x_client_id=self.client_id,
                current_user=mock_user,
                db=self.db
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Não é possível arquivar um template que está fixado no topo", ctx.exception.detail)

    async def test_delete_pinned_template_fails(self):
        """Valida que tentar excluir um template fixado lança erro 400"""
        from routers.whatsapp import delete_template
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        # Fixar o template t1
        self.t1.is_pinned = True
        self.db.commit()

        with self.assertRaises(HTTPException) as ctx:
            await delete_template(
                template_name="template_teste_1",
                x_client_id=self.client_id,
                current_user=mock_user,
                db=self.db
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Não é possível excluir um template que está fixado no topo", ctx.exception.detail)

if __name__ == "__main__":
    unittest.main()

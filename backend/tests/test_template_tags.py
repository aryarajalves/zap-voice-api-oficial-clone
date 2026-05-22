import sys
import os
import unittest
from unittest.mock import MagicMock, patch, AsyncMock

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

class TestTemplateTags(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.db = SessionLocal()
        self.client_id = 999
        # Limpar dados de teste anteriores
        self.db.query(models.WhatsAppTemplateCache).filter(
            models.WhatsAppTemplateCache.client_id == self.client_id
        ).delete()
        self.db.commit()

        # Criar templates de teste no cache local
        self.t1 = models.WhatsAppTemplateCache(
            id=1111111111,
            client_id=self.client_id,
            name="template_teste_1",
            language="pt_BR",
            body="Olá {{1}}",
            components=[],
            tags="principal, urgente"
        )
        self.t2 = models.WhatsAppTemplateCache(
            id=2222222222,
            client_id=self.client_id,
            name="template_teste_2",
            language="pt_BR",
            body="Seu código é {{1}}",
            components=[],
            tags=None
        )
        self.db.add_all([self.t1, self.t2])
        self.db.commit()

    async def asyncTearDown(self):
        self.db.query(models.WhatsAppTemplateCache).filter(
            models.WhatsAppTemplateCache.client_id == self.client_id
        ).delete()
        self.db.commit()
        self.db.close()

    @patch('routers.whatsapp.ChatwootClient')
    async def test_list_templates_meta_success(self, mock_chatwoot_client_class):
        """Valida que quando a Meta responde com sucesso, as tags locais são mescladas"""
        from routers.whatsapp import list_templates
        
        # Configurar mock do ChatwootClient
        mock_client = MagicMock()
        mock_client.get_whatsapp_templates = AsyncMock(return_value=[
            {
                "id": "1111111111",
                "name": "template_teste_1",
                "language": "pt_BR",
                "category": "MARKETING",
                "status": "APPROVED",
                "body_text": "Olá {{1}}",
                "components": []
            },
            {
                "id": "2222222222",
                "name": "template_teste_2",
                "language": "pt_BR",
                "category": "MARKETING",
                "status": "APPROVED",
                "body_text": "Seu código é {{1}}",
                "components": []
            }
        ])
        mock_chatwoot_client_class.return_value = mock_client

        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        res = await list_templates(x_client_id=self.client_id, current_user=mock_user, db=self.db)
        
        self.assertEqual(len(res), 2)
        tpl1 = next(t for t in res if t["id"] == "1111111111")
        self.assertEqual(tpl1["tags"], ["principal", "urgente"])

        tpl2 = next(t for t in res if t["id"] == "2222222222")
        self.assertEqual(tpl2["tags"], [])

    @patch('routers.whatsapp.ChatwootClient')
    async def test_list_templates_meta_failure_fallback(self, mock_chatwoot_client_class):
        """Valida que quando a Meta falha, list_templates faz fallback para o cache local"""
        from routers.whatsapp import list_templates
        
        # Configurar mock do ChatwootClient para lançar exceção
        mock_client = MagicMock()
        mock_client.get_whatsapp_templates = AsyncMock(side_effect=Exception("Meta API Offline"))
        mock_chatwoot_client_class.return_value = mock_client

        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        res = await list_templates(x_client_id=self.client_id, current_user=mock_user, db=self.db)
        
        # Deve ter buscado do cache local
        self.assertEqual(len(res), 2)
        tpl1 = next(t for t in res if t["id"] == "1111111111")
        self.assertEqual(tpl1["name"], "template_teste_1")
        self.assertEqual(tpl1["tags"], ["principal", "urgente"])

    async def test_update_template_tags_success(self):
        """Valida a atualização bem-sucedida das tags de um template"""
        from routers.whatsapp import update_template_tags
        from schemas import TemplateTagsUpdate

        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        payload = TemplateTagsUpdate(tags=["nova_tag", "outra_tag"])
        res = await update_template_tags(
            template_id="1111111111", 
            payload=payload, 
            x_client_id=self.client_id, 
            current_user=mock_user, 
            db=self.db
        )

        self.assertTrue(res["success"])
        self.assertEqual(res["tags"], ["nova_tag", "outra_tag"])

        # Verificar no banco de dados
        db_tpl = self.db.query(models.WhatsAppTemplateCache).get(1111111111)
        self.assertEqual(db_tpl.tags, "nova_tag,outra_tag")

    async def test_update_template_tags_not_found(self):
        """Valida que update_template_tags lança 404 se o template não existir no cache"""
        from routers.whatsapp import update_template_tags
        from schemas import TemplateTagsUpdate
        from fastapi import HTTPException

        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        payload = TemplateTagsUpdate(tags=["teste"])
        with self.assertRaises(HTTPException) as ctx:
            await update_template_tags(
                template_id="9999999999", 
                payload=payload, 
                x_client_id=self.client_id, 
                current_user=mock_user, 
                db=self.db
            )
        self.assertEqual(ctx.exception.status_code, 404)

    async def test_update_template_tags_invalid_id(self):
        """Valida que update_template_tags lança 400 se o ID do template for inválido"""
        from routers.whatsapp import update_template_tags
        from schemas import TemplateTagsUpdate
        from fastapi import HTTPException

        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        payload = TemplateTagsUpdate(tags=["teste"])
        with self.assertRaises(HTTPException) as ctx:
            await update_template_tags(
                template_id="invalido", 
                payload=payload, 
                x_client_id=self.client_id, 
                current_user=mock_user, 
                db=self.db
            )
        self.assertEqual(ctx.exception.status_code, 400)

if __name__ == "__main__":
    unittest.main()

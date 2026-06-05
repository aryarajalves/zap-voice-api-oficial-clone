import sys
import os
import unittest
from unittest.mock import MagicMock
import uuid
from fastapi import HTTPException

# Adiciona o diretório backend ao path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# ⚠️ OBRIGATÓRIO: Definir DATABASE_URL e SECRET_KEY antes de importar models/database
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test_secret_key_minimum_32_characters_long_for_security"

# Mock RabbitMQ
sys.modules['rabbitmq_client'] = MagicMock()

import models
import schemas
from database import SessionLocal, engine
from routers.webhooks.integrations import create_webhook_integration, update_webhook_integration, delete_webhook_integration

# Cria as tabelas se estiver usando SQLite
if str(engine.url).startswith("sqlite"):
    models.Base.metadata.create_all(bind=engine)

class TestWebhookSlugUniqueness(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.client_id = 999
        
        # Limpa dados antes de rodar cada teste
        self.db.query(models.WebhookEventMapping).delete()
        self.db.query(models.WebhookHistory).delete()
        self.db.query(models.WebhookIntegration).delete()
        self.db.commit()

        # Cria uma integração padrão para testar duplicados
        self.existing_integration = models.WebhookIntegration(
            id=uuid.uuid4(),
            client_id=self.client_id,
            name="Integração Existente",
            platform="hotmart",
            status="active",
            custom_slug="slug-duplicado"
        )
        self.db.add(self.existing_integration)
        self.db.commit()
        self.db.refresh(self.existing_integration)

    def tearDown(self):
        self.db.query(models.WebhookEventMapping).delete()
        self.db.query(models.WebhookHistory).delete()
        self.db.query(models.WebhookIntegration).delete()
        self.db.commit()
        self.db.close()

    def test_create_webhook_integration_duplicate_slug_raises_error(self):
        """
        Verifica se criar uma integração com um slug personalizado já existente lança HTTPException 400.
        """
        print("\n--- Testando Bloqueio de Slug Duplicado na Criação ---")
        
        new_integration_schema = schemas.WebhookIntegrationCreate(
            name="Nova Integração",
            platform="kiwify",
            status="active",
            custom_slug="slug-duplicado",  # Slug já usado na setUp
            mappings=[]
        )
        
        with self.assertRaises(HTTPException) as context:
            create_webhook_integration(
                integration=new_integration_schema,
                x_client_id=self.client_id,
                db=self.db,
                current_user=None
            )
            
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("já está em uso", context.exception.detail)
        print("OK: Bloqueio de Slug Duplicado na Criação passou!")

    def test_update_webhook_integration_duplicate_slug_raises_error(self):
        """
        Verifica se atualizar uma integração com o slug de outra lança HTTPException 400.
        """
        print("\n--- Testando Bloqueio de Slug Duplicado na Edição ---")
        
        # 1. Cria uma segunda integração com slug diferente
        sec_integration = models.WebhookIntegration(
            id=uuid.uuid4(),
            client_id=self.client_id,
            name="Segunda Integração",
            platform="kiwify",
            status="active",
            custom_slug="slug-unico"
        )
        self.db.add(sec_integration)
        self.db.commit()
        self.db.refresh(sec_integration)
        
        # 2. Tenta atualizar a segunda integração para usar o slug da primeira (slug-duplicado)
        update_schema = schemas.WebhookIntegrationCreate(
            name="Segunda Integração Atualizada",
            platform="kiwify",
            status="active",
            custom_slug="slug-duplicado",  # Tenta colidir com a integração do setUp
            mappings=[]
        )
        
        with self.assertRaises(HTTPException) as context:
            update_webhook_integration(
                integration_id=str(sec_integration.id),
                integration_update=update_schema,
                x_client_id=self.client_id,
                db=self.db,
                current_user=None
            )
            
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("já está em uso", context.exception.detail)
        print("OK: Bloqueio de Slug Duplicado na Edição passou!")

    def test_delete_webhook_integration_cleans_dependents(self):
        """
        Verifica se excluir uma integração remove fisicamente a integração, mapeamentos e histórico do banco.
        """
        print("\n--- Testando Deleção Física e Cascata Garantida ---")
        
        # 1. Adiciona mapeamento e histórico vinculados
        mapping = models.WebhookEventMapping(
            integration_id=self.existing_integration.id,
            event_type="compra_aprovada",
            is_active=True
        )
        history = models.WebhookHistory(
            integration_id=self.existing_integration.id,
            event_type="compra_aprovada",
            status="processed"
        )
        self.db.add(mapping)
        self.db.add(history)
        self.db.commit()
        
        # 2. Chama a deleção física
        result = delete_webhook_integration(
            integration_id=str(self.existing_integration.id),
            x_client_id=self.client_id,
            db=self.db,
            current_user=None
        )
        
        self.assertEqual(result["message"], "Integration deleted successfully")
        
        # 3. Garante que tudo foi limpo do banco
        db_mappings = self.db.query(models.WebhookEventMapping).filter(
            models.WebhookEventMapping.integration_id == self.existing_integration.id
        ).all()
        db_history = self.db.query(models.WebhookHistory).filter(
            models.WebhookHistory.integration_id == self.existing_integration.id
        ).all()
        db_integration = self.db.query(models.WebhookIntegration).filter(
            models.WebhookIntegration.id == self.existing_integration.id
        ).first()
        
        self.assertEqual(len(db_mappings), 0)
        self.assertEqual(len(db_history), 0)
        self.assertIsNone(db_integration)
        print("OK: Deleção Física e Cascata Garantida passou!")

if __name__ == "__main__":
    unittest.main()

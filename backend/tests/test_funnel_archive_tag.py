import sys
import os
import unittest
from unittest.mock import MagicMock
from datetime import datetime

# Configura banco de dados SQLite para testes
os.environ["DATABASE_URL"] = "sqlite:///./test_funnel_archive_tag.db"

# Adiciona o diretório backend ao path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock RabbitMQ to avoid connection errors
sys.modules['rabbitmq_client'] = MagicMock()
import rabbitmq_client
rabbitmq_client.rabbitmq = MagicMock()
sys.modules['config_loader'] = MagicMock()

import models
import schemas
from database import SessionLocal, engine

# Ensure tables exist
models.Base.metadata.create_all(bind=engine)

class TestFunnelArchiveTag(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.client_id = 777
        
        # Limpar dados antigos
        self.db.query(models.Funnel).filter(models.Funnel.client_id == self.client_id).delete()
        self.db.commit()

        # Criar funil ativo
        self.funnel_active = models.Funnel(
            client_id=self.client_id,
            name="Funil Ativo",
            description="Descrição do funil ativo",
            steps={"nodes": [], "edges": []},
            is_archived=False,
            tag="Vendas"
        )
        # Criar funil arquivado
        self.funnel_archived = models.Funnel(
            client_id=self.client_id,
            name="Funil Arquivado",
            description="Descrição do funil arquivado",
            steps={"nodes": [], "edges": []},
            is_archived=True,
            tag="Marketing"
        )
        self.db.add(self.funnel_active)
        self.db.add(self.funnel_archived)
        self.db.commit()
        self.db.refresh(self.funnel_active)
        self.db.refresh(self.funnel_archived)

    def tearDown(self):
        self.db.query(models.Funnel).filter(models.Funnel.client_id == self.client_id).delete()
        self.db.commit()
        self.db.close()

    def test_list_active_funnels(self):
        """Valida que a listagem de funis padrão retorna apenas os ativos"""
        from routers.funnels import list_funnels
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        res = list_funnels(
            skip=0,
            limit=10,
            is_archived=False,
            x_client_id=self.client_id,
            db=self.db,
            current_user=mock_user
        )
        
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0].name, "Funil Ativo")
        self.assertEqual(res[0].is_archived, False)

    def test_list_archived_funnels(self):
        """Valida que a listagem de funis arquivados retorna apenas os arquivados"""
        from routers.funnels import list_funnels
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        res = list_funnels(
            skip=0,
            limit=10,
            is_archived=True,
            x_client_id=self.client_id,
            db=self.db,
            current_user=mock_user
        )
        
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0].name, "Funil Arquivado")
        self.assertEqual(res[0].is_archived, True)

    def test_archive_funnel_success(self):
        """Valida que o endpoint de arquivar altera corretamente o estado do funil"""
        from routers.funnels import archive_funnel
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        res = archive_funnel(
            funnel_id=self.funnel_active.id,
            payload={"is_archived": True},
            x_client_id=self.client_id,
            db=self.db,
            current_user=mock_user
        )
        
        self.assertEqual(res.is_archived, True)
        
        # Verificar banco de dados
        db_funnel = self.db.query(models.Funnel).filter(models.Funnel.id == self.funnel_active.id).first()
        self.assertEqual(db_funnel.is_archived, True)

    def test_tag_funnel_success(self):
        """Valida que a etiqueta (tag) é adicionada com sucesso no funil"""
        from routers.funnels import tag_funnel
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        res = tag_funnel(
            funnel_id=self.funnel_active.id,
            payload={"tag": "Novo Marcador"},
            x_client_id=self.client_id,
            db=self.db,
            current_user=mock_user
        )
        
        self.assertEqual(res.tag, "Novo Marcador")
        
        # Verificar banco de dados
        db_funnel = self.db.query(models.Funnel).filter(models.Funnel.id == self.funnel_active.id).first()
        self.assertEqual(db_funnel.tag, "Novo Marcador")

if __name__ == "__main__":
    unittest.main()

import sys
import os
import unittest
from unittest.mock import MagicMock
from fastapi import HTTPException

# Configura banco de dados SQLite para testes
os.environ["DATABASE_URL"] = "sqlite:///./test_funnel_pinned.db"

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

class TestFunnelPinned(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.client_id = 888
        
        # Limpar dados antigos
        self.db.query(models.Funnel).filter(models.Funnel.client_id == self.client_id).delete()
        self.db.commit()

        # Criar 4 funis para testar ordenação e limites
        self.funnel1 = models.Funnel(client_id=self.client_id, name="Funil 1", steps={"nodes": [], "edges": []}, is_pinned=False)
        self.funnel2 = models.Funnel(client_id=self.client_id, name="Funil 2", steps={"nodes": [], "edges": []}, is_pinned=False)
        self.funnel3 = models.Funnel(client_id=self.client_id, name="Funil 3", steps={"nodes": [], "edges": []}, is_pinned=False)
        self.funnel4 = models.Funnel(client_id=self.client_id, name="Funil 4", steps={"nodes": [], "edges": []}, is_pinned=False)
        
        self.db.add(self.funnel1)
        self.db.add(self.funnel2)
        self.db.add(self.funnel3)
        self.db.add(self.funnel4)
        self.db.commit()
        
        self.db.refresh(self.funnel1)
        self.db.refresh(self.funnel2)
        self.db.refresh(self.funnel3)
        self.db.refresh(self.funnel4)

    def tearDown(self):
        self.db.query(models.Funnel).filter(models.Funnel.client_id == self.client_id).delete()
        self.db.commit()
        self.db.close()

    def test_pin_funnel_success(self):
        """Valida que podemos fixar um funil com sucesso"""
        from routers.funnels import pin_funnel
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        res = pin_funnel(
            funnel_id=self.funnel1.id,
            payload={"is_pinned": True},
            x_client_id=self.client_id,
            db=self.db,
            current_user=mock_user
        )
        
        self.assertTrue(res.is_pinned)
        
        # Verificar banco
        db_funnel = self.db.query(models.Funnel).filter(models.Funnel.id == self.funnel1.id).first()
        self.assertTrue(db_funnel.is_pinned)

    def test_pin_funnel_limit_reached(self):
        """Valida que tentar fixar o 4º funil lança erro 400 (limite máximo de 3)"""
        from routers.funnels import pin_funnel
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        # Fixar os 3 primeiros funis
        self.funnel1.is_pinned = True
        self.funnel2.is_pinned = True
        self.funnel3.is_pinned = True
        self.db.commit()

        # Tentar fixar o 4º funil deve lançar erro
        with self.assertRaises(HTTPException) as ctx:
            pin_funnel(
                funnel_id=self.funnel4.id,
                payload={"is_pinned": True},
                x_client_id=self.client_id,
                db=self.db,
                current_user=mock_user
            )
        
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Você só pode fixar até 3 funis no topo", ctx.exception.detail)

    def test_funnel_list_ordering_pinned_first(self):
        """Valida que funis fixados aparecem no topo na listagem"""
        from routers.funnels import list_funnels
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        # Fixar apenas o Funil 3
        self.funnel3.is_pinned = True
        self.db.commit()

        res = list_funnels(
            skip=0,
            limit=10,
            is_archived=False,
            x_client_id=self.client_id,
            db=self.db,
            current_user=mock_user
        )
        
        # O Funil 3 deve vir em primeiro lugar
        self.assertEqual(res[0].id, self.funnel3.id)
        self.assertTrue(res[0].is_pinned)

    def test_archive_pinned_funnel_fails(self):
        """Valida que tentar arquivar um funil fixado lança erro 400"""
        from routers.funnels import archive_funnel
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        # Fixar o funil 1
        self.funnel1.is_pinned = True
        self.db.commit()

        with self.assertRaises(HTTPException) as ctx:
            archive_funnel(
                funnel_id=self.funnel1.id,
                payload={"is_archived": True},
                x_client_id=self.client_id,
                db=self.db,
                current_user=mock_user
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Não é possível arquivar um funil que está fixado no topo", ctx.exception.detail)

    def test_delete_pinned_funnel_fails(self):
        """Valida que tentar excluir um funil fixado lança erro 400"""
        from routers.funnels import delete_funnel
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        # Fixar o funil 1
        self.funnel1.is_pinned = True
        self.db.commit()

        with self.assertRaises(HTTPException) as ctx:
            delete_funnel(
                funnel_id=self.funnel1.id,
                x_client_id=self.client_id,
                db=self.db,
                current_user=mock_user
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Não é possível excluir um funil que está fixado no topo", ctx.exception.detail)

    def test_delete_bulk_pinned_funnels_fails(self):
        """Valida que tentar excluir múltiplos funis onde um está fixado lança erro 400"""
        from routers.funnels import delete_funnels_bulk
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        # Fixar o funil 2
        self.funnel2.is_pinned = True
        self.db.commit()

        payload = schemas.FunnelBulkDelete(funnel_ids=[self.funnel1.id, self.funnel2.id])

        with self.assertRaises(HTTPException) as ctx:
            delete_funnels_bulk(
                payload=payload,
                x_client_id=self.client_id,
                db=self.db,
                current_user=mock_user
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Não é possível excluir um ou mais funis que estão fixados no topo", ctx.exception.detail)

    def test_archive_funnels_bulk_success(self):
        """Valida arquivamento em lote de funis com sucesso"""
        from routers.funnels import archive_funnels_bulk
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        payload = schemas.FunnelBulkArchive(funnel_ids=[self.funnel1.id, self.funnel2.id], is_archived=True)
        res = archive_funnels_bulk(
            payload=payload,
            x_client_id=self.client_id,
            db=self.db,
            current_user=mock_user
        )
        self.assertEqual(res["updated_count"], 2)
        
        # Verificar banco
        self.db.refresh(self.funnel1)
        self.db.refresh(self.funnel2)
        self.assertTrue(self.funnel1.is_archived)
        self.assertTrue(self.funnel2.is_archived)

    def test_archive_funnels_bulk_fails_if_pinned(self):
        """Valida que arquivar em lote falha se algum funil selecionado estiver fixado"""
        from routers.funnels import archive_funnels_bulk
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        # Fixar o funil 2
        self.funnel2.is_pinned = True
        self.db.commit()

        payload = schemas.FunnelBulkArchive(funnel_ids=[self.funnel1.id, self.funnel2.id], is_archived=True)
        with self.assertRaises(HTTPException) as ctx:
            archive_funnels_bulk(
                payload=payload,
                x_client_id=self.client_id,
                db=self.db,
                current_user=mock_user
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Não é possível arquivar um ou mais funis que estão fixados no topo", ctx.exception.detail)

    def test_tag_funnels_bulk_success(self):
        """Valida a alteração de etiqueta em lote com sucesso"""
        from routers.funnels import tag_funnels_bulk
        
        mock_user = MagicMock()
        mock_user.client_id = self.client_id

        payload = schemas.FunnelBulkTag(funnel_ids=[self.funnel1.id, self.funnel2.id], tag="LOTE_TESTE")
        res = tag_funnels_bulk(
            payload=payload,
            x_client_id=self.client_id,
            db=self.db,
            current_user=mock_user
        )
        self.assertEqual(res["updated_count"], 2)
        
        # Verificar banco
        self.db.refresh(self.funnel1)
        self.db.refresh(self.funnel2)
        self.assertEqual(self.funnel1.tag, "LOTE_TESTE")
        self.assertEqual(self.funnel2.tag, "LOTE_TESTE")

if __name__ == "__main__":
    unittest.main()

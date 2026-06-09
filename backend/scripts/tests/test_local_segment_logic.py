import sys, os
import asyncio
from datetime import datetime, timezone
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import unittest
from database import SessionLocal
import models
from core.engine.nodes.local_segment import handle_local_segment_node

class TestLocalSegmentNode(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.loop = asyncio.get_event_loop_policy().get_event_loop()

    def setUp(self):
        self.db = SessionLocal()
        self.client = self.db.query(models.Client).first()
        if not self.client:
            self.client = models.Client(name="Cliente Teste")
            self.db.add(self.client)
            self.db.commit()
            self.db.refresh(self.client)
            
        self.funnel = models.Funnel(name="Funil Segmento Teste", steps={}, client_id=self.client.id)
        self.db.add(self.funnel)
        self.db.commit()
        self.db.refresh(self.funnel)

        self.trigger = models.ScheduledTrigger(
            client_id=self.client.id,
            funnel_id=self.funnel.id,
            status='queued',
            scheduled_time=datetime.now(timezone.utc)
        )
        self.db.add(self.trigger)
        self.db.commit()
        self.db.refresh(self.trigger)

    def tearDown(self):
        # Limpar registros criados
        self.db.query(models.BlockedContact).filter_by(client_id=self.client.id).delete()
        self.db.query(models.WebhookLead).filter_by(client_id=self.client.id).delete()
        self.db.delete(self.trigger)
        self.db.delete(self.funnel)
        self.db.commit()
        self.db.close()

    def test_add_and_remove_tag_local(self):
        node_add = {
            "id": "node_test_add_tag",
            "data": {
                "action": "add_tag",
                "tagName": "teste-automatizado"
            }
        }
        node_remove = {
            "id": "node_test_remove_tag",
            "data": {
                "action": "remove_tag",
                "tagName": "teste-automatizado"
            }
        }
        
        async def run_test():
            # 1. Adicionar Tag
            res_add = await handle_local_segment_node(self.db, self.trigger, node_add, "5585999999999")
            self.assertEqual(res_add, "default")
            
            lead = self.db.query(models.WebhookLead).filter_by(
                client_id=self.client.id,
                phone="5585999999999"
            ).first()
            self.assertIsNotNone(lead)
            self.assertIn("teste-automatizado", lead.tags)
            
            # 2. Remover Tag
            res_remove = await handle_local_segment_node(self.db, self.trigger, node_remove, "5585999999999")
            self.assertEqual(res_remove, "default")
            
            self.db.refresh(lead)
            self.assertTrue(not lead.tags or "teste-automatizado" not in lead.tags)
            
        self.loop.run_until_complete(run_test())

    def test_block_and_unblock_blacklist(self):
        node_block = {
            "id": "node_test_block",
            "data": {
                "action": "block"
            }
        }
        node_unblock = {
            "id": "node_test_unblock",
            "data": {
                "action": "unblock"
            }
        }
        
        async def run_test():
            # 1. Bloquear
            res_block = await handle_local_segment_node(self.db, self.trigger, node_block, "5585888888888")
            self.assertEqual(res_block, "default")
            
            blocked = self.db.query(models.BlockedContact).filter_by(
                client_id=self.client.id,
                phone="5585888888888"
            ).first()
            self.assertIsNotNone(blocked)
            
            # 2. Desbloquear
            res_unblock = await handle_local_segment_node(self.db, self.trigger, node_unblock, "5585888888888")
            self.assertEqual(res_unblock, "default")
            
            blocked_after = self.db.query(models.BlockedContact).filter_by(
                client_id=self.client.id,
                phone="5585888888888"
            ).first()
            self.assertIsNone(blocked_after)
            
        self.loop.run_until_complete(run_test())

if __name__ == "__main__":
    unittest.main()

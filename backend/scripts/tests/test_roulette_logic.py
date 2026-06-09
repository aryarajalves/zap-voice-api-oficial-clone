import sys, os
import asyncio
from datetime import datetime, timezone
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import unittest
from database import SessionLocal
import models
from core.engine.nodes.roulette import handle_roulette_node

class TestRouletteNode(unittest.TestCase):
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
            
        self.funnel = models.Funnel(name="Funil Roleta Teste", steps={}, client_id=self.client.id)
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
        self.db.query(models.RouletteLog).filter_by(client_id=self.client.id).delete()
        self.db.delete(self.trigger)
        self.db.delete(self.funnel)
        self.db.commit()
        self.db.close()

    def test_zero_win_chance_always_loses(self):
        node = {
            "id": "node_test_roulette_0",
            "data": {
                "winChance": 0,
                "dailyLimit": 10
            }
        }
        
        async def run_test():
            for _ in range(5):
                res = await handle_roulette_node(self.db, self.trigger, node, "5585999999999")
                self.assertEqual(res, "perdeu")
                
        self.loop.run_until_complete(run_test())

    def test_hundred_win_chance_respects_limit(self):
        node = {
            "id": "node_test_roulette_100",
            "data": {
                "winChance": 100,
                "dailyLimit": 2
            }
        }
        
        async def run_test():
            # 1ª Rodada: 100% de chance -> Deve ganhar
            res1 = await handle_roulette_node(self.db, self.trigger, node, "5585999999999")
            self.assertEqual(res1, "ganhou")
            
            # 2ª Rodada: 100% de chance -> Deve ganhar (limite é 2)
            res2 = await handle_roulette_node(self.db, self.trigger, node, "5585999999999")
            self.assertEqual(res2, "ganhou")
            
            # 3ª Rodada: 100% de chance -> Deve PERDER (atingiu limite de 2)
            res3 = await handle_roulette_node(self.db, self.trigger, node, "5585999999999")
            self.assertEqual(res3, "perdeu")
            
        self.loop.run_until_complete(run_test())

if __name__ == "__main__":
    unittest.main()

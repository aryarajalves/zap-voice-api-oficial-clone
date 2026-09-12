# Mock rabbitmq_client before other imports
import sys
from unittest.mock import MagicMock, patch
sys.modules['rabbitmq_client'] = MagicMock()
sys.modules['rabbitmq_client'].rabbitmq = MagicMock()
sys.modules['config_loader'] = MagicMock()

import os
import unittest
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

import models
from routers.triggers.details import get_trigger_messages

class TestTriggerRemainingContacts(unittest.IsolatedAsyncioTestCase):
    async def test_status_filter_remaining_returns_unprocessed_and_duplicates(self):
        """
        Garante que status_filter='remaining' lista contatos que não tiveram envio
        e identifica duplicados na lista de contatos do disparo em massa.
        """
        db = MagicMock()
        trigger_id = 999
        client_id = 1
        
        # Disparo em massa com 4 contatos: 2 únicos e 1 duplicado (aparece 2x)
        contacts = [
            {"phone": "5511999990001", "name": "Contato 1"},
            {"phone": "5511999990002", "name": "Contato 2"},
            {"phone": "5511999990002", "name": "Contato 2 Duplicado"},
            {"phone": "", "name": "Contato Sem Telefone"}
        ]
        
        trigger = models.ScheduledTrigger(
            id=trigger_id,
            client_id=client_id,
            is_bulk=True,
            status="completed",
            total_contacts=4,
            total_sent=1,
            total_failed=0,
            total_skipped=0,
            total_blocked=0,
            template_name="Template Teste",
            contacts_list=contacts,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Mensagens já enviadas no banco: apenas 5511999990001 foi processado
        sent_status = [
            models.MessageStatus(
                id=1,
                trigger_id=trigger_id,
                phone_number="5511999990001",
                status="delivered",
                delivered_counted=True
            )
        ]
        
        # Mock do DB evitando operadores sobrecarregados de SQLAlchemy
        def mock_query(*entities):
            q = MagicMock()
            target = entities[0] if entities else None
            if target is models.ScheduledTrigger:
                q.filter.return_value.first.return_value = trigger
                q.filter.return_value.all.return_value = []
            elif target is models.ScheduledTrigger.id:
                q.filter.return_value.all.return_value = []
            elif target is models.MessageStatus or getattr(target, 'class_', None) is models.MessageStatus:
                q.filter.return_value.all.return_value = sent_status
                q.filter.return_value.count.return_value = 1
            elif target is models.WebhookLead or getattr(target, 'class_', None) is models.WebhookLead:
                q.filter.return_value.all.return_value = []
            else:
                q.filter.return_value.all.return_value = []
                q.filter.return_value.first.return_value = None
                q.filter.return_value.count.return_value = 0
            return q
            
        db.query.side_effect = mock_query
        user = models.User(id=1, client_id=client_id)
        
        result = await get_trigger_messages(
            trigger_id=trigger_id,
            status_filter="remaining",
            db=db,
            current_user=user,
            skip=0,
            limit=50
        )
        
        items = result.get("items", [])
        counts = result.get("counts", {})
        
        # Deve retornar 3 contatos restantes (5511999990002 original, o duplicado e o sem telefone)
        # O 5511999990001 foi enviado, logo não deve aparecer
        phones_returned = [i["phone_number"] for i in items]
        self.assertNotIn("5511999990001", phones_returned)
        self.assertEqual(len(items), 3)
        
        # Verifica a identificação do duplicado
        reasons = [i["failure_reason"] for i in items]
        self.assertTrue(any("duplicado" in r.lower() for r in reasons))
        self.assertTrue(any("ausente ou inválido" in r.lower() for r in reasons))
        
        # Verifica is_remaining=True
        self.assertTrue(all(i.get("is_remaining") is True for i in items))
        
        # Verifica o count de remaining
        self.assertEqual(counts.get("remaining"), 3)

    async def test_counts_remaining_in_normal_filter(self):
        """
        Valida que a propriedade 'remaining' está presente em counts mesmo
        quando o filtro for 'all'.
        """
        db = MagicMock()
        trigger_id = 998
        client_id = 1
        
        trigger = models.ScheduledTrigger(
            id=trigger_id,
            client_id=client_id,
            is_bulk=True,
            status="completed",
            total_contacts=10,
            total_sent=8,
            total_failed=1,
            total_skipped=0,
            total_blocked=0,
            template_name="Template Teste",
            contacts_list=[],
            created_at=datetime.utcnow()
        )
        
        def mock_query(*entities):
            q = MagicMock()
            target = entities[0] if entities else None
            if target is models.ScheduledTrigger:
                q.filter.return_value.first.return_value = trigger
                q.filter.return_value.all.return_value = []
            elif target is models.ScheduledTrigger.id:
                q.filter.return_value.all.return_value = []
            elif target is models.MessageStatus or getattr(target, 'class_', None) is models.MessageStatus:
                q.filter.return_value.all.return_value = []
                q.filter.return_value.count.return_value = 9
                q.with_entities.return_value.group_by.return_value = []
            elif target is models.WebhookLead or getattr(target, 'class_', None) is models.WebhookLead:
                q.filter.return_value.all.return_value = []
            else:
                q.filter.return_value.all.return_value = []
                q.filter.return_value.first.return_value = None
                q.filter.return_value.count.return_value = 0
            return q
            
        db.query.side_effect = mock_query
        user = models.User(id=1, client_id=client_id)
        
        result = await get_trigger_messages(
            trigger_id=trigger_id,
            status_filter="all",
            db=db,
            current_user=user,
            skip=0,
            limit=50
        )
        
        counts = result.get("counts", {})
        # Total: 10, processados: 8 sent + 1 failed = 9. Remaining deve ser 1.
        self.assertEqual(counts.get("remaining"), 1)

if __name__ == "__main__":
    unittest.main()

import unittest
from unittest.mock import MagicMock, patch, AsyncMock
import os

# Configurações de ambiente para testes em memória
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "1234567890123456789012345678901234567890"

class TestBulkPerformanceOptimizer(unittest.IsolatedAsyncioTestCase):

    def test_update_trigger_stats_batch_aggregation(self):
        """Valida que a atualização de estatísticas suporta agregação em lote e commit opcional."""
        from services.bulk_persistence import update_trigger_stats
        
        mock_db = MagicMock()
        mock_query = mock_db.query.return_value
        mock_filter = mock_query.filter_by.return_value
        
        # Teste com commit=False
        update_trigger_stats(mock_db, trigger_id=10, sent=5, failed=2, blocked=1, skipped=1, commit=False)
        mock_filter.update.assert_called_once()
        mock_db.commit.assert_not_called()
        
        # Teste com commit=True
        update_trigger_stats(mock_db, trigger_id=10, sent=3, commit=True)
        mock_db.commit.assert_called_once()

    async def test_get_sent_phones_set_normalization(self):
        """Valida que get_sent_phones_set normaliza corretamente os telefones retornados."""
        from services.bulk_persistence import get_sent_phones_set
        
        mock_db = MagicMock()
        mock_query = mock_db.query.return_value
        mock_filter = mock_query.filter.return_value
        mock_filter.all.return_value = [
            ("5511999998888",),
            ("551188887777",),
            ("+55 (11) 97777-6666",)
        ]
        
        sent_set = await get_sent_phones_set(mock_db, trigger_id=10)
        self.assertIn("5511999998888", sent_set)
        self.assertIn("5511988887777", sent_set)  # 9º dígito normalizado
        self.assertIn("5511977776666", sent_set)  # caracteres removidos

    @patch("services.bulk.SessionLocal")
    @patch("services.bulk.rabbitmq")
    @patch("services.bulk.send_smart_message")
    @patch("services.bulk.resolve_template_body_with_sync")
    async def test_process_bulk_send_in_memory_deduplication(self, mock_resolve, mock_send, mock_rmq, mock_session):
        """Valida que contatos já no sent_phones_set em memória são pulados sem chamar a API da Meta."""
        from services.bulk import process_bulk_send

        mock_resolve.return_value = ("Template Body", {"quick_replies": [], "has_special_buttons": False})
        mock_send.return_value = {"type": "TEMPLATE", "result": {"messages": [{"id": "wamid.123"}]}}
        mock_rmq.publish_event = AsyncMock()

        # Mock db session
        mock_db = MagicMock()
        mock_session.return_value = mock_db
        
        # Trigger mock
        mock_trig = MagicMock()
        mock_trig.id = 1
        mock_trig.client_id = 1
        mock_trig.status = "processing"
        mock_trig.processed_data = {}
        mock_trig.exclusion_list = []
        mock_trig.is_dynamic_label = False
        mock_trig.total_sent = 0
        mock_trig.total_failed = 0
        mock_trig.total_blocked = 0
        mock_trig.total_skipped = 0
        mock_trig.total_cost = 0.0
        mock_trig.total_paid_templates = 0
        
        mock_db.query.return_value.get.return_value = mock_trig
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.query.return_value.filter.return_value.all.return_value = []

        contacts = [
            {"phone": "5511999990001", "name": "Lead 1"},
            {"phone": "5511999990002", "name": "Lead 2"}
        ]

        await process_bulk_send(
            trigger_id=1,
            template_name="hello_world",
            contacts=contacts,
            delay=0,
            concurrency=2,
            language="pt_BR"
        )

        # Deve ter disparado para ambos os contatos
        self.assertEqual(mock_send.call_count, 2)

if __name__ == "__main__":
    unittest.main()

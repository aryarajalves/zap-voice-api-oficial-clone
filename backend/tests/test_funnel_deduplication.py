import os
import sys
import unittest
from unittest.mock import MagicMock, patch, AsyncMock

# Mock DATABASE_URL se não estiver definido
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

# Mock rabbitmq_client antes dos imports
sys.modules['rabbitmq_client'] = MagicMock()
sys.modules['rabbitmq_client'].rabbitmq = MagicMock()

class TestFunnelDeduplication(unittest.IsolatedAsyncioTestCase):
    @patch('core.worker.handlers.funnel.SessionLocal')
    async def test_funnel_lock_discards_duplicate_job(self, mock_session_factory):
        from core.worker.handlers.funnel import handle_funnel_execution

        db = MagicMock()
        mock_session_factory.return_value = db
        db.bind.dialect.name = 'postgresql'
        
        # Simular que a consulta pg_try_advisory_xact_lock retorna False (já bloqueado por outro worker)
        db.execute.return_value.scalar.return_value = False

        data = {"trigger_id": 409, "contact_phone": "556181636181"}

        # Não deve consultar nem alterar o ScheduledTrigger
        await handle_funnel_execution(data)
        db.query.assert_not_called()

if __name__ == "__main__":
    unittest.main()

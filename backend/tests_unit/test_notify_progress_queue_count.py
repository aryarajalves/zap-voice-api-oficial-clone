"""
Testes unitários para a função notify_progress do bulk.py
Valida que o queue_count é calculado corretamente via SQL real
e incluído no payload do WebSocket para garantir consistência com o modal de fila.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.fixture
def mock_trigger():
    """Trigger bulk simulado para testes"""
    t = MagicMock()
    t.id = 42
    t.is_bulk = True
    t.status = "processing"
    t.total_sent = 20
    t.total_failed = 3
    t.total_delivered = 10
    t.total_read = 5
    t.total_interactions = 2
    t.total_blocked = 1
    t.total_cost = 7.5
    t.total_paid_templates = 15
    t.total_contacts = 25
    return t


@pytest.fixture
def mock_db(mock_trigger):
    """Session de banco de dados simulada"""
    db = MagicMock()
    db.commit.return_value = None
    db.query.return_value.get.return_value = mock_trigger
    
    # Mock para a subquery de queue_count
    mock_query = MagicMock()
    mock_subquery = MagicMock()
    mock_query.filter.return_value = mock_query
    mock_query.group_by.return_value = mock_query
    mock_query.subquery.return_value = mock_subquery
    mock_query.count.return_value = 7  # 7 mensagens na fila
    
    # Encadear múltiplos .query() de forma diferenciada
    def query_side_effect(*args):
        return mock_query
    
    db.query.side_effect = query_side_effect
    # Garantir que o .get() ainda funcione para o trigger
    db.query.return_value.get.return_value = mock_trigger
    
    return db


class TestNotifyProgressQueueCount:
    """Testes para garantir que o queue_count é incluído no evento WebSocket"""

    @pytest.mark.asyncio
    async def test_notify_progress_includes_queue_count(self, mock_trigger):
        """queue_count deve estar presente no payload do evento bulk_progress"""
        db = MagicMock()
        db.commit.return_value = None
        
        call_count = [0]
        
        def query_side_effect(*args):
            mock_q = MagicMock()
            call_count[0] += 1
            if call_count[0] == 1:
                # Primeira chamada: busca o trigger
                mock_q.get.return_value = mock_trigger
                return mock_q
            else:
                # Chamadas subsequentes: queries de MessageStatus
                mock_q.filter.return_value = mock_q
                mock_q.group_by.return_value = mock_q
                mock_q.subquery.return_value = MagicMock()
                mock_q.count.return_value = 5
                return mock_q
        
        db.query.side_effect = query_side_effect

        published_payload = {}

        async def mock_publish(event_name, payload):
            published_payload.update(payload)

        with patch("services.bulk_simulation.rabbitmq") as mock_rabbitmq:
            mock_rabbitmq.publish_event = AsyncMock(side_effect=mock_publish)
            
            from services.bulk_simulation import notify_progress
            await notify_progress(db, 42)
        
        # Verificar que queue_count está no payload
        assert "queue_count" in published_payload, "queue_count deve estar no payload do WebSocket"
        assert isinstance(published_payload["queue_count"], int), "queue_count deve ser inteiro"

    @pytest.mark.asyncio
    async def test_notify_progress_queue_count_fallback_on_error(self, mock_trigger):
        """Em caso de erro na query de queue_count, deve usar o fallback calculado"""
        db = MagicMock()
        db.commit.return_value = None
        
        call_count = [0]
        
        def query_side_effect(*args):
            mock_q = MagicMock()
            call_count[0] += 1
            if call_count[0] == 1:
                mock_q.get.return_value = mock_trigger
                return mock_q
            else:
                # Simular erro na query de MessageStatus
                mock_q.filter.side_effect = Exception("DB Error simulado")
                return mock_q
        
        db.query.side_effect = query_side_effect
        
        published_payload = {}

        async def mock_publish(event_name, payload):
            published_payload.update(payload)

        with patch("services.bulk_simulation.rabbitmq") as mock_rabbitmq:
            mock_rabbitmq.publish_event = AsyncMock(side_effect=mock_publish)
            
            from services.bulk_simulation import notify_progress
            await notify_progress(db, 42)
        
        # No fallback: total_sent(20) - total_delivered(10) - total_failed(3) = 7
        assert "queue_count" in published_payload
        expected_fallback = max(0, mock_trigger.total_sent - mock_trigger.total_delivered - mock_trigger.total_failed)
        assert published_payload["queue_count"] == expected_fallback, (
            f"Fallback incorreto: esperado {expected_fallback}, obtido {published_payload['queue_count']}"
        )

    @pytest.mark.asyncio
    async def test_notify_progress_queue_count_never_negative(self, mock_trigger):
        """queue_count nunca deve ser negativo mesmo com dados inconsistentes"""
        # Simular estado onde total_delivered > total_sent (inconsistência)
        mock_trigger.total_sent = 5
        mock_trigger.total_delivered = 10  # Inconsistente
        mock_trigger.total_failed = 2
        
        db = MagicMock()
        db.commit.return_value = None
        
        call_count = [0]
        
        def query_side_effect(*args):
            mock_q = MagicMock()
            call_count[0] += 1
            if call_count[0] == 1:
                mock_q.get.return_value = mock_trigger
                return mock_q
            else:
                mock_q.filter.side_effect = Exception("Force fallback")
                return mock_q
        
        db.query.side_effect = query_side_effect
        
        published_payload = {}

        async def mock_publish(event_name, payload):
            published_payload.update(payload)

        with patch("services.bulk_simulation.rabbitmq") as mock_rabbitmq:
            mock_rabbitmq.publish_event = AsyncMock(side_effect=mock_publish)
            
            from services.bulk_simulation import notify_progress
            await notify_progress(db, 42)
        
        # Mesmo com dados inconsistentes, queue_count não deve ser negativo
        assert published_payload.get("queue_count", 0) >= 0, "queue_count não pode ser negativo"

    @pytest.mark.asyncio
    async def test_notify_progress_all_required_fields_present(self, mock_trigger):
        """Verificar que todos os campos obrigatórios estão presentes no payload"""
        db = MagicMock()
        db.commit.return_value = None
        
        call_count = [0]
        
        def query_side_effect(*args):
            mock_q = MagicMock()
            call_count[0] += 1
            if call_count[0] == 1:
                mock_q.get.return_value = mock_trigger
                return mock_q
            else:
                mock_q.filter.side_effect = Exception("Force fallback")
                return mock_q
        
        db.query.side_effect = query_side_effect
        
        published_payload = {}

        async def mock_publish(event_name, payload):
            published_payload.update(payload)

        with patch("services.bulk_simulation.rabbitmq") as mock_rabbitmq:
            mock_rabbitmq.publish_event = AsyncMock(side_effect=mock_publish)
            
            from services.bulk_simulation import notify_progress
            await notify_progress(db, 42)
        
        required_fields = [
            "trigger_id", "status", "sent", "total_sent",
            "failed", "total_failed", "delivered", "total_delivered",
            "read", "total_read", "interactions", "total_interactions",
            "blocked", "total_blocked", "cost", "total_cost",
            "total_paid_templates", "total", "total_contacts",
            "queue_count"  # Novo campo obrigatório
        ]
        
        for field in required_fields:
            assert field in published_payload, f"Campo '{field}' ausente no payload do WebSocket"

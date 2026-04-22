"""
Unit tests for:
1. Engine traversal — execute_funnel must not overwrite 'queued' status on delay suspension
2. Triggers service — increment_delivery_stats idempotency
3. Triggers service — increment_read_stats and increment_failed_stats atomicity
4. get_next_node — edge traversal logic
"""
import os
import sys
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call

# Ensure backend is on the path (already handled by conftest.py in practice)
backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)


# ─────────────────────────────────────────────────────────────────────────────
# Helper factories
# ─────────────────────────────────────────────────────────────────────────────

def make_trigger(**kwargs):
    """Return a mock ScheduledTrigger with sensible defaults."""
    t = MagicMock()
    t.id = kwargs.get("id", 1)
    t.client_id = kwargs.get("client_id", 1)
    t.status = kwargs.get("status", "processing")
    t.is_bulk = kwargs.get("is_bulk", False)
    t.funnel_id = kwargs.get("funnel_id", 10)
    t.current_node_id = kwargs.get("current_node_id", None)
    t.template_name = kwargs.get("template_name", None)
    t.total_sent = kwargs.get("total_sent", 0)
    t.total_delivered = kwargs.get("total_delivered", 0)
    t.total_read = kwargs.get("total_read", 0)
    t.total_failed = kwargs.get("total_failed", 0)
    t.contact_phone = kwargs.get("contact_phone", "5511999999999")
    t.contact_name = kwargs.get("contact_name", "Teste")
    t.conversation_id = kwargs.get("conversation_id", None)
    t.updated_at = None
    t.created_at = None
    t.execution_history = []
    t.failure_reason = None
    return t


def make_message_status(**kwargs):
    msg = MagicMock()
    msg.id = kwargs.get("id", 100)
    msg.trigger_id = kwargs.get("trigger_id", 1)
    msg.message_id = kwargs.get("message_id", "wamid.test123")
    msg.phone_number = kwargs.get("phone_number", "5511999999999")
    msg.status = kwargs.get("status", "sent")
    msg.delivered_counted = kwargs.get("delivered_counted", False)
    msg.message_type = kwargs.get("message_type", "TEMPLATE")
    msg.meta_price_brl = kwargs.get("meta_price_brl", None)
    return msg


# ─────────────────────────────────────────────────────────────────────────────
# Tests: get_next_node
# ─────────────────────────────────────────────────────────────────────────────

class TestGetNextNode:
    def test_returns_next_node_single_edge(self):
        from services.engine import get_next_node
        edges = [{"source": "node1", "target": "node2", "sourceHandle": None}]
        result = get_next_node("node1", edges, None)
        assert result == "node2"

    def test_returns_none_when_no_edges(self):
        from services.engine import get_next_node
        edges = []
        result = get_next_node("node1", edges, None)
        assert result is None

    def test_matches_source_handle(self):
        from services.engine import get_next_node
        edges = [
            {"source": "node1", "target": "node_yes", "sourceHandle": "yes"},
            {"source": "node1", "target": "node_no", "sourceHandle": "no"},
        ]
        result = get_next_node("node1", edges, "yes")
        assert result == "node_yes"

    def test_no_match_for_wrong_handle(self):
        from services.engine import get_next_node
        edges = [
            {"source": "node1", "target": "node_yes", "sourceHandle": "yes"},
        ]
        result = get_next_node("node1", edges, "no")
        assert result is None

    def test_id_normalized_to_string(self):
        """Node IDs that come back as integers should still match string IDs from edges."""
        from services.engine import get_next_node
        edges = [{"source": "42", "target": "43", "sourceHandle": None}]
        # Pass int-like current_id; get_next_node normalizes to str
        result = get_next_node(42, edges, None)
        assert result == "43"


# ─────────────────────────────────────────────────────────────────────────────
# Tests: execute_funnel — status preservation after delay suspension
# ─────────────────────────────────────────────────────────────────────────────

class TestExecuteFunnelStatusPreservation:
    """
    Critical regression test: after execute_graph_funnel() returns early (for a 
    long delay), the outer execute_funnel() must NOT overwrite trigger.status 
    back to 'completed'.
    """

    async def test_queued_status_preserved_after_delay_suspension(self, db_session):
        """
        When execute_graph_funnel suspends due to a delay (sets status='queued'),
        execute_funnel must not set status='completed' on return.
        """
        import models
        from datetime import datetime, timezone

        # Create a minimal funnel and trigger
        funnel = models.Funnel(
            client_id=1,
            name="Test Delay Funnel",
            steps={"nodes": [], "edges": []}  # Content irrelevant: graph will be mocked
        )
        db_session.add(funnel)
        db_session.flush()

        trigger = models.ScheduledTrigger(
            client_id=1,
            funnel_id=funnel.id,
            status="processing",
            is_bulk=False,
            contact_phone="5511999999999",
            scheduled_time=datetime.now(timezone.utc),
        )
        db_session.add(trigger)
        db_session.flush()

        # simulate execute_graph_funnel suspending the trigger (delay node scenario)
        async def fake_graph_suspend(trigger_obj, *args, **kwargs):
            trigger_obj.status = 'queued'
            db_session.commit()

        with patch("services.engine.ChatwootClient") as MockChatwoot, \
             patch("services.engine.execute_graph_funnel", side_effect=fake_graph_suspend), \
             patch("services.engine.rabbitmq") as mock_rmq:

            mock_rmq.publish = AsyncMock()
            MockChatwoot.return_value = AsyncMock()

            from services.engine import execute_funnel
            await execute_funnel(
                funnel_id=funnel.id,
                conversation_id=0,
                trigger_id=trigger.id,
                contact_phone="5511999999999",
                db=db_session,
                skip_block_check=True
            )

        db_session.refresh(trigger)
        assert trigger.status == "queued", (
            f"Expected trigger.status='queued' (delay suspension), got '{trigger.status}'. "
            "The engine is overwriting the queued status with 'completed'!"
        )

    async def test_completed_status_set_after_full_execution(self, db_session):
        """
        When execute_graph_funnel completes all nodes without suspension,
        trigger.status should be 'completed'.
        """
        import models
        from datetime import datetime, timezone

        funnel = models.Funnel(
            client_id=1,
            name="Test Simple Funnel",
            steps={"nodes": [], "edges": []}
        )
        db_session.add(funnel)
        db_session.flush()

        trigger = models.ScheduledTrigger(
            client_id=1,
            funnel_id=funnel.id,
            status="processing",
            is_bulk=False,
            contact_phone="5511999999999",
            scheduled_time=datetime.now(timezone.utc),
        )
        db_session.add(trigger)
        db_session.flush()

        # simulate execute_graph_funnel running to completion (sets its own 'completed')
        async def fake_graph_complete(trigger_obj, *args, **kwargs):
            trigger_obj.status = 'completed'
            db_session.commit()

        with patch("services.engine.ChatwootClient") as MockChatwoot, \
             patch("services.engine.execute_graph_funnel", side_effect=fake_graph_complete), \
             patch("services.engine.rabbitmq") as mock_rmq:

            mock_rmq.publish = AsyncMock()
            MockChatwoot.return_value = AsyncMock()

            from services.engine import execute_funnel
            await execute_funnel(
                funnel_id=funnel.id,
                conversation_id=0,
                trigger_id=trigger.id,
                contact_phone="5511999999999",
                db=db_session,
                skip_block_check=True
            )

        db_session.refresh(trigger)
        assert trigger.status == "completed", (
            f"Expected trigger.status='completed' after full execution, got '{trigger.status}'."
        )


# ─────────────────────────────────────────────────────────────────────────────
# Tests: increment_delivery_stats — idempotency
# ─────────────────────────────────────────────────────────────────────────────

class TestIncrementDeliveryStats:

    def test_increments_delivered_on_first_call(self, db_session):
        import models
        from datetime import datetime, timezone
        from services.triggers_service import increment_delivery_stats

        trigger = models.ScheduledTrigger(
            client_id=1,
            status="completed",
            is_bulk=True,
            total_delivered=0,
            scheduled_time=datetime.now(timezone.utc),
        )
        db_session.add(trigger)
        db_session.flush()

        message = models.MessageStatus(
            trigger_id=trigger.id,
            message_id="wamid.abc123",
            phone_number="5511999999999",
            status="delivered",
            delivered_counted=False,
        )
        db_session.add(message)
        db_session.flush()

        result = increment_delivery_stats(db_session, trigger, message, cost=0.0)

        assert result == True
        db_session.refresh(message)
        assert message.delivered_counted == True

        db_session.refresh(trigger)
        assert trigger.total_delivered == 1

    def test_does_not_double_count_on_second_call(self, db_session):
        import models
        from datetime import datetime, timezone
        from services.triggers_service import increment_delivery_stats

        trigger = models.ScheduledTrigger(
            client_id=1,
            status="completed",
            is_bulk=True,
            total_delivered=0,
            scheduled_time=datetime.now(timezone.utc),
        )
        db_session.add(trigger)
        db_session.flush()

        message = models.MessageStatus(
            trigger_id=trigger.id,
            message_id="wamid.def456",
            phone_number="5511999999999",
            status="delivered",
            delivered_counted=False,
        )
        db_session.add(message)
        db_session.flush()

        # First call — should succeed
        result1 = increment_delivery_stats(db_session, trigger, message, cost=0.0)
        assert result1 == True

        # Second call (simulating RabbitMQ duplicate) — should be rejected
        result2 = increment_delivery_stats(db_session, trigger, message, cost=0.0)
        assert result2 == False

        db_session.refresh(trigger)
        assert trigger.total_delivered == 1  # Still 1, not 2!


# ─────────────────────────────────────────────────────────────────────────────
# Tests: increment_read_stats and increment_failed_stats
# ─────────────────────────────────────────────────────────────────────────────

class TestAtomicStatIncrements:

    def test_increment_read_stats(self, db_session):
        import models
        from datetime import datetime, timezone
        from services.triggers_service import increment_read_stats

        trigger = models.ScheduledTrigger(
            client_id=1,
            status="completed",
            is_bulk=True,
            total_read=0,
            scheduled_time=datetime.now(timezone.utc),
        )
        db_session.add(trigger)
        db_session.flush()

        increment_read_stats(db_session, trigger.id)
        increment_read_stats(db_session, trigger.id)

        db_session.refresh(trigger)
        assert trigger.total_read == 2

    def test_increment_failed_stats(self, db_session):
        import models
        from datetime import datetime, timezone
        from services.triggers_service import increment_failed_stats

        trigger = models.ScheduledTrigger(
            client_id=1,
            status="processing",
            is_bulk=True,
            total_failed=0,
            scheduled_time=datetime.now(timezone.utc),
        )
        db_session.add(trigger)
        db_session.flush()

        increment_failed_stats(db_session, trigger.id)

        db_session.refresh(trigger)
        assert trigger.total_failed == 1

    def test_increment_sent_stats_still_works(self, db_session):
        import models
        from datetime import datetime, timezone
        from services.triggers_service import increment_sent_stats

        trigger = models.ScheduledTrigger(
            client_id=1,
            status="processing",
            is_bulk=True,
            total_sent=5,
            scheduled_time=datetime.now(timezone.utc),
        )
        db_session.add(trigger)
        db_session.flush()

        increment_sent_stats(db_session, trigger.id)

        db_session.refresh(trigger)
        assert trigger.total_sent == 6

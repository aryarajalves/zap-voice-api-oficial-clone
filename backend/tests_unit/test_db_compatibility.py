
import pytest
from sqlalchemy import cast, String
import models
import uuid

def test_integration_id_query_compatibility(db_session):
    # Setup
    integration_id = uuid.uuid4()
    
    # Check if we can query using cast even in SQLite
    # (SQLite might ignore types but we want to ensure the syntax is correct)
    query = db_session.query(models.ScheduledTrigger).filter(
        cast(models.ScheduledTrigger.integration_id, String) == str(integration_id)
    )
    
    # Should not raise any error
    try:
        query.all()
    except Exception as e:
        pytest.fail(f"Query with cast failed: {e}")

def test_webhook_history_query_compatibility(db_session):
    integration_id = uuid.uuid4()
    
    query = db_session.query(models.WebhookHistory).filter(
        cast(models.WebhookHistory.integration_id, String) == str(integration_id)
    )
    
    try:
        query.all()
    except Exception as e:
        pytest.fail(f"Query with cast failed: {e}")

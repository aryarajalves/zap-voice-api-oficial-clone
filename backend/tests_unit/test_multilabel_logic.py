import pytest
from unittest.mock import AsyncMock, patch
from chatwoot_client import ChatwootClient
from models import ScheduledTrigger, WebhookEventMapping
from sqlalchemy.orm import Session
import json

@pytest.mark.asyncio
async def test_chatwoot_client_add_multiple_labels():
    """Test adding multiple labels to Chatwoot conversation"""
    cw = ChatwootClient(client_id=1)
    cw.api_token = "fake_token"
    cw.account_id = "fake_acc"
    cw.base_url = "https://fake.url"
    
    # Mock existing labels
    with patch.object(cw, 'get_conversation_labels', new_callable=AsyncMock) as mock_get:
        mock_get.return_value = ["label1", "label2"]
        
        with patch.object(cw, '_request', new_callable=AsyncMock) as mock_req:
            mock_req.return_value = {"payload": ["label1", "label2", "new1", "new2"]}
            
            # Test with a list
            result = await cw.add_label_to_conversation(123, ["new1", "new2", "label1"])
            
            # Verify _request was called with merged unique labels
            args, kwargs = mock_req.call_args
            sent_labels = set(kwargs['json']['labels'])
            expected_labels = {"label1", "label2", "new1", "new2"}
            assert sent_labels == expected_labels
            assert len(kwargs['json']['labels']) == 4

@pytest.mark.asyncio
async def test_chatwoot_client_add_labels_string_compatibility():
    """Test compatibility with comma-separated string (legacy)"""
    cw = ChatwootClient(client_id=1)
    cw.api_token = "fake_token"
    
    with patch.object(cw, 'get_conversation_labels', new_callable=AsyncMock) as mock_get:
        mock_get.return_value = []
        with patch.object(cw, '_request', new_callable=AsyncMock) as mock_req:
            await cw.add_label_to_conversation(123, "tag1, tag2 , tag1")
            
            args, kwargs = mock_req.call_args
            assert set(kwargs['json']['labels']) == {"tag1", "tag2"}

def test_model_json_labels_storage(db_session: Session):
    """Test that models correctly store and retrieve list as JSON"""
    # Create mapping with multiple labels
    mapping = WebhookEventMapping(
        integration_id="00000000-0000-0000-0000-000000000000",
        event_type="test_event",
        chatwoot_label=["labelA", "labelB"]
    )
    db_session.add(mapping)
    db_session.commit()
    
    # Retrieve and verify
    retrieved = db_session.query(WebhookEventMapping).filter_by(event_type="test_event").first()
    assert isinstance(retrieved.chatwoot_label, list)
    assert "labelA" in retrieved.chatwoot_label
    assert "labelB" in retrieved.chatwoot_label

def test_migration_logic():
    """Verify the logic used in migrate_chatwoot_labels.py script"""
    # Mock objects simulating DB records
    class MockRecord:
        def __init__(self, label):
            self.chatwoot_label = label
            
    m1 = MockRecord("label1, label2")
    m2 = MockRecord(["already", "list"])
    m3 = MockRecord(None)
    m4 = MockRecord("single")
    
    records = [m1, m2, m3, m4]
    
    for r in records:
        if r.chatwoot_label and isinstance(r.chatwoot_label, str):
            labels = [l.strip() for l in r.chatwoot_label.split(',') if l.strip()]
            r.chatwoot_label = labels
            
    assert m1.chatwoot_label == ["label1", "label2"]
    assert m2.chatwoot_label == ["already", "list"]
    assert m3.chatwoot_label is None
    assert m4.chatwoot_label == ["single"]

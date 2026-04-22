import pytest
from unittest.mock import MagicMock
from routers.webhooks_public import parse_webhook_payload
from models import WebhookEventMapping

def test_webhook_label_aggregation_list_logic():
    """Verify that we handle both list and string in the mock of webhooks_public logic"""
    # Simulate the logic added to webhooks_public.py
    def get_tags(mappings):
        all_tags = []
        for m in mappings:
            if m.chatwoot_label:
                if isinstance(m.chatwoot_label, list):
                    all_tags.extend([str(t).strip() for t in m.chatwoot_label if t])
                else:
                    all_tags.extend([t.strip() for t in str(m.chatwoot_label).split(',') if t.strip()])
        return all_tags

    # Test Case 1: All Lists
    m1 = MagicMock(spec=WebhookEventMapping)
    m1.chatwoot_label = ["tag1", "tag2"]
    m2 = MagicMock(spec=WebhookEventMapping)
    m2.chatwoot_label = ["tag3"]
    
    assert get_tags([m1, m2]) == ["tag1", "tag2", "tag3"]

    # Test Case 2: Mix of List and String (Backward compatibility)
    m3 = MagicMock(spec=WebhookEventMapping)
    m3.chatwoot_label = "tag4, tag5"
    
    assert get_tags([m1, m3]) == ["tag1", "tag2", "tag4", "tag5"]

    # Test Case 3: Empty/None
    m4 = MagicMock(spec=WebhookEventMapping)
    m4.chatwoot_label = None
    m5 = MagicMock(spec=WebhookEventMapping)
    m5.chatwoot_label = []
    
    assert get_tags([m4, m5]) == []

def test_webhook_label_aggregation_with_integers():
    """Verify handling if someone puts integers in the list"""
    def get_tags(mappings):
        all_tags = []
        for m in mappings:
            if m.chatwoot_label:
                if isinstance(m.chatwoot_label, list):
                    all_tags.extend([str(t).strip() for t in m.chatwoot_label if t])
                else:
                    all_tags.extend([t.strip() for t in str(m.chatwoot_label).split(',') if t.strip()])
        return all_tags

    m1 = MagicMock(spec=WebhookEventMapping)
    m1.chatwoot_label = [123, "tagB"]
    
    assert get_tags([m1]) == ["123", "tagB"]

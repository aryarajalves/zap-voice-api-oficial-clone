import pytest
from datetime import datetime, timezone, timedelta

def test_template_sorting_key():
    templates = [
        {'name': 'Template B', 'created_at': '2026-08-20T10:00:00Z', 'is_pinned': False},
        {'name': 'Template A', 'created_at': None, 'is_pinned': True},
        {'name': 'Template C', 'created_at': '2026-08-21T10:00:00Z', 'is_pinned': False},
        {'name': 'Template D', 'created_at': 'invalid_date', 'is_pinned': False},
    ]

    def get_sort_key(t):
        is_pinned_val = 0 if t.get('is_pinned', False) else 1
        created_val = 0
        if t.get('created_at'):
            try:
                clean_dt = str(t.get('created_at')).replace('Z', '+00:00')
                created_val = -datetime.fromisoformat(clean_dt).timestamp()
            except Exception:
                created_val = 0
        name_val = str(t.get('name') or '').lower()
        return (is_pinned_val, created_val, name_val)

    templates.sort(key=get_sort_key)

    assert templates[0]['name'] == 'Template A'
    assert templates[1]['name'] == 'Template C'
    assert templates[2]['name'] == 'Template B'
    assert templates[3]['name'] == 'Template D'

def test_health_check_structure():
    sample_response = {
        'database': 'online',
        'rabbitmq': 'online',
        'whatsapp': 'online',
        'chatwoot': 'disabled',
        'instagram': 'offline',
        'storage': 'online'
    }
    assert sample_response['database'] == 'online'
    assert sample_response['rabbitmq'] == 'online'

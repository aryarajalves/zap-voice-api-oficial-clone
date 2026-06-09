import pytest
from datetime import datetime
from pydantic import ValidationError
from schemas import WebhookLead

def test_webhook_lead_variables_validation_coercion():
    # 1. Test dictionary (should remain dict)
    valid_lead_data = {
        "id": 1,
        "client_id": 1,
        "name": "Maria Teste",
        "phone": "5585999999999",
        "email": "maria@teste.com",
        "variables": {"key": "value"},
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    lead = WebhookLead(**valid_lead_data)
    assert lead.variables == {"key": "value"}

    # 2. Test empty list [] (should coerce to {})
    list_lead_data = valid_lead_data.copy()
    list_lead_data["variables"] = []
    lead = WebhookLead(**list_lead_data)
    assert lead.variables == {}

    # 3. Test None (should coerce to {})
    none_lead_data = valid_lead_data.copy()
    none_lead_data["variables"] = None
    lead = WebhookLead(**none_lead_data)
    assert lead.variables == {}

    # 4. Test string JSON (should parse and coerce to dict)
    str_lead_data = valid_lead_data.copy()
    str_lead_data["variables"] = '{"custom_var": "custom_val"}'
    lead = WebhookLead(**str_lead_data)
    assert lead.variables == {"custom_var": "custom_val"}

    # 5. Test invalid string (should coerce to {})
    invalid_str_lead_data = valid_lead_data.copy()
    invalid_str_lead_data["variables"] = "invalid json string"
    lead = WebhookLead(**invalid_str_lead_data)
    assert lead.variables == {}

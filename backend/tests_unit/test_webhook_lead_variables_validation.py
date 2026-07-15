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

def test_resolve_lead_variables():
    from services.scheduler import resolve_lead_variables
    from models import WebhookLead as ModelLead
    
    lead_model = ModelLead(
        name="John Doe",
        phone="5511999998888",
        email="john@doe.com",
        event_datetime=datetime(2026, 7, 20, 15, 30),
        google_calendar_link="http://calendar.google.com/test"
    )
    
    assert resolve_lead_variables("Olá {name}!", lead_model) == "Olá John Doe!"
    assert resolve_lead_variables("Fone: {phone}", lead_model) == "Fone: 5511999998888"
    assert resolve_lead_variables("E-mail: {email}", lead_model) == "E-mail: john@doe.com"
    assert resolve_lead_variables("Horário: {event_datetime}", lead_model) == "Horário: 20/07/2026 15:30"
    assert resolve_lead_variables("Link: {google_calendar_link}", lead_model) == "Link: http://calendar.google.com/test"
    assert resolve_lead_variables("Nenhum match", lead_model) == "Nenhum match"
    assert resolve_lead_variables("", lead_model) == ""


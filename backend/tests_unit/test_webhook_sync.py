import pytest
from routers.webhooks_public import parse_webhook_payload, extract_nested_custom_fields

def test_elementor_standard_extraction_flat():
    payload = {
        "fields[phone][value]": "(85) 98769-6383",
        "fields[name][value]": "Teste",
        "fields[email][value]": "teste@gmail.com",
        "meta[credit][value]": "Elementor"
    }
    
    # Simulate a generic platform integration
    parsed = parse_webhook_payload("Outros", payload)
    
    assert parsed["phone"] == "5585987696383"
    assert parsed["name"] == "Teste"
    assert parsed["email"] == "teste@gmail.com"

def test_elementor_standard_extraction_nested():
    payload = {
        "fields": {
            "phone": {"value": "(85) 98769-6383"},
            "name": {"value": "Teste Nested"},
            "email": {"value": "nested@gmail.com"}
        }
    }
    
    parsed = parse_webhook_payload("Elementor", payload)
    
    assert parsed["phone"] == "5585987696383"
    assert parsed["name"] == "Teste Nested"
    assert parsed["email"] == "nested@gmail.com"

def test_custom_field_sync_logic():
    # This simulates the logic I added to receive_external_webhook
    payload = {
        "custom_phone_field": "85987696383",
        "custom_name_field": "Mapeado Manualmente"
    }
    
    # 1. Standard extraction fails (empty payload for standard fields)
    parsed_data = parse_webhook_payload("Outros", payload)
    assert parsed_data["phone"] is None
    assert parsed_data["name"] is None
    
    # 2. Custom mapping extraction succeeds
    mapping = {
        "phone": "custom_phone_field",
        "name": "custom_name_field"
    }
    custom_fields = extract_nested_custom_fields(payload, mapping)
    assert custom_fields["phone"] == "85987696383"
    
    # 3. Apply the SYNC logic (the one I added to webhooks_public.py)
    if custom_fields:
        if not parsed_data.get("phone") and custom_fields.get("phone"):
            parsed_data["phone"] = custom_fields["phone"]
        if not parsed_data.get("name") and custom_fields.get("name"):
            parsed_data["name"] = custom_fields["name"]
            
    # 4. Final normalization logic
    if parsed_data.get("phone"):
        raw_phone = str(parsed_data["phone"])
        cleaned = "".join(filter(str.isdigit, raw_phone))
        if len(cleaned) >= 8:
            if not cleaned.startswith("55") and len(cleaned) <= 11:
                cleaned = "55" + cleaned
            parsed_data["phone"] = cleaned
            
    assert parsed_data["phone"] == "5585987696383"
    assert parsed_data["name"] == "Mapeado Manualmente"

if __name__ == "__main__":
    pytest.main([__file__])

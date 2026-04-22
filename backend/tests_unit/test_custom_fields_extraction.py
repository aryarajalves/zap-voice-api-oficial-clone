import pytest
from routers.webhooks_public import extract_nested_custom_fields

def test_extract_nested_custom_fields_basic():
    payload = {
        "customer": {
            "name": "John Doe",
            "document": "12345678900",
            "address": {
                "city": "Sao Paulo"
            }
        },
        "event": "purchase",
        "nested_empty": {}
    }

    mapping = {
        "Documento": "customer.document",
        "Cidade": "customer.address.city",
        "Evento": "event",
        "Inexistente": "customer.age",
        "Completamente_Inexistente": "not.found.value"
    }

    result = extract_nested_custom_fields(payload, mapping)

    assert result.get("Documento") == "12345678900"
    assert result.get("Cidade") == "Sao Paulo"
    assert result.get("Evento") == "purchase"
    assert "Inexistente" not in result
    assert "Completamente_Inexistente" not in result

def test_extract_nested_custom_fields_empty():
    assert extract_nested_custom_fields({}, {"a": "b"}) == {}
    assert extract_nested_custom_fields({"a": "b"}, {}) == {}
    assert extract_nested_custom_fields(None, {"a": "b"}) == {}

def test_extract_nested_custom_fields_deep():
    payload = {
        "data": {
            "webhook": {
                "buyer": {
                    "custom_answers": {
                        "q1": "Answer to question 1",
                        "q2": "Answer to question 2"
                    }
                }
            }
        }
    }
    
    mapping = {
        "Resposta 1": "data.webhook.buyer.custom_answers.q1",
        "Resposta 2": "data.webhook.buyer.custom_answers.q2"
    }

    result = extract_nested_custom_fields(payload, mapping)
    assert result.get("Resposta 1") == "Answer to question 1"
    assert result.get("Resposta 2") == "Answer to question 2"

if __name__ == "__main__":
    pytest.main([__file__])

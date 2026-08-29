import pytest
from services.webhooks_utils import parse_webhook_payload

def test_hotmart_purchase_out_of_shopping_cart():
    """Testa se o evento PURCHASE_OUT_OF_SHOPPING_CART da Hotmart é classificado como checkout_pre_populado"""
    payload = {
        "event": "PURCHASE_OUT_OF_SHOPPING_CART",
        "checkout_pre_populado": True,
        "is_checkout_pre_populado": True,
        "tipo": "checkout_pre_populado",
        "origem": "checkout_pre_populado",
        "nome": "Aryaraj Teste Fernandes",
        "whatsapp": "+5585996123586",
        "data": {
            "product": {
                "name": "Bússola Astrológica"
            },
            "buyer": {
                "name": "Aryaraj Teste Fernandes",
                "phone": "+5585996123586"
            }
        }
    }

    result = parse_webhook_payload("hotmart", payload)
    assert result["event_type"] == "checkout_pre_populado"
    assert result["name"] == "Aryaraj Teste Fernandes"
    assert result["phone"] == "5585996123586"
    assert result["product_name"] == "Bússola Astrológica"
    assert result["raw_status"] == "Checkout Pré-populado"


def test_generic_checkout_pre_populado_flag():
    """Testa se flags genéricas de checkout pré-populado são detectadas em qualquer plataforma"""
    payload = {
        "checkout_pre_populado": True,
        "name": "Cliente Teste",
        "phone": "11999998888",
        "product_name": "Curso Exemplo"
    }

    result = parse_webhook_payload("outra", payload)
    assert result["event_type"] == "checkout_pre_populado"
    assert result["raw_status"] == "Checkout Pré-populado"

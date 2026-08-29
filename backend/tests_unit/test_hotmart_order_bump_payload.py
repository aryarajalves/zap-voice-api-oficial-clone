import pytest
from services.webhooks_utils import parse_webhook_payload

def test_hotmart_order_bump_nested_dict():
    """Testa se a Hotmart com purchase.order_bump.is_order_bump = True é detectada como compra_aprovada_ob"""
    payload = {
        "id": "997e62be-405e-47a9-bfe0-149dcf5a9499",
        "data": {
            "buyer": {
                "name": "CARLA CIBELLI Corrêa",
                "email": "carlacscdlago@gmail.com",
                "checkout_phone": "48991101603"
            },
            "product": {
                "id": 8349168,
                "name": "Bússola Astrológica"
            },
            "purchase": {
                "status": "APPROVED",
                "price": {
                    "value": 67,
                    "currency_value": "BRL"
                },
                "order_bump": {
                    "is_order_bump": True
                }
            }
        },
        "event": "PURCHASE_APPROVED"
    }

    result = parse_webhook_payload("hotmart", payload)
    assert result["order_bump"] is True
    assert result["event_type"] == "compra_aprovada_ob"
    assert result["name"] == "CARLA CIBELLI Corrêa"
    assert result["product_name"] == "Bússola Astrológica"
    assert result["price"] == "67.00"


def test_hotmart_normal_purchase_not_order_bump():
    """Testa compra aprovada normal sem order bump na Hotmart"""
    payload = {
        "id": "111e62be-405e-47a9-bfe0-149dcf5a9499",
        "data": {
            "buyer": {
                "name": "João Silva",
                "email": "joao@gmail.com",
                "checkout_phone": "11999999999"
            },
            "product": {
                "id": 8349168,
                "name": "Bússola Astrológica"
            },
            "purchase": {
                "status": "APPROVED",
                "price": {
                    "value": 197,
                    "currency_value": "BRL"
                },
                "order_bump": {
                    "is_order_bump": False
                }
            }
        },
        "event": "PURCHASE_APPROVED"
    }

    result = parse_webhook_payload("hotmart", payload)
    assert result["order_bump"] is False
    assert result["event_type"] == "compra_aprovada"

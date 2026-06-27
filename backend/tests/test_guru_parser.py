"""
Testes unitários para parse_guru em webhook_platform_parsers.py.
Valida que todos os campos do payload Guru são extraídos corretamente.
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from services.utils.webhook_platform_parsers import parse_guru

PAYLOAD_TRANSACTION_APPROVED = {
    "webhook_type": "transaction",
    "status": "approved",
    "id": "GURU17825729471",
    "api_token": "test_token_guru_scale",
    "checkout_url": "https://clkdmg.site/checkout/17825729471",
    "contact": {
        "name": "Contato Teste 1",
        "email": "teste.contato1@example.com",
        "phone_local_code": "55",
        "phone_number": "11900090001",
        "address_country": "BR",
        "address_city": "São Paulo",
        "address_state": "SP",
        "doc": "000.000.000-01"
    },
    "product": {
        "name": "Produto Scale Test",
        "type": "product",
        "total_value": 197,
        "unit_value": 197,
        "qty": 1
    },
    "payment": {
        "method": "credit_card",
        "total": 197,
        "gross": 197,
        "net": 178,
        "currency": "BRL",
        "billet": {
            "url": "",
            "line": "",
            "expiration_date": ""
        },
        "pix": None,
        "credit_card": {
            "brand": "visa",
            "last_digits": "0010",
            "first_digits": "400000"
        },
        "installments": {
            "qty": 1,
            "value": 197,
            "interest": 0
        }
    },
    "infrastructure": {
        "country": "BR",
        "ip": "127.0.0.1"
    }
}


def run_parser(payload):
    result = {}
    parse_guru(payload, result)
    return result


class TestGuru_Transaction:
    def test_compra_aprovada(self):
        r = run_parser(PAYLOAD_TRANSACTION_APPROVED)
        assert r['event_type'] == "compra_aprovada"
        assert r['name'] == "Contato Teste 1"
        assert r['email'] == "teste.contato1@example.com"
        assert r['phone'] == "5511900090001"
        assert r['product_name'] == "Produto Scale Test"
        assert r['price'] == "197.00"
        assert r['payment_method'] == "credit_card"
        assert r['country'] == "BR"
        assert r['custom_fields']['CPF'] == "000.000.000-01"

    def test_cnpj_detectado(self):
        payload = {
            **PAYLOAD_TRANSACTION_APPROVED,
            "contact": {**PAYLOAD_TRANSACTION_APPROVED["contact"], "doc": "12.345.678/0001-99"}
        }
        r = run_parser(payload)
        assert r['custom_fields']['CNPJ'] == "12.345.678/0001-99"
        assert 'CPF' not in r.get('custom_fields', {})

    def test_phone_limpeza_completa(self):
        payload = {
            **PAYLOAD_TRANSACTION_APPROVED,
            "contact": {
                **PAYLOAD_TRANSACTION_APPROVED["contact"],
                "phone_local_code": "+55",
                "phone_number": " (11) 90009-0001"
            }
        }
        r = run_parser(payload)
        assert r['phone'] == "5511900090001"


class TestGuru_Subscription:
    def test_assinatura_renovada(self):
        payload = {
            "webhook_type": "subscription",
            "last_status": "active",
            "subscriber": {
                "name": "Sub Test",
                "email": "sub@test.com",
                "phone_local_code": "55",
                "phone_number": "11999998888",
                "address_country": "BR",
                "doc": "111.111.111-11"
            },
            "product": {"name": "Produto VIP Recorrente"},
            "current_invoice": {"value": 97},
            "payment_method": "credit_card"
        }
        r = run_parser(payload)
        assert r['event_type'] == "assinatura_renovada"
        assert r['name'] == "Sub Test"
        assert r['phone'] == "5511999998888"
        assert r['product_name'] == "Produto VIP Recorrente"
        assert r['price'] == "97.00"
        assert r['custom_fields']['CPF'] == "111.111.111-11"


class TestGuru_OrderBump:
    def test_venda_order_bump(self):
        payload = {
            **PAYLOAD_TRANSACTION_APPROVED,
            "products": [
                {"id": 1, "name": "Produto Principal", "is_order_bump": False},
                {"id": 2, "name": "Produto Order Bump Extra", "is_order_bump": True}
            ]
        }
        r = run_parser(payload)
        assert r['event_type'] == "compra_aprovada_order_bump"
        assert r['order_bump'] is True
        assert r['custom_fields']['Produto(s) Order Bump'] == "Produto Order Bump Extra"


class TestGuru_Upsell:
    def test_venda_upsell_pelo_nome_do_produto(self):
        payload = {
            **PAYLOAD_TRANSACTION_APPROVED,
            "product": {
                **PAYLOAD_TRANSACTION_APPROVED["product"],
                "name": "Produto Upsell Premium"
            }
        }
        r = run_parser(payload)
        assert r['event_type'] == "compra_aprovada_upsell"
        assert r['is_upsell'] is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

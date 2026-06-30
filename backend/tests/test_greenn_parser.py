"""
Testes unitários para parse_greenn em webhook_platform_parsers.py.
Valida que todos os campos do payload Greenn são extraídos corretamente.
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from services.utils.webhook_platform_parsers import parse_greenn

PAYLOAD_SALE_PAID = {
    "type": "sale",
    "event": "saleUpdated",
    "oldStatus": "created",
    "currentStatus": "paid",
    "product": {
        "id": 1,
        "name": "Produto Scale Test",
        "amount": 197,
        "type": "TRANSACTION",
        "method": "CREDIT_CARD",
        "is_active": 1,
        "period": 0,
        "created_at": "2026-06-27T14:57:23.617Z",
        "updated_at": "2026-06-27T14:57:23.617Z"
    },
    "sale": {
        "id": 1,
        "status": "paid",
        "method": "CREDIT_CARD",
        "amount": 197,
        "installments": 1,
        "type": "TRANSACTION",
        "client_id": 1,
        "seller_id": 1,
        "created_at": "2026-06-27T14:57:23.617Z",
        "updated_at": "2026-06-27T14:57:23.617Z",
        "coupon": None
    },
    "seller": {
        "id": 1,
        "name": "Vendedor Teste",
        "email": "vendedor@test.com",
        "cellphone": ""
    },
    "client": {
        "id": 1,
        "name": "Contato Teste 1",
        "email": "teste.contato1@example.com",
        "cellphone": "+55 (11) 90009-0001",
        "cpf_cnpj": "000.000.000-01",
        "city": "São Paulo",
        "uf": "SP",
        "street": "Rua Teste",
        "number": "1",
        "neighborhood": "Centro",
        "zipcode": "01001000",
        "complement": "",
        "created_at": "2026-06-27T14:57:23.617Z",
        "updated_at": "2026-06-27T14:57:23.617Z"
    },
    "saleMetas": []
}


def run_parser(payload):
    result = {}
    parse_greenn(payload, result)
    return result


class TestGreenn_Sale:
    def test_compra_aprovada(self):
        r = run_parser(PAYLOAD_SALE_PAID)
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
            **PAYLOAD_SALE_PAID,
            "client": {**PAYLOAD_SALE_PAID["client"], "cpf_cnpj": "12.345.678/0001-99"}
        }
        r = run_parser(payload)
        assert r['custom_fields']['CNPJ'] == "12.345.678/0001-99"
        assert 'CPF' not in r.get('custom_fields', {})


class TestGreenn_Contract:
    def test_contrato_renovado(self):
        payload = {
            "type": "contract",
            "event": "contractUpdated",
            "contract": {"status": "paid"},
            "currentSale": {"amount": 197, "method": "CREDIT_CARD"},
            "client": {"name": "Cli Test", "email": "cli@test.com", "cellphone": "11900000002", "cpf_cnpj": "111.111.111-11"},
            "product": {"name": "Produto VIP"}
        }
        r = run_parser(payload)
        assert r['event_type'] == "assinatura_renovada"
        assert r['name'] == "Cli Test"
        assert r['price'] == "197.00"
        assert r['custom_fields']['CPF'] == "111.111.111-11"


class TestGreenn_OrderBump:
    def test_venda_order_bump(self):
        payload = {
            **PAYLOAD_SALE_PAID,
            "products": [
                {"id": 1, "name": "Produto Scale Test", "amount": 197, "is_order_bump": False},
                {"id": 2, "name": "Produto OB", "amount": 97, "is_order_bump": True}
            ]
        }
        r = run_parser(payload)
        assert r['event_type'] == "compra_aprovada_com_ob"
        assert r['order_bump'] is True
        assert r['custom_fields']['Produto(s) Order Bump'] == "Produto OB"


class TestGreenn_Upsell:
    def test_venda_upsell_pelo_nome_do_produto(self):
        payload = {
            **PAYLOAD_SALE_PAID,
            "product": {
                **PAYLOAD_SALE_PAID["product"],
                "name": "Produto Upsell Premium"
            }
        }
        r = run_parser(payload)
        assert r['event_type'] == "compra_aprovada_upsell"
        assert r['is_upsell'] is True

    def test_venda_upsell_pelo_nome_upgrade(self):
        payload = {
            **PAYLOAD_SALE_PAID,
            "product": {
                **PAYLOAD_SALE_PAID["product"],
                "name": "Upgrade de Plano Anual"
            }
        }
        r = run_parser(payload)
        assert r['event_type'] == "compra_aprovada_upsell"
        assert r['is_upsell'] is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

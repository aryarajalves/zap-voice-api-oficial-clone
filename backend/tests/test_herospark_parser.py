"""
Testes unitários para parse_herospark em webhook_platform_parsers.py.
Valida que todos os campos do payload HeroSpark são extraídos corretamente.
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from services.utils.webhook_platform_parsers import parse_herospark

PAYLOAD_COMPRA_APROVADA = {
    "event": "PURCHASE_APPROVED",
    "id": "hs_17825711841",
    "buyer": {
        "name": "Contato Teste 1",
        "email": "teste.contato1@example.com",
        "phone": "5511900090001",
        "doc": "000.000.000-01"
    },
    "product": {
        "id": "prod_1782571184",
        "name": "Produto Scale Test"
    },
    "purchase": {
        "price": {
            "gross": 19700,
            "value": 19700
        },
        "status": "paid",
        "payment": {
            "type": "credit_card",
            "refusal_reason": None
        },
        "created_at": "2026-06-27T14:39:44.339Z",
        "transaction": "pay_17825711841",
        "subscription": None
    }
}


def run_parser(payload):
    result = {}
    parse_herospark(payload, result)
    return result


class TestHerospark_EventType:
    def test_compra_aprovada(self):
        r = run_parser(PAYLOAD_COMPRA_APROVADA)
        assert r['event_type'] == "compra_aprovada"

    def test_compra_cancelada_cartao(self):
        r = run_parser({**PAYLOAD_COMPRA_APROVADA, "event": "PURCHASE_CANCELED",
                        "purchase": {**PAYLOAD_COMPRA_APROVADA['purchase'],
                                     "payment": {"type": "credit_card"}}})
        assert r['event_type'] == "cartao_recusado"

    def test_compra_cancelada_pix(self):
        r = run_parser({**PAYLOAD_COMPRA_APROVADA, "event": "PURCHASE_CANCELED",
                        "purchase": {**PAYLOAD_COMPRA_APROVADA['purchase'],
                                     "payment": {"type": "pix"}}})
        assert r['event_type'] == "pix_expirado"

    def test_reembolso(self):
        r = run_parser({**PAYLOAD_COMPRA_APROVADA, "event": "PURCHASE_REFUNDED"})
        assert r['event_type'] == "reembolso"

    def test_chargeback(self):
        r = run_parser({**PAYLOAD_COMPRA_APROVADA, "event": "PURCHASE_CHARGEBACK"})
        assert r['event_type'] == "chargeback"

    def test_assinatura_cancelada(self):
        r = run_parser({**PAYLOAD_COMPRA_APROVADA, "event": "SUBSCRIPTION_CANCELED"})
        assert r['event_type'] == "assinatura_cancelada"


class TestHerospark_BuyerInfo:
    def test_nome_extraido(self):
        r = run_parser(PAYLOAD_COMPRA_APROVADA)
        assert r['name'] == "Contato Teste 1"

    def test_email_extraido(self):
        r = run_parser(PAYLOAD_COMPRA_APROVADA)
        assert r['email'] == "teste.contato1@example.com"

    def test_phone_extraido_somente_digitos(self):
        r = run_parser(PAYLOAD_COMPRA_APROVADA)
        assert r['phone'] == "5511900090001"

    def test_phone_com_prefixo_plus_limpo(self):
        payload = {**PAYLOAD_COMPRA_APROVADA,
                   "buyer": {**PAYLOAD_COMPRA_APROVADA['buyer'], "phone": "+55 11 90009-0001"}}
        r = run_parser(payload)
        assert r['phone'] == "5511900090001"

    def test_doc_cpf_detectado_por_11_digitos(self):
        r = run_parser(PAYLOAD_COMPRA_APROVADA)  # doc = "000.000.000-01" = 9+2=11 digitos
        assert 'custom_fields' in r
        assert r['custom_fields']['CPF'] == "000.000.000-01"

    def test_doc_cnpj_detectado_por_14_digitos(self):
        payload = {**PAYLOAD_COMPRA_APROVADA,
                   "buyer": {**PAYLOAD_COMPRA_APROVADA['buyer'], "doc": "12.345.678/0001-99"}}
        r = run_parser(payload)
        assert r['custom_fields']['CNPJ'] == "12.345.678/0001-99"

    def test_doc_generico_quando_nao_e_cpf_nem_cnpj(self):
        payload = {**PAYLOAD_COMPRA_APROVADA,
                   "buyer": {**PAYLOAD_COMPRA_APROVADA['buyer'], "doc": "ABC123"}}
        r = run_parser(payload)
        assert r['custom_fields']['Documento'] == "ABC123"

    def test_sem_doc_nao_adiciona_custom_field(self):
        payload = {**PAYLOAD_COMPRA_APROVADA,
                   "buyer": {**PAYLOAD_COMPRA_APROVADA['buyer'], "doc": None}}
        r = run_parser(payload)
        cf = r.get('custom_fields', {})
        assert 'CPF' not in cf and 'CNPJ' not in cf and 'Documento' not in cf


class TestHerospark_Produto:
    def test_product_name_extraido(self):
        r = run_parser(PAYLOAD_COMPRA_APROVADA)
        assert r['product_name'] == "Produto Scale Test"


class TestHerospark_Preco:
    def test_price_em_centavos_dividido_por_100(self):
        r = run_parser(PAYLOAD_COMPRA_APROVADA)
        # 19700 centavos → R$ 197.00
        assert r['price'] == "197.00"

    def test_price_abaixo_de_1000_nao_divide(self):
        payload = {**PAYLOAD_COMPRA_APROVADA,
                   "purchase": {**PAYLOAD_COMPRA_APROVADA['purchase'],
                                "price": {"value": 500, "gross": 500}}}
        r = run_parser(payload)
        assert r['price'] == "500.00"

    def test_payment_method_extraido(self):
        r = run_parser(PAYLOAD_COMPRA_APROVADA)
        assert r['payment_method'] == "credit_card"


class TestHerospark_TransacaoEWebhook:
    def test_country_sempre_br(self):
        r = run_parser(PAYLOAD_COMPRA_APROVADA)
        assert r['country'] == "BR"


class TestHerospark_Assinatura:
    def test_subscription_com_dados_extraidos(self):
        payload = {**PAYLOAD_COMPRA_APROVADA,
                   "purchase": {**PAYLOAD_COMPRA_APROVADA['purchase'],
                                "subscription": {"id": "sub_123", "status": "active"}}}
        r = run_parser(payload)
        assert r['custom_fields']['Status Assinatura'] == "active"


class TestHerospark_OrderBump:
    BASE = {
        **PAYLOAD_COMPRA_APROVADA,
        "purchaseBumpUsed": True,
        "bump": [
            {"id": "prod_ob_1", "name": "Produto Order Bump", "price": {"gross": 9700, "value": 9700}},
        ],
    }

    def test_event_type_order_bump(self):
        r = run_parser(self.BASE)
        assert r['event_type'] == "compra_aprovada_com_ob"

    def test_flag_order_bump_true(self):
        r = run_parser(self.BASE)
        assert r.get('order_bump') is True

    def test_produto_ob_em_custom_fields(self):
        r = run_parser(self.BASE)
        assert r['custom_fields']['Produto(s) Order Bump'] == "Produto Order Bump"

    def test_sem_bump_event_type_normal(self):
        r = run_parser(PAYLOAD_COMPRA_APROVADA)
        assert r['event_type'] == "compra_aprovada"
        assert r.get('order_bump') is None

    def test_bump_via_campo_bump_sem_purchaseBumpUsed(self):
        """Campo bump sozinho já deve triggerar order_bump."""
        payload = {
            **PAYLOAD_COMPRA_APROVADA,
            "bump": [{"id": "ob_1", "name": "OB Produto", "price": {"gross": 5000, "value": 5000}}],
        }
        r = run_parser(payload)
        assert r['event_type'] == "compra_aprovada_com_ob"


class TestHerospark_Upsell:
    BASE = {**PAYLOAD_COMPRA_APROVADA, "upsell": True}

    def test_event_type_upsell(self):
        r = run_parser(self.BASE)
        assert r['event_type'] == "compra_aprovada_upsell"

    def test_flag_is_upsell_true(self):
        r = run_parser(self.BASE)
        assert r.get('is_upsell') is True

    def test_upsell_tem_prioridade_sobre_order_bump(self):
        """Quando upsell e bump estão ambos presentes, upsell tem prioridade."""
        payload = {
            **PAYLOAD_COMPRA_APROVADA,
            "upsell": True,
            "purchaseBumpUsed": True,
            "bump": [{"id": "ob_1", "name": "OB Produto"}],
        }
        r = run_parser(payload)
        assert r['event_type'] == "compra_aprovada_upsell"

    def test_sem_upsell_nao_define_flag(self):
        r = run_parser(PAYLOAD_COMPRA_APROVADA)
        assert r.get('is_upsell') is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

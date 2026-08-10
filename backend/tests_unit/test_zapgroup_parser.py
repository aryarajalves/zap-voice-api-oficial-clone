import pytest
from services.webhooks_utils import parse_webhook_payload
from services.utils.webhook_platform_parsers import parse_zapgroup

def test_zapgroup_exact_user_payload():
    payload = {
        "nome": "554888668693",
        "grupo": "Grupo Lancamento Teste",
        "numero": "554888668693",
        "grupo_jid": "120363405673797894@g.us",
        "extraido_em": "2026-08-01T12:37:50.664565-03:00"
    }

    result = parse_webhook_payload("zapgroup", payload)

    assert result["platform"] == "zapgroup"
    assert result["name"] == "554888668693"
    assert result["phone"] in ["554888668693", "5548988668693"]
    assert result["product_name"] == "Grupo Lancamento Teste"
    assert result["event_type"] == "lead_extraido"
    assert result["event_time"] == "2026-08-01T12:37:50.664565-03:00"
    assert result["raw_status"] == "Lead_extraido"
    assert result["country"] == "BR"

def test_zapgroup_custom_event_and_aliases():
    payload = {
        "name": "Maria Silva",
        "phone": "+5511998877665",
        "group_name": "VIP Mentoria 2026",
        "event_type": "compra_aprovada",
        "grupo_jid": "9876543210@g.us"
    }

    result = parse_webhook_payload("ZapGroup", payload)

    assert result["platform"] == "zapgroup"
    assert result["name"] == "Maria Silva"
    assert result["phone"] == "5511998877665"
    assert result["product_name"] == "VIP Mentoria 2026"
    assert result["event_type"] == "compra_aprovada"

if __name__ == "__main__":
    test_zapgroup_exact_user_payload()
    test_zapgroup_custom_event_and_aliases()
    print("✅ Testes unitários do ZapGroup concluídos com sucesso!")

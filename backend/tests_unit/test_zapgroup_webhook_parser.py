import pytest
from services.webhooks_utils import parse_webhook_payload

def test_parse_zapgroup_poll_and_lead_dict_payload():
    payload = {
        "grupo": {
            "id": "teste-preview-id",
            "jid": "120363405673797894@g.us",
            "nome": "WhatsApp - Teste - Astrologia"
        },
        "evento": "voto_enquete_teste",
        "enquete": {
            "titulo": "Qual seu principal interesse no lançamento?",
            "todas_opcoes": [
                "Garantir minha vaga no 1º lote com desconto",
                "Conhecer mais sobre o cronograma",
                "Tirar dúvidas com o suporte"
            ],
            "opcao_marcada": "Garantir minha vaga no 1º lote com desconto",
            "opcoes_marcadas": [
                "Garantir minha vaga no 1º lote com desconto"
            ],
            "id_mensagem_enquete": "POLL_TEST_ID_12345"
        },
        "usuario": {
            "jid": "5511999998888@s.whatsapp.net",
            "nome": "Lead de Demonstração (Teste)",
            "numero": "5511999998888"
        },
        "is_teste": True,
        "raw_data": {
            "tipo": "disparo_manual_de_teste",
            "origem": "painel_gerenciador_grupos"
        },
        "data_hora": "2026-08-15 08:56:44"
    }

    result = parse_webhook_payload("zapgroup", payload)
    
    # Validações críticas que impedem o psycopg2 ProgrammingError
    assert isinstance(result["product_name"], str)
    assert result["product_name"] == "WhatsApp - Teste - Astrologia"
    
    assert isinstance(result["name"], str)
    assert result["name"] == "Lead de Demonstração (Teste)"
    
    assert result["phone"] == "5511999998888"
    assert result["event_type"] == "voto_enquete"
    assert result["variables"]["titulo_enquete"] == "Qual seu principal interesse no lançamento?"
    assert result["variables"]["opcao_marcada"] == "Garantir minha vaga no 1º lote com desconto"

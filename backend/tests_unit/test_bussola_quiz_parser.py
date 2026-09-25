import pytest
from services.webhooks_utils import parse_webhook_payload, replace_variables_in_string

def get_sample_user_payload():
    return {
        "event": "PURCHASE_OUT_OF_SHOPPING_CART",
        "tipo": "leitura_concluida",
        "origem": "quiz_bussola",
        "leitura_id": "20260925-115000-a1b2c3d4",
        "data_hora_brasilia": "25/09/2026, 11:50:00",

        # 1. Dados do Usuário
        "nome_completo": "Aryaraj Alves Fernandes",
        "whatsapp": "+55 (85) 99999-8888",
        "phone": "5585999998888",
        "nascimento": {
            "ano": 1995,
            "mes": 5,
            "dia": 20,
            "hora": 14,
            "minuto": 30,
            "precisao": "exata"
        },
        "cidade": {
            "nome": "São Paulo",
            "uf": "SP",
            "lat": -23.5505,
            "lng": -46.6333,
            "tz": "America/Sao_Paulo"
        },
        "quiz": {
            "area": "dinheiro",
            "espelho": "Insegurança ao cobrar",
            "quebra": "sim"
        },

        # 2. Mensagem Secreta / Leitura Formatada para WhatsApp
        "mensagem": "Olá, Aryaraj! Aqui está a sua leitura da Bússola Astrológica:\n\n✦ SATURNO EM ÁRIES...\n\n*A SOLIDÃO VOLTOU A MISTURAR ESCOLHA COM MEDO.*...",

        # 3. Objeto Estruturado da Leitura
        "carta": {
            "titulo": "A solidão voltou a misturar escolha com medo.",
            "destaque": "A solidão pode estar protegendo uma escolha que você ainda não examinou.",
            "identificacao": {"elemento": "fogo"},
            "porta": {"numero": 1}
        },

        # 4. Mapeamento para ferramentas de automação
        "data": {
            "buyer": {
                "name": "Aryaraj Alves Fernandes",
                "phone": "+55 (85) 99999-8888"
            },
            "custom_fields": {
                "nome_completo": "Aryaraj Alves Fernandes",
                "numero": "+55 (85) 99999-8888",
                "mensagem": "Olá, Aryaraj! Aqui está a sua leitura da Bússola Astrológica:\n\n✦ SATURNO EM ÁRIES...",
                "nascimento": {
                    "ano": 1995,
                    "mes": 5,
                    "dia": 20
                },
                "cidade": {
                    "nome": "São Paulo"
                }
            }
        }
    }

def test_parse_bussola_quiz_exact_payload():
    payload = get_sample_user_payload()
    result = parse_webhook_payload("bussola_quiz", payload)

    assert result["name"] == "Aryaraj Alves Fernandes"
    assert result["first_name"] == "Aryaraj"
    assert result["phone"] == "5585999998888"
    assert result["event_type"] == "leitura_concluida"
    assert result["raw_status"] == "Leitura Concluída"
    assert result["product_name"] == "Bússola Astrológica - Dinheiro"
    assert result["leitura_id"] == "20260925-115000-a1b2c3d4"
    assert "SATURNO EM ÁRIES" in result["mensagem"]
    assert result["nascimento_data"] == "20/05/1995"
    assert result["nascimento_hora"] == "14:30"
    assert result["nascimento_completo"] == "20/05/1995 14:30"
    assert result["cidade"] == "São Paulo - SP"
    assert result["cidade_nome"] == "São Paulo"
    assert result["cidade_uf"] == "SP"
    assert result["quiz_area"] == "dinheiro"
    assert result["quiz_espelho"] == "Insegurança ao cobrar"
    assert result["quiz_quebra"] == "sim"
    assert result["carta_titulo"] == "A solidão voltou a misturar escolha com medo."
    assert result["carta_destaque"] == "A solidão pode estar protegendo uma escolha que você ainda não examinou."

    # Verifica variáveis disponibilizadas para templates e funis
    vars_map = result["variables"]
    assert vars_map["mensagem"] == result["mensagem"]
    assert vars_map["leitura_id"] == "20260925-115000-a1b2c3d4"
    assert vars_map["nascimento_data"] == "20/05/1995"
    assert vars_map["cidade"] == "São Paulo - SP"
    assert vars_map["quiz_area"] == "dinheiro"
    assert vars_map["origem"] == "quiz_bussola"

    # Verifica também em custom_fields
    custom = result["custom_fields"]
    assert custom["mensagem"] == result["mensagem"]
    assert custom["leitura_id"] == "20260925-115000-a1b2c3d4"

def test_parse_quiz_bussola_alias_platform():
    payload = get_sample_user_payload()
    result = parse_webhook_payload("quiz_bussola", payload)
    assert result["event_type"] == "leitura_concluida"
    assert result["first_name"] == "Aryaraj"
    assert result["quiz_area"] == "dinheiro"

def test_bussola_quiz_variable_replacement():
    payload = get_sample_user_payload()
    result = parse_webhook_payload("bussola_quiz", payload)

    template_text = "Olá {{first_name}}, sua leitura de {{quiz_area}} (ID: {{leitura_id}}) para a cidade {{cidade}}:\n{{mensagem}}"
    replaced = replace_variables_in_string(template_text, payload, result)

    assert "Olá Aryaraj" in replaced
    assert "sua leitura de dinheiro" in replaced
    assert "ID: 20260925-115000-a1b2c3d4" in replaced
    assert "cidade São Paulo - SP" in replaced
    assert "SATURNO EM ÁRIES" in replaced

def test_bussola_quiz_checkout_pre_populado_fallback():
    payload = {
        "event": "PURCHASE_OUT_OF_SHOPPING_CART",
        "origem": "quiz_bussola",
        "nome": "Carla Mendes",
        "whatsapp": "+55 11 98888-7777",
        "quiz": {"area": "amor"}
    }
    result = parse_webhook_payload("bussola_quiz", payload)
    assert result["event_type"] == "checkout_pre_populado"
    assert result["raw_status"] == "Checkout Pré-populado"
    assert result["name"] == "Carla Mendes"
    assert result["product_name"] == "Bússola Astrológica - Amor"

def test_bussola_quiz_compra_aprovada():
    payload = {
        "tipo": "compra_aprovada",
        "origem": "quiz_bussola",
        "nome_completo": "Joao Pedro",
        "phone": "5511999990000"
    }
    result = parse_webhook_payload("bussola_quiz", payload)
    assert result["event_type"] == "compra_aprovada"
    assert result["raw_status"] == "Compra Aprovada"

if __name__ == "__main__":
    test_parse_bussola_quiz_exact_payload()
    test_parse_quiz_bussola_alias_platform()
    test_bussola_quiz_variable_replacement()
    test_bussola_quiz_checkout_pre_populado_fallback()
    test_bussola_quiz_compra_aprovada()
    print("✅ Todos os testes unitários do Quiz Bússola passaram com sucesso!")

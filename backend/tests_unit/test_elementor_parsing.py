import pytest
from routers.webhooks_public import parse_webhook_payload

def test_elementor_flat_json_parsing():
    payload = {
        "form[id]": "c1d6fde",
        "form[name]": "Checkout pré populado",
        "fields[name][value]": "Teste",
        "fields[email][value]": "teste@gmail.com",
        "fields[phone][value]": "(85) 98769-6383",
        "fields[utm_source][value]": "acesso",
        "fields[utm_medium][value]": "direto",
        "fields[utm_campaign][value]": "organico",
        "meta[remote_ip][value]": "2804:29b8:512a:2767:1cd6:b485:f567:86d9"
    }
    
    result = parse_webhook_payload("elementor", payload)
    
def test_elementor_fullname_parsing():
    # Novo formato encontrado em logs reais do usuário
    payload = {
        "email": "guilhermeevinicius1@gmail.com",
        "phone": "44999037534",
        "fullname": "Guilherme Vinicius"
    }
    
    result = parse_webhook_payload("elementor", payload)
    
    assert result["name"] == "Guilherme Vinicius"
    assert result["email"] == "guilhermeevinicius1@gmail.com"
    # Normalização BR: 55 + 44 + 9 + 99037534 = 5544999037534
    assert result["phone"] == "5544999037534"
    assert result["platform"] == "elementor"

if __name__ == "__main__":
    test_elementor_flat_json_parsing()
    test_elementor_fullname_parsing()
    print("Testes Elementor concluídos com sucesso!")

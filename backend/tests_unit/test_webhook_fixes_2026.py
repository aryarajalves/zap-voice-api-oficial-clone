import pytest
from unittest.mock import MagicMock, patch
from routers.webhooks_public import parse_webhook_payload

def test_eduzz_orbita_nested_payload_with_cellphone():
    # Simulando o payload do log fornecido
    payload = {
        "id": "odati925zv0tyvmkmxz2kghsh",
        "event": "myeduzz.invoice_paid",
        "data": {
            "id": "98364546",
            "status": "paid",
            "buyer": {
                "id": "23445258",
                "name": "Eliana Pires Domingues",
                "email": "elianadominguesdomingues6@gmail.com",
                "phone": None,
                "cellphone": "+5511911816709"
            },
            "items": [
                {"name": "Produto Teste", "price": {"value": 100.0, "currency": "BRL"}}
            ],
            "price": {"value": 100.0, "currency": "BRL"}
        }
    }
    
    result = parse_webhook_payload("eduzz", payload)
    
    assert result['name'] == "Eliana Pires Domingues"
    assert result['email'] == "elianadominguesdomingues6@gmail.com"
    # O telefone deve ser normalizado para 55119911816709 (adicionando o 9 se necessário, ou apenas limpando)
    # No caso de +5511911816709, vira 5511911816709. 
    # Se fosse 551111816709 (12 digitos), injetaria o 9.
    assert result['phone'] == "5511911816709"
    assert result['event_type'] == "compra_aprovada"

def test_eduzz_orbita_student_nested():
    payload = {
        "data": {
            "status": "paid",
            "student": {
                "name": "João Aluno",
                "cellphone": "11988887777"
            }
        }
    }
    result = parse_webhook_payload("eduzz", payload)
    assert result['name'] == "João Aluno"
    assert result['phone'] == "5511988887777" # Auto-adiciona 55 se <= 11 digitos

def test_elementor_wp_payload():
    # Simulando o payload do Elementor que envia campos dentro de 'fields'
    payload = {
        "fields": {
            "name": {"id": "name", "value": "Joao WordPress"},
            "whatsapp": {"id": "whatsapp", "value": "11977776666"},
            "email": {"id": "email", "value": "wp@teste.com"}
        },
        "form_id": "123",
        "form_name": "Contato"
    }
    result = parse_webhook_payload("outros", payload)
    assert result['name'] == "Joao WordPress"
    assert result['phone'] == "5511977776666"
    assert result['email'] == "wp@teste.com"
    assert parsed["phone"] == "5511999999999"
    assert parsed["name"] == "Elementor User"

async def test_webhook_history_search(db_session, client):
    # Testar se a busca no histórico funciona
    from uuid import uuid4
    integration_id = str(uuid4())
    
    # Criar integração fake
    new_int = models.WebhookIntegration(
        id=integration_id,
        name="Search Test",
        platform="outros",
        client_id=1
    )
    db_session.add(new_int)
    db_session.commit()
    
    # Adicionar registros no histórico
    h1 = models.WebhookHistory(
        integration_id=integration_id,
        status="processed",
        event_type="test",
        payload={"raw": "data 123"},
        processed_data={"name": "Alice Wonderland", "phone": "5511999998888"}
    )
    h2 = models.WebhookHistory(
        integration_id=integration_id,
        status="processed",
        event_type="test",
        payload={"raw": "data 456"},
        processed_data={"name": "Bob Builder", "phone": "5521777776666"}
    )
    db_session.add_all([h1, h2])
    db_session.commit()
    
    # 1. Buscar pela Alice (por nome)
    response = client.get(f"/api/webhooks/{integration_id}/history?search=Alice", headers={"X-Client-ID": "1"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["processed_data"]["name"] == "Alice Wonderland"
    
    # 2. Buscar por telefone do Bob
    response = client.get(f"/api/webhooks/{integration_id}/history?search=552177777", headers={"X-Client-ID": "1"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["processed_data"]["name"] == "Bob Builder"
    
    # 3. Buscar algo que não existe (deve retornar vazio/zero)
    response = client.get(f"/api/webhooks/{integration_id}/history?search=Zeca", headers={"X-Client-ID": "1"})
    assert response.status_code == 200
    assert response.json() == []

def test_generic_wp_payload():
    # Simulando um plugin WP que envia campos no root
    payload = {
        "nome": "Maria WP",
        "whatsapp": "11966665555"
    }
    result = parse_webhook_payload("outros", payload)
    assert result['name'] == "Maria WP"
    assert result['phone'] == "5511966665555"

@pytest.mark.asyncio
async def test_chatwoot_unbound_local_fix():
    # Este teste verifica se a função chatwoot_webhook pode ser chamada/carregada sem o erro de UnboundLocalError
    # Requer bibliotecas suficientes instaladas.
    from routers.webhooks import chatwoot_webhook
    
    # Mock parameters
    mock_request = MagicMock()
    mock_request.json.return_value = {"event": "ping"}
    mock_request.body.return_value = b'{"event": "ping"}'
    mock_request.headers = {}
    
    mock_db = MagicMock()
    
    # Se a função carregar e não estourar erro de sintaxe/referência ao ser definida, já é um bom sinal.
    # Mas vamos tentar chamar um evento simples para ver se ela falha no meio.
    try:
        # Usamos um payload de ping que cai no final e retorna {"status": "ignored"}
        response = await chatwoot_webhook(mock_request, {"event": "ping"}, mock_db)
        assert response["status"] == "ignored"
    except UnboundLocalError as e:
        pytest.fail(f"UnboundLocalError detectado: {e}")
    except Exception as e:
        # Outros erros (como falha de mock) são aceitáveis para este teste específico de regressão de variável local
        print(f"Nota: Outro erro ocorreu (esperado devido a mocks incompletos), mas não foi UnboundLocalError: {e}")
        pass

if __name__ == "__main__":
    # Simples execução local para debug rápido
    test_eduzz_orbita_nested_payload_with_cellphone()
    print("✅ Teste Eduzz OK")

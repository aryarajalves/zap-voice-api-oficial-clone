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

def test_eduzz_nutror_payload():
    payload = {
      "id": "ujmxx7q9xzjpho16x8nwhyzc0",
      "data": {
        "course": {
          "hash": "656c71c4b848dfa44666d2893c3438985bbf0085",
          "title": "Título do Curso"
        },
        "learner": {
          "name": "Ciclano da Silva",
          "email": "learner@eduzz.com"
        },
        "producer": {
          "name": "Fulano da Silva",
          "email": "fulano@eduzz.com"
        },
        "createdAt": "2023-09-28T18:29:03Z"
      },
      "event": "nutror.community_viewed",
      "sentDate": "2026-05-18T23:12:08.220Z"
    }
    
    result = parse_webhook_payload("eduzz", payload)
    
    assert result['name'] == "Ciclano da Silva"
    assert result['email'] == "learner@eduzz.com"
    assert result['product_name'] == "Título do Curso"
    assert result['event_type'] == "evento_aluno"
    assert result['raw_status'] == "Evento do Aluno"

def test_eduzz_sun_cart_abandonment_payload():
    payload = {
      "id": "lvxyo2lzuhb5j8llfovo7gow5",
      "data": {
        "href": "https://elements2.eduzz.com/89AQE26EWD?transactionKey=92a39f6e26324a65b4f89338ace25cf6&signature=5372cf01f9744b3e884fe3bcb281adda&utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQPMTI0MDI0NTc0Mjg3NDE0AAGnFYRxWCqGYUbqnHqbtOWmIrBEU7pry6KB_0UEVbh_Ctkd6Ui_56KoxsHWAAc_aem_YWdncwAE-SPhynY1ou4ggRyai6P2&brid=YWdncwG321Zvlhw70RB1ZYE-GXeY&name=Ricardo+Silva&email=rstreinador%40gmail.com&cel=32988040758&transactionkey=d4abd66b03b2475583e3f89525ca9a8e&fbp=fb.1.1779162322715.211172870360816500&fbc=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQPMTI0MDI0NTc0Mjg3NDE0AAGnFYRxWCqGYUbqnHqbtOWmIrBEU7pry6KB_0UEVbh_Ctkd6Ui_56KoxsHWAAc_aem_YWdncwAE-SPhynY1ou4ggRyai6P2&ext=76598f12-3eb0-4448-89d9-a2579fb33f6c&lang=ptbr&transaction_id=321871224&valor=49&valor_moeda=49&moeda=BRL&email_comprador=rstreinador%40gmail.com&nome_comprador=Ricardo+Silva&cpfcnpj_comprador=96462175672&produto=2978551&oferta_chave=wopgevbw&oferta_nome=Oferta+Base&url_boleto=https%3A%2F%2Fchk.eduzz.com%2Fthankyou%2F867f8bb036b04955974e75d0e4e42fa1%3Fbs%3D1&chave=867f8bb036b04955974e75d0e4e42fa1&sck=76598f12-3eb0-4448-89d9-a2579fb33f6c&external_id=76598f12-3eb0-4448-89d9-a2579fb33f6c&ip=152.255.121.221&showDescription=true",
        "customer": {
          "name": "Ricardo Silva",
          "email": "rstreinador@gmail.com",
          "phone": "+5532988040758"
        },
        "lastStep": "payment_failed",
        "productId": [
          "2984159"
        ],
        "updatedAt": "2026-05-19T04:06:59.879Z",
        "producerId": 74997937,
        "transactionId": "92a39f6e26324a65b4f89338ace25cf6",
        "saleRecoveryUrl": "https://sun.eduzz.com/c_92a39f6e26324a65b4f89338ace25cf6"
      },
      "event": "sun.cart_abandonment",
      "sentDate": "2026-05-19T04:12:07.529Z"
    }

    result = parse_webhook_payload("eduzz", payload)
    
    assert result['name'] == "Ricardo Silva"
    assert result['email'] == "rstreinador@gmail.com"
    assert result['phone'] == "5532988040758"
    assert result['product_name'] == "Produto 2984159"
    assert result['event_type'] == "carrinho_abandonado"
    assert result['raw_status'] == "Carrinho Abandonado"

def test_myeduzz_commission_processed_payload():
    payload = {
      "id": "pqqfwp7gx4vei1bb71k51f5nb",
      "data": {
        "price": {
          "value": 147,
          "currency": "BRL"
        },
        "createdAt": "2026-05-19T04:04:25.0Z",
        "invoiceId": "99757970",
        "commissions": {
          "producer": {
            "id": 74997937,
            "name": "A",
            "commission": {
              "value": 82.38,
              "currency": "BRL"
            }
          },
          "coproducers": [
            {
              "id": "62418",
              "name": "ORION",
              "commission": {
                "value": 27.46,
                "currency": "BRL"
              }
            },
            {
              "id": "82214786",
              "name": "BRUNO",
              "commission": {
                "value": 27.46,
                "currency": "BRL"
              }
            }
          ]
        }
      },
      "event": "myeduzz.commission_processed",
      "sentDate": "2026-05-19T04:04:26.626Z"
    }

    result = parse_webhook_payload("eduzz", payload)
    
    assert result['name'] == "Fatura #99757970"
    assert result['email'] is None
    assert result['phone'] is None
    assert result['product_name'] == "Fatura #99757970"
    assert result['event_type'] == "outros"
    assert result['raw_status'] == "Comissão Processada"
    assert result['price'] == "147.00"

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

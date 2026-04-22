import pytest
from unittest.mock import patch, MagicMock
from database import Base
import models
import uuid

def test_manychat_sync_called_on_webhook(client, db_session):
    """
    Testa se a função de sincronização do ManyChat é chamada com os dados dinâmicos
    corretos quando um webhook é recebido e a opção está ativa.
    """
    # 1. Setup: Criar Cliente e Integração de Teste
    test_client = models.Client(name=f"ManyChat Test {uuid.uuid4().hex[:6]}")
    db_session.add(test_client)
    db_session.commit()
    db_session.refresh(test_client)

    integration = models.WebhookIntegration(
        client_id=test_client.id,
        name="ManyChat Integration",
        platform="hotmart",
        status="active"
    )
    db_session.add(integration)
    db_session.commit()
    db_session.refresh(integration)

    # 2. Criar Mapeamento com ManyChat Ativo
    mapping = models.WebhookEventMapping(
        integration_id=integration.id,
        event_type="compra_aprovada",
        template_name="test_template",
        manychat_active=True,
        manychat_name="{{name}}",
        manychat_phone="{{phone}}",
        manychat_tag="vip_member"
    )
    db_session.add(mapping)
    db_session.commit()

    # 3. Payload do Webhook (Hotmart)
    payload = {
        "event": "PURCHASE_APPROVED",
        "data": {
            "buyer": {
                "name": "Cliente de Teste ManyChat",
                "checkout_phone": "5511988887777",
                "email": "test@manychat.com"
            },
            "purchase": {
                "status": "APPROVED",
                "payment": {"type": "CREDIT_CARD"}
            },
            "product": {"name": "Produto ManyChat"}
        }
    }

    # 4. Mockar a função sync_to_manychat no roteador de webhooks
    with patch("routers.webhooks_public.sync_to_manychat") as mock_sync:
        mock_sync.return_value = None
        
        response = client.post(
            f"/api/webhooks/external/{integration.id}",
            json=payload
        )
        
        # Se falhou, vamos ver o erro
        if response.status_code != 200:
            print(f"Response Error: {response.json()}")
            
        assert response.status_code == 200
        
        # O mock deve ter sido chamado (via BackgroundTasks)
        mock_sync.assert_called_once()
        
        # Verificar se os dados dinâmicos foram substituídos corretamente
        # Argumentos: (client_id, name, phone, tag)
        args, _ = mock_sync.call_args
        assert args[1] == "Cliente de Teste ManyChat"
        assert "5511988887777" in args[2]
        assert args[3] == "vip_member"

def test_variable_replacement_helper():
    """
    Testa a função auxiliar de substituição de variáveis diretamente.
    """
    from routers.webhooks_public import replace_variables_in_string
    
    payload = {
        "order": {
            "id": "123",
            "info": {"source": "facebook"}
        }
    }
    parsed_data = {
        "name": "Maria Silva",
        "phone": "5511900001111"
    }
    
    # Teste 1: Campos do parsed_data
    assert replace_variables_in_string("Olá {{name}}", payload, parsed_data) == "Olá Maria Silva"
    
    # Teste 2: Campos aninhados do payload
    assert replace_variables_in_string("Origem: {{order.info.source}}", payload, parsed_data) == "Origem: facebook"
    
    # Teste 3: Várias variáveis
    assert replace_variables_in_string("Nome: {{name}}, ID: {{order.id}}", payload, parsed_data) == "Nome: Maria Silva, ID: 123"
    
    # Teste 4: Variável inexistente (deve manter o placeholder)
    assert replace_variables_in_string("Oi {{missing}}", payload, parsed_data) == "Oi {{missing}}"

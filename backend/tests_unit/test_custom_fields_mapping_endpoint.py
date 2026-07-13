import pytest
from models import User, Client, WebhookIntegration
from core.security import get_password_hash, create_access_token

def test_patch_custom_fields_mapping(client, db_session):
    # 1. Criar cliente e usuário
    test_client = Client(name="Cliente Mapeamento Teste", is_active=True)
    db_session.add(test_client)
    db_session.commit()
    db_session.refresh(test_client)

    test_user = User(
        email="dev_mapping@zapvoice.com.br",
        hashed_password=get_password_hash("password123"),
        role="admin",
        is_active=True,
        client_id=test_client.id
    )
    test_user.accessible_clients.append(test_client)
    db_session.add(test_user)
    db_session.commit()
    db_session.refresh(test_user)

    # 2. Criar integração de webhook
    integration = WebhookIntegration(
        client_id=test_client.id,
        name="Elementor Test Manual Mapping",
        platform="elementor",
        status="active",
        custom_fields_mapping={}
    )
    db_session.add(integration)
    db_session.commit()
    db_session.refresh(integration)

    # Gerar token JWT e headers
    jwt_token = create_access_token(data={"sub": test_user.email})
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "X-Client-ID": str(test_user.client_id)
    }

    # 3. Chamar PATCH para custom-fields-mapping
    mapping_payload = {
        "name": "contact_name",
        "phone": "contact_phone",
        "email": "contact_email"
    }
    
    url = f"/api/webhook-integrations/{integration.id}/custom-fields-mapping"
    res = client.patch(url, json=mapping_payload, headers=headers)
    
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["status"] == "success"
    assert res_data["custom_fields_mapping"] == mapping_payload

    # Verificar banco de dados
    db_session.refresh(integration)
    assert integration.custom_fields_mapping == mapping_payload


def test_fallback_custom_fields_mapping_resolution():
    from services.webhooks_utils import extract_nested_custom_fields
    payload = {
        "user_info": {
            "first_name": "Leonardo"
        },
        "mobile": "5511999999999"
    }
    # Mapeamento com múltiplos fallbacks
    mapping = {
        "name": "user_info.name, user_info.first_name",
        "phone": "whatsapp, mobile, contact_phone"
    }
    extracted = extract_nested_custom_fields(payload, mapping)
    assert extracted.get("name") == "Leonardo" # Resolveu o segundo fallback de name
    assert extracted.get("phone") == "5511999999999" # Resolveu o segundo fallback de phone (mobile)


def test_retroactive_reprocessing_on_patch(client, db_session):
    # 1. Criar cliente e usuário
    test_client = Client(name="Cliente Mapeamento Retroativo", is_active=True)
    db_session.add(test_client)
    db_session.commit()
    db_session.refresh(test_client)

    test_user = User(
        email="dev_retroactive@zapvoice.com.br",
        hashed_password=get_password_hash("password123"),
        role="admin",
        is_active=True,
        client_id=test_client.id
    )
    test_user.accessible_clients.append(test_client)
    db_session.add(test_user)
    db_session.commit()
    db_session.refresh(test_user)

    # 2. Criar integração e histórico de webhook
    integration = WebhookIntegration(
        client_id=test_client.id,
        name="Retroactive Integration",
        platform="elementor",
        status="active",
        custom_fields_mapping={}
    )
    db_session.add(integration)
    db_session.commit()
    db_session.refresh(integration)

    from models import WebhookHistory
    history = WebhookHistory(
        integration_id=integration.id,
        payload={
            "customer_email": "jane@example.com",
            "fallback_phone": "5521888888888"
        },
        processed_data={},
        status="error",
        error_message="Telefone Ausente"
    )
    db_session.add(history)
    db_session.commit()
    db_session.refresh(history)

    # Headers
    jwt_token = create_access_token(data={"sub": test_user.email})
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "X-Client-ID": str(test_user.client_id)
    }

    # PATCH para definir mapeamentos personalizados (com fallback para phone)
    mapping_payload = {
        "email": "customer_email",
        "phone": "non_existent, fallback_phone"
    }

    url = f"/api/webhook-integrations/{integration.id}/custom-fields-mapping"
    res = client.patch(url, json=mapping_payload, headers=headers)
    assert res.status_code == 200

    # Verificar que o histórico foi retroativamente corrigido e reprocessado
    db_session.refresh(history)
    assert history.status == "processed"
    assert history.error_message is None
    assert history.processed_data.get("email") == "jane@example.com"
    assert history.processed_data.get("phone") == "5521888888888"


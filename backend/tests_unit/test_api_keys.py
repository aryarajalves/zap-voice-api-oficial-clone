import pytest
import os
import sys
from models import User, Client, ApiKey
from core.security import get_password_hash, create_access_token

def test_api_keys_flow(client, db_session):
    # 1. Criar cliente e usuário de teste
    test_client = Client(name="Cliente API Teste", is_active=True)
    db_session.add(test_client)
    db_session.commit()
    db_session.refresh(test_client)

    test_user = User(
        email="dev_api@zapvoice.com.br",
        hashed_password=get_password_hash("password123"),
        role="admin",
        is_active=True,
        client_id=test_client.id
    )
    test_user.accessible_clients.append(test_client)
    db_session.add(test_user)
    db_session.commit()
    db_session.refresh(test_user)

    # Gerar token JWT para autenticar o setup inicial das chaves de API
    jwt_token = create_access_token(data={"sub": test_user.email})
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "X-Client-ID": str(test_user.client_id)
    }

    # 2. Criar Chave de API
    payload = {"name": "Token de Teste Integração"}
    res_create = client.post("/api/api-keys", json=payload, headers=headers)
    assert res_create.status_code == 200
    data = res_create.json()
    
    assert data["name"] == "Token de Teste Integração"
    assert "api_key" in data
    api_key = data["api_key"]
    assert api_key.startswith("zv_live_")
    key_id = data["id"]

    # 3. Listar Chaves de API
    res_list = client.get("/api/api-keys", headers=headers)
    assert res_list.status_code == 200
    keys = res_list.json()
    assert len(keys) >= 1
    assert keys[0]["name"] == "Token de Teste Integração"
    assert "api_key" not in keys[0] # Chave crua nunca deve ser listada

    # 4. Autenticação usando a nova API Key gerada
    api_headers = {
        "Authorization": f"Bearer {api_key}",
        "X-Client-ID": str(test_user.client_id)
    }
    
    # Chama a rota de listar chaves usando o Token gerado
    res_auth = client.get("/api/api-keys", headers=api_headers)
    assert res_auth.status_code == 200
    assert len(res_auth.json()) >= 1

    # 5. Revogar a Chave de API
    res_revoke = client.delete(f"/api/api-keys/{key_id}", headers=headers)
    assert res_revoke.status_code == 200
    assert res_revoke.json()["status"] == "success"

    # 6. Tentar acessar usando a chave revogada (deve falhar com 401)
    res_fail = client.get("/api/api-keys", headers=api_headers)
    assert res_fail.status_code == 401

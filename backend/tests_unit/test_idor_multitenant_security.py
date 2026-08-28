import pytest
from fastapi import HTTPException
from models import User, Client, ApiKey, BlockedContact, RestingContact, WebhookLead
from core.security import get_password_hash, create_access_token
from core.deps import get_validated_client_id

def test_get_validated_client_id_direct_logic(db_session):
    """
    Testa a função de dependência get_validated_client_id diretamente.
    """
    # 1. Setup Clients
    client_a = Client(name="Empresa A", is_active=True)
    client_b = Client(name="Empresa B", is_active=True)
    db_session.add_all([client_a, client_b])
    db_session.commit()
    db_session.refresh(client_a)
    db_session.refresh(client_b)

    # 2. Setup Standard User (Apenas acesso ao client_a)
    user_standard = User(
        email="user_a@empresa.com",
        hashed_password=get_password_hash("pass123"),
        role="user",
        is_active=True,
        client_id=client_a.id
    )
    user_standard.accessible_clients.append(client_a)

    # 3. Setup Super Admin
    user_admin = User(
        email="superadmin@zapvoice.com",
        hashed_password=get_password_hash("pass123"),
        role="super_admin",
        is_active=True,
        client_id=client_a.id
    )
    db_session.add_all([user_standard, user_admin])
    db_session.commit()
    db_session.refresh(user_standard)
    db_session.refresh(user_admin)

    # Caso 1: Usuário comum acessando seu próprio client_id explicitamente
    assert get_validated_client_id(x_client_id=client_a.id, current_user=user_standard) == client_a.id
    assert get_validated_client_id(x_client_id=str(client_a.id), current_user=user_standard) == client_a.id

    # Caso 2: Usuário comum sem enviar header (fallback seguro)
    assert get_validated_client_id(x_client_id=None, current_user=user_standard) == client_a.id
    assert get_validated_client_id(x_client_id="null", current_user=user_standard) == client_a.id

    # Caso 3: Tentativa de IDOR - Usuário comum tentando acessar Empresa B -> Deve lançar 403
    with pytest.raises(HTTPException) as exc_info:
        get_validated_client_id(x_client_id=client_b.id, current_user=user_standard)
    assert exc_info.value.status_code == 403
    assert "Acesso negado ao cliente solicitado" in exc_info.value.detail

    # Caso 4: Super Admin acessando Empresa B -> Permitido
    assert get_validated_client_id(x_client_id=client_b.id, current_user=user_admin) == client_b.id


def test_api_idor_prevention_on_endpoints(client, db_session):
    """
    Testa endpoints HTTP reais bloqueando requisições com X-Client-ID forjado.
    """
    # 1. Setup Clients
    client_1 = Client(name="Tenant 1", is_active=True)
    client_2 = Client(name="Tenant 2", is_active=True)
    db_session.add_all([client_1, client_2])
    db_session.commit()
    db_session.refresh(client_1)
    db_session.refresh(client_2)


    # 2. Setup User de Tenant 1
    user_tenant_1 = User(
        email="tenant1@teste.com",
        hashed_password=get_password_hash("123456"),
        role="admin",
        is_active=True,
        client_id=client_1.id
    )

    user_tenant_1.accessible_clients.append(client_1)
    db_session.add(user_tenant_1)
    db_session.commit()
    db_session.refresh(user_tenant_1)

    jwt_token = create_access_token(data={"sub": user_tenant_1.email})

    # Headers legítimos para o Tenant 1
    legit_headers = {
        "Authorization": f"Bearer {jwt_token}",
        "X-Client-ID": str(client_1.id)
    }

    # Headers maliciosos tentando IDOR no Tenant 2
    idor_headers = {
        "Authorization": f"Bearer {jwt_token}",
        "X-Client-ID": str(client_2.id)
    }

    # Teste 1: /api/api-keys
    res_legit = client.get("/api/api-keys", headers=legit_headers)
    print("API KEYS:", res_legit.status_code, res_legit.text)
    assert res_legit.status_code == 200

    res_idor = client.get("/api/api-keys", headers=idor_headers)
    print("API KEYS IDOR:", res_idor.status_code, res_idor.text)
    assert res_idor.status_code == 403
    assert "Acesso negado" in res_idor.json().get("detail", "")

    # Teste 2: /api/blocked/
    res_blocked_legit = client.get("/api/blocked/", headers=legit_headers)
    print("BLOCKED:", res_blocked_legit.status_code, res_blocked_legit.text)
    assert res_blocked_legit.status_code == 200

    res_blocked_idor = client.get("/api/blocked/", headers=idor_headers)
    print("BLOCKED IDOR:", res_blocked_idor.status_code, res_blocked_idor.text)
    assert res_blocked_idor.status_code == 403

    # Teste 3: /api/resting/
    res_resting_legit = client.get("/api/resting/", headers=legit_headers)
    print("RESTING:", res_resting_legit.status_code, res_resting_legit.text)
    assert res_resting_legit.status_code == 200

    res_resting_idor = client.get("/api/resting/", headers=idor_headers)
    print("RESTING IDOR:", res_resting_idor.status_code, res_resting_idor.text)
    assert res_resting_idor.status_code == 403


    # Teste 4: /api/leads
    res_leads_legit = client.get("/api/leads", headers=legit_headers)
    print("LEADS:", res_leads_legit.status_code, res_leads_legit.text)
    assert res_leads_legit.status_code == 200

    res_leads_idor = client.get("/api/leads", headers=idor_headers)
    print("LEADS IDOR:", res_leads_idor.status_code, res_leads_idor.text)
    assert res_leads_idor.status_code == 403

    # Teste 5: /api/triggers
    res_triggers_legit = client.get("/api/triggers", headers=legit_headers)
    print("TRIGGERS:", res_triggers_legit.status_code, res_triggers_legit.text)
    assert res_triggers_legit.status_code == 200

    res_triggers_idor = client.get("/api/triggers", headers=idor_headers)
    print("TRIGGERS IDOR:", res_triggers_idor.status_code, res_triggers_idor.text)
    assert res_triggers_idor.status_code == 403

    # Teste 6: /api/uploads/list
    res_uploads_legit = client.get("/api/uploads/list", headers=legit_headers)
    assert res_uploads_legit.status_code == 200

    res_uploads_idor = client.get("/api/uploads/list", headers=idor_headers)
    assert res_uploads_idor.status_code == 403

    # Teste 7: /api/financial/summary
    res_fin_legit = client.get("/api/financial/summary", headers=legit_headers)
    assert res_fin_legit.status_code == 200

    res_fin_idor = client.get("/api/financial/summary", headers=idor_headers)
    assert res_fin_idor.status_code == 403

    # Teste 8: /api/whatsapp/debug/env - Protegido apenas para Super Admin
    res_debug_unauthorized = client.get("/api/whatsapp/debug/env", headers=legit_headers)
    assert res_debug_unauthorized.status_code == 403



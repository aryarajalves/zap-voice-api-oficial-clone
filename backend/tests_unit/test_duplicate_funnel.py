import pytest
from models import User, Client, Funnel
from core.security import get_password_hash, create_access_token

@pytest.fixture
def client_obj(db_session):
    c = Client(name="FunnelTestClient")
    db_session.add(c)
    db_session.commit()
    db_session.refresh(c)
    return c

@pytest.fixture
def test_user(db_session, client_obj):
    user = User(
        email="funnel_user@test.com",
        hashed_password=get_password_hash("pass"),
        role="admin",
        is_active=True,
        client_id=client_obj.id,
    )
    # Adicionar o relacionamento de acesso do cliente
    user.accessible_clients.append(client_obj)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def auth_headers(test_user, client_obj):
    token = create_access_token({"sub": test_user.email, "role": test_user.role})
    return {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_obj.id),
    }

@pytest.fixture
def original_funnel(db_session, client_obj):
    funnel = Funnel(
        name="Funil de Vendas",
        description="Funil original para testes",
        steps={"nodes": [{"id": "n1", "type": "messageNode", "data": {"text": "Olá"}}]},
        client_id=client_obj.id,
        is_archived=False
    )
    db_session.add(funnel)
    db_session.commit()
    db_session.refresh(funnel)
    return funnel

# -- POST /funnels/{funnel_id}/duplicate --------------------------------------

def test_duplicate_funnel_success(client, auth_headers, db_session, original_funnel):
    resp = client.post(f"/api/funnels/{original_funnel.id}/duplicate", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Funil de Vendas (Cópia)"
    assert data["description"] == original_funnel.description
    assert data["steps"] == original_funnel.steps
    assert data["id"] != original_funnel.id

def test_duplicate_funnel_consecutive(client, auth_headers, db_session, original_funnel):
    # Duplicar primeira vez para criar "Funil de Vendas (Cópia)"
    client.post(f"/api/funnels/{original_funnel.id}/duplicate", headers=auth_headers)
    
    # Duplicar de novo para criar "Funil de Vendas (Cópia) 2"
    resp = client.post(f"/api/funnels/{original_funnel.id}/duplicate", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Funil de Vendas (Cópia) 2"

def test_duplicate_funnel_not_found(client, auth_headers):
    resp = client.post("/api/funnels/99999/duplicate", headers=auth_headers)
    assert resp.status_code == 404

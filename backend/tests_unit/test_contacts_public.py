"""
Testes unitarios para o endpoint publico de atualizacao de contatos.

Cobre:
- Rejeicao sem API Key (401)
- Rejeicao com API Key invalida (401)
- Atualizacao bem-sucedida com API Key valida (200)
- Atualizacao de google_meet_link e meeting_at (200)
- Rejeicao de payload vazio / sem campos validos (400)
- Telefone invalido (400)
- GET /api/settings/contacts retorna os novos campos
- Contato criado automaticamente via UPSERT se nao existia
"""

import pytest
from sqlalchemy import text

from models import Client, User, ApiKey
from core.security import get_password_hash, create_access_token


# Constantes
TEST_TABLE = "contatos_monitorados"


# Fixture: cria client, user e jwt_headers de teste
@pytest.fixture
def api_key_setup(db_session):
    test_client_obj = Client(name="Cliente Contacts Test", is_active=True)
    db_session.add(test_client_obj)
    db_session.commit()
    db_session.refresh(test_client_obj)
    client_id = test_client_obj.id

    test_user = User(
        email="contacts_test@zapvoice.test",
        hashed_password=get_password_hash("senha_segura"),
        role="admin",
        is_active=True,
        client_id=client_id
    )
    test_user.accessible_clients.append(test_client_obj)
    db_session.add(test_user)
    db_session.commit()
    db_session.refresh(test_user)

    jwt_token = create_access_token(data={"sub": test_user.email})
    jwt_headers = {
        "Authorization": f"Bearer {jwt_token}",
        "X-Client-ID": str(client_id)
    }

    return {
        "client_id": client_id,
        "user_id": test_user.id,
        "jwt_headers": jwt_headers,
    }


@pytest.fixture
def live_api_key(client, api_key_setup):
    """Cria uma API Key real via endpoint e retorna o token bruto."""
    res = client.post(
        "/api/api-keys",
        json={"name": "Chave Contacts Public Test"},
        headers=api_key_setup["jwt_headers"]
    )
    assert res.status_code == 200, f"Falha ao criar API Key: {res.text}"
    return res.json()["api_key"]


@pytest.fixture(autouse=True)
def clean_contacts_table(db_session):
    """Garante que a tabela de contatos existe e limpa registros de teste."""
    try:
        db_session.execute(text(f"""
            CREATE TABLE IF NOT EXISTS {TEST_TABLE} (
                phone VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255),
                inbox_id INTEGER,
                last_interaction_at TIMESTAMP,
                google_meet_link TEXT,
                meeting_at TIMESTAMP
            )
        """))
        db_session.commit()
        db_session.execute(text(f"DELETE FROM {TEST_TABLE} WHERE phone LIKE '559900%'"))
        db_session.commit()
    except Exception:
        db_session.rollback()
    yield
    try:
        db_session.execute(text(f"DELETE FROM {TEST_TABLE} WHERE phone LIKE '559900%'"))
        db_session.commit()
    except Exception:
        db_session.rollback()


# Testes de autenticacao

def test_update_contact_sem_api_key_retorna_401(client):
    """Deve retornar 401 quando nenhuma API Key for fornecida."""
    response = client.post(
        "/api/contacts/5599001001/update",
        json={"google_meet_link": "https://meet.google.com/abc"}
    )
    assert response.status_code == 401
    assert "API Key" in response.json()["detail"]


def test_update_contact_com_api_key_invalida_retorna_401(client):
    """Deve retornar 401 quando a API Key for invalida/inexistente."""
    response = client.post(
        "/api/contacts/5599001001/update",
        json={"google_meet_link": "https://meet.google.com/abc"},
        headers={"Authorization": "Bearer zv_live_chave_que_nao_existe_123456789"}
    )
    assert response.status_code == 401
    # Verifica que a mensagem contém indicação de chave inválida
    detail = response.json()["detail"]
    assert any(word in detail.lower() for word in ["invalida", "inválida", "revogada"])


def test_update_contact_sem_bearer_prefix_retorna_401(client):
    """Deve retornar 401 quando o header Authorization nao tiver o prefixo Bearer."""
    response = client.post(
        "/api/contacts/5599001001/update",
        json={"google_meet_link": "https://meet.google.com/abc"},
        headers={"Authorization": "zv_live_sem_prefixo_bearer"}
    )
    assert response.status_code == 401


# Testes de atualizacao bem-sucedida

def test_update_contact_google_meet_link_sucesso(client, live_api_key):
    """Deve atualizar o google_meet_link de um contato com sucesso."""
    meet_link = "https://meet.google.com/abc-def-ghi"

    response = client.post(
        "/api/contacts/5599001001/update",
        json={"google_meet_link": meet_link},
        headers={"Authorization": f"Bearer {live_api_key}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "google_meet_link" in data["updated_fields"]
    assert data["contact"]["google_meet_link"] == meet_link
    assert data["contact"]["phone"] == "5599001001"


def test_update_contact_meeting_at_sucesso(client, live_api_key):
    """Deve atualizar meeting_at com sucesso."""
    meeting_dt = "2026-07-20T14:00:00+00:00"

    response = client.post(
        "/api/contacts/5599001002/update",
        json={"meeting_at": meeting_dt},
        headers={"Authorization": f"Bearer {live_api_key}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "meeting_at" in data["updated_fields"]
    assert data["contact"]["meeting_at"] is not None


def test_update_contact_multiplos_campos_sucesso(client, live_api_key):
    """Deve atualizar google_meet_link, meeting_at e name simultaneamente."""
    response = client.post(
        "/api/contacts/5599001003/update",
        json={
            "google_meet_link": "https://meet.google.com/xyz-abc-def",
            "meeting_at": "2026-07-21T10:00:00+00:00",
            "name": "Joao Teste"
        },
        headers={"Authorization": f"Bearer {live_api_key}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert set(["google_meet_link", "meeting_at", "name"]).issubset(set(data["updated_fields"]))
    assert data["contact"]["name"] == "Joao Teste"
    assert data["contact"]["google_meet_link"] == "https://meet.google.com/xyz-abc-def"


def test_update_contact_cria_novo_se_nao_existe(client, live_api_key, db_session):
    """Deve criar o contato na tabela se ele ainda nao existir (UPSERT)."""
    phone = "5599001099"
    response = client.post(
        f"/api/contacts/{phone}/update",
        json={"google_meet_link": "https://meet.google.com/new-contact"},
        headers={"Authorization": f"Bearer {live_api_key}"}
    )

    assert response.status_code == 200
    assert response.json()["contact"]["phone"] == phone

    row = db_session.execute(
        text(f"SELECT phone, google_meet_link FROM {TEST_TABLE} WHERE phone = :phone"),
        {"phone": phone}
    ).first()
    assert row is not None
    assert row[1] == "https://meet.google.com/new-contact"


# Testes de validacao de payload

def test_update_contact_payload_vazio_retorna_400(client, live_api_key):
    """Deve retornar 400 quando o payload nao tiver nenhum campo valido."""
    response = client.post(
        "/api/contacts/5599001004/update",
        json={},
        headers={"Authorization": f"Bearer {live_api_key}"}
    )
    assert response.status_code == 400
    assert "Nenhum campo" in response.json()["detail"]


def test_update_contact_somente_campos_desconhecidos_retorna_400(client, live_api_key):
    """Campos extras sao ignorados pelo Pydantic, payload fica vazio, retorna 400."""
    response = client.post(
        "/api/contacts/5599001005/update",
        json={"campo_inventado": "valor", "outro_campo": 123},
        headers={"Authorization": f"Bearer {live_api_key}"}
    )
    assert response.status_code == 400


def test_update_contact_telefone_invalido_retorna_400(client, live_api_key):
    """Deve retornar 400 para telefones sem digitos."""
    response = client.post(
        "/api/contacts/abc-def/update",
        json={"google_meet_link": "https://meet.google.com/xyz"},
        headers={"Authorization": f"Bearer {live_api_key}"}
    )
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert any(word in detail.lower() for word in ["invalido", "inválido", "digitos", "dígitos"])


# Teste de GET /settings/contacts com novos campos

def test_get_settings_contacts_retorna_novos_campos(client, db_session, api_key_setup):
    """GET /api/settings/contacts deve retornar google_meet_link e meeting_at."""
    from core.deps import get_validated_client_id, get_current_user
    from models import User as UserModel
    from main import app

    db_session.execute(text(f"""
        INSERT INTO {TEST_TABLE} (phone, name, google_meet_link, meeting_at)
        VALUES ('5599001010', 'Teste Meet', 'https://meet.google.com/test', '2026-07-20 14:00:00')
        ON CONFLICT (phone) DO UPDATE SET
            google_meet_link = EXCLUDED.google_meet_link,
            meeting_at = EXCLUDED.meeting_at
    """))
    db_session.commit()

    client_id = api_key_setup["client_id"]

    async def override_validated_client():
        return client_id

    async def override_current_user():
        return UserModel(id=1, email="test@zv.test", role="admin", client_id=client_id)

    app.dependency_overrides[get_validated_client_id] = override_validated_client
    app.dependency_overrides[get_current_user] = override_current_user

    try:
        response = client.get("/api/settings/contacts?skip=0&limit=50")
        assert response.status_code == 200
        data = response.json()
        items = data.get("items", [])
        if items:
            assert "google_meet_link" in items[0]
            assert "meeting_at" in items[0]
    finally:
        app.dependency_overrides.pop(get_validated_client_id, None)
        app.dependency_overrides.pop(get_current_user, None)

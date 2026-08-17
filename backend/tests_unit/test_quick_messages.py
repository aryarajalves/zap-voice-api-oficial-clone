import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from main import app
from core.deps import get_db, get_current_user
from routers.chat import get_client_id
import models

client = TestClient(app)


@pytest.fixture
def mock_current_user():
    return models.User(id=1, email="admin@zapvoice.com", role="super_admin", client_id=10)


def test_create_quick_message_success(mock_current_user):
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    app.dependency_overrides[get_client_id] = lambda: 10

    mock_db = MagicMock()
    def mock_refresh(obj):
        if not getattr(obj, "id", None):
            obj.id = 1
    mock_db.refresh.side_effect = mock_refresh
    app.dependency_overrides[get_db] = lambda: mock_db

    # Simular que não existe atalho duplicado
    mock_db.query.return_value.filter.return_value.first.return_value = None

    payload = {
        "shortcut": "/pix",
        "title": "Chave PIX",
        "content": "Olá {{nome}}, nossa chave PIX é pix@zapvoice.com.br"
    }

    response = client.post("/api/quick-messages", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["shortcut"] == "pix"
    assert data["title"] == "Chave PIX"
    assert data["content"] == "Olá {{nome}}, nossa chave PIX é pix@zapvoice.com.br"
    assert mock_db.add.called
    assert mock_db.commit.called


def test_create_quick_message_duplicate_shortcut(mock_current_user):
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    app.dependency_overrides[get_client_id] = lambda: 10

    mock_db = MagicMock()
    app.dependency_overrides[get_db] = lambda: mock_db

    # Simular que já existe registro com shortcut="pix"
    existing_qm = models.QuickMessage(id=1, client_id=10, shortcut="pix", title="PIX", content="Texto")
    mock_db.query.return_value.filter.return_value.first.return_value = existing_qm

    payload = {
        "shortcut": "pix",
        "title": "Outro PIX",
        "content": "Novo conteúdo"
    }

    response = client.post("/api/quick-messages", json=payload)
    assert response.status_code == 400
    assert "Já existe uma mensagem rápida" in response.json()["detail"]


def test_list_quick_messages_with_search(mock_current_user):
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    app.dependency_overrides[get_client_id] = lambda: 10

    mock_db = MagicMock()
    app.dependency_overrides[get_db] = lambda: mock_db

    qm1 = models.QuickMessage(id=1, client_id=10, shortcut="ola", title="Boas-vindas", content="Olá {{nome}}!")
    qm2 = models.QuickMessage(id=2, client_id=10, shortcut="pix", title="PIX", content="Chave pix")

    mock_db.query.return_value.filter.return_value.filter.return_value.order_by.return_value.all.return_value = [qm1]

    response = client.get("/api/quick-messages?search=ola")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["shortcut"] == "ola"


def test_update_quick_message(mock_current_user):
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    app.dependency_overrides[get_client_id] = lambda: 10

    mock_db = MagicMock()
    app.dependency_overrides[get_db] = lambda: mock_db

    existing_qm = models.QuickMessage(id=5, client_id=10, shortcut="suporte", title="Suporte", content="Ajuda")
    # Primeira chamada acha o item pelo ID, segunda chamada não acha duplicatas
    mock_db.query.return_value.filter.return_value.first.side_effect = [existing_qm, None]

    payload = {
        "title": "Suporte Técnico Especializado",
        "content": "Olá {{primeiro_nome}}, como posso ajudar hoje?"
    }

    response = client.put("/api/quick-messages/5", json=payload)
    assert response.status_code == 200
    assert existing_qm.title == "Suporte Técnico Especializado"
    assert existing_qm.content == "Olá {{primeiro_nome}}, como posso ajudar hoje?"
    assert mock_db.commit.called


def test_delete_quick_message(mock_current_user):
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    app.dependency_overrides[get_client_id] = lambda: 10

    mock_db = MagicMock()
    app.dependency_overrides[get_db] = lambda: mock_db

    existing_qm = models.QuickMessage(id=8, client_id=10, shortcut="regras", title="Regras", content="Texto")
    mock_db.query.return_value.filter.return_value.first.return_value = existing_qm

    response = client.delete("/api/quick-messages/8")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert mock_db.delete.called
    assert mock_db.commit.called

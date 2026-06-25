import pytest
from fastapi.testclient import TestClient
from main import app
from core.deps import get_db, get_current_user
from core.permissions import require_super_admin
import models
import database

# Garante que as tabelas existem no SQLite usado pelo main.app na engine de teste do conftest
from tests_unit.conftest import engine, Base
import models.project # Certifica import para registro no Metadata

@pytest.fixture(autouse=True, scope="module")
def setup_routes_test_db():
    Base.metadata.create_all(bind=engine)
    yield

# O client de testes será resolvido a partir da conftest.py global

# Fixture para simular usuário super_admin autenticado
@pytest.fixture(scope="function")
def setup_admin_and_client(db_session):
    # Criar cliente padrão
    cli = models.Client(name="Cliente Padrao Teste")
    db_session.add(cli)
    db_session.commit()
    db_session.refresh(cli)
    
    # Criar super_admin
    admin = models.User(
        email="admin_proj@teste.com",
        hashed_password="fake",
        role="super_admin",
        client_id=cli.id
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    
    return admin, cli

@pytest.fixture(autouse=True)
def mock_auth(setup_admin_and_client):
    admin, _ = setup_admin_and_client
    app.dependency_overrides[get_current_user] = lambda: admin
    app.dependency_overrides[require_super_admin] = lambda: admin
    yield
    # Limpa overrides
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(require_super_admin, None)

def test_crud_project_endpoints(client, setup_admin_and_client, db_session):
    _, cli = setup_admin_and_client
    
    # 1. POST - Criar projeto
    response = client.post("/api/projects/", json={"name": "Operacao X"})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Operacao X"
    project_id = data["id"]

    # 2. GET - Listar projetos
    response = client.get("/api/projects/")
    assert response.status_code == 200
    projs = response.json()
    assert len(projs) >= 1
    assert any(p["id"] == project_id for p in projs)

    # 3. POST - Associar cliente ao projeto
    response = client.post(f"/api/projects/{project_id}/clients", json={"client_ids": [cli.id]})
    assert response.status_code == 200
    data = response.json()
    assert len(data["clients"]) == 1
    assert data["clients"][0]["id"] == cli.id

    # 4. PUT - Editar nome do projeto
    response = client.put(f"/api/projects/{project_id}", json={"name": "Operacao Y"})
    assert response.status_code == 200
    assert response.json()["name"] == "Operacao Y"

    # 5. DELETE - Deletar projeto
    response = client.delete(f"/api/projects/{project_id}")
    assert response.status_code == 204

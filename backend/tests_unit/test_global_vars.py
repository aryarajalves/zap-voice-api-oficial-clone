import pytest
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from database import Base
from models import User, Client, GlobalVariable
from core.security import get_password_hash, create_access_token
from core.deps import get_db

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client_obj(db):
    c = Client(name="GlobalVarClient")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@pytest.fixture
def test_user(db, client_obj):
    user = User(
        email="globals_user@test.com",
        hashed_password=get_password_hash("pass"),
        role="admin",
        is_active=True,
        client_id=client_obj.id,
    )
    db.add(user)
    # Grant access via many-to-many relationship
    user.accessible_clients.append(client_obj)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user, client_obj):
    token = create_access_token({"sub": test_user.email, "role": test_user.role})
    return {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_obj.id),
    }


@pytest.fixture
def app_client(db):
    from main import app
    import routers.global_vars as global_vars_router

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[global_vars_router.get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def sample_var(db, client_obj):
    var = GlobalVariable(client_id=client_obj.id, name="preco_produto", value="R$ 97,00")
    db.add(var)
    db.commit()
    db.refresh(var)
    return var


# -- GET /globals -------------------------------------------------------------

def test_list_globals_success(app_client, auth_headers, sample_var):
    resp = app_client.get("/api/globals", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert any(v["name"] == "preco_produto" for v in data)


def test_list_globals_without_client_id(app_client, auth_headers):
    headers = {"Authorization": auth_headers["Authorization"]}
    resp = app_client.get("/api/globals", headers=headers)
    assert resp.status_code == 400


# -- POST /globals ------------------------------------------------------------

def test_create_global_success(app_client, auth_headers):
    resp = app_client.post(
        "/api/globals",
        json={"name": "nome_empresa", "value": "Acme Corp"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "nome_empresa"
    assert data["value"] == "Acme Corp"


def test_create_global_upsert_existing(app_client, auth_headers, sample_var):
    """Criar com nome existente deve atualizar o valor (upsert)."""
    resp = app_client.post(
        "/api/globals",
        json={"name": "preco_produto", "value": "R$ 197,00"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["value"] == "R$ 197,00"


# -- PUT /globals/{id} --------------------------------------------------------

def test_update_global_success(app_client, auth_headers, sample_var):
    resp = app_client.put(
        f"/api/globals/{sample_var.id}",
        json={"name": "preco_produto", "value": "R$ 147,00"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["value"] == "R$ 147,00"


def test_update_global_not_found(app_client, auth_headers):
    resp = app_client.put(
        "/api/globals/99999",
        json={"name": "ghost", "value": "x"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


def test_update_global_duplicate_name(app_client, auth_headers, db, client_obj):
    var2 = GlobalVariable(client_id=client_obj.id, name="outro_var", value="val")
    db.add(var2)
    db.commit()
    # First create another var
    var3 = GlobalVariable(client_id=client_obj.id, name="var_three", value="val3")
    db.add(var3)
    db.commit()
    resp = app_client.put(
        f"/api/globals/{var3.id}",
        json={"name": "outro_var", "value": "val3"},
        headers=auth_headers,
    )
    assert resp.status_code == 400


# -- DELETE /globals/{id} -----------------------------------------------------

def test_delete_global_success(app_client, auth_headers, db, client_obj):
    var = GlobalVariable(client_id=client_obj.id, name="to_delete_var", value="del")
    db.add(var)
    db.commit()
    resp = app_client.delete(f"/api/globals/{var.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert "excluída" in resp.json()["message"].lower()


def test_delete_global_not_found(app_client, auth_headers):
    resp = app_client.delete("/api/globals/99999", headers=auth_headers)
    assert resp.status_code == 404

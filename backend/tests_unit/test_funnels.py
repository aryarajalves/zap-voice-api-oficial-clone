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
from models import User, Client, Funnel
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
    c = Client(name="FunnelTestClient")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@pytest.fixture
def test_user(db, client_obj):
    user = User(
        email="funnel_user@test.com",
        hashed_password=get_password_hash("pass"),
        role="admin",
        is_active=True,
        client_id=client_obj.id,
    )
    db.add(user)
    # Grant access to client via many-to-many
    user.accessible_clients.append(client_obj)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    token = create_access_token({"sub": test_user.email, "role": test_user.role})
    return {"Authorization": f"Bearer {token}", "X-Client-ID": str(test_user.client_id)}


@pytest.fixture
def app_client(db, test_user):
    from main import app
    import routers.funnels as funnels_router

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[funnels_router.get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def sample_funnel(db, client_obj):
    f = Funnel(
        name="Sample Funnel",
        client_id=client_obj.id,
        steps=[{"type": "message", "content": "Hello"}],
    )
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


# -- GET /funnels -------------------------------------------------------------

def test_list_funnels_without_client_id(app_client, auth_headers):
    headers = {"Authorization": auth_headers["Authorization"]}
    resp = app_client.get("/api/funnels", headers=headers)
    assert resp.status_code == 400


def test_list_funnels_success(app_client, auth_headers, sample_funnel):
    resp = app_client.get("/api/funnels", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert any(f["name"] == "Sample Funnel" for f in data)


def test_list_funnels_unauthenticated(app_client, client_obj):
    resp = app_client.get("/api/funnels", headers={"X-Client-ID": str(client_obj.id)})
    assert resp.status_code == 401


# -- GET /funnels/{id} --------------------------------------------------------

def test_get_funnel_success(app_client, auth_headers, sample_funnel):
    resp = app_client.get(f"/api/funnels/{sample_funnel.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == sample_funnel.id


def test_get_funnel_not_found(app_client, auth_headers):
    resp = app_client.get("/api/funnels/99999", headers=auth_headers)
    assert resp.status_code == 404


def test_get_funnel_wrong_client(app_client, auth_headers, db):
    other_client = Client(name="OtherClient_Funnel")
    db.add(other_client)
    db.commit()
    other_funnel = Funnel(
        name="Other Funnel",
        client_id=other_client.id,
        steps=[],
    )
    db.add(other_funnel)
    db.commit()
    # Try to access other client's funnel
    resp = app_client.get(f"/api/funnels/{other_funnel.id}", headers=auth_headers)
    assert resp.status_code == 404


# -- POST /funnels ------------------------------------------------------------

def test_create_funnel_success(app_client, auth_headers):
    payload = {
        "name": "New Funnel",
        "steps": [{"type": "message", "content": "Oi"}],
    }
    resp = app_client.post("/api/funnels", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Funnel"


def test_create_funnel_duplicate_name(app_client, auth_headers, sample_funnel):
    payload = {
        "name": "Sample Funnel",
        "steps": [],
    }
    resp = app_client.post("/api/funnels", json=payload, headers=auth_headers)
    assert resp.status_code == 400


def test_create_funnel_without_client_id(app_client, auth_headers):
    headers = {"Authorization": auth_headers["Authorization"]}
    payload = {"name": "No Client", "steps": []}
    resp = app_client.post("/api/funnels", json=payload, headers=headers)
    assert resp.status_code == 400


# -- PUT /funnels/{id} --------------------------------------------------------

def test_update_funnel_success(app_client, auth_headers, sample_funnel):
    payload = {
        "name": "Updated Funnel",
        "steps": [{"type": "message", "content": "Updated"}],
    }
    resp = app_client.put(f"/api/funnels/{sample_funnel.id}", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Funnel"


def test_update_funnel_not_found(app_client, auth_headers):
    payload = {"name": "Ghost Funnel", "steps": []}
    resp = app_client.put("/api/funnels/99999", json=payload, headers=auth_headers)
    assert resp.status_code == 404


# -- DELETE /funnels/{id} -----------------------------------------------------

def test_delete_funnel_success(app_client, auth_headers, db, client_obj):
    funnel = Funnel(name="To Delete", client_id=client_obj.id, steps=[])
    db.add(funnel)
    db.commit()
    resp = app_client.delete(f"/api/funnels/{funnel.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert "deleted" in resp.json()["message"].lower()


def test_delete_funnel_not_found(app_client, auth_headers):
    resp = app_client.delete("/api/funnels/99999", headers=auth_headers)
    assert resp.status_code == 404


# -- DELETE /funnels/bulk -----------------------------------------------------

def test_delete_funnels_bulk(app_client, auth_headers, db, client_obj):
    f1 = Funnel(name="Bulk Del 1", client_id=client_obj.id, steps=[])
    f2 = Funnel(name="Bulk Del 2", client_id=client_obj.id, steps=[])
    db.add_all([f1, f2])
    db.commit()
    payload = {"funnel_ids": [f1.id, f2.id]}
    resp = app_client.request("DELETE", "/api/funnels/bulk", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["deleted_count"] == 2


def test_delete_funnels_bulk_empty(app_client, auth_headers):
    payload = {"funnel_ids": [99998, 99997]}
    resp = app_client.request("DELETE", "/api/funnels/bulk", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["deleted_count"] == 0

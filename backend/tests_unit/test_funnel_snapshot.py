import pytest
import os
import sys
from datetime import datetime, timezone

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from database import Base
from models import User, Client, Funnel, ScheduledTrigger
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
    c = Client(name="SnapshotTestClient")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@pytest.fixture
def super_admin(db, client_obj):
    user = User(
        email="snapshot_admin@test.com",
        hashed_password=get_password_hash("pass"),
        role="super_admin",
        is_active=True,
        client_id=client_obj.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(super_admin, client_obj):
    token = create_access_token({"sub": super_admin.email, "role": super_admin.role})
    return {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_obj.id),
    }


@pytest.fixture
def app_client(db):
    from main import app

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_funnel_snapshot_automatic_persistence(db, client_obj):
    # Criar funil com nós específicos
    initial_steps = {"nodes": [{"id": "node-1", "type": "messageNode"}], "edges": []}
    f = Funnel(name="Snapshot Funnel", client_id=client_obj.id, steps=initial_steps)
    db.add(f)
    db.commit()
    db.refresh(f)

    # Inserir trigger
    t = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=f.id,
        status="completed",
        scheduled_time=datetime.now(timezone.utc),
        contact_name="Lead Test",
        contact_phone="5511999998888"
    )
    db.add(t)
    db.commit()
    db.refresh(t)

    # Validar se o snapshot foi persistido automaticamente e corresponde aos steps originais
    assert t.funnel_snapshot is not None
    assert t.funnel_snapshot["nodes"][0]["id"] == "node-1"


def test_get_trigger_renders_snapshot_even_if_funnel_modified(app_client, auth_headers, db, client_obj):
    # Criar funil com nós iniciais
    f = Funnel(
        name="Snapshot Funnel 2",
        client_id=client_obj.id,
        steps={"nodes": [{"id": "node-original", "type": "messageNode"}], "edges": []}
    )
    db.add(f)
    db.commit()
    db.refresh(f)

    # Criar trigger (que automaticamente salva o snapshot original)
    t = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=f.id,
        status="completed",
        scheduled_time=datetime.now(timezone.utc)
    )
    db.add(t)
    db.commit()
    db.refresh(t)

    # Modificar o funil original após o disparo
    f.steps = {"nodes": [{"id": "node-modified-new", "type": "audioNode"}], "edges": []}
    db.add(f)
    db.commit()

    # Buscar detalhes do disparo pela API
    resp = app_client.get(f"/api/triggers/{t.id}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()

    # O funil retornado no disparo DEVE conter o nó original (preservado pelo snapshot)
    assert data["funnel"] is not None
    assert data["funnel"]["steps"]["nodes"][0]["id"] == "node-original"


def test_get_trigger_renders_snapshot_even_if_funnel_deleted(app_client, auth_headers, db, client_obj):
    # Criar funil
    f = Funnel(
        name="Snapshot Funnel 3",
        client_id=client_obj.id,
        steps={"nodes": [{"id": "node-to-be-deleted", "type": "messageNode"}], "edges": []}
    )
    db.add(f)
    db.commit()
    db.refresh(f)

    # Criar trigger
    t = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=f.id,
        status="completed",
        scheduled_time=datetime.now(timezone.utc)
    )
    db.add(t)
    db.commit()
    db.refresh(t)

    # Excluir o funil do banco de dados
    db.delete(f)
    db.commit()

    # Buscar detalhes do disparo pela API
    resp = app_client.get(f"/api/triggers/{t.id}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()

    # O funil retornado no disparo DEVE ser gerado em memória a partir do snapshot
    assert data["funnel"] is not None
    assert "Excluído" in data["funnel"]["name"]
    assert data["funnel"]["steps"]["nodes"][0]["id"] == "node-to-be-deleted"

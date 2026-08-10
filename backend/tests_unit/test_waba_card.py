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
from models import User, Client, ScheduledTrigger, AppConfig
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
    c = Client(name="WabaCardClient")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@pytest.fixture
def test_user(db, client_obj):
    user = User(
        email="wabacard_user@test.com",
        hashed_password=get_password_hash("pass"),
        role="admin",
        is_active=True,
        client_id=client_obj.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user, client_obj):
    token = create_access_token({"sub": test_user.email, "role": test_user.role, "client_id": client_obj.id})
    return {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_obj.id),
    }


@pytest.fixture
def app_client(db):
    from main import app
    import core.deps as deps

    def override_get_db():
        yield db

    app.dependency_overrides[deps.get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_triggers_returns_none_when_waba_card_not_set(app_client, db):
    """
    Se a chave WA_WABA_CARD_LAST4 não estiver configurada, waba_card_last4 deve ser None.
    """
    c = Client(name="ClientNoCard")
    db.add(c)
    db.commit()
    db.refresh(c)

    user = User(email="nocard@test.com", hashed_password=get_password_hash("pass"), role="admin", client_id=c.id)
    db.add(user)
    db.commit()

    token = create_access_token({"sub": user.email, "role": user.role, "client_id": c.id})
    headers = {"Authorization": f"Bearer {token}", "X-Client-ID": str(c.id)}

    trig = ScheduledTrigger(
        client_id=c.id,
        status="completed",
        is_bulk=True,
        template_name="TemplateSemCartao"
    )
    db.add(trig)
    db.commit()

    resp = app_client.get("/api/triggers", headers=headers)
    assert resp.status_code == 200
    items = resp.json().get("items", [])
    target = next((item for item in items if item["id"] == trig.id), None)
    assert target is not None
    assert target.get("waba_card_last4") is None


def test_triggers_returns_waba_card_when_configured(app_client, db):
    """
    Se a chave WA_WABA_CARD_LAST4 estiver configurada como '4821', waba_card_last4 deve retornar '4821'.
    """
    c = Client(name="ClientWithCard")
    db.add(c)
    db.commit()
    db.refresh(c)

    user = User(email="withcard@test.com", hashed_password=get_password_hash("pass"), role="admin", client_id=c.id)
    db.add(user)
    
    cfg = AppConfig(client_id=c.id, key="WA_WABA_CARD_LAST4", value="4821")
    db.add(cfg)

    trig = ScheduledTrigger(
        client_id=c.id,
        status="completed",
        is_bulk=True,
        template_name="TemplateComCartao"
    )
    db.add(trig)
    db.commit()

    token = create_access_token({"sub": user.email, "role": user.role, "client_id": c.id})
    headers = {"Authorization": f"Bearer {token}", "X-Client-ID": str(c.id)}

    resp = app_client.get("/api/triggers", headers=headers)
    assert resp.status_code == 200
    items = resp.json().get("items", [])
    target = next((item for item in items if item["id"] == trig.id), None)
    assert target is not None
    assert target.get("waba_card_last4") == "4821"


def test_update_settings_saves_waba_card_last4(app_client, db):
    """
    Garante que o endpoint POST /api/settings/ aceita e persiste a chave WA_WABA_CARD_LAST4.
    """
    from main import app
    import routers.settings as settings_router

    c = Client(name="SaveCardClient")
    db.add(c)
    db.commit()
    db.refresh(c)

    user = User(email="savecard@test.com", hashed_password=get_password_hash("pass"), role="super_admin", client_id=c.id)
    db.add(user)
    db.commit()

    app.dependency_overrides[settings_router.require_admin] = lambda: user

    token = create_access_token({"sub": user.email, "role": user.role, "client_id": c.id})
    headers = {"Authorization": f"Bearer {token}", "X-Client-ID": str(c.id)}

    payload = {
        "settings": {
            "WA_WABA_CARD_LAST4": "9988"
        }
    }
    resp = app_client.post("/api/settings/", json=payload, headers=headers)
    assert resp.status_code == 200

    # Ler do DB se a chave foi salva
    saved_cfg = db.query(AppConfig).filter(AppConfig.client_id == c.id, AppConfig.key == "WA_WABA_CARD_LAST4").first()
    assert saved_cfg is not None
    assert saved_cfg.value == "9988"


def test_trigger_card_snapshot_is_immutable_on_future_settings_change(app_client, db):
    """
    Garante que a alteração posterior da chave WA_WABA_CARD_LAST4 não altera os disparos antigos.
    """
    c = Client(name="ImmutableClient")
    db.add(c)
    db.commit()
    db.refresh(c)

    user = User(email="immutable@test.com", hashed_password=get_password_hash("pass"), role="super_admin", client_id=c.id)
    db.add(user)

    # 1. Configurar cartão inicial como '4821'
    cfg = AppConfig(client_id=c.id, key="WA_WABA_CARD_LAST4", value="4821")
    db.add(cfg)
    db.commit()

    # 2. Criar disparo antigo 1
    trig1 = ScheduledTrigger(client_id=c.id, status="completed", is_bulk=True, template_name="DisparoAntigo")
    db.add(trig1)
    db.commit()
    db.refresh(trig1)

    # O event listener deve ter congelado '4821' no trig1
    assert trig1.waba_card_last4 == "4821"

    # 3. Alterar cartão nas configurações para '1234'
    cfg.value = "1234"
    db.commit()

    # 4. Criar novo disparo 2
    trig2 = ScheduledTrigger(client_id=c.id, status="completed", is_bulk=True, template_name="DisparoNovo")
    db.add(trig2)
    db.commit()
    db.refresh(trig2)

    # O event listener deve congelar '1234' no trig2
    assert trig2.waba_card_last4 == "1234"

    # 5. Buscar via API e garantir que trig1 manteve '4821' e trig2 obteve '1234'
    token = create_access_token({"sub": user.email, "role": user.role, "client_id": c.id})
    headers = {"Authorization": f"Bearer {token}", "X-Client-ID": str(c.id)}

    resp = app_client.get("/api/triggers", headers=headers)
    assert resp.status_code == 200
    items = resp.json().get("items", [])

    item1 = next((i for i in items if i["id"] == trig1.id), None)
    item2 = next((i for i in items if i["id"] == trig2.id), None)

    assert item1 is not None and item1.get("waba_card_last4") == "4821"
    assert item2 is not None and item2.get("waba_card_last4") == "1234"



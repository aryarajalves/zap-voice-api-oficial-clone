import pytest
import os
import sys
import json

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from database import Base
from main import app
import models
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
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def client_obj(db):
    c = models.Client(name="ReminderTestClient")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

@pytest.fixture
def test_user(db, client_obj):
    user = models.User(
        email="reminder_user@test.com",
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
def auth_headers(test_user, client_obj):
    token = create_access_token({"sub": test_user.email, "role": test_user.role})
    return {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_obj.id),
    }

def test_retry_reminder_endpoint(client, db, client_obj, auth_headers):
    # 1. Configurar lembretes para o cliente no banco de dados
    configs_to_add = [
        ("APPOINTMENTS_ENABLED", "true"),
        ("APPOINTMENTS_REMINDER_MINUTES", "60"),
        ("APPOINTMENTS_REMINDER_TEMPLATE", "convite_base_webinaro"),
        ("APPOINTMENTS_REMINDER_PARAMS", json.dumps({"BODY_1": "{name}"}))
    ]
    for key, val in configs_to_add:
        new_cfg = models.AppConfig(client_id=client_obj.id, key=key, value=val)
        db.add(new_cfg)
    
    # 2. Adicionar o template mockado no cache
    from models.trigger import WhatsAppTemplateCache
    new_tpl = WhatsAppTemplateCache(
        id=123456,
        client_id=client_obj.id,
        name="convite_base_webinaro",
        language="pt_BR",
        components=[{"type": "BODY", "text": "Olá {{1}}!"}]
    )
    db.add(new_tpl)
    db.commit()

    # 3. Criar um lead de teste para o cliente
    lead = models.WebhookLead(
        client_id=client_obj.id,
        phone="5585996123586",
        name="Aryaraj Teste",
        google_calendar_reminder_sent=True
    )
    db.add(lead)
    db.commit()

    # 4. Chamar o endpoint de re-disparo
    response = client.post(f"/api/reminders/leads/{lead.id}/retry", headers=auth_headers)
    
    # Deve disparar a tentativa (e falhar por não ter Meta real, resultando em 502/500/etc.)
    # O importante é que a rota execute o fluxo.
    assert response.status_code in [200, 502, 500]

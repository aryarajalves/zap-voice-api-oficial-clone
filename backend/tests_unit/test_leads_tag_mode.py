import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os
from datetime import datetime, timezone

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import Base
from main import app
from core.deps import get_db, get_current_user
import models

TEST_DATABASE_URL = "sqlite:///./test_leads_tag_mode.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        if os.path.exists("./test_leads_tag_mode.db"):
            os.remove("./test_leads_tag_mode.db")

def test_leads_tag_mode_and_vs_or(db_session):
    client_id = 1001
    test_client = models.Client(id=client_id, name="Test Tag Mode Client")
    db_session.add(test_client)
    db_session.commit()

    # Lead 1: VIP e Lead Quente
    l1 = models.WebhookLead(
        client_id=client_id,
        phone="5511999990001",
        name="Lead VIP e Quente",
        email="l1@test.com",
        tags="VIP, Lead Quente",
        total_events=1,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    # Lead 2: Apenas VIP
    l2 = models.WebhookLead(
        client_id=client_id,
        phone="5511999990002",
        name="Lead Apenas VIP",
        email="l2@test.com",
        tags="VIP",
        total_events=1,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    # Lead 3: Apenas Lead Quente
    l3 = models.WebhookLead(
        client_id=client_id,
        phone="5511999990003",
        name="Lead Apenas Quente",
        email="l3@test.com",
        tags="Lead Quente",
        total_events=1,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    # Lead 4: Outra tag
    l4 = models.WebhookLead(
        client_id=client_id,
        phone="5511999990004",
        name="Lead Frio",
        email="l4@test.com",
        tags="Frio",
        total_events=1,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db_session.add_all([l1, l2, l3, l4])
    db_session.commit()

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    mock_user = models.User(
        id=1234,
        email="test_tag_mode@test.com",
        role="premium",
        client_id=client_id
    )
    def override_get_current_user():
        return mock_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    client = TestClient(app)

    # 1. Modo OR (padrão): deve retornar todos os contatos que possuem ao menos 1 das etiquetas (L1, L2, L3)
    resp_or = client.get("/api/leads?tag=VIP&tag=Lead+Quente&tag_mode=OR", headers={"X-Client-ID": str(client_id)})
    assert resp_or.status_code == 200
    data_or = resp_or.json()
    assert data_or["total"] == 3
    names_or = [item["name"] for item in data_or["items"]]
    assert "Lead VIP e Quente" in names_or
    assert "Lead Apenas VIP" in names_or
    assert "Lead Apenas Quente" in names_or
    assert "Lead Frio" not in names_or

    # 2. Modo AND: deve retornar APENAS os contatos que possuem TODAS as etiquetas selecionadas juntas (L1)
    resp_and = client.get("/api/leads?tag=VIP&tag=Lead+Quente&tag_mode=AND", headers={"X-Client-ID": str(client_id)})
    assert resp_and.status_code == 200
    data_and = resp_and.json()
    assert data_and["total"] == 1
    assert data_and["items"][0]["name"] == "Lead VIP e Quente"

    # 3. Testar com exclude_tag: filtrar VIP mas excluir quem tem Lead Quente (L2)
    resp_exc = client.get("/api/leads?tag=VIP&exclude_tag=Lead+Quente", headers={"X-Client-ID": str(client_id)})
    assert resp_exc.status_code == 200
    data_exc = resp_exc.json()
    assert data_exc["total"] == 1
    assert data_exc["items"][0]["name"] == "Lead Apenas VIP"

    # 4. Testar escape de '_' (underscore) no SQL: tag 'aryaraj, hokage' não deve casar com exclude_tag 'aryaraj_hokage'
    lead_a = models.WebhookLead(
        client_id=client_id,
        name="Aryaraj Fernandes",
        phone="5585999990001",
        tags="aryaraj, hokage"
    )
    lead_b = models.WebhookLead(
        client_id=client_id,
        name="Douglas Lundy",
        phone="5585999990002",
        tags="aryaraj"
    )
    lead_c = models.WebhookLead(
        client_id=client_id,
        name="Lead Excluido",
        phone="5585999990003",
        tags="aryaraj, aryaraj_hokage"
    )
    db_session.add_all([lead_a, lead_b, lead_c])
    db_session.commit()

    resp_underscore = client.get("/api/leads?tag=aryaraj&exclude_tag=aryaraj_hokage", headers={"X-Client-ID": str(client_id)})
    assert resp_underscore.status_code == 200
    data_und = resp_underscore.json()
    names_und = [item["name"] for item in data_und["items"]]
    assert "Aryaraj Fernandes" in names_und
    assert "Douglas Lundy" in names_und
    assert "Lead Excluido" not in names_und

    app.dependency_overrides.clear()

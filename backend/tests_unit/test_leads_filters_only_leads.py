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

# Banco de testes em memória
TEST_DATABASE_URL = "sqlite:///./test_filters_leads.db"
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
        if os.path.exists("./test_filters_leads.db"):
            os.remove("./test_filters_leads.db")

def test_get_lead_filters_only_leads(db_session):
    # Setup mock dependencies
    client_id = 999
    
    # 1. Popular banco de dados com cliente
    test_client = models.Client(id=client_id, name="Test Filter Client")
    db_session.add(test_client)
    db_session.commit()

    # 2. Popular banco de dados com contatos (leads) contendo tags
    lead1 = models.WebhookLead(
        client_id=client_id,
        phone="5511999992222",
        name="Lead One",
        email="lead1@test.com",
        tags="TAG_DO_CONTATO",
        total_events=1,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db_session.add(lead1)
    db_session.commit()

    # 3. Popular banco de dados com mapeamento de webhook contendo tags de integração
    import uuid
    integration_id_uuid = uuid.UUID('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d')
    integration = models.WebhookIntegration(
        id=integration_id_uuid,
        client_id=client_id,
        name="Integration Mock",
        platform="hotmart",
        custom_slug="mock-slug"
    )
    db_session.add(integration)
    db_session.commit()

    mapping = models.WebhookEventMapping(
        integration_id=integration_id_uuid,
        event_type="purchase_approved",
        internal_tags="TAG_DA_INTEGRACAO"
    )
    db_session.add(mapping)
    db_session.commit()

    # Sobrescrever dependências do FastAPI
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    # Mock de usuário autenticado
    mock_user = models.User(
        id=123,
        email="admin@test.com",
        role="premium",
        client_id=client_id
    )
    def override_get_current_user():
        return mock_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    # Teste 1: only_leads = False (Padrão) - Deve retornar ambas as tags
    client = TestClient(app)
    response = client.get("/api/leads/filters?only_leads=false", headers={"X-Client-ID": str(client_id)})
    assert response.status_code == 200
    data = response.json()
    assert "TAG_DO_CONTATO" in data["tags"]
    assert "TAG_DA_INTEGRACAO" in data["tags"]

    # Teste 2: only_leads = True - Deve retornar apenas a tag do contato
    response = client.get("/api/leads/filters?only_leads=true", headers={"X-Client-ID": str(client_id)})
    assert response.status_code == 200
    data = response.json()
    assert "TAG_DO_CONTATO" in data["tags"]
    assert "TAG_DA_INTEGRACAO" not in data["tags"]

    # Limpar overrides
    app.dependency_overrides.clear()

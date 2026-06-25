import pytest
import os
import sys
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# Garante que o diretório backend está no path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import models
from database import Base
from routers.leads import list_leads, get_lead_filters

# Configuração do banco de testes (SQLite em memória)
TEST_DATABASE_URL = "sqlite://"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=models.StaticPool if hasattr(models, 'StaticPool') else None)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    # Cria as tabelas
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def mock_user():
    return models.User(id=1, email="test@example.com", role="admin", client_id=1)

def test_list_leads_filter_by_tag(db: Session, mock_user: models.User):
    # 1. Create a few leads with different tags
    lead1 = models.WebhookLead(
        client_id=1,
        name="Lead Tag A",
        phone="5511999999991",
        tags="tag_a, global_tag"
    )
    lead2 = models.WebhookLead(
        client_id=1,
        name="Lead Tag B",
        phone="5511999999992",
        tags="tag_b, global_tag"
    )
    db.add(lead1)
    db.add(lead2)
    db.commit()

    # 2. Test filter by tag_a
    # We call the router function directly to avoid TestClient overhead and auth complexity
    result = list_leads(
        tag="tag_a",
        x_client_id=1,
        db=db,
        current_user=mock_user
    )
    assert result["total"] == 1
    assert result["items"][0].name == "Lead Tag A"

    # 3. Test filter by global_tag
    result = list_leads(
        tag="global_tag",
        x_client_id=1,
        db=db,
        current_user=mock_user
    )
    assert result["total"] == 2

    # 4. Test filter by non-existent tag
    result = list_leads(
        tag="non_existent",
        x_client_id=1,
        db=db,
        current_user=mock_user
    )
    assert result["total"] == 0

def test_get_lead_filters_includes_tags(db: Session, mock_user: models.User):
    # Create leads with tags
    lead1 = models.WebhookLead(client_id=1, name="L1", phone="1", tags="alpha, beta")
    lead2 = models.WebhookLead(client_id=1, name="L2", phone="2", tags="beta, gamma")
    db.add_all([lead1, lead2])
    
    # Create integration and event mapping with tags
    integration = models.WebhookIntegration(id=uuid.UUID("12345678-1234-5678-1234-567812345678"), client_id=1, name="Test Integration", platform="hotmart")
    db.add(integration)
    db.flush()
    
    mapping = models.WebhookEventMapping(
        integration_id=integration.id,
        event_type="purchase_approved",
        internal_tags="delta, epsilon, alpha" # 'alpha' is duplicate to check deduplication
    )
    db.add(mapping)
    db.commit()

    result = get_lead_filters(
        x_client_id=1,
        db=db,
        current_user=mock_user
    )
    assert "tags" in result
    assert set(result["tags"]) == {"alpha", "beta", "gamma", "delta", "epsilon"}

def test_list_leads_filter_by_multiple_tags_and_or(db: Session, mock_user: models.User):
    # 1. Create a few leads with different combinations of tags
    lead1 = models.WebhookLead(
        client_id=1,
        name="Lead 1",
        phone="5511999999991",
        tags="tag_a, tag_b"
    )
    lead2 = models.WebhookLead(
        client_id=1,
        name="Lead 2",
        phone="5511999999992",
        tags="tag_a, tag_c"
    )
    db.add_all([lead1, lead2])
    db.commit()

    # 2. Test OR filter (default)
    result = list_leads(
        tag=["tag_b", "tag_c"],
        tag_mode="OR",
        x_client_id=1,
        db=db,
        current_user=mock_user
    )
    assert result["total"] == 2

    # 3. Test AND filter
    result = list_leads(
        tag=["tag_a", "tag_b"],
        tag_mode="AND",
        x_client_id=1,
        db=db,
        current_user=mock_user
    )
    assert result["total"] == 1
    assert result["items"][0].name == "Lead 1"

    # 4. Test AND filter with tag_b and tag_c (none matches both)
    result = list_leads(
        tag=["tag_b", "tag_c"],
        tag_mode="AND",
        x_client_id=1,
        db=db,
        current_user=mock_user
    )
    assert result["total"] == 0

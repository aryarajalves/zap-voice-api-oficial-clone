import pytest
import os
import sys
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import models
from database import Base
from routers.leads_import import bulk_create_leads, BulkCreateLeadsRequest, LeadBatchItem

TEST_DATABASE_URL = "sqlite://"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
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

def test_bulk_create_leads_success(db, mock_user):
    request = BulkCreateLeadsRequest(
        leads=[
            LeadBatchItem(phone="5585999999999", name="Maria Teste", email="maria@teste.com"),
            LeadBatchItem(phone="5585888888888", name="João Teste", email="joao@teste.com")
        ],
        tags="lead_importado, excel"
    )
    
    response = bulk_create_leads(
        request=request,
        x_client_id=1,
        db=db,
        current_user=mock_user
    )
    
    assert response["status"] == "success"
    assert response["imported"] == 2
    
    # Verificar se foram inseridos no banco de dados
    leads = db.query(models.WebhookLead).filter(models.WebhookLead.client_id == 1).all()
    assert len(leads) == 2
    
    maria = db.query(models.WebhookLead).filter(models.WebhookLead.phone == "5585999999999").first()
    assert maria is not None
    assert maria.name == "Maria Teste"
    assert maria.email == "maria@teste.com"
    assert "lead_importado" in maria.tags
    assert "excel" in maria.tags

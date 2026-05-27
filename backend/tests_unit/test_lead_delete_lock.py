import pytest
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from fastapi import HTTPException

# Garante que o diretório backend está no path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import models
from database import Base
from routers.leads import delete_lead, bulk_delete_leads, BulkDeleteRequest

# Configuração do banco de testes (SQLite em memória)
TEST_DATABASE_URL = "sqlite://"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
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

def test_delete_locked_lead_raises_exception(db: Session, mock_user: models.User):
    # 1. Criar um lead bloqueado (is_locked=True)
    locked_lead = models.WebhookLead(
        client_id=1,
        name="Lead Bloqueado",
        phone="5511999999991",
        is_locked=True
    )
    # 2. Criar um lead normal (is_locked=False)
    normal_lead = models.WebhookLead(
        client_id=1,
        name="Lead Normal",
        phone="5511999999992",
        is_locked=False
    )
    db.add_all([locked_lead, normal_lead])
    db.commit()
    db.refresh(locked_lead)
    db.refresh(normal_lead)

    # Testar que tentar deletar o lead bloqueado lança HTTPException com status code 403
    with pytest.raises(HTTPException) as exc_info:
        delete_lead(
            lead_id=locked_lead.id,
            x_client_id=1,
            db=db,
            current_user=mock_user
        )
    assert exc_info.value.status_code == 403
    assert "bloqueado" in exc_info.value.detail

    # Testar que o lead normal pode ser deletado normalmente
    res = delete_lead(
        lead_id=normal_lead.id,
        x_client_id=1,
        db=db,
        current_user=mock_user
    )
    assert res["status"] == "success"
    
    # Validar no banco que o bloqueado continua e o normal foi excluído
    assert db.query(models.WebhookLead).filter(models.WebhookLead.id == locked_lead.id).first() is not None
    assert db.query(models.WebhookLead).filter(models.WebhookLead.id == normal_lead.id).first() is None


def test_bulk_delete_locked_lead_skips_locked(db: Session, mock_user: models.User):
    # 1. Criar um lead bloqueado e um normal
    locked_lead = models.WebhookLead(
        client_id=1,
        name="Lead Bloqueado Bulk",
        phone="5511999999993",
        is_locked=True
    )
    normal_lead = models.WebhookLead(
        client_id=1,
        name="Lead Normal Bulk",
        phone="5511999999994",
        is_locked=False
    )
    db.add_all([locked_lead, normal_lead])
    db.commit()
    db.refresh(locked_lead)
    db.refresh(normal_lead)

    req = BulkDeleteRequest(lead_ids=[locked_lead.id, normal_lead.id])
    
    # Executar bulk-delete
    res = bulk_delete_leads(
        request=req,
        x_client_id=1,
        db=db,
        current_user=mock_user
    )
    
    assert res["status"] == "success"
    assert res["deleted_count"] == 1
    assert res["skipped_locked"] == 1
    
    # Validar no banco
    assert db.query(models.WebhookLead).filter(models.WebhookLead.id == locked_lead.id).first() is not None
    assert db.query(models.WebhookLead).filter(models.WebhookLead.id == normal_lead.id).first() is None

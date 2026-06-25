import pytest
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
import uuid

# Garante que o diretório backend está no path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import models
from database import Base
from services.leads import upsert_webhook_lead

# Configuração do banco de testes
TEST_DATABASE_URL = "sqlite:///./test_webhook_origin.db"
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
        engine.dispose()
        if os.path.exists("./test_webhook_origin.db"):
            os.remove("./test_webhook_origin.db")

def test_webhook_origin_metadata_saving(db: Session):
    # 1. Criar cliente
    client = models.Client(name="Webhook Origin Client")
    db.add(client)
    db.commit()
    db.refresh(client)

    # 2. Dados com metadados do webhook
    parsed_data = {
        "name": "Arya Stark",
        "phone": "5511999991234",
        "email": "arya@winterfell.com",
        "event_type": "form_submission",
        "created_by_webhook": True,
        "webhook_name": "Elementor Landing Page"
    }

    # 3. Upsert
    lead = upsert_webhook_lead(db, client.id, "elementor", parsed_data)

    # 4. Asserts
    assert lead is not None
    assert lead.variables is not None
    assert lead.variables.get("created_by_webhook") is True
    assert lead.variables.get("webhook_name") == "Elementor Landing Page"

    # 5. Atualizar os mesmos dados com outro nome de webhook
    parsed_data_update = {
        "name": "Arya Stark",
        "phone": "5511999991234",
        "email": "arya@winterfell.com",
        "event_type": "purchase",
        "created_by_webhook": True,
        "webhook_name": "Hotmart Vendas"
    }
    lead_updated = upsert_webhook_lead(db, client.id, "hotmart", parsed_data_update)

    assert lead_updated.variables.get("created_by_webhook") is True
    assert lead_updated.variables.get("webhook_name") == "Hotmart Vendas"

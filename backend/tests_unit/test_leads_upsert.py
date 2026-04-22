import pytest
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from datetime import datetime, timezone
import uuid

# Garante que o diretório backend está no path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import models
from database import Base
from routers.webhooks_public import parse_webhook_payload
from services.leads import upsert_webhook_lead

# Configuração do banco de testes (SQLite em memória ou arquivo local)
TEST_DATABASE_URL = "sqlite:///./test_leads.db"
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
        # Limpa após o teste
        Base.metadata.drop_all(bind=engine)
        if os.path.exists("./test_leads.db"):
            os.remove("./test_leads.db")

def test_lead_upsert_logic(db: Session):
    # 1. Create a dummy client and integration
    client = models.Client(name="Test Client")
    db.add(client)
    db.commit()
    db.refresh(client)

    integration = models.WebhookIntegration(
        id=uuid.uuid4(),
        client_id=client.id,
        name="Hotmart Test",
        platform="hotmart",
        status="active"
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)

    # 2. Simulate first webhook hit (Boleto Impresso)
    payload_1 = {
        "event": "PURCHASE_BILLET_PRINTED",
        "data": {
            "buyer": {
                "name": "João Silva",
                "email": "joao@example.com",
                "checkout_phone": "5511999998888"
            },
            "product": {"name": "Curso de Python"},
            "purchase": {"payment": {"type": "BILLET"}, "status": "WAITING_PAYMENT"}
        }
    }
    
    parsed_1 = parse_webhook_payload("hotmart", payload_1)
    
    # Use the real service
    lead_1 = upsert_webhook_lead(db, integration.client_id, integration.platform, parsed_1)
    
    assert lead_1.phone == "5511999998888"
    assert lead_1.name == "João Silva"
    assert lead_1.total_events == 1
    assert lead_1.last_event_type == "boleto_impresso"

    # 3. Segunda hit (Compra Aprovada)
    payload_2 = {
        "event": "PURCHASE_APPROVED",
        "data": {
            "buyer": {
                "name": "João Silva",
                "email": "joao@example.com",
                "checkout_phone": "5511999998888"
            },
            "product": {"name": "Curso de Python"},
            "purchase": {"payment": {"type": "CREDIT_CARD"}, "status": "APPROVED"}
        }
    }
    
    parsed_2 = parse_webhook_payload("hotmart", payload_2)
    lead_2 = upsert_webhook_lead(db, integration.client_id, integration.platform, parsed_2)
    
    # Assert
    assert db.query(models.WebhookLead).count() == 1
    assert lead_2.total_events == 2
    assert lead_2.last_event_type == "compra_aprovada"

    print("\n✅ Teste de Upsert de Lead concluído com sucesso!")

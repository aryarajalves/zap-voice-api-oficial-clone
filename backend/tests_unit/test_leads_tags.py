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
TEST_DATABASE_URL = "sqlite:///./test_tags.db"
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
        if os.path.exists("./test_tags.db"):
            os.remove("./test_tags.db")

def test_lead_tags_accumulation(db: Session):
    # 1. Create a dummy client
    client = models.Client(id=1, name="Test Client")
    db.add(client)
    db.commit()
    db.refresh(client)

    # 2. Simulate first event with Tag A
    parsed_1 = {
        "phone": "5511999991111",
        "name": "User One",
        "email": "user1@example.com",
        "event_type": "event_1"
    }
    
    lead = upsert_webhook_lead(db, client.id, "generic", parsed_1, tag="Tag_A")
    
    assert lead.tags == "Tag_A"
    assert lead.total_events == 1

    # 3. Simulate second event with Tag B
    parsed_2 = {
        "phone": "5511999991111",
        "name": "User One",
        "email": "user1@example.com",
        "event_type": "event_2"
    }
    
    lead = upsert_webhook_lead(db, client.id, "generic", parsed_2, tag="Tag_B")
    
    # Should accumulate unique tags
    assert "Tag_A" in lead.tags
    assert "Tag_B" in lead.tags
    assert lead.total_events == 2

    # 4. Simulate third event with duplicate Tag A
    lead = upsert_webhook_lead(db, client.id, "generic", parsed_2, tag="Tag_A")
    
    # Should not duplicate Tag A
    tags_list = [t.strip() for t in lead.tags.split(",")]
    assert len(tags_list) == 2
    assert "Tag_A" in tags_list
    assert "Tag_B" in tags_list
    assert lead.total_events == 3

    print("\n✅ Teste de Acúmulo de Etiquetas concluído com sucesso!")

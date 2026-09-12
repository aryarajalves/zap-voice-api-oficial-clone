import pytest
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import models
from database import Base
from routers.leads.crud_routes import check_contacts_tags_info

TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    db_session = TestingSessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()
        Base.metadata.drop_all(bind=engine)

def test_check_contacts_tags_info(db: Session):
    # 1. Cria o cliente
    client = models.Client(id=1, name="Cliente Teste")
    db.add(client)
    db.commit()

    # 2. Cria contatos com tags e sem tags
    lead1 = models.WebhookLead(
        client_id=1,
        phone="5535984297193",
        name="Douglas",
        tags="aryaraj, vip"
    )
    lead2 = models.WebhookLead(
        client_id=1,
        phone="5511984913214",
        name="Lead Sem Tag",
        tags=None
    )
    db.add_all([lead1, lead2])
    db.commit()

    # 3. Executa a função check_contacts_tags_info
    payload = {
        "phones": [
            "5535984297193",
            "5511984913214",
            "5511999999999" # Não cadastrado
        ]
    }
    dummy_user = models.User(id=1, email="test@example.com")
    res = check_contacts_tags_info(payload, client_id=1, db=db, current_user=dummy_user)

    # 4. Validações
    assert "5535984297193" in res
    assert res["5535984297193"]["is_registered"] is True
    assert res["5535984297193"]["name"] == "Douglas"
    assert "aryaraj" in res["5535984297193"]["tags"]
    assert "vip" in res["5535984297193"]["tags"]

    assert "5511984913214" in res
    assert res["5511984913214"]["is_registered"] is True
    assert res["5511984913214"]["tags"] == []

    assert "5511999999999" in res
    assert res["5511999999999"]["is_registered"] is False
    assert res["5511999999999"]["tags"] == []

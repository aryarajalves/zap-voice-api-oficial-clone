import pytest
import os
import sys
import re
from datetime import datetime, timezone, timedelta

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from database import Base
import models
from routers.leads import clean_corrupted_tags

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)

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
def client_obj(db):
    c = models.Client(name="LeadDedupTestClient")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

@pytest.fixture
def user_obj(db, client_obj):
    u = models.User(
        email="test_dedup@zapvoice.com",
        hashed_password="123",
        is_active=True,
        client_id=client_obj.id,
        role="super_admin"
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u

def test_clean_corrupted_tags_deduplication(db, client_obj, user_obj):
    # Criar contatos de teste duplicados com o mesmo telefone
    # Lead 1: Mais antigo, com menos tags, nome incorreto mojibake
    lead1 = models.WebhookLead(
        client_id=client_obj.id,
        name="Jose MÃ©rio",
        phone="5511999999999",
        email="jose.mario@gmail.com",
        tags="tag_antiga, tag-corrompida/",
        total_events=1,
        created_at=datetime.now(timezone.utc) - timedelta(days=2)
    )
    # Lead 2: Mais recente, com nome correto e mais longo, outra tag, variables JSON
    lead2 = models.WebhookLead(
        client_id=client_obj.id,
        name="Jose Mario Da Silva",
        phone="5511999999999",
        email=None,
        tags="tag_nova",
        total_events=3,
        variables={"source": "facebook", "campaign": "promo"},
        created_at=datetime.now(timezone.utc) - timedelta(days=1)
    )
    # Lead 3: Outro duplicado, com email diferente, sem nome, outra tag
    lead3 = models.WebhookLead(
        client_id=client_obj.id,
        name=None,
        phone="5511999999999",
        email="jose.mario.silva@gmail.com",
        tags="tag_nova, tag_especial",
        total_events=2,
        variables={"campaign": "promo2"},
        created_at=datetime.now(timezone.utc)
    )
    
    # Lead 4: Outro contato (não duplicado)
    lead_other = models.WebhookLead(
        client_id=client_obj.id,
        name="Ana Costa",
        phone="5511888888888",
        tags="lead_outro",
        total_events=1,
        created_at=datetime.now(timezone.utc)
    )
    
    db.add_all([lead1, lead2, lead3, lead_other])
    db.commit()
    
    # Chama a rota diretamente
    res = clean_corrupted_tags(x_client_id=client_obj.id, db=db, current_user=user_obj)
    
    assert res["status"] == "success"
    assert res["leads_merged"] == 2
    
    # Valida no banco que restaram apenas 2 leads no total para esse cliente
    all_leads = db.query(models.WebhookLead).filter_by(client_id=client_obj.id).all()
    assert len(all_leads) == 2
    
    # Acha o principal
    principal = db.query(models.WebhookLead).filter_by(phone="5511999999999").first()
    assert principal is not None
    
    # Verifica dados unificados no principal:
    # 1. Nome normalizado e do mais longo/completo: "Jose Mario Da Silva" -> "Jose Mario Da Silva"
    assert principal.name == "Jose Mario Da Silva"
    # 2. Email preenchido (não nulo)
    assert principal.email in ["jose.mario@gmail.com", "jose.mario.silva@gmail.com"]
    # 3. Tags agregadas sem duplicidades e sem tags corrompidas (a tag-corrompida/ com barra foi removida)
    tags_list = [t.strip() for t in principal.tags.split(",")]
    assert "tag_antiga" in tags_list
    assert "tag_nova" in tags_list
    assert "tag_especial" in tags_list
    assert "tag-corrompida/" not in tags_list
    
    # 4. total_events somado: 1 (lead1) + 3 (lead2) + 2 (lead3) = 6
    assert principal.total_events == 6
    
    # 5. variables mescladas
    assert principal.variables.get("source") == "facebook"
    assert principal.variables.get("campaign") == "promo2"

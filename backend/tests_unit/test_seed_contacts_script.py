import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
from scripts.seed_10k_contacts import seed_contacts

@pytest.fixture
def standalone_db():
    db_file = "test_temp_seed_script.db"
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass

    engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
    models.Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    c = models.Client(id=99, name="Cliente Teste Seed")
    db.add(c)
    db.commit()

    yield db

    db.close()
    engine.dispose()
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass

def test_seed_contacts_logic(standalone_db):
    success = seed_contacts(count=25, client_identifier="Cliente Teste Seed", db=standalone_db)
    assert success is True

    # Verifica se as 25 conversas foram inseridas
    created_convos = standalone_db.query(models.ChatConversation).filter_by(client_id=99).all()
    assert len(created_convos) == 25

    # Verifica se as mensagens correspondentes foram geradas
    convo_ids = [c.id for c in created_convos]
    created_msgs = standalone_db.query(models.ChatMessage).filter(models.ChatMessage.conversation_id.in_(convo_ids)).all()
    assert len(created_msgs) == 25

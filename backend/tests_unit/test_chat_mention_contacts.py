import pytest
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import models
from routers.chat.notes_and_labels_routes import list_mention_contacts

mock_user = models.User(id=1, email="test@test.com", client_id=1, is_active=True)

@pytest.fixture
def db_session():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    db_file = "test_temp_mentions.db"
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass
            
    engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
    models.Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    yield db
    
    db.close()
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass

@pytest.mark.asyncio
async def test_list_mention_contacts_deduplication_and_normalization(db_session):
    # Inserir conversa existente com 9 dígitos
    c1 = models.ChatConversation(id=870, client_id=1, contact_name="Aryaraj", phone="5585996123586", status="open")
    c2 = models.ChatConversation(id=871, client_id=1, contact_name="Bruno Castro", phone="5511999990001", status="open")
    # Outro client_id para garantir isolamento
    c_other = models.ChatConversation(id=999, client_id=2, contact_name="Aryaraj Outro Cliente", phone="5585996123586", status="open")

    db_session.add_all([c1, c2, c_other])
    db_session.commit()

    # Teste de busca por nome "Aryaraj" garantindo isolamento por client_id=1 e desduplicação
    result = await list_mention_contacts(
        search="aryaraj",
        page=1,
        limit=20,
        client_id=1,
        current_user=mock_user,
        db=db_session
    )

    assert result["total"] == 1
    assert len(result["items"]) == 1
    assert result["items"][0]["contact_name"] == "Aryaraj"
    assert result["items"][0]["id"] == 870

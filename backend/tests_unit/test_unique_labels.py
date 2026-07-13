import pytest
from sqlalchemy.orm import Session
import models
from database import SessionLocal

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_unique_labels_validation(db_session: Session):
    # 1. Configurar cliente e conversa de teste
    client = db_session.query(models.Client).first()
    if not client:
        client = models.Client(name="Cliente Teste Etiquetas")
        db_session.add(client)
        db_session.commit()
        db_session.refresh(client)
        
    client_id = client.id

    convo = models.ChatConversation(
        client_id=client_id,
        phone="5511988888888",
        contact_name="Contato Etiquetas",
        status="open",
        labels=["whatsapp", "robo", "whatsapp", "WhatsApp", "24-horas"]
    )
    
    db_session.add(convo)
    db_session.commit()
    db_session.refresh(convo)

    # Verificar que as etiquetas foram salvas de forma deduplicada preservando o casing da primeira ocorrência
    assert len(convo.labels) == 3
    assert convo.labels == ["whatsapp", "robo", "24-horas"]

    # Testar atualização
    convo.labels = ["robo", "Robo", "suporte", "SUPORTE", "whatsapp"]
    db_session.commit()
    db_session.refresh(convo)

    assert len(convo.labels) == 3
    assert convo.labels == ["robo", "suporte", "whatsapp"]

    # Limpar banco de teste
    db_session.delete(convo)
    db_session.commit()

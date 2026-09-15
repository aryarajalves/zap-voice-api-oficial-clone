import pytest
import sys
import os
from datetime import datetime, timedelta, timezone

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
from routers.leads.query_routes import list_leads

def setup_db():
    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    # Criar cliente
    client = models.Client(id=1, name="Cliente Teste")
    db.add(client)
    db.commit()

    now = datetime.now(timezone.utc)

    # Lead 1: interagiu há 2 dias (dentro de 7 dias)
    lead1 = models.WebhookLead(
        id=101,
        client_id=1,
        name="Contato Recente",
        phone="5511999990001",
        email="recente@test.com"
    )
    convo1 = models.ChatConversation(
        id=201,
        client_id=1,
        phone="5511999990001",
        status="open",
        last_contact_message_at=now - timedelta(days=2)
    )

    # Lead 2: interagiu há 20 dias (fora de 7 e 14 dias, dentro de 30 dias)
    lead2 = models.WebhookLead(
        id=102,
        client_id=1,
        name="Contato Antigo",
        phone="5511999990002",
        email="antigo@test.com"
    )
    convo2 = models.ChatConversation(
        id=202,
        client_id=1,
        phone="5511999990002",
        status="open",
        last_contact_message_at=now - timedelta(days=20)
    )

    # Lead 3: nunca interagiu (sem conversa ou last_contact_message_at = None)
    lead3 = models.WebhookLead(
        id=103,
        client_id=1,
        name="Contato Sem Resposta",
        phone="5511999990003",
        email="semresposta@test.com"
    )
    convo3 = models.ChatConversation(
        id=203,
        client_id=1,
        phone="5511999990003",
        status="open",
        last_contact_message_at=None
    )

    # Lead 4: nunca teve nem conversa aberta
    lead4 = models.WebhookLead(
        id=104,
        client_id=1,
        name="Contato Virgem",
        phone="5511999990004",
        email="virgem@test.com"
    )

    db.add_all([lead1, lead2, lead3, lead4, convo1, convo2, convo3])
    db.commit()

    return db, client


def test_interaction_filter_all():
    db, client = setup_db()
    mock_user = models.User(id=1, email="admin@test.com", role="super_admin")

    res = list_leads(skip=0, limit=50, client_id=1, db=db, current_user=mock_user)
    assert res["total"] == 4
    db.close()


def test_interaction_filter_any():
    db, client = setup_db()
    mock_user = models.User(id=1, email="admin@test.com", role="super_admin")

    # Apenas contatos que já interagiram alguma vez (Lead 1 e Lead 2)
    res = list_leads(skip=0, limit=50, interaction_preset="any", client_id=1, db=db, current_user=mock_user)
    assert res["total"] == 2
    phones = {item.phone for item in res["items"]}
    assert phones == {"5511999990001", "5511999990002"}
    db.close()


def test_interaction_filter_never():
    db, client = setup_db()
    mock_user = models.User(id=1, email="admin@test.com", role="super_admin")

    # Apenas contatos que NUNCA interagiram (Lead 3 e Lead 4)
    res = list_leads(skip=0, limit=50, interaction_preset="never", client_id=1, db=db, current_user=mock_user)
    assert res["total"] == 2
    phones = {item.phone for item in res["items"]}
    assert phones == {"5511999990003", "5511999990004"}
    db.close()


def test_interaction_filter_last7():
    db, client = setup_db()
    mock_user = models.User(id=1, email="admin@test.com", role="super_admin")

    # Apenas contatos que interagiram nos últimos 7 dias (apenas Lead 1)
    res = list_leads(skip=0, limit=50, interaction_preset="last7", client_id=1, db=db, current_user=mock_user)
    assert res["total"] == 1
    assert res["items"][0].phone == "5511999990001"
    assert res["items"][0].last_interaction_at is not None
    db.close()


def test_interaction_filter_last30():
    db, client = setup_db()
    mock_user = models.User(id=1, email="admin@test.com", role="super_admin")

    # Contatos nos últimos 30 dias (Lead 1 e Lead 2)
    res = list_leads(skip=0, limit=50, interaction_preset="last30", client_id=1, db=db, current_user=mock_user)
    assert res["total"] == 2
    phones = {item.phone for item in res["items"]}
    assert phones == {"5511999990001", "5511999990002"}
    db.close()

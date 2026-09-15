import pytest
import sys
import os

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

    client = models.Client(id=1, name="Cliente Teste")
    db.add(client)
    db.commit()

    # Lead Bloqueado
    lead_blocked = models.WebhookLead(
        id=1,
        client_id=1,
        name="Lead Bloqueado",
        phone="5511999990001",
        email="blocked@test.com"
    )
    # Registro de bloqueio
    blocked_contact = models.BlockedContact(
        client_id=1,
        phone="5511999990001"
    )

    # Lead Livre (Não Bloqueado)
    lead_unblocked = models.WebhookLead(
        id=2,
        client_id=1,
        name="Lead Livre",
        phone="5511999990002",
        email="free@test.com"
    )

    db.add_all([lead_blocked, blocked_contact, lead_unblocked])
    db.commit()
    return db


def test_filter_unblocked_leads():
    db = setup_db()

    # Filtra por unblocked
    res = list_leads(
        db=db,
        client_id=1,
        block_status="unblocked"
    )

    items = res.get("items", [])
    phones = [item.phone for item in items]

    assert "5511999990002" in phones
    assert "5511999990001" not in phones
    assert len(items) == 1


def test_filter_blocked_leads():
    db = setup_db()

    # Filtra por blocked
    res = list_leads(
        db=db,
        client_id=1,
        block_status="blocked"
    )

    items = res.get("items", [])
    phones = [item.phone for item in items]

    assert "5511999990001" in phones
    assert "5511999990002" not in phones
    assert len(items) == 1

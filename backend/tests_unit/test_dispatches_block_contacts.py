import pytest
import uuid
from datetime import datetime, timezone
import models
from main import app
from routers.webhooks.dispatches import get_db as dispatches_get_db
from services.blocked_contacts_service import (
    is_contact_blocked,
    get_blocked_phone_suffixes,
    is_phone_in_blocked_suffixes
)
from core.security import create_access_token

def test_blocked_contacts_service_suffix_matching(db_session):
    client = models.Client(name="Client Block Test")
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)

    # Add a blocked contact with phone "5511988887777"
    blocked = models.BlockedContact(
        client_id=client.id,
        phone="5511988887777",
        name="Spammer",
        reason="Erro Meta 131026"
    )
    db_session.add(blocked)
    db_session.commit()

    # Exact match
    assert is_contact_blocked(db_session, client.id, "5511988887777") is True
    # Formatted match (same suffix)
    assert is_contact_blocked(db_session, client.id, "+55 (11) 98888-7777") is True
    assert is_contact_blocked(db_session, client.id, "11988887777") is True
    # Different phone
    assert is_contact_blocked(db_session, client.id, "5511911112222") is False

    suffixes = get_blocked_phone_suffixes(db_session, client.id)
    assert "88887777" in suffixes
    assert is_phone_in_blocked_suffixes("5511988887777", suffixes) is True
    assert is_phone_in_blocked_suffixes("5511911112222", suffixes) is False

def test_list_dispatches_annotates_blocked_contact(client, db_session):
    app.dependency_overrides[dispatches_get_db] = lambda: db_session
    try:
        test_client = models.Client(name="Client List Block Test")
        db_session.add(test_client)
        db_session.commit()
        db_session.refresh(test_client)

        user = models.User(email="admin_list@test.com", role="super_admin", client_id=test_client.id)
        db_session.add(user)

        integration = models.WebhookIntegration(
            id=uuid.uuid4(),
            client_id=test_client.id,
            name="Integration Block Test",
            platform="hotmart",
            status="active"
        )
        db_session.add(integration)

        # Contact 1: blocked
        blocked = models.BlockedContact(
            client_id=test_client.id,
            phone="5511999990001",
            name="Blocked User",
            reason="Falha"
        )
        db_session.add(blocked)

        # Trigger 1 for blocked contact
        t1 = models.ScheduledTrigger(
            client_id=test_client.id,
            integration_id=integration.id,
            event_type="order_approved",
            scheduled_time=datetime.now(timezone.utc),
            status="failed",
            contact_phone="5511999990001",
            failure_reason="Erro Meta 131026"
        )
        # Trigger 2 for clean contact
        t2 = models.ScheduledTrigger(
            client_id=test_client.id,
            integration_id=integration.id,
            event_type="order_approved",
            scheduled_time=datetime.now(timezone.utc),
            status="completed",
            contact_phone="5511999990002"
        )
        db_session.add(t1)
        db_session.add(t2)
        db_session.commit()

        token = create_access_token({"sub": "admin_list@test.com", "role": "super_admin"})
        headers = {
            "X-Client-ID": str(test_client.id),
            "Authorization": f"Bearer {token}"
        }

        res = client.get(f"/api/webhook-integrations/{integration.id}/dispatches", headers=headers)
        assert res.status_code == 200
        data = res.json()
        triggers = data["items"]
        assert len(triggers) == 2

        t1_resp = next(t for t in triggers if t["id"] == t1.id)
        t2_resp = next(t for t in triggers if t["id"] == t2.id)

        assert t1_resp["is_contact_blocked"] is True
        assert t2_resp["is_contact_blocked"] is False
    finally:
        app.dependency_overrides.pop(dispatches_get_db, None)

def test_play_dispatch_rejects_blocked_contact(client, db_session):
    app.dependency_overrides[dispatches_get_db] = lambda: db_session
    try:
        test_client = models.Client(name="Client Play Block Test")
        db_session.add(test_client)
        db_session.commit()
        db_session.refresh(test_client)

        user = models.User(email="admin_play@test.com", role="super_admin", client_id=test_client.id)
        db_session.add(user)

        integration = models.WebhookIntegration(
            id=uuid.uuid4(),
            client_id=test_client.id,
            name="Integration Play Test",
            platform="hotmart",
            status="active"
        )
        db_session.add(integration)

        blocked = models.BlockedContact(
            client_id=test_client.id,
            phone="5511977778888",
            name="Blocked Guy",
            reason="Blocked"
        )
        db_session.add(blocked)

        trigger = models.ScheduledTrigger(
            client_id=test_client.id,
            integration_id=integration.id,
            event_type="abandoned_cart",
            scheduled_time=datetime.now(timezone.utc),
            status="failed",
            contact_phone="5511977778888",
            failure_reason="Erro Meta 131026"
        )
        db_session.add(trigger)
        db_session.commit()

        token = create_access_token({"sub": "admin_play@test.com", "role": "super_admin"})
        headers = {
            "X-Client-ID": str(test_client.id),
            "Authorization": f"Bearer {token}"
        }

        res = client.post(f"/api/webhook-integrations/{integration.id}/dispatches/{trigger.id}/play", headers=headers)
        assert res.status_code == 400
        assert "está bloqueado na Blacklist" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(dispatches_get_db, None)

import pytest
from datetime import datetime, timezone
from models import User, Client, ChatConversation
from core.security import get_password_hash, create_access_token


def test_bulk_finish_human_handover(client, db_session):
    test_client = Client(name="Cliente Handover Bulk Test", is_active=True)
    db_session.add(test_client)
    db_session.commit()
    db_session.refresh(test_client)

    test_user = User(
        email="test_handover_bulk@example.com",
        full_name="Usuario Teste Handover",
        hashed_password=get_password_hash("password123"),
        client_id=test_client.id,
        is_active=True,
        role="admin"
    )
    test_user.accessible_clients.append(test_client)
    db_session.add(test_user)
    db_session.commit()
    db_session.refresh(test_user)

    token = create_access_token(data={"sub": test_user.email, "client_id": test_client.id})
    headers = {"Authorization": f"Bearer {token}", "X-Client-ID": str(test_client.id)}

    now = datetime.now(timezone.utc)
    c1 = ChatConversation(
        client_id=test_client.id,
        contact_name="Lead 1 Handover",
        phone="5511999990001",
        status="open",
        human_handover_at=now,
        labels=["atendimento humano"]
    )
    c2 = ChatConversation(
        client_id=test_client.id,
        contact_name="Lead 2 Handover",
        phone="5511999990002",
        status="open",
        human_handover_at=now,
        labels=["atendimento humano"]
    )
    db_session.add_all([c1, c2])
    db_session.commit()
    db_session.refresh(c1)
    db_session.refresh(c2)

    # 1. Executa finalização em lote
    res = client.post(
        "/api/chat/conversations/bulk-finish-human-handover",
        json={"ids": [c1.id, c2.id]},
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["count"] == 2

    # 2. Confirma que human_handover_at foi limpo
    db_session.refresh(c1)
    db_session.refresh(c2)
    assert c1.human_handover_at is None
    assert c2.human_handover_at is None

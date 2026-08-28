import pytest
from datetime import datetime, timedelta, timezone
from models import User, Client, ChatConversation, ChatMessage
from core.security import get_password_hash, create_access_token


def test_archive_single_conversation(client, db_session):
    test_client = Client(name="Cliente Archive Test", is_active=True)
    db_session.add(test_client)
    db_session.commit()
    db_session.refresh(test_client)

    test_user = User(
        email="test_archive@example.com",
        full_name="Usuario Teste Archive",
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
    convo = ChatConversation(
        client_id=test_client.id,
        contact_name="Lead Para Arquivar",
        phone="5511999991234",
        status="open",
        last_message_at=now
    )
    db_session.add(convo)
    db_session.commit()
    db_session.refresh(convo)

    # 1. Arquivar via POST /archive (toggle)
    res_arch = client.post(f"/api/chat/conversations/{convo.id}/archive", json={}, headers=headers)
    assert res_arch.status_code == 200
    data_arch = res_arch.json()
    assert data_arch["status"] == "ok"
    assert data_arch["conversation_status"] == "archived"
    assert data_arch["is_archived"] is True

    # Verificar no banco
    db_session.refresh(convo)
    assert convo.status == "archived"

    # 2. Desarquivar via POST /archive (toggle)
    res_unarch = client.post(f"/api/chat/conversations/{convo.id}/archive", json={}, headers=headers)
    assert res_unarch.status_code == 200
    data_unarch = res_unarch.json()
    assert data_unarch["status"] == "ok"
    assert data_unarch["conversation_status"] == "open"
    assert data_unarch["is_archived"] is False

    # 3. Forçar status via POST /status com 'archived'
    res_status = client.post(f"/api/chat/conversations/{convo.id}/status", json={"status": "archived"}, headers=headers)
    assert res_status.status_code == 200
    assert res_status.json()["conversation_status"] == "archived"


def test_bulk_archive_and_filtering(client, db_session):
    test_client = Client(name="Cliente Bulk Archive Test", is_active=True)
    db_session.add(test_client)
    db_session.commit()
    db_session.refresh(test_client)

    test_user = User(
        email="test_bulk_archive@example.com",
        full_name="Usuario Bulk Archive",
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
    c1 = ChatConversation(client_id=test_client.id, contact_name="Lead 1", phone="5511988880001", status="open", last_message_at=now)
    c2 = ChatConversation(client_id=test_client.id, contact_name="Lead 2", phone="5511988880002", status="open", last_message_at=now)
    c3 = ChatConversation(client_id=test_client.id, contact_name="Lead 3", phone="5511988880003", status="open", last_message_at=now)
    db_session.add_all([c1, c2, c3])
    db_session.commit()
    db_session.refresh(c1)
    db_session.refresh(c2)
    db_session.refresh(c3)

    # 1. Arquivar c1 e c2 em lote
    res_bulk = client.post("/api/chat/conversations/bulk-archive", json={"ids": [c1.id, c2.id], "archived": True}, headers=headers)
    assert res_bulk.status_code == 200
    assert res_bulk.json()["updated_count"] == 2
    assert res_bulk.json()["target_status"] == "archived"

    # 2. Filtrar conversas Abertas (status=open) - apenas c3 deve vir
    res_open = client.get("/api/chat/conversations?status=open", headers=headers)
    assert res_open.status_code == 200
    open_ids = [c["id"] for c in res_open.json()["conversations"]]
    assert c3.id in open_ids
    assert c1.id not in open_ids
    assert c2.id not in open_ids

    # 3. Filtrar conversas Arquivadas (status=archived) - c1 e c2 devem vir
    res_arch = client.get("/api/chat/conversations?status=archived", headers=headers)
    assert res_arch.status_code == 200
    arch_ids = [c["id"] for c in res_arch.json()["conversations"]]
    assert c1.id in arch_ids
    assert c2.id in arch_ids
    assert c3.id not in arch_ids

    # 4. Desarquivar em lote c1 e c2
    res_unarch_bulk = client.post("/api/chat/conversations/bulk-archive", json={"ids": [c1.id, c2.id], "archived": False}, headers=headers)
    assert res_unarch_bulk.status_code == 200
    assert res_unarch_bulk.json()["target_status"] == "open"

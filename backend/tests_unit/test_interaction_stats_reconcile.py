import pytest
from models import User, Client, ScheduledTrigger, MessageStatus
from core.security import get_password_hash, create_access_token
from services.triggers_service import reconcile_trigger_stats_logic
from datetime import datetime, timezone

@pytest.fixture
def client_obj(db_session):
    c = Client(name="StatsTestClient")
    db_session.add(c)
    db_session.commit()
    db_session.refresh(c)
    return c

@pytest.fixture
def test_user(db_session, client_obj):
    user = User(
        email="stats_user@test.com",
        hashed_password=get_password_hash("pass"),
        role="admin",
        is_active=True,
        client_id=client_obj.id,
    )
    user.accessible_clients.append(client_obj)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def auth_headers(test_user, client_obj):
    token = create_access_token({"sub": test_user.email, "role": test_user.role})
    return {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_obj.id),
    }

def test_interaction_stats_reconcile_and_filter(client, auth_headers, db_session, client_obj):
    # 1. Criar o trigger pai (bulk) e o trigger filho (interação)
    parent_trigger = ScheduledTrigger(
        client_id=client_obj.id,
        status="completed",
        is_bulk=True,
        scheduled_time=datetime.now(timezone.utc)
    )
    db_session.add(parent_trigger)
    db_session.commit()
    db_session.refresh(parent_trigger)

    child_trigger = ScheduledTrigger(
        client_id=client_obj.id,
        status="completed",
        parent_id=parent_trigger.id,
        is_interaction=True,
        scheduled_time=datetime.now(timezone.utc)
    )
    db_session.add(child_trigger)
    db_session.commit()
    db_session.refresh(child_trigger)

    # 2. Criar status de mensagem de interação (no trigger pai)
    msg1 = MessageStatus(
        trigger_id=parent_trigger.id,
        message_id="wamid_parent_1",
        phone_number="5585996123586",
        status="read",
        is_interaction=True,
        interaction_counted=True,
        message_type="TEMPLATE",
        timestamp=datetime.now(timezone.utc)
    )
    db_session.add(msg1)
    
    # 3. Criar status de mensagens do funil subsequentes (no trigger filho) com IDs maiores
    msg2 = MessageStatus(
        trigger_id=child_trigger.id,
        message_id="wamid_child_1",
        phone_number="5585996123586",
        status="read",
        is_interaction=False,
        interaction_counted=False,
        message_type="FREE_MESSAGE",
        timestamp=datetime.now(timezone.utc)
    )
    db_session.add(msg2)
    db_session.commit()

    # 4. Executar reconciliação no trigger pai
    import asyncio
    asyncio.run(reconcile_trigger_stats_logic(parent_trigger.id, client_obj.id, db_session))
    db_session.refresh(parent_trigger)

    # Assert: total_interactions deve ser 1
    assert parent_trigger.total_interactions == 1

    # 5. Chamar a API e validar o filtro de status 'interaction'
    resp = client.get(f"/api/triggers/{parent_trigger.id}/messages?status_filter=interaction", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["phone_number"] == "5585996123586"

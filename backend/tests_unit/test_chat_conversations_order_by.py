import pytest
from datetime import datetime, timedelta
from models import User, Client, ChatConversation, ChatMessage
from core.security import get_password_hash, create_access_token

def test_chat_conversations_ordering(client, db_session):
    # 1. Setup Client e User
    test_client = Client(name="Cliente Ordenacao Test", is_active=True)
    db_session.add(test_client)
    db_session.commit()
    db_session.refresh(test_client)

    test_user = User(
        email="test_order@example.com",
        full_name="Usuario Teste Ordem",
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

    now = datetime.utcnow()

    # 2. Criar 3 conversas com dados específicos
    # Convo A: Ana - 10 mensagens - mais antiga (3 dias atras)
    convo_a = ChatConversation(
        client_id=test_client.id,
        contact_name="Ana Carolina",
        phone="5511999990001",
        status="open",
        last_message_at=now - timedelta(days=3)
    )
    # Convo B: Bruno - 50 mensagens - intermediaria (2 dias atras)
    convo_b = ChatConversation(
        client_id=test_client.id,
        contact_name="Bruno Souza",
        phone="5511999990002",
        status="open",
        last_message_at=now - timedelta(days=2)
    )
    # Convo C: Carlos - 2 mensagens - mais recente (hoje)
    convo_c = ChatConversation(
        client_id=test_client.id,
        contact_name="Carlos Eduardo",
        phone="5511999990003",
        status="open",
        last_message_at=now
    )
    db_session.add_all([convo_a, convo_b, convo_c])
    db_session.commit()
    db_session.refresh(convo_a)
    db_session.refresh(convo_b)
    db_session.refresh(convo_c)

    # Adicionar mensagens
    msgs = []
    # 10 msgs para Ana
    for i in range(10):
        msgs.append(ChatMessage(
            conversation_id=convo_a.id,
            sender_type="user",
            content=f"msg A {i}",
            timestamp=now - timedelta(days=3)
        ))
    # 50 msgs para Bruno
    for i in range(50):
        msgs.append(ChatMessage(
            conversation_id=convo_b.id,
            sender_type="user",
            content=f"msg B {i}",
            timestamp=now - timedelta(days=2)
        ))
    # 2 msgs para Carlos
    for i in range(2):
        msgs.append(ChatMessage(
            conversation_id=convo_c.id,
            sender_type="user",
            content=f"msg C {i}",
            timestamp=now
        ))
    db_session.add_all(msgs)
    db_session.commit()

    # Teste 1: Alfabética A-Z (name_asc)
    res_asc = client.get(f"/api/chat/conversations?order_by=name_asc", headers=headers)
    assert res_asc.status_code == 200
    names_asc = [c["contact_name"] for c in res_asc.json()["conversations"]]
    assert names_asc == ["Ana Carolina", "Bruno Souza", "Carlos Eduardo"]

    # Teste 2: Alfabética Z-A (name_desc)
    res_desc = client.get(f"/api/chat/conversations?order_by=name_desc", headers=headers)
    assert res_desc.status_code == 200
    names_desc = [c["contact_name"] for c in res_desc.json()["conversations"]]
    assert names_desc == ["Carlos Eduardo", "Bruno Souza", "Ana Carolina"]

    # Teste 3: Quantidade de mensagens decrescente (messages_desc)
    res_msgs_desc = client.get(f"/api/chat/conversations?order_by=messages_desc", headers=headers)
    assert res_msgs_desc.status_code == 200
    names_msgs_desc = [c["contact_name"] for c in res_msgs_desc.json()["conversations"]]
    assert names_msgs_desc == ["Bruno Souza", "Ana Carolina", "Carlos Eduardo"]

    # Teste 4: Quantidade de mensagens crescente (messages_asc)
    res_msgs_asc = client.get(f"/api/chat/conversations?order_by=messages_asc", headers=headers)
    assert res_msgs_asc.status_code == 200
    names_msgs_asc = [c["contact_name"] for c in res_msgs_asc.json()["conversations"]]
    assert names_msgs_asc == ["Carlos Eduardo", "Ana Carolina", "Bruno Souza"]

    # Teste 5: Mais antigas (oldest)
    res_oldest = client.get(f"/api/chat/conversations?order_by=oldest", headers=headers)
    assert res_oldest.status_code == 200
    names_oldest = [c["contact_name"] for c in res_oldest.json()["conversations"]]
    assert names_oldest == ["Ana Carolina", "Bruno Souza", "Carlos Eduardo"]

    # Teste 6: Mais recentes (recent) padrão
    res_recent = client.get(f"/api/chat/conversations?order_by=recent", headers=headers)
    assert res_recent.status_code == 200
    names_recent = [c["contact_name"] for c in res_recent.json()["conversations"]]
    assert names_recent == ["Carlos Eduardo", "Bruno Souza", "Ana Carolina"]

    # Teste 7: Quando o atendente responde para Ana Carolina, ela vai para o topo de Mais Recentes
    convo_a.last_message_at = now + timedelta(minutes=10)
    convo_a.last_message_content = "Resposta do atendente para Ana"
    db_session.commit()

    res_recent_after_reply = client.get(f"/api/chat/conversations?order_by=recent", headers=headers)
    assert res_recent_after_reply.status_code == 200
    names_after_reply = [c["contact_name"] for c in res_recent_after_reply.json()["conversations"]]
    assert names_after_reply == ["Ana Carolina", "Carlos Eduardo", "Bruno Souza"]


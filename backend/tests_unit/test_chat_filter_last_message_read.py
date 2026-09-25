import pytest
import os
import sys
from datetime import datetime, timezone

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import models
from routers.chat.conversation_modules.conversation_filter_helpers import build_conversation_filter_query

mock_user = models.User(id=1, email="test@test.com", client_id=1, is_active=True)

@pytest.fixture
def db_session():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    db_file = "test_temp_filter_last_msg.db"
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


def test_filter_last_message_read_and_unread(db_session):
    client_id = 1

    # Conversa 1: Última mensagem enviada pelo atendente e LIDA (read)
    convo1 = models.ChatConversation(id=1, client_id=client_id, phone="5585911111111", status="open")
    db_session.add(convo1)
    msg1_1 = models.ChatMessage(id=101, conversation_id=1, sender_type="contact", content="Oi")
    msg1_2 = models.ChatMessage(id=102, conversation_id=1, sender_type="user", content="Tudo bem?", status="read")
    db_session.add_all([msg1_1, msg1_2])

    # Conversa 2: Última mensagem enviada pelo atendente e NÃO LIDA (delivered)
    convo2 = models.ChatConversation(id=2, client_id=client_id, phone="5585922222222", status="open")
    db_session.add(convo2)
    msg2_1 = models.ChatMessage(id=201, conversation_id=2, sender_type="contact", content="Olá")
    msg2_2 = models.ChatMessage(id=202, conversation_id=2, sender_type="user", content="Como posso ajudar?", status="delivered")
    db_session.add_all([msg2_1, msg2_2])

    # Conversa 3: Última mensagem foi enviada pelo CONTATO (não deve entrar em nenhum dos dois)
    convo3 = models.ChatConversation(id=3, client_id=client_id, phone="5585933333333", status="open")
    db_session.add(convo3)
    msg3_1 = models.ChatMessage(id=301, conversation_id=3, sender_type="user", content="Bom dia", status="read")
    msg3_2 = models.ChatMessage(id=302, conversation_id=3, sender_type="contact", content="Bom dia, quanto custa?")
    db_session.add_all([msg3_1, msg3_2])

    db_session.commit()

    # 1. Testar filtro: last_message_read_only=True
    q_read = build_conversation_filter_query(
        db=db_session,
        client_id=client_id,
        current_user=mock_user,
        last_message_read_only=True
    )
    results_read = q_read.all()
    assert len(results_read) == 1
    assert results_read[0].id == 1

    # 2. Testar filtro: last_message_unread_only=True
    q_unread = build_conversation_filter_query(
        db=db_session,
        client_id=client_id,
        current_user=mock_user,
        last_message_unread_only=True
    )
    results_unread = q_unread.all()
    assert len(results_unread) == 1
    assert results_unread[0].id == 2

import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
import models
from routers.chat import reset_24h_window


def test_reset_24h_window_endpoint(db_session: Session):
    # Criar conversa com janela de 24h ativa (última mensagem há 1 hora)
    convo = models.ChatConversation(
        client_id=1,
        phone="5511988887777",
        status="open",
        labels=["janela_24h", "cliente_vip"],
        last_contact_message_at=datetime.now(timezone.utc) - timedelta(hours=1)
    )
    db_session.add(convo)
    db_session.commit()
    db_session.refresh(convo)

    user = models.User(id=1, email="admin@test.com", full_name="Super Admin", client_id=1)

    # Executar a rota de encerramento da janela de 24h
    res = asyncio.run(reset_24h_window(
        conversation_id=convo.id,
        client_id=1,
        current_user=user,
        db=db_session
    ))

    assert res["status"] == "ok"
    assert res["conversation"]["id"] == convo.id

    # Recarregar do banco
    db_session.refresh(convo)
    assert convo.last_contact_message_at is not None

    # Garantir timezone-aware para comparação (SQLite pode retornar naive)
    last_msg = convo.last_contact_message_at
    if last_msg.tzinfo is None:
        last_msg = last_msg.replace(tzinfo=timezone.utc)

    diff = datetime.now(timezone.utc) - last_msg
    assert diff.total_seconds() > 24 * 3600, \
        f"Esperado mais de 24h atrás, mas diff foi {diff.total_seconds()/3600:.1f}h"

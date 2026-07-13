import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy.orm import Session
import models
from database import SessionLocal
from routers.chat import send_chat_message

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.mark.asyncio
@patch("routers.chat.WhatsAppClient")
async def test_send_chat_message_does_not_automatically_add_human_label(mock_wa_client_class, db_session: Session):
    """
    Testa que ao enviar uma mensagem pelo painel do chat, a etiqueta da conversa NÃO muda
    para 'humano' automaticamente, respeitando a vontade do usuário de ter essa etiqueta
    controlada apenas pelo AgentFlow ou manualmente.
    """
    from sqlalchemy import event
    from services.chat_webhook_service import after_message_insert
    try:
        event.remove(models.ChatMessage, "after_insert", after_message_insert)
    except Exception:
        pass

    # Configurar mock do WhatsAppClient para não enviar de verdade para o Facebook
    mock_wa_instance = MagicMock()
    mock_wa_instance.send_text_official = AsyncMock(return_value={"messages": [{"id": "wamid.test_outbound_123"}]})
    mock_wa_client_class.return_value = mock_wa_instance

    # 1. Configurar cliente e conversa
    client = db_session.query(models.Client).first()
    if not client:
        client = models.Client(name="Cliente Teste Handover")
        db_session.add(client)
        db_session.commit()
        db_session.refresh(client)
        
    client_id = client.id

    phone_test = "5511999991111"
    db_session.query(models.ChatConversation).filter(
        models.ChatConversation.client_id == client_id,
        models.ChatConversation.phone == phone_test
    ).delete()

    # Criar conversa com a etiqueta 'robo' e 'whatsApp' e janela de 24h ativa
    from datetime import datetime, timezone, timedelta
    convo = models.ChatConversation(
        client_id=client_id,
        phone=phone_test,
        contact_name="Contato Auto Label Test",
        status="open",
        labels=["whatsApp", "robo"],
        last_contact_message_at=datetime.now(timezone.utc) - timedelta(hours=1)
    )
    db_session.add(convo)
    db_session.commit()
    db_session.refresh(convo)

    # Criar mock user
    mock_user = MagicMock()
    mock_user.id = 999

    # Configurações de tags do robô e humano
    def mock_get_setting(key, default="", client_id=None):
        if key == "WA_HAS_AI_AGENT":
            return "true"
        if key == "WA_HUMAN_LABEL":
            return "humano"
        if key == "WA_ROBO_LABEL":
            return "robo"
        return default

    # Chamar send_chat_message
    payload = {"content": "Olá cliente, como posso te ajudar?", "is_private": False}
    with patch("config_loader.get_setting", side_effect=mock_get_setting):
        await send_chat_message(
            conversation_id=convo.id,
            payload=payload,
            client_id=client_id,
            current_user=mock_user,
            db=db_session
        )

    # Recarregar conversa para garantir integridade das etiquetas
    db_session.refresh(convo)

    # Garantir que a etiqueta de robô permaneceu e NENHUMA etiqueta 'humano' foi adicionada automaticamente
    assert "robo" in convo.labels
    assert "humano" not in convo.labels
    assert convo.human_handover_at is None

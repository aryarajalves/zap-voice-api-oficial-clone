import pytest
from unittest.mock import patch
from sqlalchemy.orm import Session
import models
from models import Client, AppConfig, ChatConversation, ChatMessage
import core.worker.handlers.whatsapp as wah
from core.worker.handlers.whatsapp_inbound import handle_whatsapp_inbound_messages

@pytest.mark.asyncio
async def test_reaction_attaches_to_original_message_without_wamid_prefix(db_session, monkeypatch):
    wah.GLOBAL_PROCESSING_LOCKS.clear()

    client = Client(name="ReactionTestClient", is_active=True)
    db_session.add(client)
    db_session.flush()

    app_config = AppConfig(
        client_id=client.id,
        key="WA_PHONE_NUMBER_ID",
        value="98765"
    )
    db_session.add(app_config)
    db_session.flush()

    phone_number = "5511988888889"

    convo = ChatConversation(
        client_id=client.id,
        phone=phone_number,
        contact_name="Contato Original",
        status="open"
    )
    db_session.add(convo)
    db_session.flush()

    target_wa_id = "HBgMNTU8NTk2MTIzNTg2FQIAERgSRDZDQUJDM0M3RDU1MUY4Njg5AA=="
    original_msg = ChatMessage(
        conversation_id=convo.id,
        sender_type="user",
        message_type="text",
        content="Original",
        wa_message_id=target_wa_id
    )
    db_session.add(original_msg)
    db_session.flush()

    convo_id = convo.id

    print("\nBEFORE HANDLER - CONVOS IN DB:", db_session.query(ChatConversation).all())
    print("BEFORE HANDLER - MSGS IN DB:", db_session.query(ChatMessage).all())

    inbound_payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "12345",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {"display_phone_number": "98765", "phone_number_id": "98765"},
                    "contacts": [{"profile": {"name": "Contato Original"}, "wa_id": phone_number}],
                    "messages": [{
                        "from": phone_number,
                        "id": "wamid.reaction_event_id_unique_123",
                        "timestamp": "1700000000",
                        "type": "reaction",
                        "reaction": {
                            "message_id": f"wamid.{target_wa_id}",
                            "emoji": "😜"
                        }
                    }]
                },
                "field": "messages"
            }]
        }]
    }

    class MockChatwootClient:
        def __init__(self, *args, **kwargs):
            pass
        async def ensure_conversation(self, *args, **kwargs):
            return {"convo_id": 1112, "contact_id": 2223}
            
    monkeypatch.setattr(wah, "ChatwootClient", MockChatwootClient)
    monkeypatch.setattr("services.window_manager.sync_contact_to_custom_table", lambda *a, **k: None)

    value = inbound_payload["entry"][0]["changes"][0]["value"]
    messages = value["messages"]
    metadata = value["metadata"]
    
    with patch.object(db_session, "commit", side_effect=db_session.flush), \
         patch.object(Session, "expire_all", lambda self: None):
        await handle_whatsapp_inbound_messages(db_session, messages, value, metadata)

    print("AFTER HANDLER - CONVOS IN DB:", db_session.query(ChatConversation).all())
    print("AFTER HANDLER - MSGS IN DB:", db_session.query(ChatMessage).all())

    updated_msg = db_session.query(ChatMessage).filter_by(wa_message_id=target_wa_id).first()
    assert updated_msg is not None, "Mensagem original deve ser encontrada no banco por wa_message_id"
    meta = updated_msg.meta_data or {}
    assert "reactions" in meta
    assert meta["reactions"][0]["emoji"] == "😜"
    assert meta["reactions"][0]["sender"] == "contact"

    reaction_messages_count = db_session.query(ChatMessage).filter_by(
        conversation_id=convo_id,
        message_type="reaction"
    ).count()
    assert reaction_messages_count == 0

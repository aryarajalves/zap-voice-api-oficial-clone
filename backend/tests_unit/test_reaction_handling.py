import pytest
from models import Client, AppConfig, ChatConversation, ChatMessage
from core.worker.handlers.whatsapp_inbound import handle_whatsapp_inbound_messages

@pytest.mark.asyncio
async def test_reaction_message_inbound_saves_correct_text(db_session, monkeypatch):
    client = Client(name="ReactionTestClient")
    db_session.add(client)
    db_session.flush()

    app_config = AppConfig(
        client_id=client.id,
        key="WA_PHONE_NUMBER_ID",
        value="98765"
    )
    db_session.add(app_config)
    db_session.flush()

    phone_number = "5511988888888"

    inbound_payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "12345",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {"display_phone_number": "98765", "phone_number_id": "98765"},
                    "contacts": [{"profile": {"name": "Cliente Reacao"}, "wa_id": phone_number}],
                    "messages": [{
                        "from": phone_number,
                        "id": "wamid.reaction_msg_id",
                        "timestamp": "1700000000",
                        "type": "reaction",
                        "reaction": {
                            "message_id": "wamid.replied_message_id",
                            "emoji": "❤️"
                        }
                    }]
                },
                "field": "messages"
            }]
        }]
    }

    import core.worker.handlers.whatsapp as wah
    class MockChatwootClient:
        def __init__(self, *args, **kwargs):
            pass
        async def ensure_conversation(self, *args, **kwargs):
            return {"convo_id": 1111, "contact_id": 2222}
            
    monkeypatch.setattr(wah, "ChatwootClient", MockChatwootClient)

    value = inbound_payload["entry"][0]["changes"][0]["value"]
    messages = value["messages"]
    metadata = value["metadata"]
    
    client_id = client.id
    await handle_whatsapp_inbound_messages(db_session, messages, value, metadata)

    chat_convo = db_session.query(ChatConversation).filter_by(
        client_id=client_id,
        phone=phone_number
    ).first()
    
    assert chat_convo is not None
    assert chat_convo.last_message_content == "Reagiu com ❤️"

    chat_message = db_session.query(ChatMessage).filter_by(
        conversation_id=chat_convo.id,
        wa_message_id="wamid.reaction_msg_id"
    ).first()

    assert chat_message is not None
    assert chat_message.message_type == "reaction"
    assert chat_message.content == "Reagiu com ❤️"

@pytest.mark.asyncio
async def test_reaction_attaches_to_original_message_without_wamid_prefix(db_session, monkeypatch):
    client = Client(name="ReactionTestClient2")
    db_session.add(client)
    db_session.flush()
    client_id = client.id

    app_config = AppConfig(
        client_id=client_id,
        key="WA_PHONE_NUMBER_ID",
        value="98765"
    )
    db_session.add(app_config)
    db_session.flush()

    phone_number = "5511988888889"

    # Criar conversa e mensagem original (com wa_message_id sem o prefixo wamid.)
    convo = ChatConversation(
        client_id=client_id,
        phone=phone_number,
        contact_name="Contato Original",
        status="open"
    )
    db_session.add(convo)
    db_session.flush()

    original_msg = ChatMessage(
        conversation_id=convo.id,
        sender_type="user",
        message_type="text",
        content="Original",
        wa_message_id="HBgMNTU4NTk2MTIzNTg2FQIAERgSRDZDQUJDM0M3RDU1MUY4Njg5AA=="
    )
    db_session.add(original_msg)
    db_session.flush()

    # Reação recebida com o prefixo wamid.
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
                        "id": "wamid.reaction_event_id",
                        "timestamp": "1700000000",
                        "type": "reaction",
                        "reaction": {
                            "message_id": "wamid.HBgMNTU4NTk2MTIzNTg2FQIAERgSRDZDQUJDM0M3RDU1MUY4Njg5AA==",
                            "emoji": "😜"
                        }
                    }]
                },
                "field": "messages"
            }]
        }]
    }

    import core.worker.handlers.whatsapp as wah
    class MockChatwootClient:
        def __init__(self, *args, **kwargs):
            pass
        async def ensure_conversation(self, *args, **kwargs):
            return {"convo_id": 1112, "contact_id": 2223}
            
    monkeypatch.setattr(wah, "ChatwootClient", MockChatwootClient)

    value = inbound_payload["entry"][0]["changes"][0]["value"]
    messages = value["messages"]
    metadata = value["metadata"]
    
    await handle_whatsapp_inbound_messages(db_session, messages, value, metadata)

    # Validar que a reação foi anexada ao meta_data da original_msg
    db_session.refresh(original_msg)
    assert original_msg.meta_data is not None
    assert "reactions" in original_msg.meta_data
    assert original_msg.meta_data["reactions"][0]["emoji"] == "😜"
    assert original_msg.meta_data["reactions"][0]["sender"] == "contact"

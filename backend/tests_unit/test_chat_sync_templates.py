import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone
import models
from database import SessionLocal

@pytest.mark.asyncio
async def test_post_send_chat_local_sync_creates_conversation():
    # Arrange
    from services.bulk_core import _post_send
    
    db = SessionLocal()
    try:
        # Create a test client
        client_obj = models.Client(name="Test Client")
        db.add(client_obj)
        db.commit()
        
        # Mock chatwoot client
        mock_cw = MagicMock()
        mock_cw.client_id = client_obj.id
        mock_cw.settings = {}
        mock_cw.add_label_to_conversation = AsyncMock()
        mock_cw.ensure_conversation = AsyncMock(return_value=None)
        mock_cw.find_existing_conversation = AsyncMock(return_value=None)
        
        phone_num = "558599887766"
        contact_name = "Arya Stark"
        note_content = "Olá, esta é uma mensagem de teste do template."
        
        # Act
        await _post_send(
            chatwoot=mock_cw,
            phone=phone_num,
            contact_name=contact_name,
            conversation_id=None,
            note_content=note_content,
            chatwoot_label=None,
            trigger_id=None
        )
        
        # Assert - check if conversation was created in db
        chat_convo = db.query(models.ChatConversation).filter(
            models.ChatConversation.client_id == client_obj.id,
            models.ChatConversation.phone == phone_num
        ).first()
        
        assert chat_convo is not None
        assert chat_convo.contact_name == contact_name
        assert chat_convo.status == "open"
        
        # Check if chat message was recorded
        chat_msg = db.query(models.ChatMessage).filter(
            models.ChatMessage.conversation_id == chat_convo.id
        ).first()
        
        assert chat_msg is not None
        assert chat_msg.content == note_content
        assert chat_msg.sender_type == "user"
        
        # Cleanup
        db.delete(chat_msg)
        db.delete(chat_convo)
        db.delete(client_obj)
        db.commit()
        
    finally:
        db.close()


@pytest.mark.asyncio
async def test_post_send_chat_local_sync_matches_existing_by_last_8_digits():
    # Arrange
    from services.bulk_core import _post_send
    
    db = SessionLocal()
    try:
        # Create a test client
        client_obj = models.Client(name="Test Client 8 Digits")
        db.add(client_obj)
        db.commit()
        
        # Create an existing conversation with slightly different formatting but same 8 digits
        # existing: 13 dígitos, last 8 = "99887766"
        # target:   12 dígitos, last 8 = "99887766"  (simula ausência do 9 extra)
        existing_phone = "5585999887766"   # last 8: "99887766"
        target_phone   = "558599887766"    # last 8: "99887766"
        
        chat_convo = models.ChatConversation(
            client_id=client_obj.id,
            phone=existing_phone,
            contact_name="Existing Contact Name",
            status="open"
        )
        db.add(chat_convo)
        db.commit()
        
        # Mock chatwoot client
        mock_cw = MagicMock()
        mock_cw.client_id = client_obj.id
        mock_cw.settings = {}
        mock_cw.add_label_to_conversation = AsyncMock()
        mock_cw.ensure_conversation = AsyncMock(return_value=None)
        mock_cw.find_existing_conversation = AsyncMock(return_value=None)
        
        note_content = "Template content synced to existing."
        
        # Act
        await _post_send(
            chatwoot=mock_cw,
            phone=target_phone,
            contact_name="Target Contact Name",
            conversation_id=None,
            note_content=note_content,
            chatwoot_label=None,
            trigger_id=None
        )
        
        # Assert - should find existing and NOT create new one
        conversations = db.query(models.ChatConversation).filter(
            models.ChatConversation.client_id == client_obj.id
        ).all()
        
        assert len(conversations) == 1
        assert conversations[0].id == chat_convo.id
        
        # Check message registered inside that existing conversation
        chat_msg = db.query(models.ChatMessage).filter(
            models.ChatMessage.conversation_id == chat_convo.id
        ).first()
        
        assert chat_msg is not None
        assert chat_msg.content == note_content
        
        # Cleanup
        db.delete(chat_msg)
        db.delete(chat_convo)
        db.delete(client_obj)
        db.commit()
        
    finally:
        db.close()


@pytest.mark.asyncio
async def test_post_send_chat_local_sync_saves_template_meta_data():
    # Arrange
    from services.bulk_core import _post_send
    
    db = SessionLocal()
    try:
        # Create a test client
        client_obj = models.Client(name="Test Client MetaData")
        db.add(client_obj)
        db.commit()
        
        # Create a WhatsAppTemplateCache with header and buttons
        template_name = "welcome_test_meta"
        tpl_cache = models.WhatsAppTemplateCache(
            id=123456,
            client_id=client_obj.id,
            name=template_name,
            language="pt_BR",
            body="Olá {{1}}, bem-vindo!",
            components=[
                {
                    "type": "HEADER",
                    "format": "IMAGE"
                },
                {
                    "type": "BODY",
                    "text": "Olá {{1}}, bem-vindo!"
                },
                {
                    "type": "BUTTONS",
                    "buttons": [
                        {
                            "type": "QUICK_REPLY",
                            "text": "Falar com suporte"
                        },
                        {
                            "type": "URL",
                            "text": "Acessar Site"
                        }
                    ]
                }
            ]
        )
        db.add(tpl_cache)
        db.commit()
        
        # Create a ScheduledTrigger that references the template
        trigger_obj = models.ScheduledTrigger(
            client_id=client_obj.id,
            template_name=template_name,
            status="sent"
        )
        db.add(trigger_obj)
        db.commit()
        
        # Mock chatwoot client
        mock_cw = MagicMock()
        mock_cw.client_id = client_obj.id
        mock_cw.settings = {}
        mock_cw.add_label_to_conversation = AsyncMock()
        mock_cw.ensure_conversation = AsyncMock(return_value=None)
        mock_cw.find_existing_conversation = AsyncMock(return_value=None)
        
        phone_num = "5585999887755"
        
        # Act
        await _post_send(
            chatwoot=mock_cw,
            phone=phone_num,
            contact_name="Meta Contact",
            conversation_id=None,
            note_content="Olá João, bem-vindo!",
            chatwoot_label=None,
            trigger_id=trigger_obj.id
        )
        
        # Assert - check if conversation and message were created
        chat_convo = db.query(models.ChatConversation).filter(
            models.ChatConversation.client_id == client_obj.id,
            models.ChatConversation.phone == phone_num
        ).first()
        
        assert chat_convo is not None
        
        chat_msg = db.query(models.ChatMessage).filter(
            models.ChatMessage.conversation_id == chat_convo.id
        ).first()
        
        assert chat_msg is not None
        assert chat_msg.meta_data is not None
        assert chat_msg.meta_data.get("is_template") is True
        assert chat_msg.meta_data.get("template_name") == template_name
        assert chat_msg.meta_data.get("header") == {"format": "IMAGE", "text": None}
        assert chat_msg.meta_data.get("buttons") == ["Falar com suporte", "Acessar Site"]
        
        # Cleanup
        db.delete(chat_msg)
        db.delete(chat_convo)
        db.delete(trigger_obj)
        db.delete(tpl_cache)
        db.delete(client_obj)
        db.commit()
        
    finally:
        db.close()

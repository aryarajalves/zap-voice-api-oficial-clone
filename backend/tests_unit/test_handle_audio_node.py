import unittest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone
from core.engine.nodes.audio import handle_audio_node
import models

class TestHandleAudioNode(unittest.IsolatedAsyncioTestCase):
    @patch("core.engine.nodes.audio.get_best_conversation")
    @patch("core.engine.nodes.audio.is_window_open_strict")
    @patch("core.engine.nodes.audio.validate_media_url")
    @patch("core.engine.nodes.audio.log_node_execution")
    @patch("core.engine.nodes.audio.publish_node_external_event")
    async def test_handle_audio_node_sends_official_directly_when_conversation_exists(
        self, mock_publish_event, mock_log, mock_validate, mock_window, mock_best_conv
    ):
        mock_validate.return_value = (True, "")
        mock_window.return_value = True
        mock_best_conv.return_value = 123
        
        db = MagicMock()
        trigger = MagicMock()
        trigger.id = 999
        trigger.client_id = 1
        trigger.is_bulk = False
        trigger.contact_name = "Arya"
        trigger.chatwoot_inbox_id = 10
        
        node = {
            "id": "node_audio_123",
            "data": {
                "mediaUrl": "audio_test.ogg",
                "publishExternalEvent": False
            }
        }
        
        chatwoot = AsyncMock()
        # Mocking send_audio_official
        chatwoot.send_audio_official.return_value = {
            "messages": [{"id": "wamid.test_audio_msg_id_123"}]
        }
        chatwoot.ensure_conversation.return_value = {"conversation_id": 123}
        
        contact_phone = "5585999999999"
        apply_vars_func = lambda x: x
        funnel = MagicMock()
        
        res = await handle_audio_node(db, trigger, node, chatwoot, 123, contact_phone, apply_vars_func, funnel)
        
        # Verificações
        self.assertEqual(res["status"], "continue")
        self.assertEqual(res["conversation_id"], 123)
        
        # Deve ter chamado send_audio_official e NÃO send_attachment para o envio real
        chatwoot.send_audio_official.assert_called_once_with(contact_phone, "https://zap-voice.s3.us-west-004.backblazeb2.com/audio_test.ogg")
        chatwoot.send_attachment.assert_not_called()
        
        # Deve ter sincronizado com o Chatwoot enviando apenas texto/mensagem informativa no Chatwoot para evitar duplicidade de anexo
        chatwoot.ensure_conversation.assert_called_once()
        chatwoot.create_message.assert_called_once_with(123, "[Áudio enviado: https://zap-voice.s3.us-west-004.backblazeb2.com/audio_test.ogg]", "outgoing")
        
        # Deve ter persistido MessageStatus no banco
        db.add.assert_called_once()
        db.commit.assert_called()

    @patch("core.engine.nodes.audio.validate_media_url")
    @patch("core.engine.nodes.audio.log_node_execution")
    async def test_handle_audio_node_sends_official_when_no_conversation(
        self, mock_log, mock_validate
    ):
        mock_validate.return_value = (True, "")
        db = MagicMock()
        trigger = MagicMock()
        trigger.id = 999
        trigger.client_id = 1
        trigger.contact_name = "Arya"
        trigger.chatwoot_inbox_id = 10
        
        node = {
            "id": "node_audio_123",
            "data": {
                "mediaUrl": "audio_test_no_conv.ogg"
            }
        }
        
        chatwoot = AsyncMock()
        chatwoot.send_audio_official.return_value = {
            "messages": [{"id": "wamid.test_audio_msg_id_456"}]
        }
        chatwoot.ensure_conversation.return_value = {"conversation_id": 789}
        
        contact_phone = "5585999999999"
        apply_vars_func = lambda x: x
        funnel = MagicMock()
        
        res = await handle_audio_node(db, trigger, node, chatwoot, None, contact_phone, apply_vars_func, funnel)
        
        self.assertEqual(res["status"], "continue")
        chatwoot.send_audio_official.assert_called_once_with(contact_phone, "https://zap-voice.s3.us-west-004.backblazeb2.com/audio_test_no_conv.ogg")
        chatwoot.ensure_conversation.assert_called_once()
        chatwoot.create_message.assert_called_once_with(789, "[Áudio enviado: https://zap-voice.s3.us-west-004.backblazeb2.com/audio_test_no_conv.ogg]", "outgoing")

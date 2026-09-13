import pytest
from unittest.mock import MagicMock, patch
from fastapi import APIRouter, HTTPException
import routers.chat.notes_and_labels_routes as nlr
from routers.chat.notes_labels_modules import (
    notes_router,
    labels_router,
    human_handover_router,
    ai_analysis_router,
    mention_router,
    get_ai_config,
)


def test_notes_and_labels_exports():
    """Valida que todos os métodos e o router são exportados na fachada"""
    assert isinstance(nlr.router, APIRouter)
    assert hasattr(nlr, "list_chat_agents")
    assert hasattr(nlr, "list_custom_labels")
    assert hasattr(nlr, "create_custom_label")
    assert hasattr(nlr, "update_conversation_labels")
    assert hasattr(nlr, "bulk_tag_conversations")
    assert hasattr(nlr, "update_conversation_note")
    assert hasattr(nlr, "update_private_note_message")
    assert hasattr(nlr, "list_human_conversations")
    assert hasattr(nlr, "finish_human_handover")
    assert hasattr(nlr, "bulk_finish_human_handover")
    assert hasattr(nlr, "get_ai_config")
    assert hasattr(nlr, "analyze_conversation_doubts")
    assert hasattr(nlr, "analyze_conversations_doubts_bulk")
    assert hasattr(nlr, "list_mention_contacts")


def test_notes_and_labels_router_paths():
    """Valida que todas as rotas esperadas estão registradas no router principal"""
    paths = [r.path for r in nlr.router.routes]
    assert "/chat/agents" in paths
    assert "/chat/conversations/{conversation_id}/labels" in paths
    assert "/chat/conversations/bulk-tag" in paths
    assert "/chat/conversations/{conversation_id}/note" in paths
    assert "/chat/conversations/{conversation_id}/notes/{message_id}" in paths
    assert "/chat/human-conversations" in paths
    assert "/chat/conversations/{conversation_id}/finish-human-handover" in paths
    assert "/chat/conversations/bulk-finish-human-handover" in paths
    assert "/chat/ai-config" in paths
    assert "/chat/conversations/{conversation_id}/analyze-doubts" in paths
    assert "/chat/conversations/analyze-doubts-bulk" in paths
    assert "/chat/mention-contacts" in paths


@pytest.mark.asyncio
async def test_get_ai_config_behavior():
    """Valida a rota get_ai_config com e sem chave configurada"""
    mock_user = MagicMock()
    with patch("routers.chat.notes_labels_modules.ai_analysis_routes.get_setting", return_value="sk-fake-key"):
        res = await get_ai_config(client_id=1, current_user=mock_user)
        assert res["openai_configured"] is True

    with patch("routers.chat.notes_labels_modules.ai_analysis_routes.get_setting", return_value=""):
        res_empty = await get_ai_config(client_id=1, current_user=mock_user)
        assert res_empty["openai_configured"] is False


@pytest.mark.asyncio
async def test_update_conversation_note_validation():
    """Valida que update_conversation_note bloqueia nota vazia ou conversa inexistente"""
    mock_user = MagicMock()
    mock_user.id = 10
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = None

    # Conversa não encontrada
    with pytest.raises(HTTPException) as exc_info:
        await nlr.update_conversation_note(
            conversation_id=999,
            payload={"private_note": "Anotação teste"},
            client_id=1,
            current_user=mock_user,
            db=mock_db
        )
    assert exc_info.value.status_code == 404

    # Nota vazia
    mock_convo = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = mock_convo
    with pytest.raises(HTTPException) as exc_info:
        await nlr.update_conversation_note(
            conversation_id=1,
            payload={"private_note": "   "},
            client_id=1,
            current_user=mock_user,
            db=mock_db
        )
    assert exc_info.value.status_code == 400

import pytest
from unittest.mock import MagicMock, patch
from fastapi import APIRouter
import routers.chat.conversation_routes as cr
from routers.chat.conversation_modules import (
    list_router,
    status_router,
    toggle_router,
    delete_router,
    build_conversation_filter_query,
    get_block_info,
)


def test_conversation_routes_exports():
    """Valida que todos os métodos e o router principal são exportados na fachada"""
    assert isinstance(cr.router, APIRouter)
    assert hasattr(cr, "get_or_create_conversation")
    assert hasattr(cr, "list_conversations")
    assert hasattr(cr, "update_conversation_status")
    assert hasattr(cr, "toggle_archive_conversation")
    assert hasattr(cr, "bulk_archive_conversations")
    assert hasattr(cr, "assign_conversation")
    assert hasattr(cr, "mark_as_read")
    assert hasattr(cr, "toggle_pin_conversation")
    assert hasattr(cr, "toggle_urgent_conversation")
    assert hasattr(cr, "reset_24h_window")
    assert hasattr(cr, "clear_conversation_messages")
    assert hasattr(cr, "delete_conversation")
    assert hasattr(cr, "delete_conversations_bulk")
    assert hasattr(cr, "seed_conversations")
    assert hasattr(cr, "build_conversation_filter_query")
    assert hasattr(cr, "get_blocked_and_resting_data")
    assert hasattr(cr, "get_block_info")
    assert hasattr(cr, "get_active_funnels_map")


def test_conversation_routes_paths():
    """Valida que todas as rotas esperadas estão registradas no router"""
    paths = [r.path for r in cr.router.routes]
    assert "/chat/conversations/get-or-create" in paths
    assert "/chat/conversations" in paths
    assert "/chat/conversations/{conversation_id}/status" in paths
    assert "/chat/conversations/{conversation_id}/archive" in paths
    assert "/chat/conversations/bulk-archive" in paths
    assert "/chat/conversations/{conversation_id}/assign" in paths
    assert "/chat/conversations/{conversation_id}/read" in paths
    assert "/chat/conversations/{conversation_id}/pin" in paths
    assert "/chat/conversations/{conversation_id}/urgent" in paths
    assert "/chat/conversations/{conversation_id}/reset-24h-window" in paths
    assert "/chat/conversations/{conversation_id}/messages" in paths
    assert "/chat/conversations/{conversation_id}" in paths
    assert "/chat/seed-conversations" in paths


def test_get_block_info_helper():
    """Valida a lógica de detecção de bloqueio e descanso por sufixo de 8 dígitos"""
    blocked_suffixes = {"99998888"}
    from datetime import datetime, timedelta
    future_time = datetime.utcnow() + timedelta(hours=2)
    resting_map = {"77776666": future_time}

    # Curto demais
    b_type, b_time = get_block_info("123", blocked_suffixes, resting_map)
    assert b_type is None and b_time is None

    # Bloqueado
    b_type, b_time = get_block_info("5511999998888", blocked_suffixes, resting_map)
    assert b_type == "blocked"
    assert b_time is None

    # Em descanso
    b_type, b_time = get_block_info("+5511977776666", blocked_suffixes, resting_map)
    assert b_type == "resting"
    assert b_time == future_time

    # Normal
    b_type, b_time = get_block_info("5511911112222", blocked_suffixes, resting_map)
    assert b_type is None and b_time is None


@pytest.mark.asyncio
async def test_get_or_create_validation():
    """Valida que get_or_create_conversation exige telefone"""
    mock_db = MagicMock()
    mock_user = MagicMock()
    with pytest.raises(Exception) as exc_info:
        await cr.get_or_create_conversation(payload={}, client_id=1, current_user=mock_user, db=mock_db)
    assert "Telefone é obrigatório" in str(exc_info.value.detail)

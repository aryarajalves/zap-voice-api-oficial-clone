import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi import APIRouter
import routers.whatsapp as wa
from routers.whatsapp_modules.client_helper import get_chatwoot_client
from routers.whatsapp_modules.connection_routes import TestTokenRequest


def test_whatsapp_barrel_exports():
    """Valida que todos os endpoints e objetos essenciais são exportados por routers.whatsapp"""
    assert isinstance(wa.router, APIRouter)
    assert hasattr(wa, "ChatwootClient")
    assert hasattr(wa, "list_templates")
    assert hasattr(wa, "archive_template")
    assert hasattr(wa, "unarchive_template")
    assert hasattr(wa, "update_template_tags")
    assert hasattr(wa, "pin_template")
    assert hasattr(wa, "delete_template_tag_global")
    assert hasattr(wa, "create_template")
    assert hasattr(wa, "update_template")
    assert hasattr(wa, "delete_template")
    assert hasattr(wa, "reset_template_24h_history")
    assert hasattr(wa, "update_template_status")
    assert hasattr(wa, "upload_template_media")
    assert hasattr(wa, "send_template")
    assert hasattr(wa, "debug_env")
    assert hasattr(wa, "test_whatsapp_token")
    assert hasattr(wa, "list_labels")


def test_whatsapp_router_paths_registered():
    """Valida que todas as sub-rotas foram incluídas no router principal"""
    paths = [r.path for r in wa.router.routes]
    assert "/whatsapp/debug/env" in paths
    assert "/whatsapp/test-token" in paths
    assert "/whatsapp/labels" in paths
    assert "/whatsapp/templates" in paths
    assert "/whatsapp/templates/{template_name}/archive" in paths
    assert "/whatsapp/templates/{template_name}/unarchive" in paths
    assert "/whatsapp/templates/{template_id}/tags" in paths
    assert "/whatsapp/templates/{template_id}/pin" in paths
    assert "/whatsapp/upload-template-media" in paths
    assert "/whatsapp/send-template" in paths


@patch("routers.whatsapp.ChatwootClient")
def test_get_chatwoot_client_honors_mock(mock_client_class):
    """Valida que get_chatwoot_client respeita @patch em routers.whatsapp.ChatwootClient"""
    mock_instance = MagicMock()
    mock_client_class.return_value = mock_instance
    client = get_chatwoot_client(client_id=123)
    assert client == mock_instance
    mock_client_class.assert_called_once_with(client_id=123)


def test_token_request_schema():
    """Valida o schema do TestTokenRequest"""
    req = TestTokenRequest(phone_number_id="12345", access_token="secret_token")
    assert req.phone_number_id == "12345"
    assert req.access_token == "secret_token"
    assert req.business_account_id is None

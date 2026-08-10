"""
Testes unitários para validação de suporte a múltiplos tokens do ManyChat.
"""
import pytest
import json
from unittest.mock import patch, AsyncMock
from sqlalchemy.orm import Session

import models
from services.manychat import get_manychat_tokens, sync_to_manychat, _MANYCHAT_ROTATION_POINTERS

def test_get_manychat_tokens_legacy_single(db_session: Session):
    client = models.Client(name="Cliente Teste ManyChat Single")
    db_session.add(client)
    db_session.commit()

    setting = models.AppConfig(client_id=client.id, key="MANYCHAT_API_KEY", value="123456:abc_token")
    db_session.add(setting)
    db_session.commit()

    tokens = get_manychat_tokens(client.id)
    assert len(tokens) == 1
    assert tokens[0]["key"] == "123456:abc_token"
    assert tokens[0]["name"] == "Conta Principal"

def test_get_manychat_tokens_json_list(db_session: Session):
    client = models.Client(name="Cliente Teste ManyChat Multi")
    db_session.add(client)
    db_session.commit()

    multi_json = json.dumps([
        {"id": "1", "name": "Conta Vendas", "key": "111:key_vendas"},
        {"id": "2", "name": "Conta Suporte", "key": "222:key_suporte"}
    ])

    setting = models.AppConfig(client_id=client.id, key="MANYCHAT_API_KEYS", value=multi_json)
    db_session.add(setting)
    db_session.commit()

    tokens = get_manychat_tokens(client.id)
    assert len(tokens) == 2
    assert tokens[0]["name"] == "Conta Vendas"
    assert tokens[0]["key"] == "111:key_vendas"
    assert tokens[1]["name"] == "Conta Suporte"
    assert tokens[1]["key"] == "222:key_suporte"

def test_get_manychat_tokens_comma_separated(db_session: Session):
    client = models.Client(name="Cliente Teste ManyChat Comma")
    db_session.add(client)
    db_session.commit()

    setting = models.AppConfig(client_id=client.id, key="MANYCHAT_API_KEY", value="token1, token2")
    db_session.add(setting)
    db_session.commit()

    tokens = get_manychat_tokens(client.id)
    assert len(tokens) == 2
    assert tokens[0]["key"] == "token1"
    assert tokens[1]["key"] == "token2"

@pytest.mark.asyncio
async def test_sync_to_manychat_multi_token_execution(db_session: Session):
    client = models.Client(name="Cliente Sync Multi ManyChat")
    db_session.add(client)
    db_session.commit()

    multi_json = json.dumps([
        {"id": "1", "name": "Conta Alpha", "key": "key_alpha"},
        {"id": "2", "name": "Conta Beta", "key": "key_beta"}
    ])
    setting = models.AppConfig(client_id=client.id, key="MANYCHAT_API_KEYS", value=multi_json)
    db_session.add(setting)
    db_session.commit()

    _MANYCHAT_ROTATION_POINTERS[client.id] = 0

    with patch("services.manychat._sync_to_manychat_with_key", new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = {
            "status": "success",
            "contact": {"status": "created", "id": 100},
            "tag": {"status": "applied", "name": "tag_teste"},
            "error": None
        }

        res = await sync_to_manychat(client.id, "Carlos", "5511999991111", "tag_teste")

        assert mock_sync.call_count == 1
        assert res["status"] == "success"
        assert res["account_name"] == "Conta Alpha"
        assert res["rotation_info"] == "Rotação 1 de 2"

def test_settings_router_unmasks_manychat_api_keys(db_session: Session):
    """Garante que a rota GET /api/settings não corrompe a string JSON de MANYCHAT_API_KEYS."""
    client = models.Client(name="Cliente Settings Test")
    db_session.add(client)
    db_session.commit()

    multi_json = json.dumps([
        {"id": "1", "name": "Conta 1", "key": "123:key1"},
        {"id": "2", "name": "Conta 2", "key": "456:key2"}
    ])
    setting = models.AppConfig(client_id=client.id, key="MANYCHAT_API_KEYS", value=multi_json)
    db_session.add(setting)
    db_session.commit()

    from unittest.mock import MagicMock
    mock_user = MagicMock(email="test@example.com")
    from routers.settings import read_settings
    res = read_settings(x_client_id=client.id, current_user=mock_user, db=db_session)
    assert "MANYCHAT_API_KEYS" in res
    assert res["MANYCHAT_API_KEYS"] == multi_json
    assert "*" not in res["MANYCHAT_API_KEYS"]

@pytest.mark.asyncio
async def test_sync_to_manychat_and_update_history_includes_account_name(db_session: Session):
    """Valida se sync_to_manychat_and_update_history inclui account_name no processed_data."""
    client = models.Client(name="Cliente Sync History Test")
    db_session.add(client)
    db_session.commit()

    multi_json = json.dumps([
        {"id": "1", "name": "ManyChat Vendas", "key": "key_vendas"}
    ])
    setting = models.AppConfig(client_id=client.id, key="MANYCHAT_API_KEYS", value=multi_json)
    db_session.add(setting)

    integration = models.WebhookIntegration(
        client_id=client.id,
        platform="kiwify",
        name="Integracao Teste"
    )
    db_session.add(integration)
    db_session.commit()

    history = models.WebhookHistory(
        integration_id=integration.id,
        status="processed",
        payload={"name": "Maria"},
        processed_data={"manychat_enabled": True}
    )
    db_session.add(history)
    db_session.commit()

    from services.manychat import sync_to_manychat_and_update_history
    with patch("services.manychat._sync_to_manychat_with_key", new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = {
            "status": "success",
            "contact": {"status": "created", "id": 101},
            "tag": {"status": "applied", "name": "tag_test"},
            "error": None
        }

        await sync_to_manychat_and_update_history(client.id, "Maria", "5511988887777", "tag_test", "maria@test.com", history.id)

    db_session.refresh(history)
    assert history.processed_data is not None
    assert "manychat_sync" in history.processed_data
    sync_res = history.processed_data["manychat_sync"]
    assert sync_res["status"] == "success"
    assert sync_res["account_name"] == "ManyChat Vendas"
    assert sync_res["rotation_info"] == "Conta Única"




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


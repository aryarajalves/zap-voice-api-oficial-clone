"""
Testes unitários para a rotação sequencial Round-Robin de tokens do ManyChat.
"""
import pytest
import json
from unittest.mock import patch, AsyncMock
from sqlalchemy.orm import Session

import models
from services.manychat import get_next_rotated_manychat_token, sync_to_manychat, _MANYCHAT_ROTATION_POINTERS

def test_manychat_rotation_sequence(db_session: Session):
    client = models.Client(name="Cliente Rotação ManyChat")
    db_session.add(client)
    db_session.commit()

    multi_json = json.dumps([
        {"id": "1", "name": "Conta 1", "key": "key_1"},
        {"id": "2", "name": "Conta 2", "key": "key_2"},
        {"id": "3", "name": "Conta 3", "key": "key_3"}
    ])
    setting = models.AppConfig(client_id=client.id, key="MANYCHAT_API_KEYS", value=multi_json)
    db_session.add(setting)
    db_session.commit()

    # Resetar ponteiro em memória para este cliente
    _MANYCHAT_ROTATION_POINTERS[client.id] = 0

    token1, pos1, total1 = get_next_rotated_manychat_token(client.id)
    assert token1["name"] == "Conta 1"
    assert pos1 == 1
    assert total1 == 3

    token2, pos2, total2 = get_next_rotated_manychat_token(client.id)
    assert token2["name"] == "Conta 2"
    assert pos2 == 2
    assert total2 == 3

    token3, pos3, total3 = get_next_rotated_manychat_token(client.id)
    assert token3["name"] == "Conta 3"
    assert pos3 == 3
    assert total3 == 3

    # 4ª rotação deve voltar para a Conta 1
    token4, pos4, total4 = get_next_rotated_manychat_token(client.id)
    assert token4["name"] == "Conta 1"
    assert pos4 == 1
    assert total4 == 3

@pytest.mark.asyncio
async def test_sync_to_manychat_rotation(db_session: Session):
    client = models.Client(name="Cliente Sync Rotação")
    db_session.add(client)
    db_session.commit()

    multi_json = json.dumps([
        {"id": "1", "name": "ManyChat A", "key": "key_a"},
        {"id": "2", "name": "ManyChat B", "key": "key_b"}
    ])
    setting = models.AppConfig(client_id=client.id, key="MANYCHAT_API_KEYS", value=multi_json)
    db_session.add(setting)
    db_session.commit()

    _MANYCHAT_ROTATION_POINTERS[client.id] = 0

    with patch("services.manychat._sync_to_manychat_with_key", new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = {
            "status": "success",
            "contact": {"status": "created", "id": 50},
            "tag": {"status": "applied", "name": "tag1"},
            "error": None
        }

        # 1ª chamada -> ManyChat A
        res1 = await sync_to_manychat(client.id, "User 1", "5511999990001", "tag1")
        assert res1["account_name"] == "ManyChat A"
        assert res1["rotation_info"] == "Rotação 1 de 2"

        # 2ª chamada -> ManyChat B
        res2 = await sync_to_manychat(client.id, "User 2", "5511999990002", "tag1")
        assert res2["account_name"] == "ManyChat B"
        assert res2["rotation_info"] == "Rotação 2 de 2"

        # 3ª chamada -> ManyChat A novamente
        res3 = await sync_to_manychat(client.id, "User 3", "5511999990003", "tag1")
        assert res3["account_name"] == "ManyChat A"
        assert res3["rotation_info"] == "Rotação 1 de 2"

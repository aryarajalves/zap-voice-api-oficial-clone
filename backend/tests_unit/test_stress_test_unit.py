import os
import pytest
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from main import app
from chatwoot_client import ChatwootClient
from database import SessionLocal
import models

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def mock_user_auth():
    # Mock para get_current_user e get_validated_client_id
    user = MagicMock()
    user.id = 1
    user.client_id = 1
    user.email = "test@example.com"
    return user

@patch("chatwoot_client.os.getenv")
@pytest.mark.asyncio
async def test_chatwoot_client_simulation_and_rate_limit(mock_getenv):
    # 1. Testar com simulação ativada mas sem rate limit
    mock_getenv.side_effect = lambda key, default=None: "true" if key == "SIMULATE_MESSAGING" else "false"
    
    client = ChatwootClient(account_id="1", client_id=1)
    assert client.simulate is True
    assert client.simulate_ratelimit is False

    # Chamar métodos simulados - devem responder sucesso instantaneamente
    res_template = await client.send_template("5511999999999", "welcome_template")
    assert "messages" in res_template
    assert res_template["messages"][0]["id"].startswith("wamid.simulated_")

    res_note = await client.create_private_note(12345, "Nota de teste")
    assert res_note["success"] is True

    # 2. Testar com rate limit ativado (forçando a probabilidade para disparar o 429)
    mock_getenv.side_effect = lambda key, default=None: "true" if key in ["SIMULATE_MESSAGING", "SIMULATE_CHATWOOT_RATELIMIT"] else "false"
    client_rl = ChatwootClient(account_id="1", client_id=1)
    assert client_rl.simulate_ratelimit is True

    # Mockar random para sempre retornar 0.0 (forçando o erro 429)
    with patch("chatwoot_client.random.random", return_value=0.0):
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await client_rl.send_template("5511999999999", "welcome_template")
        assert exc_info.value.response.status_code == 429


@patch("routers.triggers.stress_test.rabbitmq")
def test_stress_test_endpoint(mock_rabbit, client, mock_user_auth):
    from core.deps import get_current_user, get_validated_client_id

    # Mockar a publicação do RabbitMQ
    mock_rabbit.publish = AsyncMock()
    mock_rabbit.publish_event = AsyncMock()

    # Payload para rota
    payload = {
        "funnel_id": 1,
        "number_of_contacts": 50,
        "delay_seconds": 0,
        "concurrency_limit": 5
    }

    # Cabeçalho de autorização simulado
    headers = {
        "Authorization": "Bearer fake_token",
        "X-Client-ID": "1"
    }

    # Substituir dependências no FastAPI
    app.dependency_overrides[get_current_user] = lambda: mock_user_auth
    app.dependency_overrides[get_validated_client_id] = lambda: 1

    try:
        # Mockar a sessão do DB
        db_mock = MagicMock()
        with patch("core.deps.get_db", return_value=db_mock):
            with patch("sqlalchemy.orm.Session.commit"), \
                 patch("sqlalchemy.orm.Session.add"), \
                 patch("sqlalchemy.orm.Session.refresh"):
                
                response = client.post("/api/stress-test", json=payload, headers=headers)
                
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "success"
                assert "trigger_id" in data
                
                # Verificar se foi publicado no RabbitMQ
                mock_rabbit.publish.assert_called_once()
                mock_rabbit.publish_event.assert_called_once()
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
@patch("services.bulk.rabbitmq")
@patch("services.bulk.asyncio.sleep")
@patch("services.bulk.random.random", return_value=0.0)
async def test_simulate_lifecycle(mock_random, mock_sleep, mock_rabbit):
    from services.bulk import simulate_lifecycle
    
    # Setup mocks
    db_mock = MagicMock()
    msg_mock = MagicMock()
    msg_mock.status = 'sent'
    msg_mock.delivered_counted = False
    
    # Configure DB queries
    db_mock.query.return_value.filter_by.return_value.first.return_value = msg_mock
    db_mock.query.return_value.get.return_value = MagicMock(status='completed', total_sent=10, total_failed=0, total_delivered=1, total_read=1, total_interactions=1, total_blocked=0, total_cost=0.0, total_contacts=10)
    
    # Mock SessionLocal
    with patch("database.SessionLocal", return_value=db_mock), \
         patch("services.bulk.text") as mock_text:
        
        # Call simulate_lifecycle
        await simulate_lifecycle(message_id="sim_wamid_123", trigger_id=1, client_id=1)
        
        # Verify status updates and DB calls
        print("MOCK STATUS:", msg_mock.status)
        print("DB CALLS:", db_mock.mock_calls)
        print("RANDOM CALLS:", mock_random.mock_calls)
        assert msg_mock.status in ('delivered', 'read', 'interaction')
        assert db_mock.commit.called
        assert mock_rabbit.publish_event.called

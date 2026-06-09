import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from main import app
from core.deps import get_db

@pytest.fixture
def client():
    return TestClient(app)

@pytest.mark.asyncio
async def test_webhook_rate_limit_exempt(client):
    # Mock do RabbitMQ para não tentar publicar de verdade nos testes
    from rabbitmq_client import rabbitmq
    
    mock_publish = AsyncMock(return_value=True)
    db_mock = MagicMock()
    
    # Payload simulando o evento da Meta
    meta_payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "123456",
            "changes": [{
                "field": "messages",
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {"display_phone_number": "5511999999999", "phone_number_id": "100000000"},
                    "messages": [{
                        "from": "5511999999999",
                        "id": "wamid.HBgNNTUxMTk5OTk5OTk5OQ==",
                        "timestamp": "1672531199",
                        "text": {"body": "Olá"},
                        "type": "text"
                    }]
                }
            }]
        }]
    }

    # Substituir dependência de DB
    app.dependency_overrides[get_db] = lambda: db_mock

    try:
        with patch.object(rabbitmq, "publish", mock_publish):
            # Enviar múltiplas requisições POST seguidas para simular estouro do rate limit global (escrita: 30/minuto)
            # Como a rota está com @limiter.exempt, todas devem retornar 200 (não 429)
            # Usamos hashes diferentes no corpo para evitar a trava global de payload duplicado de 5 segundos
            for i in range(40):
                payload_unique = meta_payload.copy()
                payload_unique["entry"][0]["changes"][0]["value"]["messages"][0]["id"] = f"wamid.unique_id_{i}"
                response = client.post("/api/meta", json=payload_unique)
                assert response.status_code == 200, f"Falhou na iteração {i} com status {response.status_code}"
                
            # Validar que a rota de status também está isenta
            for i in range(40):
                response = client.post("/api/whatsapp/status", json={"status": "sent", "id": f"st_id_{i}"})
                assert response.status_code == 200
    finally:
        app.dependency_overrides.clear()

import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi import HTTPException
import os
import models
from routers.whatsapp_profile import assistant_chat

class MockUser:
    def __init__(self, client_id=1):
        self.client_id = client_id

@pytest.mark.asyncio
@patch("routers.whatsapp.list_templates")
@patch("httpx.AsyncClient.post")
async def test_assistant_chat_success(mock_post, mock_list_templates, db_session):
    # Mock active templates list
    mock_list_templates.return_value = [
        {"id": "1", "name": "template_one", "language": "pt_BR", "category": "MARKETING", "body_text": "Olá!", "components": []}
    ]

    # Mock OpenAI API call response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "Aqui está sua sugestão:\n```json\n{\n  \"name\": \"promocao_natal\",\n  \"category\": \"MARKETING\",\n  \"language\": \"pt_BR\",\n  \"header_type\": \"NONE\",\n  \"body_text\": \"Feliz Natal!\"\n}\n```"
                }
            }
        ]
    }
    mock_post.return_value = mock_response

    # Temporarily set API key env var for testing
    with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-mock-key"}):
        res = await assistant_chat(
            payload={"messages": [{"role": "user", "content": "Olá, crie um template"}]},
            x_client_id=1,
            current_user=MockUser(1),
            db=db_session
        )

        assert res["role"] == "assistant"
        assert "promocao_natal" in res["content"]
        assert mock_post.called

@pytest.mark.asyncio
async def test_assistant_chat_missing_api_key(db_session):
    # Ensure OPENAI_API_KEY is not in env
    with patch.dict(os.environ, {}, clear=True):
        if "OPENAI_API_KEY" in os.environ:
            del os.environ["OPENAI_API_KEY"]

        with pytest.raises(HTTPException) as excinfo:
            await assistant_chat(
                payload={"messages": []},
                x_client_id=1,
                current_user=MockUser(1),
                db=db_session
            )
        assert excinfo.value.status_code == 400
        assert "OPENAI_API_KEY não configurada" in excinfo.value.detail

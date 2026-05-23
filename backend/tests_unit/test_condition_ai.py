import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from core.engine.nodes.condition import handle_condition_node

@pytest.fixture
def mock_db():
    db = MagicMock()
    return db

@pytest.fixture
def mock_trigger():
    trigger = MagicMock()
    trigger.client_id = 1
    return trigger

@pytest.fixture
def mock_chatwoot():
    cw = AsyncMock()
    # Mock padrão de get_messages retorna lista de mensagens do Chatwoot
    cw.get_messages = AsyncMock(return_value=[
        {"message_type": 1, "content": "Olá, você gostaria de agendar?", "private": False, "created_at": 1700000000},
        {"message_type": 0, "content": "Sim, por favor!", "private": False, "created_at": 1700000010}
    ])
    cw.get_contact_conversations = AsyncMock(return_value=[{"id": 123}])
    return cw

@pytest.mark.asyncio
async def test_ai_condition_success_answered(mock_db, mock_trigger, mock_chatwoot):
    """Testa o caso em que a OpenAI determina que a pergunta foi respondida."""
    node = {
        "id": "node_ai_1",
        "data": {
            "conditionType": "ai_question",
            "aiQuestion": "O contato aceitou o agendamento?",
            "aiLimit": 10
        }
    }

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json = MagicMock(return_value={
        "choices": [{
            "message": {
                "content": '{"answered": true, "reason": "Contato confirmou com \'Sim, por favor!\'"}'
            }
        }]
    })

    with patch("core.engine.nodes.condition.get_setting", side_effect=lambda key, default="", client_id=None: "fake_key" if key == "OPENAI_API_KEY" else "gpt-5-mini"), \
         patch("httpx.AsyncClient.post", return_value=mock_response) as mock_post, \
         patch("core.engine.nodes.condition.log_node_execution") as mock_log:
        
        result = await handle_condition_node(mock_db, mock_trigger, node, mock_chatwoot, "5511999999999", [], 123)
        
        assert result == "yes"
        mock_post.assert_called_once()
        mock_log.assert_called_once()
        # Verificar se chamou com gpt-5-mini
        args, kwargs = mock_post.call_args
        assert kwargs["json"]["model"] == "gpt-5-mini"

@pytest.mark.asyncio
async def test_ai_condition_success_not_answered(mock_db, mock_trigger, mock_chatwoot):
    """Testa o caso em que a OpenAI determina que a pergunta NÃO foi respondida."""
    node = {
        "id": "node_ai_1",
        "data": {
            "conditionType": "ai_question",
            "aiQuestion": "O contato comprou o produto?",
            "aiLimit": 5
        }
    }

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json = MagicMock(return_value={
        "choices": [{
            "message": {
                "content": '{"answered": false, "reason": "Nenhuma menção a compra."}'
            }
        }]
    })

    with patch("core.engine.nodes.condition.get_setting", side_effect=lambda key, default="", client_id=None: "fake_key" if key == "OPENAI_API_KEY" else "gpt-5-mini"), \
         patch("httpx.AsyncClient.post", return_value=mock_response), \
         patch("core.engine.nodes.condition.log_node_execution"):
        
        result = await handle_condition_node(mock_db, mock_trigger, node, mock_chatwoot, "5511999999999", [], 123)
        
        assert result == "no"

@pytest.mark.asyncio
async def test_ai_condition_fallback_on_first_model_failure(mock_db, mock_trigger, mock_chatwoot):
    """Testa se o gpt-4o-mini é acionado como fallback caso a primeira chamada falhe."""
    node = {
        "id": "node_ai_1",
        "data": {
            "conditionType": "ai_question",
            "aiQuestion": "Pergunta teste",
            "aiLimit": 15
        }
    }

    # Primeira resposta: Erro (Modelo inexistente/falha na cota)
    # Segunda resposta: Sucesso
    resp_fail = MagicMock()
    resp_fail.status_code = 404
    resp_fail.text = "Model not found"

    resp_ok = MagicMock()
    resp_ok.status_code = 200
    resp_ok.json = MagicMock(return_value={
        "choices": [{
            "message": {
                "content": '{"answered": true, "reason": "Fallback ok"}'
            }
        }]
    })

    with patch("core.engine.nodes.condition.get_setting", side_effect=lambda key, default="", client_id=None: "fake_key" if key == "OPENAI_API_KEY" else "gpt-5-mini"), \
         patch("httpx.AsyncClient.post", side_effect=[resp_fail, resp_ok]) as mock_post, \
         patch("core.engine.nodes.condition.log_node_execution") as mock_log:
        
        result = await handle_condition_node(mock_db, mock_trigger, node, mock_chatwoot, "5511999999999", [], 123)
        
        assert result == "yes"
        assert mock_post.call_count == 2
        
        # Verificar o modelo usado em cada chamada
        calls = mock_post.call_args_list
        assert calls[0][1]["json"]["model"] == "gpt-5-mini"
        assert calls[1][1]["json"]["model"] == "gpt-4o-mini"
        
        # O log de execução deve registrar o modelo final bem sucedido
        mock_log.assert_called_once()
        log_message = mock_log.call_args[0][4]
        assert "gpt-4o-mini" in log_message

@pytest.mark.asyncio
async def test_ai_condition_error_missing_key(mock_db, mock_trigger, mock_chatwoot):
    """Testa se o nó retorna 'error' caso a OPENAI_API_KEY não esteja configurada."""
    node = {
        "id": "node_ai_1",
        "data": {
            "conditionType": "ai_question",
            "aiQuestion": "O contato agendou?",
            "aiLimit": 15
        }
    }

    with patch("core.engine.nodes.condition.get_setting", return_value=""), \
         patch("core.engine.nodes.condition.log_node_execution") as mock_log:
        
        result = await handle_condition_node(mock_db, mock_trigger, node, mock_chatwoot, "5511999999999", [], 123)
        
        assert result == "error"
        mock_log.assert_called_once()
        assert "OPENAI_API_KEY não configurada" in mock_log.call_args[0][4]

@pytest.mark.asyncio
async def test_ai_condition_error_all_models_fail(mock_db, mock_trigger, mock_chatwoot):
    """Testa se o nó retorna 'error' caso ambos os modelos falhem na OpenAI."""
    node = {
        "id": "node_ai_1",
        "data": {
            "conditionType": "ai_question",
            "aiQuestion": "Pergunta teste",
            "aiLimit": 15
        }
    }

    resp_fail = MagicMock()
    resp_fail.status_code = 500
    resp_fail.text = "Internal Server Error"

    with patch("core.engine.nodes.condition.get_setting", side_effect=lambda key, default="", client_id=None: "fake_key" if key == "OPENAI_API_KEY" else "gpt-5-mini"), \
         patch("httpx.AsyncClient.post", return_value=resp_fail), \
         patch("core.engine.nodes.condition.log_node_execution") as mock_log:
        
        result = await handle_condition_node(mock_db, mock_trigger, node, mock_chatwoot, "5511999999999", [], 123)
        
        assert result == "error"
        mock_log.assert_called_once()
        assert "Falha crítica nas chamadas à OpenAI" in mock_log.call_args[0][4]

@pytest.mark.asyncio
async def test_ai_condition_with_instructions(mock_db, mock_trigger, mock_chatwoot):
    """Testa se o campo aiInstructions é corretamente incluído no system_prompt enviado para a OpenAI."""
    node = {
        "id": "node_ai_1",
        "data": {
            "conditionType": "ai_question",
            "aiQuestion": "Pergunta teste",
            "aiInstructions": "Instrucoes de sucesso personalizadas de teste",
            "aiLimit": 15
        }
    }

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json = MagicMock(return_value={
        "choices": [{
            "message": {
                "content": '{"answered": true, "reason": "OK"}'
            }
        }]
    })

    with patch("core.engine.nodes.condition.get_setting", side_effect=lambda key, default="", client_id=None: "fake_key" if key == "OPENAI_API_KEY" else "gpt-5-mini"), \
         patch("httpx.AsyncClient.post", return_value=mock_response) as mock_post, \
         patch("core.engine.nodes.condition.log_node_execution"):
        
        result = await handle_condition_node(mock_db, mock_trigger, node, mock_chatwoot, "5511999999999", [], 123)
        
        assert result == "yes"
        mock_post.assert_called_once()
        
        # Verificar se as instruções de sucesso estão no prompt de sistema enviado para a OpenAI
        args, kwargs = mock_post.call_args
        messages = kwargs["json"]["messages"]
        system_msg = next(m for m in messages if m["role"] == "system")
        assert "Instrucoes de sucesso personalizadas de teste" in system_msg["content"]


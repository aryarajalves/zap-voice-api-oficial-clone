import pytest
from unittest.mock import patch, MagicMock
from core.engine.nodes.http_request import handle_http_request_node

class MockTrigger:
    def __init__(self):
        self.status = "processing"
        self.client_id = 1
        self.contact_name = "Arya Stark"
        self.contact_phone = "5511999999999"
        self.product_name = "Curso de Espada"
        self.template_components = []

@pytest.mark.asyncio
async def test_http_request_node_success():
    db = MagicMock()
    trigger = MockTrigger()
    node = {
        "id": "node-http",
        "data": {
            "method": "POST",
            "url": "https://api.pipedrive.com/v1/deals",
            "headers": [
                {"key": "Authorization", "value": "Bearer test-token"},
                {"key": "Content-Type", "value": "application/json"}
            ],
            "payload": '{"phone": "{{telefone}}", "name": "{{nome}}", "product": "{{produto}}"}'
        }
    }
    
    def apply_vars_mock(text):
        if not text:
            return text
        return text.replace("{{telefone}}", trigger.contact_phone).replace("{{nome}}", trigger.contact_name).replace("{{produto}}", trigger.product_name)

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = "OK"

    with patch("httpx.AsyncClient.post", return_value=mock_response) as mock_post, \
         patch("core.engine.nodes.http_request.log_node_execution") as mock_log:
        
        res = await handle_http_request_node(db, trigger, node, apply_vars_mock)
        assert res == "success"
        
        # Verificar se os headers e payloads foram passados e as variáveis aplicadas
        mock_post.assert_called_once()
        called_args, called_kwargs = mock_post.call_args
        assert called_kwargs["headers"] == {"Authorization": "Bearer test-token", "Content-Type": "application/json"}
        assert called_kwargs["json"] == {
            "phone": "5511999999999",
            "name": "Arya Stark",
            "product": "Curso de Espada"
        }

@pytest.mark.asyncio
async def test_http_request_node_failure_status():
    db = MagicMock()
    trigger = MockTrigger()
    node = {
        "id": "node-http",
        "data": {
            "method": "GET",
            "url": "https://httpbin.org/status/500",
            "headers": [],
            "payload": ""
        }
    }
    
    def apply_vars_mock(text): return text

    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = "Internal Server Error"

    with patch("httpx.AsyncClient.get", return_value=mock_response) as mock_get, \
         patch("core.engine.nodes.http_request.log_node_execution") as mock_log:
        
        res = await handle_http_request_node(db, trigger, node, apply_vars_mock)
        assert res == "fail"
        mock_get.assert_called_once()

@pytest.mark.asyncio
async def test_http_request_node_exception():
    db = MagicMock()
    trigger = MockTrigger()
    node = {
        "id": "node-http",
        "data": {
            "method": "POST",
            "url": "https://invalid-url.zapvoice.com",
            "headers": [],
            "payload": ""
        }
    }
    
    def apply_vars_mock(text): return text

    with patch("httpx.AsyncClient.post", side_effect=Exception("Timeout / Connection Error")) as mock_post, \
         patch("core.engine.nodes.http_request.log_node_execution") as mock_log:
        
        res = await handle_http_request_node(db, trigger, node, apply_vars_mock)
        assert res == "fail"
        mock_post.assert_called_once()

@pytest.mark.asyncio
async def test_http_request_node_fields():
    db = MagicMock()
    trigger = MockTrigger()
    node = {
        "id": "node-http",
        "data": {
            "method": "POST",
            "url": "https://api.pipedrive.com/v1/deals",
            "headers": [],
            "payloadType": "fields",
            "payloadFields": [
                {"key": "phone", "value": "{{telefone}}"},
                {"key": "name", "value": "{{nome}}"},
                {"key": "product", "value": "{{produto}}"}
            ]
        }
    }
    
    def apply_vars_mock(text):
        if not text:
            return text
        return text.replace("{{telefone}}", trigger.contact_phone).replace("{{nome}}", trigger.contact_name).replace("{{produto}}", trigger.product_name)

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = "OK"

    with patch("httpx.AsyncClient.post", return_value=mock_response) as mock_post, \
         patch("core.engine.nodes.http_request.log_node_execution") as mock_log:
        
        res = await handle_http_request_node(db, trigger, node, apply_vars_mock)
        assert res == "success"
        
        mock_post.assert_called_once()
        called_args, called_kwargs = mock_post.call_args
        assert called_kwargs["json"] == {
            "phone": "5511999999999",
            "name": "Arya Stark",
            "product": "Curso de Espada"
        }


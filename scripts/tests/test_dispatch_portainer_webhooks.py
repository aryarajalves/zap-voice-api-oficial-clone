import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import pytest
import json
from unittest.mock import patch, MagicMock
import urllib.error
from scripts.dispatch_portainer_webhooks import (
    parse_webhooks,
    mask_url,
    trigger_webhook
)

def test_mask_url():
    url = "https://portainer.example.com/api/stacks/webhooks/abcdef1234567890"
    masked = mask_url(url)
    assert "abcdef1234567890" not in masked
    assert masked.startswith("https://portainer.example.com/api/stacks/webhooks/")
    assert masked.endswith("****")


def test_parse_webhooks_json():
    json_data = json.dumps({
        "producao": "https://portainer.prod.com/api/stacks/webhooks/prod-token-123",
        "staging": "https://portainer.stage.com/api/stacks/webhooks/stage-token-456",
        "cliente_a": "https://portainer.client.com/api/stacks/webhooks/client-token-789"
    })
    parsed = parse_webhooks(json_data)
    assert len(parsed) == 3
    assert parsed["producao"] == "https://portainer.prod.com/api/stacks/webhooks/prod-token-123"
    assert parsed["staging"] == "https://portainer.stage.com/api/stacks/webhooks/stage-token-456"
    assert parsed["cliente_a"] == "https://portainer.client.com/api/stacks/webhooks/client-token-789"


def test_parse_webhooks_single_url():
    single_url = "https://portainer.prod.com/api/stacks/webhooks/single-token-123"
    parsed = parse_webhooks(single_url)
    assert len(parsed) == 1
    assert parsed["default"] == single_url


def test_parse_webhooks_multiline_key_value():
    content = """
    # Comentário
    producao = https://portainer.prod.com/api/stacks/webhooks/prod-123
    staging: https://portainer.stage.com/api/stacks/webhooks/stage-456
    """
    parsed = parse_webhooks(content)
    assert len(parsed) == 2
    assert parsed["producao"] == "https://portainer.prod.com/api/stacks/webhooks/prod-123"
    assert parsed["staging"] == "https://portainer.stage.com/api/stacks/webhooks/stage-456"


def test_parse_webhooks_empty_or_whitespace():
    assert parse_webhooks("") == {}
    assert parse_webhooks("   \n\n  ") == {}


def test_trigger_webhook_success():
    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_response = MagicMock()
        mock_response.status = 204
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        success, status, msg = trigger_webhook("producao", "https://portainer.prod.com/api/stacks/webhooks/xyz")
        assert success is True
        assert status == 204
        assert msg == "Sucesso"


def test_trigger_webhook_http_error():
    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="https://portainer.prod.com",
            code=404,
            msg="Not Found",
            hdrs={},
            fp=None
        )

        success, status, msg = trigger_webhook("producao", "https://portainer.prod.com/api/stacks/webhooks/invalid")
        assert success is False
        assert status == 404
        assert "404" in msg

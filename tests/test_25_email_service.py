import sys
import os
import pytest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from services.email_service import send_single_email

class DummyEmailConfig:
    def __init__(self, provider="direct", from_name="ZapVoice", from_email="teste@zapvoice.com"):
        self.provider = provider
        self.from_name = from_name
        self.from_email = from_email
        self.resend_api_key = "re_12345"
        self.aws_access_key_id = "AKIA12345"
        self.aws_secret_access_key = "secret123"
        self.aws_region = "us-east-1"
        self.smtp_host = "smtp.example.com"
        self.smtp_port = 587
        self.smtp_user = "user"
        self.smtp_password = "pass"
        self.smtp_encryption = "tls"


@pytest.mark.asyncio
async def test_send_single_email_invalid_dest():
    config = DummyEmailConfig()
    res = await send_single_email(config, "email_invalido", "Assunto", "<p>Teste</p>")
    assert res["success"] is False
    assert "inválido" in res["error"]


@pytest.mark.asyncio
async def test_send_single_email_no_config():
    res = await send_single_email(None, "destino@exemplo.com", "Assunto", "<p>Teste</p>")
    assert res["success"] is False
    assert "não encontrada" in res["error"]


@pytest.mark.asyncio
async def test_send_single_email_direct_fallback():
    config = DummyEmailConfig(provider="direct")
    # Mock SMTP to avoid actual network call during test
    with patch("smtplib.SMTP") as mock_smtp:
        mock_instance = MagicMock()
        mock_smtp.return_value = mock_instance
        res = await send_single_email(config, "destino@exemplo.com", "Assunto {{nome}}", "<p>Olá {{nome}}</p>", recipient_name="Arya")
        assert res["success"] is True
        assert res["message_id"] == "direct_destino@exemplo.com"
        mock_instance.sendmail.assert_called_once()


@pytest.mark.asyncio
async def test_send_single_email_resend_mock():
    config = DummyEmailConfig(provider="resend")
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = {"id": "msg_resend_123"}
        mock_post.return_value = mock_res
        
        res = await send_single_email(config, "cliente@exemplo.com", "Bem-vindo", "<p>Boas-vindas</p>")
        assert res["success"] is True
        assert res["message_id"] == "msg_resend_123"

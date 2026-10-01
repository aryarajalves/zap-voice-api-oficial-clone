import sys
import os
import pytest
import asyncio
from unittest.mock import MagicMock, patch

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test_secret_key_1234567890_super_long_32chars"
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from services.email_service import send_single_email

class DummyConfig:
    def __init__(self):
        self.provider = "smtp"
        self.from_email = "remetente@zapvoice.com"
        self.from_name = "ZapVoice Teste"
        self.smtp_host = "smtp.test.com"
        self.smtp_port = 587
        self.smtp_user = "user"
        self.smtp_password = "pass"
        self.smtp_encryption = "tls"

@pytest.mark.asyncio
async def test_email_variable_replacements():
    config = DummyConfig()

    contact_data = {
        "name": "Maria Silva",
        "email": "maria@cliente.com",
        "phone": "5511988887777",
        "product_name": "Mentoria Premium",
        "platform": "Kiwify",
        "price": "R$ 497,00",
        "payment_method": "PIX",
        "tags": "VIP, Comprador"
    }

    body_template = "<p>Olá {{nome}}, seu e-mail é {{email}} e comprou {{produto}} na plataforma {{plataforma}} por {{valor}} via {{forma_pagamento}}. Tags: {{etiquetas}}.</p>"
    subject_template = "Parabéns {{nome}}, seu produto {{produto}} está disponível!"

    with patch("smtplib.SMTP") as mock_smtp:
        mock_instance = MagicMock()
        mock_smtp.return_value = mock_instance

        res = await send_single_email(
            config=config,
            to_email="maria@cliente.com",
            subject=subject_template,
            body_html=body_template,
            recipient_name=contact_data
        )

        assert res["success"] is True
        args, kwargs = mock_instance.sendmail.call_args
        raw_msg = args[2]

        # O cabeçalho Subject contém a substituição codificada em UTF-8 (Q-encoding)
        assert "Maria_Silva" in raw_msg or "Maria Silva" in raw_msg
        assert "Mentoria_Premium" in raw_msg or "Mentoria Premium" in raw_msg

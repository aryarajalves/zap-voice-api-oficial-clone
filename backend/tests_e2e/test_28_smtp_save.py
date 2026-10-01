import sys
import os
import pytest
from unittest.mock import MagicMock

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test_secret_key_1234567890_super_long_32chars"
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from routers.email_marketing import save_email_config, get_email_config, EmailConfigSchema

class DummyConfig:
    def __init__(self):
        self.id = 1
        self.client_id = 11
        self.provider = "smtp"
        self.aws_access_key_id = None
        self.aws_secret_access_key = None
        self.aws_region = "us-east-1"
        self.resend_api_key = None
        self.smtp_host = "smtp-relay.brevo.com"
        self.smtp_port = 587
        self.smtp_user = "usuario_test"
        self.smtp_password = "senha_secreta_smtp_123"
        self.smtp_encryption = "tls"
        self.from_email = "teste@dominio.com"
        self.from_name = "ZapVoice"

def test_smtp_password_persistence_and_retrieval():
    config_obj = DummyConfig()
    mock_db = MagicMock()
    mock_query = MagicMock()
    mock_db.query.return_value = mock_query
    mock_query.filter_by.return_value = mock_query
    mock_query.first.return_value = config_obj

    mock_user = MagicMock()
    mock_user.client_id = 11

    # Test GET config returns exact smtp_password
    get_res = get_email_config(x_client_id=11, db=mock_db, current_user=mock_user)
    assert get_res["configured"] is True
    assert get_res["config"]["smtp_password"] == "senha_secreta_smtp_123"
    assert get_res["config"]["smtp_user"] == "usuario_test"

    # Test POST config updates password properly
    payload = EmailConfigSchema(
        provider="smtp",
        from_email="teste@dominio.com",
        smtp_host="smtp-relay.brevo.com",
        smtp_port=587,
        smtp_user="usuario_test",
        smtp_password="nova_senha_smtp_456"
    )
    save_res = save_email_config(payload=payload, x_client_id=11, db=mock_db, current_user=mock_user)
    assert save_res["status"] == "success"
    assert config_obj.smtp_password == "nova_senha_smtp_456"

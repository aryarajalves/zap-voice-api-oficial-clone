import sys
import os
import pytest
from unittest.mock import MagicMock

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test_secret_key_1234567890_super_long_32chars"
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from routers.email_marketing import preview_email_recipients

class DummyLead:
    def __init__(self, id, name, email, tags, phone=""):
        self.id = id
        self.name = name
        self.email = email
        self.tags = tags
        self.phone = phone

def test_preview_recipients_filter_valid_emails():
    mock_db = MagicMock()
    mock_query = MagicMock()
    mock_db.query.return_value = mock_query
    mock_query.filter.return_value = mock_query
    
    # Mock return 3 leads: 2 with valid email, 1 without email
    mock_query.all.return_value = [
        DummyLead(1, "João", "joao@teste.com", "aryaraj"),
        DummyLead(2, "Maria", "maria@teste.com", "aryaraj"),
        DummyLead(3, "Carlos", None, "aryaraj")
    ]
    
    mock_user = MagicMock()
    mock_user.client_id = 11
    
    res = preview_email_recipients(tag_name="aryaraj", x_client_id=11, db=mock_db, current_user=mock_user)
    
    assert res["total_valid"] == 2
    assert len(res["recipients"]) == 2
    assert res["recipients"][0]["email"] == "joao@teste.com"
    assert res["recipients"][1]["email"] == "maria@teste.com"

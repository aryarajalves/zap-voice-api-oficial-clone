import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from services.manychat import sync_to_manychat
import httpx
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_sync_to_manychat_creates_tag_and_adds_it():
    """
    Testa se o serviço ManyChat tenta criar a tag antes de adicioná-la ao contato.
    """
    client_id = 999
    name = "User Test"
    phone = "5511999999999"
    tag = "new_tag_123"

    with patch("services.manychat.get_settings") as mock_settings:
        mock_settings.return_value = {"MANYCHAT_API_KEY": "valid_token"}
        
        mock_client = AsyncMock()
        
        resp_create_contact = MagicMock()
        resp_create_contact.status_code = 200
        resp_create_contact.json.return_value = {"data": {"id": 123456}}
        
        resp_create_tag = MagicMock()
        resp_create_tag.status_code = 200
        
        resp_add_tag = MagicMock()
        resp_add_tag.status_code = 200
        
        mock_client.post.side_effect = [
            resp_create_contact,
            resp_create_tag,
            resp_add_tag
        ]

        with patch("httpx.AsyncClient", return_value=mock_client):
            mock_client.__aenter__.return_value = mock_client
            
            asyncio.run(sync_to_manychat(client_id, name, phone, tag))
            
            assert mock_client.post.call_count == 3
            
            args1, kwargs1 = mock_client.post.call_args_list[0]
            assert "createContact" in args1[0]
            assert "first_name" in kwargs1["json"]
            
            args2, kwargs2 = mock_client.post.call_args_list[1]
            assert "createTag" in args2[0]
            assert kwargs2["json"]["name"] == tag
            
            args3, kwargs3 = mock_client.post.call_args_list[2]
            assert "addTagByName" in args3[0]
            assert kwargs3["json"]["tag_name"] == tag
            assert kwargs3["json"]["subscriber_id"] == 123456


# ========================
# Testes do dropdown de variáveis no replace_variables_in_string
# ========================

from routers.webhooks_public import replace_variables_in_string

PARSED = {
    "name": "João Silva",
    "phone": "5511999999999",
    "email": "joao@email.com",
    "product_name": "Curso ZapVoice",
    "payment_method": "Cartão de Crédito",
    "checkout_url": "https://checkout.example.com",
    "pix_qrcode": "00020126...",
}
PAYLOAD = {
    "buyer": {
        "name": "Maria Hotmart",
        "email": "maria@hotmart.com"
    },
    "Customer": {
        "full_name": "Carlos Kiwify"
    }
}


def test_replace_simple_key_name():
    """Dropdown envia 'name' → deve resolver para o nome do contato."""
    result = replace_variables_in_string("name", PAYLOAD, PARSED)
    assert result == "João Silva"


def test_replace_simple_key_phone():
    """Dropdown envia 'phone' → deve resolver para o telefone."""
    result = replace_variables_in_string("phone", PAYLOAD, PARSED)
    assert result == "5511999999999"


def test_replace_simple_key_email():
    """Dropdown envia 'email' → deve resolver para o e-mail."""
    result = replace_variables_in_string("email", PAYLOAD, PARSED)
    assert result == "joao@email.com"


def test_replace_simple_key_product_name():
    """Dropdown envia 'product_name' → deve resolver para o nome do produto."""
    result = replace_variables_in_string("product_name", PAYLOAD, PARSED)
    assert result == "Curso ZapVoice"


def test_replace_dotted_path_hotmart():
    """Dropdown envia 'buyer.name' → deve resolver via caminho no payload."""
    result = replace_variables_in_string("buyer.name", PAYLOAD, PARSED)
    assert result == "Maria Hotmart"


def test_replace_dotted_path_kiwify():
    """Dropdown envia 'Customer.full_name' → deve resolver via caminho no payload."""
    result = replace_variables_in_string("Customer.full_name", PAYLOAD, PARSED)
    assert result == "Carlos Kiwify"


def test_replace_mustache_syntax():
    """Tipo campo personalizado fixo com sintaxe {{name}} ainda funciona."""
    result = replace_variables_in_string("{{name}}", PAYLOAD, PARSED)
    assert result == "João Silva"


def test_replace_fixed_text():
    """Campo personalizado com valor fixo (não é variável) é retornado sem alteração."""
    result = replace_variables_in_string("valor_fixo", PAYLOAD, PARSED)
    assert result == "valor_fixo"


def test_replace_empty_string():
    """String vazia retorna string vazia."""
    result = replace_variables_in_string("", PAYLOAD, PARSED)
    assert result == ""

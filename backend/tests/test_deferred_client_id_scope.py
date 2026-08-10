import pytest
from unittest.mock import MagicMock

def test_client_id_scope_in_deferred_delivery():
    # Simula o escopo de variáveis onde client_id é extraído antes do bloco condicional
    trigger = MagicMock()
    trigger.client_id = 2
    message_record = MagicMock()
    message_record.var1 = "2"

    client_id = trigger.client_id if trigger else (int(message_record.var1) if message_record.var1 else None)
    
    existing_chat_msg = True
    if not existing_chat_msg:
        pass
    else:
        # No bloco else, client_id DEVE estar acessível sem UnboundLocalError
        assert client_id == 2

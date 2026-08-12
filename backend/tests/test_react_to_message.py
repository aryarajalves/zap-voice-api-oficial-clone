import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException
from routers.chat import react_to_message, ReactRequest

@pytest.mark.asyncio
async def test_react_to_message_invalid_wamid():
    db_mock = MagicMock()
    payload = ReactRequest(
        phone="558599999999",
        message_id="invalid_id",
        emoji="👍"
    )
    
    # Simula query ao banco retornando None
    db_mock.query.return_value.filter.return_value.first.return_value = None
    
    with pytest.raises(HTTPException) as exc_info:
        await react_to_message(
            payload=payload,
            client_id=1,
            current_user=MagicMock(),
            db=db_mock
        )
        
    assert exc_info.value.status_code == 400
    assert "não possui o ID oficial do WhatsApp (wamid)" in exc_info.value.detail

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from routers.chat import cancel_funnel_for_conversation

@pytest.mark.asyncio
async def test_cancel_funnel_for_conversation_success():
    mock_db = MagicMock()
    
    mock_convo = MagicMock()
    mock_convo.id = 1083
    mock_convo.client_id = 1
    mock_convo.phone = "5585996123586"
    
    mock_trigger = MagicMock()
    mock_trigger.id = 42
    mock_trigger.conversation_id = 1083
    mock_trigger.contact_phone = "5585996123586"
    mock_trigger.status = "processing"
    
    # Mocking db queries
    mock_db.query.return_value.filter.return_value.first.side_effect = [mock_convo]
    mock_db.query.return_value.filter.return_value.all.side_effect = [[mock_trigger]]
    
    mock_user = MagicMock()
    mock_user.email = "test@example.com"
    
    result = await cancel_funnel_for_conversation(
        conversation_id=1083,
        client_id=1,
        current_user=mock_user,
        db=mock_db
    )
    
    assert result == {"message": "Funil cancelado com sucesso!", "trigger_id": 42}
    assert mock_trigger.status == "cancelled"
    mock_db.commit.assert_called_once()

import pytest
from unittest.mock import MagicMock
from routers.chat import list_conversations

@pytest.mark.asyncio
async def test_list_conversations_filter_has_active_funnel():
    mock_db = MagicMock()
    mock_user = MagicMock()
    mock_user.id = 1

    # Desabilitar filtro e testar execução direta da rota com lista vazia de funis
    mock_db.query.return_value.filter.return_value.filter.return_value.distinct.return_value.all.return_value = []
    mock_db.query.return_value.filter.return_value.count.return_value = 0
    mock_db.query.return_value.filter.return_value.offset.return_value.limit.return_value.all.return_value = []

    res = await list_conversations(
        has_active_funnel=True,
        client_id=1,
        current_user=mock_user,
        db=mock_db
    )

    assert res is not None
    assert "conversations" in res
    assert res["conversations"] == []

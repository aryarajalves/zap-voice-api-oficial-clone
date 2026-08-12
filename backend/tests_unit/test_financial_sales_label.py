import pytest
from unittest.mock import MagicMock
from routers.financial import get_financial_sales

@pytest.mark.asyncio
async def test_get_financial_sales_with_label_filter():
    mock_db = MagicMock()
    mock_user = MagicMock()
    mock_user.client_id = 1

    # Mock de etiquetas do cliente
    mock_label = MagicMock()
    mock_label.name = "VIP"

    # Mock de conversas do cliente com a etiqueta VIP
    mock_convo = MagicMock()
    mock_convo.phone = "5511999999999"
    mock_convo.labels = ["VIP"]

    mock_db.query.return_value.filter.return_value.all.side_effect = [
        [],           # WebhookHistory query (limpo para simplificar)
        [mock_label], # ChatLabel query
        [mock_convo]  # ChatConversation query
    ]

    res = get_financial_sales(
        label="VIP",
        x_client_id=1,
        current_user=mock_user,
        db=mock_db
    )

    assert res is not None
    assert "totals" in res
    assert "all_labels" in res

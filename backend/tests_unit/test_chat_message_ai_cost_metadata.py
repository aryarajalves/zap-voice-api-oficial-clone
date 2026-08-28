import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone
import models
from routers.chat.message_routes import send_chat_message

@pytest.mark.asyncio
async def test_send_chat_message_persists_ai_cost_metadata():
    # Mock DB e dependências
    mock_db = MagicMock()
    mock_convo = MagicMock()
    mock_convo.id = 100
    mock_convo.phone = "5585996123586"
    mock_convo.client_id = 1
    mock_convo.last_contact_message_at = datetime.now(timezone.utc)

    mock_db.query.return_value.filter.return_value.first.return_value = mock_convo
    mock_user = MagicMock()
    mock_user.id = 1

    payload = {
        "content": "Resposta do Agente com Custo",
        "total_cost": 0.0025,
        "router_cost": 0.0004,
        "agent_cost": 0.0021,
        "processing_steps": [
            {"step": "Pré-Router", "cost": 0.0004},
            {"step": "Agente Principal", "cost": 0.0021}
        ]
    }

    with patch("routers.chat.message_routes._get_whatsapp_client") as mock_wa_cls:
        from unittest.mock import AsyncMock
        mock_wa_instance = MagicMock()
        mock_wa_instance.send_text_official = AsyncMock(return_value={"messages": [{"id": "wamid.12345"}]})
        mock_wa_cls.return_value = mock_wa_instance

        with patch("rabbitmq_client.rabbitmq.publish_event") as mock_publish:
            res = await send_chat_message(
                conversation_id=100,
                payload=payload,
                client_id=1,
                current_user=mock_user,
                db=mock_db
            )

            assert res["content"] == "Resposta do Agente com Custo"
            assert res["meta_data"] is not None
            assert res["meta_data"]["total_cost"] == 0.0025
            assert res["meta_data"]["router_cost"] == 0.0004
            assert res["meta_data"]["agent_cost"] == 0.0021
            assert len(res["meta_data"]["processing_steps"]) == 2

            # Verifica se foi salvo no DB
            added_msg = mock_db.add.call_args[0][0]
            assert added_msg.meta_data["total_cost"] == 0.0025

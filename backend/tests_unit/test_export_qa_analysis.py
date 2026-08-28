import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone

import models
from routers.chat.export_qa_routes import analyze_qa_for_export, _extract_heuristic_qa


def test_extract_heuristic_qa():
    msg1 = models.ChatMessage(
        id=1,
        sender_type="contact",
        content="quanto custa o curso?",
        timestamp=datetime(2026, 8, 20, 10, 0, tzinfo=timezone.utc)
    )
    msg2 = models.ChatMessage(
        id=2,
        sender_type="user",
        content="O curso custa R$297 à vista.",
        timestamp=datetime(2026, 8, 20, 10, 1, tzinfo=timezone.utc)
    )
    msg3 = models.ChatMessage(
        id=3,
        sender_type="contact",
        content="tem desconto no pix?",
        timestamp=datetime(2026, 8, 20, 10, 5, tzinfo=timezone.utc)
    )

    items = _extract_heuristic_qa([msg1, msg2, msg3])
    assert len(items) == 2
    assert items[0]["status"] == "answered"
    assert items[0]["question_text"] == "quanto custa o curso?"
    assert items[0]["answer_text"] == "O curso custa R$297 à vista."
    assert items[1]["status"] == "unanswered"
    assert items[1]["question_text"] == "tem desconto no pix?"
    assert items[1]["answer_text"] is None


@pytest.mark.asyncio
async def test_analyze_qa_for_export_with_openai_gpt5_2():
    mock_db = MagicMock()
    mock_convo = MagicMock()
    mock_convo.id = 12800
    mock_convo.contact_name = "Aryaraj"
    mock_convo.phone = "5585996123586"
    mock_convo.client_id = 1

    msg1 = models.ChatMessage(
        id=1,
        sender_type="contact",
        content="quem é a professora?",
        timestamp=datetime(2026, 8, 20, 9, 17, tzinfo=timezone.utc)
    )
    msg2 = models.ChatMessage(
        id=2,
        sender_type="user",
        content="A professora do Método Laser Day é a Tarcira Martins.",
        timestamp=datetime(2026, 8, 20, 9, 17, tzinfo=timezone.utc)
    )

    mock_db.query.return_value.filter.return_value.first.return_value = mock_convo
    mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [msg1, msg2]

    mock_user = MagicMock()
    mock_user.id = 1

    fake_openai_json = {
        "choices": [
            {
                "message": {
                    "content": """
                    {
                        "qa_items": [
                            {
                                "question_id": "q-1",
                                "question_text": "quem é a professora?",
                                "question_time": "09:17",
                                "answer_text": "A professora do Método Laser Day é a Tarcira Martins.",
                                "answer_time": "09:17",
                                "status": "answered",
                                "status_label": "Respondida com Clareza",
                                "ai_analysis": "O agente identificou e respondeu diretamente o nome da professora."
                            }
                        ]
                    }
                    """
                }
            }
        ]
    }

    with patch("routers.chat.export_qa_routes.get_setting") as mock_setting:
        def side_effect(k, def_val=None, client_id=None):
            if k == "OPENAI_API_KEY":
                return "sk-test-key-123"
            if k == "OPENAI_API_MODEL":
                return "gpt-5.2"
            return def_val
        mock_setting.side_effect = side_effect

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_res = MagicMock()
            mock_res.status_code = 200
            mock_res.json.return_value = fake_openai_json
            mock_post.return_value = mock_res

            res = await analyze_qa_for_export(
                conversation_id=12800,
                client_id=1,
                current_user=mock_user,
                db=mock_db
            )

            assert res["status"] == "ok"
            assert res["model_used"] == "gpt-5.2"
            assert res["is_ai_evaluated"] is True
            assert res["total_questions"] == 1
            assert res["answered_count"] == 1
            assert len(res["qa_items"]) == 1
            assert res["qa_items"][0]["status"] == "answered"
            assert res["qa_items"][0]["ai_analysis"] == "O agente identificou e respondeu diretamente o nome da professora."

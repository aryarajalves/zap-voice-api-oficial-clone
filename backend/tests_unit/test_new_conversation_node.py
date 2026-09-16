import pytest
from unittest.mock import MagicMock
from core.engine.nodes.new_conversation import handle_new_conversation_node
from core.worker.handlers.whatsapp_inbound.trigger_evaluator import evaluate_new_conversation_triggers

@pytest.mark.asyncio
async def test_handle_new_conversation_node_match_first_route():
    db = MagicMock()
    trigger = MagicMock()
    trigger.processed_data = {'first_message': 'Ola, preciso de suporte com meu plano'}
    node = {
        'id': 'node_new_convo_1',
        'type': 'newConversationNode',
        'data': {
            'routes': [
                {'id': 'route_support', 'label': 'Suporte', 'phrases': 'ajuda, suporte, duvida', 'matchType': 'contains'},
                {'id': 'route_sales', 'label': 'Vendas', 'phrases': 'comprar, preco, valor', 'matchType': 'contains'}
            ]
        }
    }

    result = await handle_new_conversation_node(db, trigger, node, '5511999999999', None)
    assert result == 'route_support'


@pytest.mark.asyncio
async def test_handle_new_conversation_node_match_second_route():
    db = MagicMock()
    trigger = MagicMock()
    trigger.processed_data = {'first_message': 'Quero comprar o plano anual'}
    node = {
        'id': 'node_new_convo_1',
        'type': 'newConversationNode',
        'data': {
            'routes': [
                {'id': 'route_support', 'label': 'Suporte', 'phrases': 'ajuda, suporte, duvida', 'matchType': 'contains'},
                {'id': 'route_sales', 'label': 'Vendas', 'phrases': 'comprar, preco, valor', 'matchType': 'contains'}
            ]
        }
    }

    result = await handle_new_conversation_node(db, trigger, node, '5511999999999', None)
    assert result == 'route_sales'


@pytest.mark.asyncio
async def test_handle_new_conversation_node_fallback_default():
    db = MagicMock()
    trigger = MagicMock()
    trigger.processed_data = {'first_message': 'Boa tarde, tudo bem?'}
    node = {
        'id': 'node_new_convo_1',
        'type': 'newConversationNode',
        'data': {
            'routes': [
                {'id': 'route_support', 'label': 'Suporte', 'phrases': 'ajuda, suporte, duvida', 'matchType': 'contains'},
                {'id': 'route_sales', 'label': 'Vendas', 'phrases': 'comprar, preco, valor', 'matchType': 'contains'}
            ]
        }
    }

    result = await handle_new_conversation_node(db, trigger, node, '5511999999999', None)
    assert result == 'default'


@pytest.mark.asyncio
async def test_handle_new_conversation_node_exact_match():
    db = MagicMock()
    trigger = MagicMock()
    trigger.processed_data = {'first_message': 'suporte'}
    node = {
        'id': 'node_new_convo_1',
        'type': 'newConversationNode',
        'data': {
            'routes': [
                {'id': 'route_exact', 'label': 'Exato', 'phrases': 'suporte, ajuda', 'matchType': 'exact'}
            ]
        }
    }

    result = await handle_new_conversation_node(db, trigger, node, '5511999999999', None)
    assert result == 'route_exact'

    trigger.processed_data = {'first_message': 'preciso de suporte'}
    result_non_match = await handle_new_conversation_node(db, trigger, node, '5511999999999', None)
    assert result_non_match == 'default'


@pytest.mark.asyncio
async def test_evaluate_new_conversation_triggers_skips_when_not_new_convo():
    db = MagicMock()
    chat_convo = MagicMock()
    chat_convo._is_new_convo = False

    await evaluate_new_conversation_triggers(
        db, target_cid=1, from_phone='5511999999999', raw_from='5511999999999',
        user_input='Oi', chat_convo=chat_convo, resolved_convo_id=10, contacts_map={}
    )
    db.query.assert_not_called()


@pytest.mark.asyncio
async def test_evaluate_new_conversation_triggers_activates_funnel(monkeypatch):
    from unittest.mock import AsyncMock
    import core.worker.handlers.whatsapp as wah

    db = MagicMock()
    chat_convo = MagicMock()
    chat_convo.id = 28010
    chat_convo._is_new_convo = True

    mock_funnel = MagicMock()
    mock_funnel.id = 166
    mock_funnel.name = "Funil - Boas Vindas"
    mock_funnel.is_active = True
    mock_funnel.is_archived = False
    mock_funnel.is_trigger_active = True
    mock_funnel.trigger_on_new_conversation = True
    mock_funnel.allowed_phones = None
    mock_funnel.blocked_phones = None
    mock_funnel.trigger_limit_type = "none"

    query_mock = MagicMock()
    query_mock.filter.return_value.all.return_value = [mock_funnel]
    db.query.return_value = query_mock

    mock_publish = AsyncMock()
    monkeypatch.setattr(wah.rabbitmq, "publish", mock_publish)

    import core.worker.handlers.whatsapp_inbound.trigger_evaluator as te
    mock_record_chat = AsyncMock()
    monkeypatch.setattr(te, "record_funnel_started_event_in_chat", mock_record_chat)

    await evaluate_new_conversation_triggers(
        db,
        target_cid=11,
        from_phone='5585998259497',
        raw_from='5585998259497',
        user_input='Oie, bom dia',
        chat_convo=chat_convo,
        resolved_convo_id=28010,
        contacts_map={'5585998259497': 'Aryaraj'}
    )

    # Verifica se persistiu o trigger no banco
    assert db.add.called
    added_trigger = db.add.call_args[0][0]
    assert added_trigger.client_id == 11
    assert added_trigger.funnel_id == 166
    assert added_trigger.contact_phone == '5585998259497'
    assert added_trigger.contact_name == 'Aryaraj'
    assert added_trigger.status == 'processing'
    assert added_trigger.processed_data['first_message'] == 'Oie, bom dia'

    # Verifica se publicou na fila zapvoice_funnel_executions
    mock_publish.assert_awaited_once_with(
        "zapvoice_funnel_executions",
        {
            "trigger_id": added_trigger.id,
            "funnel_id": 166,
            "conversation_id": 28010,
            "contact_phone": '5585998259497'
        }
    )
    mock_record_chat.assert_awaited_once()


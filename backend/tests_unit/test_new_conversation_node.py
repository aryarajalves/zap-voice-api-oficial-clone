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

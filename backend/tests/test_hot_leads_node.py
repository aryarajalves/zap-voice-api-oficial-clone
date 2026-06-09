import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from unittest.mock import MagicMock, patch, AsyncMock

# Mock rabbitmq_client e config_loader antes de outros imports
sys.modules['rabbitmq_client'] = MagicMock()
sys.modules['rabbitmq_client'].rabbitmq = MagicMock()
sys.modules['config_loader'] = MagicMock()

import pytest
import core.engine.nodes.hot_leads
core.engine.nodes.hot_leads.log_node_execution = MagicMock()

from core.engine.nodes.hot_leads import handle_hot_leads_node
from models.auth import User
from models.trigger import HotLead, RoundRobinState

class MockTrigger:
    def __init__(self):
        self.client_id = 1
        self.funnel_id = 10
        self.contact_name = "Cliente de Teste"
        self.contact_phone = "5585999999999"

class MockDB:
    def __init__(self, query_results=None):
        self.query_results = query_results or {}
        self.added = []
        self.committed = False

    def query(self, model):
        mock_query = MagicMock()
        
        # Simula filtros e resultados de consulta do SQLAlchemy
        def filter_side_effect(*args, **kwargs):
            filtered_query = MagicMock()
            
            # Retorna o resultado configurado
            result_list = self.query_results.get(model, [])
            filtered_query.all.return_value = result_list
            filtered_query.first.return_value = result_list[0] if result_list else None
            
            return filtered_query
            
        mock_query.filter.side_effect = filter_side_effect
        return mock_query

    def add(self, instance):
        self.added.append(instance)

    def commit(self):
        self.committed = True

    def refresh(self, instance):
        # Simula preenchimento de ID e data no objeto salvo
        instance.id = 999
        from datetime import datetime
        instance.created_at = datetime.now()

@pytest.mark.asyncio
@patch("core.engine.nodes.hot_leads.manager.broadcast", new_callable=AsyncMock)
async def test_hot_leads_node_round_robin_distribution(mock_broadcast):
    # Setup
    trigger = MockTrigger()
    
    # Mock Vendedores ativos
    seller1 = User(id=101, email="seller1@test.com", full_name="Seller One", role="vendedor", is_active=True)
    seller2 = User(id=102, email="seller2@test.com", full_name="Seller Two", role="vendedor", is_active=True)
    
    # Configura o mock do banco com os vendedores e sem estado anterior de RR
    db = MockDB({
        User: [seller1, seller2],
        RoundRobinState: []
    })

    node = {
        "id": "node-hot-1",
        "data": {
            "alertName": "Interesse Mentoria",
            "priority": "Alta",
            "contextMessage": "Avançou para o checkout",
            "sellersQueueType": "all",
            "distributionMode": "round_robin"
        }
    }

    # Executa pela primeira vez (RR deve pegar o menor ID = 101)
    res = await handle_hot_leads_node(db, trigger, node, trigger.contact_phone)
    
    assert res == "default"
    assert db.committed is True
    assert len(db.added) == 2  # 1 RoundRobinState + 1 HotLead
    
    # Valida o estado de RR criado
    rr_state = next(x for x in db.added if isinstance(x, RoundRobinState))
    assert rr_state.last_path_id == "101"
    
    # Valida o lead quente inserido
    hot_lead = next(x for x in db.added if isinstance(x, HotLead))
    assert hot_lead.assigned_user_id == 101
    assert hot_lead.alert_name == "Interesse Mentoria"
    assert hot_lead.priority == "Alta"
    assert hot_lead.context_message == "Avançou para o checkout"
    assert hot_lead.contact_phone == trigger.contact_phone

    # Valida chamada do WebSocket
    assert mock_broadcast.called is True
    call_args = mock_broadcast.call_args[0][0]
    assert call_args["event"] == "new_hot_lead"
    assert call_args["data"]["assigned_user_id"] == 101


@pytest.mark.asyncio
@patch("core.engine.nodes.hot_leads.manager.broadcast", new_callable=AsyncMock)
async def test_hot_leads_node_random_distribution(mock_broadcast):
    trigger = MockTrigger()
    seller = User(id=105, email="seller5@test.com", full_name="Seller Five", role="vendedor", is_active=True)
    
    db = MockDB({
        User: [seller]
    })

    node = {
        "id": "node-hot-2",
        "data": {
            "alertName": "Interesse Mentoria",
            "priority": "Baixa",
            "sellersQueueType": "selected",
            "selectedSellerIds": [105],
            "distributionMode": "random"
        }
    }

    res = await handle_hot_leads_node(db, trigger, node, trigger.contact_phone)
    
    assert res == "default"
    assert db.committed is True
    
    hot_lead = next(x for x in db.added if isinstance(x, HotLead))
    assert hot_lead.assigned_user_id == 105
    assert hot_lead.priority == "Baixa"
    assert mock_broadcast.called is True

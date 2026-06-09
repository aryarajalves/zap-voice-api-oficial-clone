import pytest
from unittest.mock import MagicMock, patch
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.engine.nodes.hot_leads import handle_hot_leads_node
import models

class MockUser:
    def __init__(self, id, client_id, role, is_active, seller_weight, full_name=None, email=None):
        self.id = id
        self.client_id = client_id
        self.role = role
        self.is_active = is_active
        self.seller_weight = seller_weight
        self.full_name = full_name
        self.email = email

@pytest.mark.asyncio
async def test_weighted_hot_leads_distribution():
    # Setup de vendedores com pesos diferentes
    # Vendedor 1: Peso 3 (deve receber 3 leads no ciclo sequencial)
    # Vendedor 2: Peso 1 (deve receber 1 lead no ciclo sequencial)
    seller_1 = MockUser(id=1, client_id=1, role="vendedor", is_active=True, seller_weight=3, full_name="Top Seller")
    seller_2 = MockUser(id=2, client_id=1, role="vendedor", is_active=True, seller_weight=1, full_name="Junior Seller")

    mock_users = [seller_1, seller_2]

    # Setup do mock de banco
    db = MagicMock()
    
    # query chain
    q = MagicMock()
    db.query.return_value = q
    q.filter.return_value = q
    q.filter_by.return_value = q
    q.join.return_value = q
    
    # Simula retorno dos usuários
    q.all.return_value = mock_users

    # Simula retorno do estado (inicialmente None)
    states = []
    added_objects = []
    def mock_first(*args, **kwargs):
        if not states:
            return None
        return states[0]

    q.first.side_effect = mock_first

    def mock_add(obj):
        added_objects.append(obj)
        # Se for estado
        if "RoundRobinState" in str(type(obj)):
            states.append(obj)
    db.add.side_effect = mock_add

    # Trigger dummy
    trigger = MagicMock()
    trigger.client_id = 1
    trigger.funnel_id = 1
    trigger.contact_name = "Lead Teste"

    node = {
        "id": "HOT_LEADS_NODE",
        "data": {
            "alertName": "Teste Ponderado",
            "priority": "Alta",
            "sellersQueueType": "all",
            "distributionMode": "round_robin"
        }
    }

    # Distribuição Sequencial: Ciclo Ponderado totaliza 4 passos ([1, 1, 1, 2])
    # Vamos simular 4 atribuições consecutivas e verificar a sequência dos IDs designados
    assigned_ids = []
    
    with patch("websocket_manager.manager.broadcast") as mock_broadcast:
        # Loop do ciclo (4 execuções)
        for i in range(4):
            # No motor real do funil, handle_hot_leads_node é rodado. 
            # Como a transação adiciona o hot_lead e faz commit, precisamos verificar os IDs de atribuicao salvos.
            
            # Limpa chamadas anteriores no log do mock, mas nao os objetos salvos
            added_objects.clear()
            
            await handle_hot_leads_node(db, trigger, node, "5585999999999")
            
            # Apanha o ID atribuido ao hot_lead criado na chamada
            added_hot_lead = None
            for obj in added_objects:
                if "HotLead" in str(type(obj)):
                    added_hot_lead = obj
            
            assert added_hot_lead is not None
            assigned_ids.append(added_hot_lead.assigned_user_id)

        # O ciclo sequencial gerado para pesos (Vendedor 1 = Peso 3, Vendedor 2 = Peso 1) ordenado por ID é:
        # sorted_users = [seller_1 (id=1), seller_2 (id=2)]
        # weighted_cycle = [1, 1, 1, 2]
        # Portanto, a sequência esperada de IDs designados deve ser exatamente [1, 1, 1, 2]
        assert assigned_ids == [1, 1, 1, 2]

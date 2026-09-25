import pytest
from unittest.mock import MagicMock
from core.engine.graph_executor import execute_graph_funnel

@pytest.fixture
def mock_trigger():
    trigger = MagicMock()
    trigger.id = 999
    trigger.client_id = 1
    trigger.current_node_id = "node_folder_1"
    trigger.status = "queued"
    trigger.funnel = MagicMock()
    return trigger

@pytest.mark.asyncio
async def test_folder_node_bypassed_safely_in_graph_executor(mock_trigger):
    """Valida que um nó visual de pasta/seção organizadora é processado com segurança no graph_executor."""
    db = MagicMock()

    nodes = [
        {
            "id": "node_folder_1",
            "type": "folderNode",
            "data": {
                "title": "Etapa de Teste",
                "description": "Seção organizadora"
            }
        },
        {
            "id": "node_folder_2",
            "type": "folderNode",
            "data": {
                "title": "Etapa 2 - Fechamento",
                "description": "Segunda seção organizadora"
            }
        }
    ]

    edges = [
        {
            "id": "edge_1",
            "source": "node_folder_1",
            "sourceHandle": "default",
            "target": "node_folder_2"
        }
    ]

    graph_data = {"nodes": nodes, "edges": edges}

    # Executar grafo com folderNode
    await execute_graph_funnel(
        trigger=mock_trigger,
        graph_data=graph_data,
        chatwoot=None,
        conversation_id="123",
        contact_phone="5511999999999",
        db=db,
        apply_vars_func=lambda text, phone: text
    )

    # Verifica que o gatilho foi concluído com sucesso
    assert mock_trigger.status == "completed"

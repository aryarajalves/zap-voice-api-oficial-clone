import os
import sys
import pytest
from unittest.mock import MagicMock

# Ajusta path para importar o backend
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

# Corrige DATABASE_URL para local caso necessário
db_url = os.getenv("DATABASE_URL")
if db_url:
    if "zapvoice-postgres:5432" in db_url:
        os.environ["DATABASE_URL"] = db_url.replace("zapvoice-postgres:5432", "localhost:5435")
    elif "zapvoice-postgres" in db_url:
        os.environ["DATABASE_URL"] = db_url.replace("zapvoice-postgres", "localhost")

from database import SessionLocal
import models
from core.engine.nodes.actions import handle_randomizer_node

@pytest.fixture
def db_session():
    session = SessionLocal()
    yield session
    session.close()

@pytest.mark.anyio
async def test_weighted_random_routing(db_session):
    # Mock do trigger
    trigger = MagicMock()
    trigger.client_id = 1
    trigger.funnel_id = 123
    
    # 1. Teste de Roteamento Aleatório com pesos definidos
    node = {
        "id": "node_random_test",
        "data": {
            "mode": "random",
            "paths": [
                {"id": "a", "label": "Caminho A", "percent": 100},
                {"id": "b", "label": "Caminho B", "percent": 0}
            ]
        }
    }
    
    # Executa 10 vezes. Como o Caminho A tem 100% de peso, deve retornar sempre "a"
    for _ in range(10):
        result = await handle_randomizer_node(db_session, trigger, node)
        assert result == "a"

@pytest.mark.anyio
async def test_round_robin_routing(db_session):
    # Mock do trigger
    trigger = MagicMock()
    trigger.client_id = 1
    trigger.funnel_id = 124
    
    node_id = "node_rr_test"
    
    # Limpa estados antigos caso existam no banco
    db_session.query(models.RoundRobinState).filter(
        models.RoundRobinState.client_id == trigger.client_id,
        models.RoundRobinState.funnel_id == trigger.funnel_id,
        models.RoundRobinState.node_id == node_id
    ).delete()
    db_session.commit()
    
    # Configura 3 saídas
    node = {
        "id": node_id,
        "data": {
            "mode": "round_robin",
            "paths": [
                {"id": "caminho_1", "label": "Caminho 1"},
                {"id": "caminho_2", "label": "Caminho 2"},
                {"id": "caminho_3", "label": "Caminho 3"}
            ]
        }
    }
    
    # Primeira execução: deve retornar o primeiro caminho ("caminho_1")
    res1 = await handle_randomizer_node(db_session, trigger, node)
    assert res1 == "caminho_1"
    
    # Segunda execução: deve alternar para "caminho_2"
    res2 = await handle_randomizer_node(db_session, trigger, node)
    assert res2 == "caminho_2"
    
    # Terceira execução: deve alternar para "caminho_3"
    res3 = await handle_randomizer_node(db_session, trigger, node)
    assert res3 == "caminho_3"
    
    # Quarta execução: deve voltar para "caminho_1" (ciclo completo)
    res4 = await handle_randomizer_node(db_session, trigger, node)
    assert res4 == "caminho_1"
    
    # Limpeza
    db_session.query(models.RoundRobinState).filter(
        models.RoundRobinState.client_id == trigger.client_id,
        models.RoundRobinState.funnel_id == trigger.funnel_id,
        models.RoundRobinState.node_id == node_id
    ).delete()
    db_session.commit()

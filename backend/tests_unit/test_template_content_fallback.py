"""
Testes unitários para:
1. extract_body_from_components - extrai texto real dos components do template
2. find_existing_conversation   - busca conversa existente SEM criar nova
3. executor.py delay de 5s antes de buscar conversa quando conversation_id é None
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from services.utils.bulk_helpers import extract_body_from_components


# ─────────────────────────────────────────────────────────────────────────────
# 1. extract_body_from_components
# ─────────────────────────────────────────────────────────────────────────────

def test_extract_body_from_components_retorna_texto_preenchido():
    """Deve extrair o texto dos parâmetros do componente BODY."""
    components = [
        {
            "type": "BODY",
            "parameters": [
                {"type": "text", "text": "João Silva"},
                {"type": "text", "text": "Curso Python"},
            ]
        }
    ]
    resultado = extract_body_from_components(components)
    assert resultado == "João Silva Curso Python"


def test_extract_body_from_components_case_insensitive():
    """O tipo 'body' em minúsculas também deve ser reconhecido."""
    components = [
        {
            "type": "body",
            "parameters": [{"type": "text", "text": "Maria"}]
        }
    ]
    resultado = extract_body_from_components(components)
    assert resultado == "Maria"


def test_extract_body_from_components_ignora_header_e_footer():
    """Deve ignorar componentes HEADER e FOOTER, pegar apenas BODY."""
    components = [
        {"type": "HEADER", "parameters": [{"type": "text", "text": "TÍTULO"}]},
        {"type": "BODY",   "parameters": [{"type": "text", "text": "Conteúdo real"}]},
        {"type": "FOOTER", "parameters": [{"type": "text", "text": "Rodapé"}]},
    ]
    resultado = extract_body_from_components(components)
    assert resultado == "Conteúdo real"


def test_extract_body_from_components_sem_components_retorna_none():
    """Deve retornar None quando não há components."""
    assert extract_body_from_components([]) is None
    assert extract_body_from_components(None) is None


def test_extract_body_from_components_sem_body_retorna_none():
    """Deve retornar None quando não há componente BODY."""
    components = [
        {"type": "HEADER", "parameters": [{"type": "text", "text": "Cabeçalho"}]},
    ]
    resultado = extract_body_from_components(components)
    assert resultado is None


def test_extract_body_from_components_parametros_vazios_retorna_none():
    """Deve retornar None quando o BODY não tem parâmetros com texto."""
    components = [
        {"type": "BODY", "parameters": []}
    ]
    resultado = extract_body_from_components(components)
    assert resultado is None


def test_extract_body_from_components_parametros_string():
    """Deve funcionar quando os parâmetros são strings diretamente."""
    components = [
        {"type": "BODY", "parameters": ["Valor1", "Valor2"]}
    ]
    resultado = extract_body_from_components(components)
    assert resultado == "Valor1 Valor2"


# ─────────────────────────────────────────────────────────────────────────────
# 2. find_existing_conversation (chatwoot contacts.py)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_find_existing_conversation_retorna_conversa_aberta():
    """Deve retornar a conversa aberta existente sem criar uma nova."""
    from core.clients.chatwoot.contacts import ChatwootContactsMixin

    client = MagicMock()
    client.api_token = "fake_token"

    # Mock: search_contact encontra contato
    client.search_contact = AsyncMock(return_value={
        "payload": [{"id": 42}]
    })

    # Mock: get_contact_conversations retorna conversa aberta
    client.get_contact_conversations = AsyncMock(return_value=[
        {"id": 999, "inbox_id": 2, "status": "open", "sort_timestamp": 1000},
    ])

    result = await ChatwootContactsMixin.find_existing_conversation(client, "5585999999999", inbox_id=2)

    assert result is not None
    assert result["conversation_id"] == 999
    assert result["contact_id"] == 42


@pytest.mark.asyncio
async def test_find_existing_conversation_retorna_none_sem_contato():
    """Deve retornar None quando o contato não existe no Chatwoot."""
    from core.clients.chatwoot.contacts import ChatwootContactsMixin

    client = MagicMock()
    client.api_token = "fake_token"
    client.search_contact = AsyncMock(return_value={"payload": []})

    result = await ChatwootContactsMixin.find_existing_conversation(client, "5500000000000")

    assert result is None


@pytest.mark.asyncio
async def test_find_existing_conversation_retorna_none_sem_conversas():
    """Deve retornar None quando o contato existe mas não tem conversas."""
    from core.clients.chatwoot.contacts import ChatwootContactsMixin

    client = MagicMock()
    client.api_token = "fake_token"
    client.search_contact = AsyncMock(return_value={"payload": [{"id": 10}]})
    client.get_contact_conversations = AsyncMock(return_value=[])

    result = await ChatwootContactsMixin.find_existing_conversation(client, "5585999999999")

    assert result is None


@pytest.mark.asyncio
async def test_find_existing_conversation_nao_chama_create_conversation():
    """Garante que find_existing_conversation NUNCA chama create_conversation."""
    from core.clients.chatwoot.contacts import ChatwootContactsMixin

    client = MagicMock()
    client.api_token = "fake_token"
    client.search_contact = AsyncMock(return_value={"payload": []})
    client.create_conversation = AsyncMock()

    await ChatwootContactsMixin.find_existing_conversation(client, "5585000000000")

    # Nunca deve criar conversa
    client.create_conversation.assert_not_called()


@pytest.mark.asyncio
async def test_find_existing_conversation_prioriza_open_sobre_resolved():
    """Deve priorizar conversa 'open' sobre 'resolved'."""
    from core.clients.chatwoot.contacts import ChatwootContactsMixin

    client = MagicMock()
    client.api_token = "fake_token"
    client.search_contact = AsyncMock(return_value={"payload": [{"id": 5}]})
    client.get_contact_conversations = AsyncMock(return_value=[
        {"id": 100, "inbox_id": 2, "status": "resolved", "sort_timestamp": 2000},
        {"id": 200, "inbox_id": 2, "status": "open",     "sort_timestamp": 1000},
    ])

    result = await ChatwootContactsMixin.find_existing_conversation(client, "5585111111111", inbox_id=2)

    assert result["conversation_id"] == 200


# ─────────────────────────────────────────────────────────────────────────────
# 3. executor.py — delay de 5s quando conversation_id é None
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_executor_aguarda_delay_quando_sem_conversation_id():
    """
    Quando conversation_id é None, o executor deve aguardar
    CONVERSATION_LOOKUP_DELAY_SECONDS antes de buscar a conversa.
    """
    from core.engine import executor as exec_module

    # Forçar o delay para 0 no teste (evita lentidão)
    original_delay = exec_module.CONVERSATION_LOOKUP_DELAY_SECONDS
    exec_module.CONVERSATION_LOOKUP_DELAY_SECONDS = 0

    try:
        with patch("core.engine.executor.asyncio.sleep", new_callable=AsyncMock) as mock_sleep, \
             patch("core.engine.executor.ChatwootClient") as mock_cw_cls, \
             patch("core.engine.executor.execute_graph_funnel", new_callable=AsyncMock), \
             patch("core.engine.executor.execute_legacy_funnel", new_callable=AsyncMock):

            mock_cw = AsyncMock()
            mock_cw.find_existing_conversation = AsyncMock(return_value=None)
            mock_cw.add_label_to_conversation = AsyncMock()
            mock_cw_cls.return_value = mock_cw

            # Mocks de DB
            mock_db = MagicMock()
            mock_trigger = MagicMock()
            mock_trigger.id = 1
            mock_trigger.client_id = 1
            mock_trigger.status = "processing"
            mock_trigger.conversation_id = None  # <- Sem conversation_id
            mock_trigger.chatwoot_label = None
            mock_trigger.private_message = None
            mock_trigger.chatwoot_account_id = 1
            mock_trigger.chatwoot_contact_id = 10
            mock_trigger.contact_phone = "5585999999999"

            mock_funnel = MagicMock()
            mock_funnel.steps = {}  # grafo

            mock_db.query.return_value.get.return_value = mock_funnel
            mock_db.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = mock_trigger
            mock_db.query.return_value.filter.return_value.all.return_value = []
            mock_db.query.return_value.filter.return_value.first.return_value = None

            with patch("core.engine.executor.get_setting", return_value="2"), \
                 patch("core.engine.executor.log_node_execution"):

                await exec_module.execute_funnel(
                    funnel_id=1,
                    conversation_id=None,  # <- sem conversa
                    trigger_id=1,
                    contact_phone="5585999999999",
                    db=mock_db
                )

            # O sleep deve ter sido chamado (delay de lookup)
            mock_sleep.assert_called()

    finally:
        exec_module.CONVERSATION_LOOKUP_DELAY_SECONDS = original_delay

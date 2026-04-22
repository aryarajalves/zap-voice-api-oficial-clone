"""
Testes unitários para services/window_manager.py

Cenários cobertos:
1. Cache HIT com janela aberta → retorna conversa original sem chamar API
2. Cache HIT com janela fechada + API encontra conversa aberta → redireciona
3. Cache MISS + API encontra conversa do mesmo número com janela aberta → redireciona
4. Cache MISS + API retorna vazio + cache com outra janela aberta → redireciona pelo cache
5. Nenhuma janela aberta em lugar nenhum → fallback para conversa original
6. API falha com exceção → não quebra, cai para busca no cache
"""

import pytest
import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone, timedelta

# Adiciona o diretório backend ao path (conftest também faz isso, mas garantindo)
backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)


def make_window(convo_id: int, phone: str, client_id: int, last_interaction: datetime, inbox_id: int = 1):
    """Helper para criar um mock de ContactWindow."""
    w = MagicMock()
    w.chatwoot_conversation_id = convo_id
    w.chatwoot_inbox_id = inbox_id
    w.phone = phone
    w.client_id = client_id
    w.last_interaction_at = last_interaction
    return w


def make_db(current_window=None, better_window=None):
    """Helper para criar mock da sessão SQLAlchemy."""
    db = MagicMock()
    
    # Simula db.query(...).filter(...).first()
    def query_side_effect(*args):
        q = MagicMock()
        
        def filter_side(*fargs):
            f = MagicMock()
            f.first.return_value = current_window
            f.order_by.return_value.first.return_value = better_window
            return f
        
        q.filter.side_effect = filter_side
        return q
    
    db.query.side_effect = query_side_effect
    return db


def make_chatwoot(conversations: list):
    """Helper para mock do ChatwootClient."""
    cw = MagicMock()
    cw.get_contact_conversations = AsyncMock(return_value=conversations)
    return cw


# ─────────────────────────────────────────────────────────────────────────────
# Importação lazy para evitar problemas de ambiente no CI
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def get_best_conversation_fn():
    from services.window_manager import get_best_conversation
    return get_best_conversation


NOW = datetime.now(timezone.utc)
PHONE = "5511999998888"
CLIENT_ID = 1
CURRENT_CONV_ID = 100


# ─────────────────────────────────────────────────────────────────────────────
# CENÁRIO 1: Cache HIT com janela aberta → deve retornar sem consultar API
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cache_hit_open_window_no_api_call(get_best_conversation_fn):
    """Cache tem registro com janela aberta → deve usar cache, NÃO chamar API."""
    recent_window = make_window(CURRENT_CONV_ID, PHONE, CLIENT_ID, NOW - timedelta(hours=1))
    db = make_db(current_window=recent_window)
    chatwoot = make_chatwoot([])

    result = await get_best_conversation_fn(CLIENT_ID, PHONE, CURRENT_CONV_ID, db, chatwoot)

    assert result == CURRENT_CONV_ID
    # API não deve ser chamada porque cache foi suficiente
    chatwoot.get_contact_conversations.assert_not_called()


# ─────────────────────────────────────────────────────────────────────────────
# CENÁRIO 2: Cache HIT com janela FECHADA + Cache tem outra conversa aberta
# (API NÃO é chamada pois já temos record no cache — vai direto para step 3)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cache_hit_closed_window_finds_better_in_cache(get_best_conversation_fn):
    """Cache tem registro com janela fechada. Busca no cache encontra outra conversa aberta."""
    old_window = make_window(CURRENT_CONV_ID, PHONE, CLIENT_ID, NOW - timedelta(hours=25))
    new_conv_id = 200
    other_window = make_window(new_conv_id, PHONE, CLIENT_ID, NOW - timedelta(hours=1))
    db = make_db(current_window=old_window, better_window=other_window)

    chatwoot = make_chatwoot([])  # Não deve ser chamado

    result = await get_best_conversation_fn(CLIENT_ID, PHONE, CURRENT_CONV_ID, db, chatwoot)

    assert result == new_conv_id
    # API NÃO deve ser chamada quando já existe registro no cache (mesmo que fechado)
    chatwoot.get_contact_conversations.assert_not_called()


# ─────────────────────────────────────────────────────────────────────────────
# CENÁRIO 3: Cache MISS + API encontra janela aberta
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cache_miss_api_finds_open_window(get_best_conversation_fn):
    """Sem registro no cache para a conversa atual → API chamada, retorna conversa com janela aberta."""
    db = make_db(current_window=None, better_window=None)

    new_conv_id = 300
    recent_ts = int((NOW - timedelta(hours=3)).timestamp())

    chatwoot = make_chatwoot([
        {"id": CURRENT_CONV_ID, "last_activity_at": int((NOW - timedelta(hours=30)).timestamp())},
        {"id": new_conv_id, "last_activity_at": recent_ts}
    ])

    result = await get_best_conversation_fn(CLIENT_ID, PHONE, CURRENT_CONV_ID, db, chatwoot)

    assert result == new_conv_id
    chatwoot.get_contact_conversations.assert_called_once_with(PHONE)


# ─────────────────────────────────────────────────────────────────────────────
# CENÁRIO 4: Cache MISS + API retorna vazio + Cache tem outra janela aberta
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cache_miss_api_empty_cache_has_other_open(get_best_conversation_fn):
    """API retorna vazio mas cache tem outra conversa aberta pelo mesmo número."""
    other_conv_id = 400
    other_window = make_window(other_conv_id, PHONE, CLIENT_ID, NOW - timedelta(hours=1))
    db = make_db(current_window=None, better_window=other_window)

    chatwoot = make_chatwoot([])  # API não encontra nada

    result = await get_best_conversation_fn(CLIENT_ID, PHONE, CURRENT_CONV_ID, db, chatwoot)

    assert result == other_conv_id


# ─────────────────────────────────────────────────────────────────────────────
# CENÁRIO 5: Nenhuma janela aberta em lugar nenhum → fallback para original
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_no_open_window_fallback_to_original(get_best_conversation_fn):
    """Nenhuma fonte tem janela aberta → retorna conversa original como fallback."""
    db = make_db(current_window=None, better_window=None)

    chatwoot = make_chatwoot([
        {"id": CURRENT_CONV_ID, "last_activity_at": int((NOW - timedelta(hours=26)).timestamp())}
    ])

    result = await get_best_conversation_fn(CLIENT_ID, PHONE, CURRENT_CONV_ID, db, chatwoot)

    assert result == CURRENT_CONV_ID  # Mantém original como fallback


# ─────────────────────────────────────────────────────────────────────────────
# CENÁRIO 6: API falha com exceção → não quebra, continua para busca no cache
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_api_exception_does_not_crash(get_best_conversation_fn):
    """Se a API lançar exceção, o sistema não deve quebrar e deve cair para o cache."""
    other_conv_id = 500
    other_window = make_window(other_conv_id, PHONE, CLIENT_ID, NOW - timedelta(hours=1))
    db = make_db(current_window=None, better_window=other_window)

    chatwoot = MagicMock()
    chatwoot.get_contact_conversations = AsyncMock(side_effect=Exception("API timeout"))

    result = await get_best_conversation_fn(CLIENT_ID, PHONE, CURRENT_CONV_ID, db, chatwoot)

    # Deve ter feito fallback para o cache e encontrado a janela aberta
    assert result == other_conv_id


# ─────────────────────────────────────────────────────────────────────────────
# CENÁRIO 7: Sem chatwoot instance → não tenta API, vai direto para cache
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_no_chatwoot_instance_uses_cache(get_best_conversation_fn):
    """Se chatwoot=None, não deve tentar chamar API, apenas usar cache."""
    other_conv_id = 600
    other_window = make_window(other_conv_id, PHONE, CLIENT_ID, NOW - timedelta(hours=1))
    db = make_db(current_window=None, better_window=other_window)

    result = await get_best_conversation_fn(CLIENT_ID, PHONE, CURRENT_CONV_ID, db, chatwoot=None)

    assert result == other_conv_id

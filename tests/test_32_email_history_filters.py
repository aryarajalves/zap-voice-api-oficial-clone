
"""
test_32_email_history_filters.py
Testes unitários para os filtros do Histórico de Disparos de E-mail.

Verifica a lógica de filtragem (simulando o comportamento do frontend):
  - Filtro por status (completed, failed, completed_with_errors, scheduled)
  - Filtro por nome / assunto / etiqueta (busca textual)
  - Filtro por data (De / Até) usando horário de Brasília (UTC-3)
  - Combinação de múltiplos filtros
  - Limpar filtros retorna todos os itens
"""

import pytest
from datetime import datetime, timezone, timedelta


# ---------------------------------------------------------------------------
# Dados de exemplo (simulam o retorno do GET /api/email/history)
# ---------------------------------------------------------------------------

SAMPLE_HISTORY = [
    {
        "id": 1,
        "title": "Campanha Boas-vindas",
        "subject": "Bem-vindo ao nosso sistema!",
        "tag_name": "novos",
        "status": "completed",
        "total_contacts": 10,
        "total_sent": 10,
        "total_failed": 0,
        "failure_reason": None,
        "created_at": "2026-07-24T09:00:00Z",
        "scheduled_time": None,
    },
    {
        "id": 2,
        "title": "Campanha Oferta Especial",
        "subject": "50% OFF somente hoje",
        "tag_name": "vip",
        "status": "failed",
        "total_contacts": 5,
        "total_sent": 0,
        "total_failed": 5,
        "failure_reason": "SMTP authentication failed",
        "created_at": "2026-07-23T14:30:00Z",
        "scheduled_time": None,
    },
    {
        "id": 3,
        "title": "Webinário Julho",
        "subject": "Inscreva-se no webinário",
        "tag_name": "leads",
        "status": "completed_with_errors",
        "total_contacts": 20,
        "total_sent": 15,
        "total_failed": 5,
        "failure_reason": None,
        "created_at": "2026-07-22T10:00:00Z",
        "scheduled_time": None,
    },
    {
        "id": 4,
        "title": "Newsletter Agosto",
        "subject": "Novidades de agosto",
        "tag_name": None,
        "status": "scheduled",
        "total_contacts": 50,
        "total_sent": 0,
        "total_failed": 0,
        "failure_reason": None,
        "created_at": "2026-07-24T12:00:00Z",
        "scheduled_time": "2026-08-01T08:00:00Z",
    },
    {
        "id": 5,
        "title": "Reengajamento",
        "subject": "Sentimos sua falta!",
        "tag_name": "inativos",
        "status": "completed",
        "total_contacts": 30,
        "total_sent": 30,
        "total_failed": 0,
        "failure_reason": None,
        "created_at": "2026-07-20T08:00:00Z",
        "scheduled_time": None,
    },
]


# ---------------------------------------------------------------------------
# Funções de filtro (espelham a lógica do EmailHistoryTab.jsx)
# ---------------------------------------------------------------------------

def apply_filters(history, filter_status="", filter_search="", filter_date_from="", filter_date_to=""):
    """Replica a lógica de filtros do componente React (frontend)."""
    result = []
    for item in history:
        # Filtro por status
        if filter_status and item["status"] != filter_status:
            continue

        # Filtro por texto (title, subject, tag_name)
        if filter_search.strip():
            q = filter_search.strip().lower()
            in_title = q in (item.get("title") or "").lower()
            in_subject = q in (item.get("subject") or "").lower()
            in_tag = q in (item.get("tag_name") or "").lower()
            if not in_title and not in_subject and not in_tag:
                continue

        # Filtro por data (Brasília = UTC-3)
        if filter_date_from or filter_date_to:
            raw = item.get("created_at", "")
            item_dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))

            if filter_date_from:
                from_dt = datetime.fromisoformat(filter_date_from + "T00:00:00-03:00")
                if item_dt < from_dt:
                    continue

            if filter_date_to:
                to_dt = datetime.fromisoformat(filter_date_to + "T23:59:59-03:00")
                if item_dt > to_dt:
                    continue

        result.append(item)
    return result


# ---------------------------------------------------------------------------
# Testes de filtro por status
# ---------------------------------------------------------------------------

class TestFilterByStatus:
    def test_sem_filtro_retorna_todos(self):
        result = apply_filters(SAMPLE_HISTORY, filter_status="")
        assert len(result) == 5

    def test_filtro_completed(self):
        result = apply_filters(SAMPLE_HISTORY, filter_status="completed")
        assert all(r["status"] == "completed" for r in result)
        assert len(result) == 2

    def test_filtro_failed(self):
        result = apply_filters(SAMPLE_HISTORY, filter_status="failed")
        assert len(result) == 1
        assert result[0]["id"] == 2

    def test_filtro_completed_with_errors(self):
        result = apply_filters(SAMPLE_HISTORY, filter_status="completed_with_errors")
        assert len(result) == 1
        assert result[0]["id"] == 3

    def test_filtro_scheduled(self):
        result = apply_filters(SAMPLE_HISTORY, filter_status="scheduled")
        assert len(result) == 1
        assert result[0]["id"] == 4

    def test_filtro_status_inexistente_retorna_vazio(self):
        result = apply_filters(SAMPLE_HISTORY, filter_status="processing")
        assert len(result) == 0


# ---------------------------------------------------------------------------
# Testes de filtro por texto
# ---------------------------------------------------------------------------

class TestFilterBySearch:
    def test_busca_por_titulo(self):
        result = apply_filters(SAMPLE_HISTORY, filter_search="Webinário")
        assert len(result) == 1
        assert result[0]["id"] == 3

    def test_busca_case_insensitive(self):
        result = apply_filters(SAMPLE_HISTORY, filter_search="WEBINÁRIO")
        assert len(result) == 1

    def test_busca_por_assunto(self):
        result = apply_filters(SAMPLE_HISTORY, filter_search="OFF somente")
        assert len(result) == 1
        assert result[0]["id"] == 2

    def test_busca_por_etiqueta(self):
        result = apply_filters(SAMPLE_HISTORY, filter_search="vip")
        assert len(result) == 1
        assert result[0]["id"] == 2

    def test_busca_vazia_retorna_todos(self):
        result = apply_filters(SAMPLE_HISTORY, filter_search="   ")
        assert len(result) == 5

    def test_busca_sem_resultado(self):
        result = apply_filters(SAMPLE_HISTORY, filter_search="xyz_nao_existe_999")
        assert len(result) == 0

    def test_busca_parcial(self):
        # 'camp' está apenas em 'Campanha Boas-vindas'
        result = apply_filters(SAMPLE_HISTORY, filter_search="camp")
        assert len(result) == 1
        assert result[0]["id"] == 1


# ---------------------------------------------------------------------------
# Testes de filtro por data
# ---------------------------------------------------------------------------

class TestFilterByDate:
    def test_filtro_data_from_exclui_anteriores(self):
        # Apenas disparos de 24/07 em diante
        result = apply_filters(SAMPLE_HISTORY, filter_date_from="2026-07-24")
        ids = [r["id"] for r in result]
        assert 1 in ids   # 2026-07-24T09:00
        assert 4 in ids   # 2026-07-24T12:00
        assert 2 not in ids  # 2026-07-23
        assert 3 not in ids  # 2026-07-22
        assert 5 not in ids  # 2026-07-20

    def test_filtro_data_to_exclui_posteriores(self):
        # Apenas disparos até 22/07
        result = apply_filters(SAMPLE_HISTORY, filter_date_to="2026-07-22")
        ids = [r["id"] for r in result]
        assert 3 in ids   # 2026-07-22
        assert 5 in ids   # 2026-07-20
        assert 1 not in ids  # 2026-07-24
        assert 2 not in ids  # 2026-07-23

    def test_filtro_intervalo_data(self):
        # Apenas disparos de 23/07 a 23/07
        result = apply_filters(SAMPLE_HISTORY, filter_date_from="2026-07-23", filter_date_to="2026-07-23")
        assert len(result) == 1
        assert result[0]["id"] == 2

    def test_sem_filtro_data_retorna_todos(self):
        result = apply_filters(SAMPLE_HISTORY, filter_date_from="", filter_date_to="")
        assert len(result) == 5


# ---------------------------------------------------------------------------
# Testes de combinação de filtros
# ---------------------------------------------------------------------------

class TestFilterCombination:
    def test_status_e_busca(self):
        result = apply_filters(SAMPLE_HISTORY, filter_status="completed", filter_search="boas")
        assert len(result) == 1
        assert result[0]["id"] == 1

    def test_status_e_data(self):
        result = apply_filters(SAMPLE_HISTORY, filter_status="completed", filter_date_from="2026-07-24")
        assert len(result) == 1
        assert result[0]["id"] == 1

    def test_todos_filtros_combinados(self):
        result = apply_filters(
            SAMPLE_HISTORY,
            filter_status="completed",
            filter_search="boas-vindas",
            filter_date_from="2026-07-24",
            filter_date_to="2026-07-24"
        )
        assert len(result) == 1
        assert result[0]["id"] == 1

    def test_filtros_sem_resultado(self):
        result = apply_filters(
            SAMPLE_HISTORY,
            filter_status="failed",
            filter_search="newsletter"
        )
        assert len(result) == 0

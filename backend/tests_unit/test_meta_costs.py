import pytest
from datetime import datetime, timezone
import uuid
import models
from core.deps import get_current_user
from services.financial_meta_service import get_meta_costs_summary

mock_user = models.User(id=200, email="metacosts@example.com", client_id=200, is_active=True)

async def override_get_current_user():
    return mock_user

def test_meta_costs_calculation_logic(db_session):
    """
    Testa a lógica de cálculo de custos e consumo da franquia Meta:
    - 500 mensagens de serviço -> dentro da franquia (0 excedente, custo de serviço = 0)
    - 1.500 mensagens de serviço -> 1.000 franquia + 500 excedentes pagas a R$ 0,0350
    - Disparos de marketing a R$ 0,3500
    - Disparos de utilidade a R$ 0,0350
    """
    client_id = 200
    c = models.Client(id=client_id, name="Client Meta Costs")
    db_session.add(c)
    db_session.commit()

    # 1. Cria conversa e 1.200 mensagens de serviço enviadas pelo bot/atendente
    convo = models.ChatConversation(
        client_id=client_id,
        phone="5511999990000",
        contact_name="Lead Teste"
    )
    db_session.add(convo)
    db_session.commit()

    now = datetime.now(timezone.utc)
    messages = [
        models.ChatMessage(
            conversation_id=convo.id,
            sender_type="user",
            message_type="text",
            content=f"Mensagem de atendimento {i}",
            status="delivered",
            timestamp=now
        )
        for i in range(1200)
    ]
    db_session.add_all(messages)

    # 2. Cria 100 disparos de Marketing (sem integration_id)
    t_mkt = models.ScheduledTrigger(
        client_id=client_id,
        template_name="promo_outubro",
        total_delivered=100,
        total_paid_templates=100,
        status="completed",
        created_at=now
    )
    # 3. Cria 50 disparos de Utilidade (com integration_id)
    int_id = uuid.uuid4()
    t_util = models.ScheduledTrigger(
        client_id=client_id,
        template_name="compra_confirmada",
        integration_id=int_id,
        total_delivered=50,
        total_paid_templates=50,
        status="completed",
        created_at=now
    )
    db_session.add_all([t_mkt, t_util])
    db_session.commit()

    # Executa o cálculo
    summary = get_meta_costs_summary(db=db_session, client_id=client_id)

    # Asserções de Contagem
    assert summary["counts"]["service_count"] == 1200
    assert summary["counts"]["marketing_count"] == 100
    assert summary["counts"]["utility_count"] == 50

    # Asserções de Franquia
    quota = summary["quota"]
    assert quota["total"] == 1000
    assert quota["used"] == 1000
    assert quota["remaining"] == 0
    assert quota["percent_used"] == 100.0
    assert quota["billable_service_count"] == 200  # 1200 - 1000 = 200 excedentes

    # Asserções de Custos
    costs = summary["costs"]
    # Marketing: 100 * 0.35 = 35.00
    assert costs["marketing_cost"] == 35.0
    # Utilidade: 50 * 0.035 = 1.75
    assert costs["utility_cost"] == 1.75
    # Serviço: 200 * 0.035 = 7.00
    assert costs["service_cost"] == 7.0
    # Total: 35.00 + 1.75 + 7.00 = 43.75
    assert costs["total_cost"] == 43.75
    # Economia da franquia: 1000 * 0.035 = 35.00
    assert costs["savings_quota"] == 35.0


def test_financial_summary_month_filter(client, db_session):
    """
    Testa o filtro por mês específico no endpoint GET /api/financial/summary?month=YYYY-MM.
    """
    from main import app
    app.dependency_overrides[get_current_user] = override_get_current_user

    try:
        c = models.Client(id=200, name="Client Summary Month Test")
        db_session.add(c)
        db_session.commit()

        # Cria 1 disparo em Outubro/2026
        dt_oct = datetime(2026, 10, 15, 12, 0, 0, tzinfo=timezone.utc)
        t_oct = models.ScheduledTrigger(
            client_id=200,
            template_name="promo_outubro",
            total_delivered=50,
            total_paid_templates=50,
            status="completed",
            created_at=dt_oct
        )
        # Cria 1 disparo em Setembro/2026
        dt_sep = datetime(2026, 9, 10, 12, 0, 0, tzinfo=timezone.utc)
        t_sep = models.ScheduledTrigger(
            client_id=200,
            template_name="promo_setembro",
            total_delivered=30,
            total_paid_templates=30,
            status="completed",
            created_at=dt_sep
        )
        db_session.add_all([t_oct, t_sep])
        db_session.commit()

        # Busca filtrando especificamente por 2026-10
        res = client.get("/api/financial/summary?period=daily&month=2026-10")
        assert res.status_code == 200
        data = res.json()
        assert data["totals"]["total_sent"] == 50
        assert data["totals"]["paid_sent"] == 50

        # Busca filtrando especificamente por 2026-09
        res_sep = client.get("/api/financial/summary?period=daily&month=2026-09")
        assert res_sep.status_code == 200
        data_sep = res_sep.json()
        assert data_sep["totals"]["total_sent"] == 30
        assert data_sep["totals"]["paid_sent"] == 30
    finally:
        app.dependency_overrides.pop(get_current_user, None)


import pytest
from datetime import datetime, timezone
import uuid
import models
from core.deps import get_current_user
from services.webhooks_utils import is_refund_eligible_for_lead, normalize_phone_suf, normalize_product_key

mock_user = models.User(id=99, email="dedup@example.com", client_id=99, is_active=True)

async def override_get_current_user():
    return mock_user

def test_refund_dedup_service_logic(db_session):
    """
    Testa a função de serviço is_refund_eligible_for_lead:
    - Sem compras -> False
    - 1 compra -> True
    - 1 compra + 1 reembolso já registrado -> False
    - 1 compra + 1 reembolso + 1 recompra -> True
    - 1 compra + 1 reembolso + 1 recompra + 1 reembolso -> False
    """
    integration_id = uuid.uuid4()
    integration = models.WebhookIntegration(
        id=integration_id,
        client_id=99,
        name="Hotmart Dedup Test",
        platform="hotmart",
        status="active"
    )
    db_session.add(integration)
    db_session.commit()

    phone = "5511999887766"
    prod = "Curso ZapVoice Pro"

    # 1. Sem compras anteriores aprovadas
    eligible = is_refund_eligible_for_lead(
        db=db_session,
        integration_id=integration_id,
        phone=phone,
        email="lead@test.com",
        buyer_name="Lead Teste",
        product_name=prod
    )
    assert eligible is False

    # 2. Registrar 1 compra aprovada
    h1 = models.WebhookHistory(
        integration_id=integration_id,
        event_type="compra_aprovada",
        processed_data={"phone": phone, "product_name": prod, "price": 100},
        status="success",
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(h1)
    db_session.commit()

    # Agora deve ser elegível
    assert is_refund_eligible_for_lead(
        db=db_session,
        integration_id=integration_id,
        phone=phone,
        email="lead@test.com",
        product_name=prod,
        buyer_name="Lead Teste"
    ) is True

    # 3. Registrar o 1º reembolso
    h2 = models.WebhookHistory(
        integration_id=integration_id,
        event_type="reembolso",
        processed_data={"phone": phone, "product_name": prod, "price": 100},
        status="success",
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(h2)
    db_session.commit()

    # Agora não deve mais ser elegível (já consumiu a compra)
    assert is_refund_eligible_for_lead(
        db=db_session,
        integration_id=integration_id,
        phone=phone,
        email="lead@test.com",
        product_name=prod,
        buyer_name="Lead Teste"
    ) is False

    # 4. Registrar recompra do mesmo curso
    h3 = models.WebhookHistory(
        integration_id=integration_id,
        event_type="compra_aprovada",
        processed_data={"phone": phone, "product_name": prod, "price": 100},
        status="success",
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(h3)
    db_session.commit()

    # Deve voltar a ser elegível pois comprou novamente
    assert is_refund_eligible_for_lead(
        db=db_session,
        integration_id=integration_id,
        phone=phone,
        email="lead@test.com",
        product_name=prod,
        buyer_name="Lead Teste"
    ) is True

    # 5. Registrar o 2º reembolso (da recompra)
    h4 = models.WebhookHistory(
        integration_id=integration_id,
        event_type="reembolso",
        processed_data={"phone": phone, "product_name": prod, "price": 100},
        status="success",
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(h4)
    db_session.commit()

    # Não deve mais ser elegível
    assert is_refund_eligible_for_lead(
        db=db_session,
        integration_id=integration_id,
        phone=phone,
        email="lead@test.com",
        product_name=prod,
        buyer_name="Lead Teste"
    ) is False


def test_financial_sales_deduplication(client, db_session):
    """
    Testa se o endpoint /api/financial/sales ignora reembolsos duplicados no cálculo
    de faturamento e contagem de vendas/reembolsos quando há eventos repetidos no histórico.
    """
    from main import app
    app.dependency_overrides[get_current_user] = override_get_current_user

    try:
        c = models.Client(id=99, name="Client Dedup")
        db_session.add(c)
        db_session.commit()

        integration_id = uuid.uuid4()
        integration = models.WebhookIntegration(
            id=integration_id,
            client_id=99,
            name="Platform Dedup",
            platform="hotmart",
            status="active"
        )
        db_session.add(integration)
        db_session.commit()

        # Cenário:
        # Lead comprou 1 vez por R$ 200.
        # Plataforma enviou 3 webhooks de reembolso para essa mesma compra.
        # Apenas 1 reembolso deve ser contabilizado no dashboard!
        h_buy = models.WebhookHistory(
            integration_id=integration_id,
            event_type="compra_aprovada",
            processed_data={
                "phone": "+55 11 98888-7777",
                "email": "cliente@teste.com",
                "name": "Cliente Fiel",
                "product_name": "Mentoria VIP",
                "price": "200.00",
                "platform": "hotmart",
                "raw_status": "Aprovada"
            },
            status="success",
            created_at=datetime.now(timezone.utc)
        )
        h_ref1 = models.WebhookHistory(
            integration_id=integration_id,
            event_type="reembolso",
            processed_data={
                "phone": "+55 11 98888-7777",
                "email": "cliente@teste.com",
                "name": "Cliente Fiel",
                "product_name": "Mentoria VIP",
                "price": "200.00",
                "platform": "hotmart",
                "raw_status": "Reembolsada"
            },
            status="success",
            created_at=datetime.now(timezone.utc)
        )
        h_ref2 = models.WebhookHistory(
            integration_id=integration_id,
            event_type="reembolso",
            processed_data={
                "phone": "+55 11 98888-7777",
                "email": "cliente@teste.com",
                "name": "Cliente Fiel",
                "product_name": "Mentoria VIP",
                "price": "200.00",
                "platform": "hotmart",
                "raw_status": "Reembolsada"
            },
            status="success",
            created_at=datetime.now(timezone.utc)
        )
        h_ref3 = models.WebhookHistory(
            integration_id=integration_id,
            event_type="reembolso",
            processed_data={
                "phone": "+55 11 98888-7777",
                "email": "cliente@teste.com",
                "name": "Cliente Fiel",
                "product_name": "Mentoria VIP",
                "price": "200.00",
                "platform": "hotmart",
                "raw_status": "Reembolsada"
            },
            status="success",
            created_at=datetime.now(timezone.utc)
        )

        db_session.add_all([h_buy, h_ref1, h_ref2, h_ref3])
        db_session.commit()

        res = client.get("/api/financial/sales?period=monthly")
        assert res.status_code == 200
        data = res.json()
        totals = data["totals"]

        # 1 compra (200) - 1 reembolso (200) = 0.00 receita
        # total_refunds deve ser 1 (e NÃO 3!)
        assert totals["total_refunds"] == 1, f"Esperado 1 reembolso, obtido {totals['total_refunds']}"
        assert totals["total_sales"] == 0
        assert totals["total_revenue"] == 0.0

        # Lista de transações só deve conter a compra e o 1º reembolso válido
        txs = data["transactions"]
        refund_txs = [t for t in txs if t["category"] == "refunded"]
        assert len(refund_txs) == 1, f"Esperado 1 transação de reembolso na lista, obtido {len(refund_txs)}"

    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_financial_sales_chargeback_handling(client, db_session):
    """
    Testa se o evento de chargeback desconta a receita e aparece no financeiro
    como estorno (category: refunded, totals: total_refunds).
    """
    from main import app
    mock_cb_user = models.User(id=101, email="cb@example.com", client_id=101, is_active=True)
    async def override_cb_user():
        return mock_cb_user
    app.dependency_overrides[get_current_user] = override_cb_user

    try:
        c = models.Client(id=101, name="Client CB")
        db_session.add(c)
        db_session.commit()

        integration_id = uuid.uuid4()
        integration = models.WebhookIntegration(
            id=integration_id,
            client_id=101,
            name="Platform CB",
            platform="hotmart",
            status="active"
        )
        db_session.add(integration)
        db_session.commit()

        # Compra de R$ 350
        h_buy = models.WebhookHistory(
            integration_id=integration_id,
            event_type="compra_aprovada",
            processed_data={
                "phone": "+55 11 97777-6666",
                "email": "cb@teste.com",
                "name": "Cliente Contestador",
                "product_name": "Combo Anual",
                "price": "350.00",
                "platform": "hotmart",
                "raw_status": "Aprovada"
            },
            status="success",
            created_at=datetime.now(timezone.utc)
        )
        # Evento de Chargeback de R$ 350
        h_cb = models.WebhookHistory(
            integration_id=integration_id,
            event_type="chargeback",
            processed_data={
                "phone": "+55 11 97777-6666",
                "email": "cb@teste.com",
                "name": "Cliente Contestador",
                "product_name": "Combo Anual",
                "price": "350.00",
                "platform": "hotmart",
                "raw_status": "Chargeback"
            },
            status="success",
            created_at=datetime.now(timezone.utc)
        )
        db_session.add_all([h_buy, h_cb])
        db_session.commit()

        res = client.get("/api/financial/sales?period=monthly")
        assert res.status_code == 200
        data = res.json()
        totals = data["totals"]

        # Receita deve ser 0 (350 - 350), 1 estorno registrado
        assert totals["total_revenue"] == 0.0
        assert totals["total_refunds"] == 1
        assert totals["total_sales"] == 0

        # Na lista de transações, chargeback deve vir com category='refunded'
        txs = data["transactions"]
        cb_tx = next(t for t in txs if t["event_type"] == "chargeback")
        assert cb_tx["category"] == "refunded"
        assert cb_tx["status"] == "Chargeback"

    finally:
        app.dependency_overrides.pop(get_current_user, None)


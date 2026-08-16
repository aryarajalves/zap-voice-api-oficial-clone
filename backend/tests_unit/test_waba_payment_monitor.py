import pytest
import os
import json
from unittest.mock import patch, MagicMock, AsyncMock
import models
from services.waba_payment_service import WabaPaymentService

@pytest.mark.asyncio
async def test_waba_payment_check_missing_credentials(db_session):
    """Valida que quando o cliente não tem credenciais configuradas, o status é UNAVAILABLE"""
    test_client = models.Client(name="Test Client No Creds", is_active=True)
    db_session.add(test_client)
    db_session.commit()
    db_session.refresh(test_client)

    result = await WabaPaymentService.check_client_payment_status(db_session, test_client.id, check_type="MANUAL")
    assert result.status == "UNAVAILABLE"
    assert result.has_error is False
    assert "não configurados" in result.details

@pytest.mark.asyncio
async def test_waba_payment_check_healthy_status(db_session):
    """Valida que quando a Meta responde 200 OK e status APPROVED, o resultado é HEALTHY"""
    test_client = models.Client(name="Test Client Healthy", is_active=True)
    db_session.add(test_client)
    db_session.commit()
    db_session.refresh(test_client)

    # Configura credenciais
    cfg1 = models.AppConfig(client_id=test_client.id, key="WA_ACCESS_TOKEN", value="test_token")
    cfg2 = models.AppConfig(client_id=test_client.id, key="WA_BUSINESS_ACCOUNT_ID", value="123456789")
    db_session.add_all([cfg1, cfg2])
    db_session.commit()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "id": "123456789",
        "name": "Empresa Teste",
        "account_review_status": "APPROVED",
        "currency": "BRL",
        "primary_funding_id": "card_123"
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        result = await WabaPaymentService.check_client_payment_status(db_session, test_client.id, check_type="AUTOMATIC")

    assert result.status == "HEALTHY"
    assert result.has_error is False
    assert result.account_review_status == "APPROVED"
    assert result.currency == "BRL"
    assert "Vinculado" in result.payment_method_status

@pytest.mark.asyncio
async def test_waba_payment_check_detects_payment_issue_error(db_session):
    """Valida que erros como 131042 ou conta desabilitada são identificados como PAYMENT_ISSUE"""
    test_client = models.Client(name="Test Client Issue", is_active=True)
    db_session.add(test_client)
    db_session.commit()
    db_session.refresh(test_client)

    cfg1 = models.AppConfig(client_id=test_client.id, key="WA_ACCESS_TOKEN", value="test_token")
    cfg2 = models.AppConfig(client_id=test_client.id, key="WA_BUSINESS_ACCOUNT_ID", value="987654321")
    db_session.add_all([cfg1, cfg2])
    db_session.commit()

    mock_resp = MagicMock()
    mock_resp.status_code = 400
    mock_resp.json.return_value = {
        "error": {
            "message": "Payment issue: Account has an outstanding balance.",
            "code": 131042
        }
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        result = await WabaPaymentService.check_client_payment_status(db_session, test_client.id, check_type="MANUAL")

    assert result.status == "PAYMENT_ISSUE"
    assert result.has_error is True
    assert "Pendência de Pagamento" in result.details or "fatura em aberto" in result.details

def test_waba_payment_history_retrieval(db_session):
    """Valida a recuperação de histórico de verificações"""
    test_client = models.Client(name="Test Client History", is_active=True)
    db_session.add(test_client)
    db_session.commit()
    db_session.refresh(test_client)

    rec1 = models.WabaPaymentCheck(
        client_id=test_client.id,
        status="HEALTHY",
        check_type="AUTOMATIC",
        has_error=False,
        details="Tudo OK 1"
    )
    rec2 = models.WabaPaymentCheck(
        client_id=test_client.id,
        status="PAYMENT_ISSUE",
        check_type="MANUAL",
        has_error=True,
        details="Erro de Cartão"
    )
    db_session.add_all([rec1, rec2])
    db_session.commit()

    history = WabaPaymentService.get_payment_checks_history(db_session, test_client.id, limit=10)
    assert len(history) >= 2
    assert history[0].id == rec2.id

def test_waba_payment_api_endpoints(client, db_session):
    """Testa os endpoints GET /api/waba-payment/status, POST /api/waba-payment/check-now e GET /api/waba-payment/history"""
    test_user = models.User(
        email="wabapayment@test.com",
        hashed_password="hashed_pwd",
        is_active=True,
        role="admin"
    )
    db_session.add(test_user)
    db_session.commit()
    db_session.refresh(test_user)

    test_client = models.Client(name="API Client", is_active=True)
    db_session.add(test_client)
    db_session.commit()
    db_session.refresh(test_client)

    test_user.client_id = test_client.id
    db_session.commit()

    from core.deps import get_current_user
    from main import app
    app.dependency_overrides[get_current_user] = lambda: test_user

    try:
        # 1. GET status
        res_status = client.get("/api/waba-payment/status", headers={"X-Client-ID": str(test_client.id)})
        assert res_status.status_code == 200
        data_status = res_status.json()
        assert "status" in data_status
        assert data_status["client_id"] == test_client.id

        # 2. POST check-now
        res_check = client.post("/api/waba-payment/check-now", headers={"X-Client-ID": str(test_client.id)})
        assert res_check.status_code == 200
        data_check = res_check.json()
        assert data_check["check_type"] == "MANUAL"

        # 3. GET history
        res_hist = client.get("/api/waba-payment/history", headers={"X-Client-ID": str(test_client.id)})
        assert res_hist.status_code == 200
        data_hist = res_hist.json()
        assert isinstance(data_hist, list)
        assert len(data_hist) >= 1
    finally:
        app.dependency_overrides.pop(get_current_user, None)

import pytest
from datetime import datetime, timezone, timedelta
import uuid
import models
from core.deps import get_current_user

# Global mock user
mock_user = models.User(id=1, email="test@example.com", client_id=1, is_active=True)

async def override_get_current_user():
    return mock_user

def test_financial_sales_endpoint(client, db_session):
    # Setup dependency override for auth
    from main import app
    app.dependency_overrides[get_current_user] = override_get_current_user

    try:
        # 1. Create client and integration
        c = models.Client(id=1, name="Client 1")
        db_session.add(c)
        db_session.commit()

        integration_id = uuid.uuid4()
        integration = models.WebhookIntegration(
            id=integration_id,
            client_id=1,
            name="Platform A",
            platform="hotmart",
            status="active"
        )
        db_session.add(integration)
        db_session.commit()

        # 2. Add history records
        h1 = models.WebhookHistory(
            integration_id=integration_id,
            event_type="compra_aprovada",
            processed_data={
                "price": "199.90",
                "product_name": "Product Gold",
                "platform": "hotmart",
                "payment_method": "Cartão de Crédito",
                "name": "João da Silva",
                "raw_status": "Aprovada"
            },
            status="success",
            created_at=datetime.now(timezone.utc)
        )

        h2 = models.WebhookHistory(
            integration_id=integration_id,
            event_type="compra_aprovada",
            processed_data={
                "price": "99.00",
                "product_name": "Product Silver",
                "platform": "hotmart",
                "payment_method": "Pix",
                "name": "Maria Souza",
                "raw_status": "Aprovada"
            },
            status="success",
            created_at=datetime.now(timezone.utc)
        )

        h3 = models.WebhookHistory(
            integration_id=integration_id,
            event_type="reembolso",
            processed_data={
                "price": "199.90",
                "product_name": "Product Gold",
                "platform": "hotmart",
                "payment_method": "Cartão de Crédito",
                "name": "João da Silva",
                "raw_status": "Reembolsada"
            },
            status="success",
            created_at=datetime.now(timezone.utc)
        )

        h4 = models.WebhookHistory(
            integration_id=integration_id,
            event_type="pix_gerado",
            processed_data={
                "price": "50.00",
                "product_name": "Product Bronze",
                "platform": "hotmart",
                "payment_method": "Pix",
                "name": "Pedro Santos",
                "raw_status": "Aguardando Pagamento"
            },
            status="success",
            created_at=datetime.now(timezone.utc)
        )

        db_session.add_all([h1, h2, h3, h4])
        db_session.commit()

        # 3. Call endpoint
        response = client.get("/api/financial/sales?period=monthly")
        assert response.status_code == 200
        res_data = response.json()

        # 4. Verify Totals (Net)
        totals = res_data["totals"]
        assert totals["total_revenue"] == 99.00  # 199.90 + 99.00 - 199.90 (reembolso) = 99.00
        assert totals["total_sales"] == 1        # 2 aprovadas - 1 reembolso = 1
        assert totals["total_refunds"] == 1
        assert totals["total_pending"] == 1

        # 5. Verify top products
        top_products = res_data["top_products"]
        assert len(top_products) == 2
        assert top_products[0]["product_name"] == "Product Silver"
        assert top_products[0]["total_revenue"] == 99.00
        assert top_products[1]["product_name"] == "Product Gold"
        assert top_products[1]["total_revenue"] == 0.0

        # 6. Verify status filtering (approved)
        response_approved = client.get("/api/financial/sales?status=approved")
        assert response_approved.status_code == 200
        approved_txs = response_approved.json()["transactions"]
        assert len(approved_txs) == 2
        assert all(t["category"] == "approved" for t in approved_txs)

        # 7. Verify status filtering (pending)
        response_pending = client.get("/api/financial/sales?status=pending")
        assert response_pending.status_code == 200
        pending_txs = response_pending.json()["transactions"]
        assert len(pending_txs) == 1
        assert pending_txs[0]["category"] == "pending"

    finally:
        app.dependency_overrides.pop(get_current_user, None)

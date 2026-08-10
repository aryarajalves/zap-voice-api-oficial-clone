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


def test_financial_sales_product_filter(client, db_session):
    """Testa o filtro por nome de produto no endpoint /financial/sales."""
    from main import app

    # Usa client_id=3 para evitar conflito com dados do test_financial_sales_endpoint (client_id=1)
    mock_user_prod = models.User(id=10, email="prodtest@test.com", client_id=3, is_active=True)

    async def override_user_prod():
        return mock_user_prod

    app.dependency_overrides[get_current_user] = override_user_prod

    try:
        # Cria client e integração
        c = models.Client(id=3, name="Client Produto Test")
        db_session.add(c)
        db_session.commit()

        integration_id = uuid.uuid4()
        integration = models.WebhookIntegration(
            id=integration_id,
            client_id=3,
            name="Plataforma Produto",
            platform="kiwify",
            status="active"
        )
        db_session.add(integration)
        db_session.commit()

        # Cria registros de vendas com produtos distintos
        produtos = [
            ("Curso VIP", "299.00", "compra_aprovada"),
            ("Mentoria Elite", "1500.00", "compra_aprovada"),
            ("Ebook Basico", "47.00", "compra_aprovada"),
            ("Curso VIP", "299.00", "reembolso"),  # reembolso do Curso VIP
        ]
        histories = []
        for pname, price, evt in produtos:
            h = models.WebhookHistory(
                integration_id=integration_id,
                event_type=evt,
                processed_data={
                    "price": price,
                    "product_name": pname,
                    "platform": "kiwify",
                    "payment_method": "Pix",
                    "name": "Comprador Teste",
                    "raw_status": "Aprovada"
                },
                status="success",
                created_at=datetime.now(timezone.utc)
            )
            histories.append(h)

        db_session.add_all(histories)
        db_session.commit()

        # --- Teste 1: filtro por produto único ---
        resp = client.get("/api/financial/sales?product=Mentoria Elite")
        assert resp.status_code == 200
        data = resp.json()
        txs = data["transactions"]
        # Apenas "Mentoria Elite" deve aparecer
        assert all(t["product_name"] == "Mentoria Elite" for t in txs), \
            f"Esperava apenas Mentoria Elite, obteve: {[t['product_name'] for t in txs]}"
        assert len(txs) == 1
        assert data["totals"]["total_revenue"] == 1500.00

        # --- Teste 2: filtro por múltiplos produtos ---
        resp2 = client.get("/api/financial/sales?product=Mentoria Elite,Ebook Basico")
        assert resp2.status_code == 200
        data2 = resp2.json()
        txs2 = data2["transactions"]
        product_names = {t["product_name"] for t in txs2}
        assert "Curso VIP" not in product_names, "Curso VIP não deveria aparecer no filtro"
        assert "Mentoria Elite" in product_names
        assert "Ebook Basico" in product_names

        # --- Teste 3: all_products retorna lista completa e ordenada ---
        resp3 = client.get("/api/financial/sales?product=all")
        assert resp3.status_code == 200
        data3 = resp3.json()
        all_products = data3.get("all_products", [])
        assert isinstance(all_products, list), "all_products deve ser uma lista"
        assert len(all_products) >= 3, f"Esperava pelo menos 3 produtos, obteve: {all_products}"
        assert "Curso VIP" in all_products
        assert "Mentoria Elite" in all_products
        assert "Ebook Basico" in all_products
        # Verifica ordenação alfabética
        assert all_products == sorted(all_products), \
            f"all_products deveria estar ordenado, mas está: {all_products}"

        # --- Teste 4: produto inexistente retorna resultado vazio ---
        resp4 = client.get("/api/financial/sales?product=Produto Inexistente XYZ")
        assert resp4.status_code == 200
        data4 = resp4.json()
        assert data4["transactions"] == []
        assert data4["totals"]["total_revenue"] == 0.0

    finally:
        app.dependency_overrides.pop(get_current_user, None)

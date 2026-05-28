import pytest
from datetime import datetime, timezone
import models
from main import app
import uuid
from routers.webhooks.dispatches import get_db as dispatches_get_db

def _make_client_user_integration(db):
    """Helper to create a test client, user, and integration."""
    test_client = models.Client(name="Paginação Test Client")
    db.add(test_client)
    db.commit()
    db.refresh(test_client)

    from core.security import create_access_token
    user = models.User(email="admin@paginacao.com", role="super_admin", client_id=test_client.id)
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": "admin@paginacao.com", "role": "super_admin"})
    headers = {
        "X-Client-ID": str(test_client.id),
        "Authorization": f"Bearer {token}",
    }

    integration_id = uuid.uuid4()
    integration = models.WebhookIntegration(
        id=integration_id,
        client_id=test_client.id,
        name="Test Integration Paginação",
        platform="hotmart",
        status="active",
    )
    db.add(integration)
    db.commit()

    return test_client, headers, integration_id


def _bulk_create_triggers(db, client_id, integration_id, count, event_type="compra_aprovada"):
    """Creates `count` ScheduledTrigger records."""
    for i in range(count):
        trigger = models.ScheduledTrigger(
            client_id=client_id,
            integration_id=integration_id,
            event_type=event_type,
            scheduled_time=datetime.now(timezone.utc),
            status="pending",
            contact_phone=f"551199999{str(i).zfill(4)}",
            contact_name=f"Contato {i}",
        )
        db.add(trigger)
    db.commit()


class TestDispatchesPagination:

    @pytest.fixture(autouse=True)
    def setup_overrides(self, db_session):
        app.dependency_overrides[dispatches_get_db] = lambda: db_session
        yield
        app.dependency_overrides.pop(dispatches_get_db, None)

    def test_default_pagination_returns_50_items(self, client, db_session):
        """Sem parâmetros, retorna os primeiros 50 (padrão do backend)."""
        test_client, headers, integration_id = _make_client_user_integration(db_session)
        _bulk_create_triggers(db_session, test_client.id, integration_id, 75)

        response = client.get(f"/api/webhook-integrations/{integration_id}/dispatches", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 75
        assert len(data["items"]) == 50  # default limit is 50

    def test_limit_parameter(self, client, db_session):
        """Com limit=20, retorna apenas 20 itens."""
        test_client, headers, integration_id = _make_client_user_integration(db_session)
        _bulk_create_triggers(db_session, test_client.id, integration_id, 50)

        response = client.get(
            f"/api/webhook-integrations/{integration_id}/dispatches?limit=20", headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 50
        assert len(data["items"]) == 20

    def test_skip_parameter(self, client, db_session):
        """Com skip=40 e limit=20, retorna os últimos 10 de 50 registros."""
        test_client, headers, integration_id = _make_client_user_integration(db_session)
        _bulk_create_triggers(db_session, test_client.id, integration_id, 50)

        response = client.get(
            f"/api/webhook-integrations/{integration_id}/dispatches?skip=40&limit=20", headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 50
        assert len(data["items"]) == 10  # Only 10 remaining after skipping 40

    def test_limit_100(self, client, db_session):
        """limit=100 retorna até 100 itens."""
        test_client, headers, integration_id = _make_client_user_integration(db_session)
        _bulk_create_triggers(db_session, test_client.id, integration_id, 120)

        response = client.get(
            f"/api/webhook-integrations/{integration_id}/dispatches?limit=100", headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 120
        assert len(data["items"]) == 100

    def test_search_by_name(self, client, db_session):
        """Filtro search por nome retorna apenas correspondências."""
        test_client, headers, integration_id = _make_client_user_integration(db_session)
        _bulk_create_triggers(db_session, test_client.id, integration_id, 10, event_type="compra_aprovada")

        # Create one with unique name
        unique_trigger = models.ScheduledTrigger(
            client_id=test_client.id,
            integration_id=integration_id,
            event_type="compra_aprovada",
            scheduled_time=datetime.now(timezone.utc),
            status="pending",
            contact_phone="5511000000001",
            contact_name="PESSOA UNICA ESPECIAL",
        )
        db_session.add(unique_trigger)
        db_session.commit()

        response = client.get(
            f"/api/webhook-integrations/{integration_id}/dispatches?search=UNICA",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["contact_name"] == "PESSOA UNICA ESPECIAL"

    def test_search_by_phone(self, client, db_session):
        """Filtro search por telefone funciona."""
        test_client, headers, integration_id = _make_client_user_integration(db_session)
        _bulk_create_triggers(db_session, test_client.id, integration_id, 5)

        unique_trigger = models.ScheduledTrigger(
            client_id=test_client.id,
            integration_id=integration_id,
            event_type="pix_gerado",
            scheduled_time=datetime.now(timezone.utc),
            status="pending",
            contact_phone="5598123456789",
            contact_name="Pessoa Maranhão",
        )
        db_session.add(unique_trigger)
        db_session.commit()

        response = client.get(
            f"/api/webhook-integrations/{integration_id}/dispatches?search=5598",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["contact_phone"] == "5598123456789"

    def test_event_type_filter(self, client, db_session):
        """Filtro por event_type retorna apenas o tipo correto."""
        test_client, headers, integration_id = _make_client_user_integration(db_session)
        _bulk_create_triggers(db_session, test_client.id, integration_id, 5, event_type="compra_aprovada")
        _bulk_create_triggers(db_session, test_client.id, integration_id, 3, event_type="pix_gerado")

        response = client.get(
            f"/api/webhook-integrations/{integration_id}/dispatches?event_type=pix_gerado",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert all(item["event_type"] == "pix_gerado" for item in data["items"])

    def test_event_type_and_search_combined(self, client, db_session):
        """Combinar event_type e search funciona corretamente."""
        test_client, headers, integration_id = _make_client_user_integration(db_session)
        _bulk_create_triggers(db_session, test_client.id, integration_id, 5, event_type="compra_aprovada")

        special = models.ScheduledTrigger(
            client_id=test_client.id,
            integration_id=integration_id,
            event_type="abandono_carrinho",
            scheduled_time=datetime.now(timezone.utc),
            status="pending",
            contact_phone="5511777777777",
            contact_name="Cliente Carrinho",
        )
        db_session.add(special)
        db_session.commit()

        # Should find only the special one
        response = client.get(
            f"/api/webhook-integrations/{integration_id}/dispatches?event_type=abandono_carrinho&search=Carrinho",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["contact_name"] == "Cliente Carrinho"

    def test_search_no_results(self, client, db_session):
        """Busca sem resultados retorna lista vazia."""
        test_client, headers, integration_id = _make_client_user_integration(db_session)
        _bulk_create_triggers(db_session, test_client.id, integration_id, 5)

        response = client.get(
            f"/api/webhook-integrations/{integration_id}/dispatches?search=FANTASMA",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []

    def test_total_is_not_affected_by_pagination(self, client, db_session):
        """O campo 'total' sempre reflete o total real, ignorando skip/limit."""
        test_client, headers, integration_id = _make_client_user_integration(db_session)
        _bulk_create_triggers(db_session, test_client.id, integration_id, 30)

        response = client.get(
            f"/api/webhook-integrations/{integration_id}/dispatches?skip=20&limit=5",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 30  # total is always the full count
        assert len(data["items"]) == 5  # but items is paginated

    def test_template_filtering_logic(self, client, db_session):
        """Testa o filtro por template (all_templates, taxas, nome específico)."""
        test_client, headers, integration_id = _make_client_user_integration(db_session)
        
        # Trigger sem template
        t1 = models.ScheduledTrigger(
            client_id=test_client.id,
            integration_id=integration_id,
            event_type="compra_aprovada",
            scheduled_time=datetime.now(timezone.utc),
            status="pending",
            contact_phone="5511999990001",
            contact_name="Sem Template",
        )
        # Trigger com template (grátis)
        t2 = models.ScheduledTrigger(
            client_id=test_client.id,
            integration_id=integration_id,
            event_type="compra_aprovada",
            scheduled_time=datetime.now(timezone.utc),
            status="pending",
            contact_phone="5511999990002",
            contact_name="Com Template Grátis",
            template_name="template_gratis",
            sent_as="FREE_MESSAGE"
        )
        # Trigger com template (pago)
        t3 = models.ScheduledTrigger(
            client_id=test_client.id,
            integration_id=integration_id,
            event_type="compra_aprovada",
            scheduled_time=datetime.now(timezone.utc),
            status="pending",
            contact_phone="5511999990003",
            contact_name="Com Template Pago",
            template_name="template_pago",
            sent_as="TEMPLATE"
        )
        db_session.add_all([t1, t2, t3])
        db_session.commit()

        # 1. Testar sem filtro (deve retornar todos os 3)
        res = client.get(f"/api/webhook-integrations/{integration_id}/dispatches", headers=headers)
        assert res.status_code == 200
        assert res.json()["total"] == 3
        assert set(res.json()["distinct_templates"]) == {"template_gratis", "template_pago"}

        # 2. Testar template_filter=all_templates (deve retornar os 2 que possuem template_name)
        res = client.get(f"/api/webhook-integrations/{integration_id}/dispatches?template_filter=all_templates", headers=headers)
        assert res.status_code == 200
        assert res.json()["total"] == 2
        assert {item["contact_name"] for item in res.json()["items"]} == {"Com Template Grátis", "Com Template Pago"}

        # 3. Testar template_filter=taxas (deve retornar apenas o pago: sent_as = TEMPLATE)
        res = client.get(f"/api/webhook-integrations/{integration_id}/dispatches?template_filter=taxas", headers=headers)
        assert res.status_code == 200
        assert res.json()["total"] == 1
        assert res.json()["items"][0]["contact_name"] == "Com Template Pago"

        # 4. Testar template_filter=template_gratis (deve retornar apenas o template_gratis)
        res = client.get(f"/api/webhook-integrations/{integration_id}/dispatches?template_filter=template_gratis", headers=headers)
        assert res.status_code == 200
        assert res.json()["total"] == 1
        assert res.json()["items"][0]["contact_name"] == "Com Template Grátis"

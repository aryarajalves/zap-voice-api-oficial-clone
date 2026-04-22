
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone
import models
from main import app
from core.deps import get_db
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from routers.webhooks_integrations import get_db as integrations_get_db

engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[integrations_get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


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


client = TestClient(app)


class TestDispatchesPagination:

    def test_default_pagination_returns_50_items(self):
        """Sem parâmetros, retorna os primeiros 50 (padrão do backend)."""
        db = TestingSessionLocal()
        test_client, headers, integration_id = _make_client_user_integration(db)
        _bulk_create_triggers(db, test_client.id, integration_id, 75)
        db.close()

        response = client.get(f"/api/webhooks/{integration_id}/dispatches", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 75
        assert len(data["items"]) == 50  # default limit is 50

    def test_limit_parameter(self):
        """Com limit=20, retorna apenas 20 itens."""
        db = TestingSessionLocal()
        test_client, headers, integration_id = _make_client_user_integration(db)
        _bulk_create_triggers(db, test_client.id, integration_id, 50)
        db.close()

        response = client.get(
            f"/api/webhooks/{integration_id}/dispatches?limit=20", headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 50
        assert len(data["items"]) == 20

    def test_skip_parameter(self):
        """Com skip=40 e limit=20, retorna os últimos 10 de 50 registros."""
        db = TestingSessionLocal()
        test_client, headers, integration_id = _make_client_user_integration(db)
        _bulk_create_triggers(db, test_client.id, integration_id, 50)
        db.close()

        response = client.get(
            f"/api/webhooks/{integration_id}/dispatches?skip=40&limit=20", headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 50
        assert len(data["items"]) == 10  # Only 10 remaining after skipping 40

    def test_limit_100(self):
        """limit=100 retorna até 100 itens."""
        db = TestingSessionLocal()
        test_client, headers, integration_id = _make_client_user_integration(db)
        _bulk_create_triggers(db, test_client.id, integration_id, 120)
        db.close()

        response = client.get(
            f"/api/webhooks/{integration_id}/dispatches?limit=100", headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 120
        assert len(data["items"]) == 100

    def test_search_by_name(self):
        """Filtro search por nome retorna apenas correspondências."""
        db = TestingSessionLocal()
        test_client, headers, integration_id = _make_client_user_integration(db)
        _bulk_create_triggers(db, test_client.id, integration_id, 10, event_type="compra_aprovada")

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
        db.add(unique_trigger)
        db.commit()
        db.close()

        response = client.get(
            f"/api/webhooks/{integration_id}/dispatches?search=UNICA",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["contact_name"] == "PESSOA UNICA ESPECIAL"

    def test_search_by_phone(self):
        """Filtro search por telefone funciona."""
        db = TestingSessionLocal()
        test_client, headers, integration_id = _make_client_user_integration(db)
        _bulk_create_triggers(db, test_client.id, integration_id, 5)

        unique_trigger = models.ScheduledTrigger(
            client_id=test_client.id,
            integration_id=integration_id,
            event_type="pix_gerado",
            scheduled_time=datetime.now(timezone.utc),
            status="pending",
            contact_phone="5598123456789",
            contact_name="Pessoa Maranhão",
        )
        db.add(unique_trigger)
        db.commit()
        db.close()

        response = client.get(
            f"/api/webhooks/{integration_id}/dispatches?search=5598",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["contact_phone"] == "5598123456789"

    def test_event_type_filter(self):
        """Filtro por event_type retorna apenas o tipo correto."""
        db = TestingSessionLocal()
        test_client, headers, integration_id = _make_client_user_integration(db)
        _bulk_create_triggers(db, test_client.id, integration_id, 5, event_type="compra_aprovada")
        _bulk_create_triggers(db, test_client.id, integration_id, 3, event_type="pix_gerado")
        db.close()

        response = client.get(
            f"/api/webhooks/{integration_id}/dispatches?event_type=pix_gerado",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert all(item["event_type"] == "pix_gerado" for item in data["items"])

    def test_event_type_and_search_combined(self):
        """Combinar event_type e search funciona corretamente."""
        db = TestingSessionLocal()
        test_client, headers, integration_id = _make_client_user_integration(db)
        _bulk_create_triggers(db, test_client.id, integration_id, 5, event_type="compra_aprovada")

        special = models.ScheduledTrigger(
            client_id=test_client.id,
            integration_id=integration_id,
            event_type="abandono_carrinho",
            scheduled_time=datetime.now(timezone.utc),
            status="pending",
            contact_phone="5511777777777",
            contact_name="Cliente Carrinho",
        )
        db.add(special)
        db.commit()
        db.close()

        # Should find only the special one
        response = client.get(
            f"/api/webhooks/{integration_id}/dispatches?event_type=abandono_carrinho&search=Carrinho",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["contact_name"] == "Cliente Carrinho"

    def test_search_no_results(self):
        """Busca sem resultados retorna lista vazia."""
        db = TestingSessionLocal()
        test_client, headers, integration_id = _make_client_user_integration(db)
        _bulk_create_triggers(db, test_client.id, integration_id, 5)
        db.close()

        response = client.get(
            f"/api/webhooks/{integration_id}/dispatches?search=FANTASMA",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []

    def test_total_is_not_affected_by_pagination(self):
        """O campo 'total' sempre reflete o total real, ignorando skip/limit."""
        db = TestingSessionLocal()
        test_client, headers, integration_id = _make_client_user_integration(db)
        _bulk_create_triggers(db, test_client.id, integration_id, 30)
        db.close()

        response = client.get(
            f"/api/webhooks/{integration_id}/dispatches?skip=20&limit=5",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 30  # total is always the full count
        assert len(data["items"]) == 5  # but items is paginated


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

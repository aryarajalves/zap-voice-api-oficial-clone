import pytest
import uuid
from datetime import datetime, timezone
import models, schemas
from main import app
from routers.webhooks.dispatches import get_db as dispatches_get_db
from routers.webhooks.history import get_db as history_get_db
from core.security import create_access_token

def test_bulk_delete_dispatches_route(client, db_session):
    app.dependency_overrides[dispatches_get_db] = lambda: db_session
    try:
        db = db_session
        
        # Setup: Criar cliente, integração e usuário
        test_client = models.Client(name="Bulk Delete Client")
        db.add(test_client)
        db.commit()
        db.refresh(test_client)
        
        integration_id = uuid.uuid4()
        integration = models.WebhookIntegration(
            id=integration_id,
            client_id=test_client.id,
            name="Bulk Delete Integration",
            platform="hotmart",
            status="active"
        )
        db.add(integration)
        db.commit()
        
        # Criar dois ScheduledTriggers para exclusão
        t1 = models.ScheduledTrigger(
            client_id=test_client.id,
            integration_id=integration_id,
            event_type="compra_aprovada",
            scheduled_time=datetime.now(timezone.utc),
            status="pending",
            is_bulk=False,
            contact_phone="5511999999999"
        )
        t2 = models.ScheduledTrigger(
            client_id=test_client.id,
            integration_id=integration_id,
            event_type="pix_gerado",
            scheduled_time=datetime.now(timezone.utc),
            status="pending",
            is_bulk=False,
            contact_phone="5511888888888"
        )
        db.add(t1)
        db.add(t2)
        db.commit()
        db.refresh(t1)
        db.refresh(t2)
        
        # Salvar IDs localmente antes de deletar
        t1_id = t1.id
        t2_id = t2.id
        
        # Configurar autenticação
        token = create_access_token({"sub": "admin@testdelete.com", "role": "super_admin"})
        user = models.User(email="admin@testdelete.com", role="super_admin", client_id=test_client.id)
        db.add(user)
        db.commit()
        
        headers = {
            "X-Client-ID": str(test_client.id),
            "Authorization": f"Bearer {token}"
        }
        
        # Payload para bulk delete
        payload = {"ids": [t1_id, t2_id]}
        
        # Executar a requisição POST (que substitui a antiga DELETE)
        response = client.post(
            f"/api/webhook-integrations/{integration_id}/dispatches/bulk-delete",
            json=payload,
            headers=headers
        )
        
        assert response.status_code == 200
        assert response.json()["status"] == "success"
        assert response.json()["deleted_count"] == 2
        
        # Validar no banco que foram excluídos usando os IDs salvos
        triggers_count = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.id.in_([t1_id, t2_id])
        ).count()
        assert triggers_count == 0
        
    finally:
        app.dependency_overrides.pop(dispatches_get_db, None)


def test_bulk_delete_webhook_history_route(client, db_session):
    app.dependency_overrides[history_get_db] = lambda: db_session
    try:
        db = db_session
        
        # Setup: Criar cliente, integração e usuário
        test_client = models.Client(name="Bulk Delete History Client")
        db.add(test_client)
        db.commit()
        db.refresh(test_client)
        
        integration_id = uuid.uuid4()
        integration = models.WebhookIntegration(
            id=integration_id,
            client_id=test_client.id,
            name="Bulk Delete History Integration",
            platform="hotmart",
            status="active"
        )
        db.add(integration)
        db.commit()
        
        # Criar dois registros de histórico de webhook para exclusão
        h1 = models.WebhookHistory(
            integration_id=integration_id,
            payload={"event": "compra_aprovada", "data": "123"},
            status="processed",
            event_type="compra_aprovada",
            created_at=datetime.now(timezone.utc)
        )
        h2 = models.WebhookHistory(
            integration_id=integration_id,
            payload={"event": "pix_gerado", "data": "456"},
            status="ignored",
            event_type="pix_gerado",
            created_at=datetime.now(timezone.utc)
        )
        db.add(h1)
        db.add(h2)
        db.commit()
        db.refresh(h1)
        db.refresh(h2)
        
        # Salvar IDs localmente antes de deletar
        h1_id = h1.id
        h2_id = h2.id
        
        # Configurar autenticação
        token = create_access_token({"sub": "admin_history@testdelete.com", "role": "super_admin"})
        user = models.User(email="admin_history@testdelete.com", role="super_admin", client_id=test_client.id)
        db.add(user)
        db.commit()
        
        headers = {
            "X-Client-ID": str(test_client.id),
            "Authorization": f"Bearer {token}"
        }
        
        # Payload para bulk delete
        payload = {"ids": [h1_id, h2_id]}
        
        # Executar a requisição POST (que substitui a antiga DELETE)
        response = client.post(
            f"/api/webhook-integrations/{integration_id}/history/bulk-delete",
            json=payload,
            headers=headers
        )
        
        assert response.status_code == 200
        assert response.json()["status"] == "success"
        
        # Validar no banco que foram excluídos usando os IDs salvos
        history_count = db.query(models.WebhookHistory).filter(
            models.WebhookHistory.id.in_([h1_id, h2_id])
        ).count()
        assert history_count == 0
        
    finally:
        app.dependency_overrides.pop(history_get_db, None)

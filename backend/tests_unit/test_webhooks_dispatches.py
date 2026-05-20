import pytest
from datetime import datetime, timezone, timedelta
import models, schemas
import uuid
from main import app
from routers.webhooks.dispatches import get_db as dispatches_get_db

def test_webhooks_dispatches_filtering_and_fields(client, db_session):
    app.dependency_overrides[dispatches_get_db] = lambda: db_session
    try:
        db = db_session
        
        # Setup: Create a client and an integration
        test_client = models.Client(name="Test Client")
        db.add(test_client)
        db.commit()
        db.refresh(test_client)
        
        integration_id = uuid.uuid4()
        integration = models.WebhookIntegration(
            id=integration_id,
            client_id=test_client.id,
            name="Test Integration",
            platform="hotmart",
            status="active"
        )
        db.add(integration)
        
        # Create two triggers: one for this integration, one for another
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
            integration_id=uuid.uuid4(),
            event_type="pix_gerado",
            scheduled_time=datetime.now(timezone.utc),
            status="pending",
            is_bulk=False,
            contact_phone="5511888888888"
        )
        db.add(t1)
        db.add(t2)
        db.commit()
        
        # Mock auth headers
        headers = {
            "X-Client-ID": str(test_client.id),
            "Authorization": "Bearer fake-token"
        }
        
        from core.security import create_access_token
        token = create_access_token({"sub": "admin@test.com", "role": "super_admin"})
        headers["Authorization"] = f"Bearer {token}"
        
        user = models.User(email="admin@test.com", role="super_admin", client_id=test_client.id)
        db.add(user)
        db.commit()

        paths_to_test = [
            f"/api/webhook-integrations/{integration_id}/dispatches"
        ]
        
        for path in paths_to_test:
            response = client.get(path, headers=headers)
            assert response.status_code == 200
            data = response.json()
            items = data["items"]
            
            # Should only return t1
            assert len(items) == 1
            assert items[0]["integration_id"] == str(integration_id)
            assert items[0]["event_type"] == "compra_aprovada"
    finally:
        app.dependency_overrides.pop(dispatches_get_db, None)


def test_dispatch_followup_fields_exposed_when_child_exists(client, db_session):
    """
    Valida que os campos followup_status e followup_scheduled_time são expostos
    no disparo pai quando existe um disparo filho de follow-up associado.
    """
    app.dependency_overrides[dispatches_get_db] = lambda: db_session
    try:
        db = db_session

        test_client = models.Client(name="Followup Client")
        db.add(test_client)
        db.commit()
        db.refresh(test_client)

        integration_id = uuid.uuid4()
        integration = models.WebhookIntegration(
            id=integration_id,
            client_id=test_client.id,
            name="FU Integration",
            platform="kiwify",
            status="active"
        )
        db.add(integration)

        # Disparo pai
        parent = models.ScheduledTrigger(
            client_id=test_client.id,
            integration_id=integration_id,
            event_type="abandono_carrinho",
            scheduled_time=datetime.now(timezone.utc),
            status="completed",
            is_bulk=False,
            contact_phone="5511777777777",
            contact_name="Lead Teste",
            template_name="carrinho_abandonado"
        )
        db.add(parent)
        db.commit()
        db.refresh(parent)

        # Disparo filho (follow-up)
        fu_time = datetime.now(timezone.utc) + timedelta(minutes=30)
        child = models.ScheduledTrigger(
            client_id=test_client.id,
            integration_id=integration_id,
            event_type="abandono_carrinho",
            scheduled_time=fu_time,
            status="queued",
            is_bulk=False,
            is_followup=True,
            parent_id=parent.id,
            contact_phone="5511777777777",
            contact_name="Lead Teste",
            template_name="followup_carrinho"
        )
        db.add(child)
        db.commit()

        from core.security import create_access_token
        token = create_access_token({"sub": "futest@test.com", "role": "super_admin"})
        user = models.User(email="futest@test.com", role="super_admin", client_id=test_client.id)
        db.add(user)
        db.commit()

        headers = {
            "X-Client-ID": str(test_client.id),
            "Authorization": f"Bearer {token}"
        }

        response = client.get(f"/api/webhook-integrations/{integration_id}/dispatches", headers=headers)
        assert response.status_code == 200

        data = response.json()
        items = data["items"]
        assert len(items) == 1, "Deve retornar apenas o disparo pai (sem o filho na listagem principal)"

        pai = items[0]

        # Valida que o filho NÃO aparece na listagem principal
        assert pai["id"] == parent.id, "Item retornado deve ser o pai"
        assert pai["is_followup"] == False, "Disparo pai não deve ser marcado como follow-up"

        # Valida que os campos de follow-up do filho foram expostos no objeto pai
        assert "followup_status" in pai, "Campo followup_status deve existir no retorno"
        assert "followup_scheduled_time" in pai, "Campo followup_scheduled_time deve existir no retorno"
        assert pai["followup_status"] == "queued", f"followup_status esperado 'queued', recebido '{pai['followup_status']}'"
        assert pai["followup_scheduled_time"] is not None, "followup_scheduled_time não deve ser None"
    finally:
        app.dependency_overrides.pop(dispatches_get_db, None)


def test_dispatch_followup_fields_null_when_no_child(client, db_session):
    """
    Valida que followup_status e followup_scheduled_time são None quando
    o disparo pai não possui um disparo filho de follow-up associado.
    """
    app.dependency_overrides[dispatches_get_db] = lambda: db_session
    try:
        db = db_session

        test_client = models.Client(name="No FU Client")
        db.add(test_client)
        db.commit()
        db.refresh(test_client)

        integration_id = uuid.uuid4()
        integration = models.WebhookIntegration(
            id=integration_id,
            client_id=test_client.id,
            name="No FU Integration",
            platform="hotmart",
            status="active"
        )
        db.add(integration)

        parent = models.ScheduledTrigger(
            client_id=test_client.id,
            integration_id=integration_id,
            event_type="compra_aprovada",
            scheduled_time=datetime.now(timezone.utc),
            status="completed",
            is_bulk=False,
            contact_phone="5511666666666",
            template_name="boas_vindas"
        )
        db.add(parent)
        db.commit()

        from core.security import create_access_token
        token = create_access_token({"sub": "nofu@test.com", "role": "super_admin"})
        user = models.User(email="nofu@test.com", role="super_admin", client_id=test_client.id)
        db.add(user)
        db.commit()

        headers = {
            "X-Client-ID": str(test_client.id),
            "Authorization": f"Bearer {token}"
        }

        response = client.get(f"/api/webhook-integrations/{integration_id}/dispatches", headers=headers)
        assert response.status_code == 200

        data = response.json()
        items = data["items"]
        assert len(items) == 1

        pai = items[0]
        assert pai["followup_status"] is None, "followup_status deve ser None quando não há filho"
        assert pai["followup_scheduled_time"] is None, "followup_scheduled_time deve ser None quando não há filho"
    finally:
        app.dependency_overrides.pop(dispatches_get_db, None)


def test_play_dispatch_clones_followup(client, db_session):
    """
    Valida que ao disparar manualmente um agendamento individual (play_dispatch),
    se o disparo original possuía follow-up associado, o sistema clona e reagenda
    o follow-up associado ao novo disparo pai clonado.
    """
    app.dependency_overrides[dispatches_get_db] = lambda: db_session
    try:
        db = db_session

        test_client = models.Client(name="Play FU Client")
        db.add(test_client)
        db.commit()
        db.refresh(test_client)

        integration_id = uuid.uuid4()
        integration = models.WebhookIntegration(
            id=integration_id,
            client_id=test_client.id,
            name="Play FU Integration",
            platform="hotmart",
            status="active"
        )
        db.add(integration)

        # Disparo original
        parent = models.ScheduledTrigger(
            client_id=test_client.id,
            integration_id=integration_id,
            event_type="abandono_carrinho",
            scheduled_time=datetime.now(timezone.utc) - timedelta(hours=1),
            status="failed",
            is_bulk=False,
            contact_phone="5511555555555",
            template_name="carrinho_original"
        )
        db.add(parent)
        db.commit()
        db.refresh(parent)

        # Follow-up original
        original_fu = models.ScheduledTrigger(
            client_id=test_client.id,
            integration_id=integration_id,
            event_type="abandono_carrinho",
            scheduled_time=datetime.now(timezone.utc) - timedelta(minutes=30),
            status="failed",
            is_bulk=False,
            is_followup=True,
            parent_id=parent.id,
            contact_phone="5511555555555",
            template_name="followup_original"
        )
        db.add(original_fu)
        db.commit()

        from core.security import create_access_token
        token = create_access_token({"sub": "playfu@test.com", "role": "super_admin"})
        user = models.User(email="playfu@test.com", role="super_admin", client_id=test_client.id)
        db.add(user)
        db.commit()

        headers = {
            "X-Client-ID": str(test_client.id),
            "Authorization": f"Bearer {token}"
        }

        # Aciona o play do disparo pai original
        response = client.post(
            f"/api/webhook-integrations/{integration_id}/dispatches/{parent.id}/play",
            headers=headers
        )
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "success"
        new_id = result["new_id"]

        # Verifica se o clone do pai foi inserido com status 'processing'
        new_parent = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == new_id).first()
        assert new_parent is not None
        assert new_parent.status == "processing"
        assert new_parent.parent_id is None

        # Verifica se um novo follow-up clone foi criado para o novo pai
        new_fu = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.parent_id == new_parent.id,
            models.ScheduledTrigger.is_followup == True
        ).first()

        assert new_fu is not None, "Um novo follow-up deveria ter sido clonado e associado ao novo disparo pai."
        assert new_fu.status == "queued"
        assert new_fu.template_name == "followup_original"
        # O agendamento do novo follow-up deve ser no futuro
        assert new_fu.scheduled_time.replace(tzinfo=None) > datetime.now()
    finally:
        app.dependency_overrides.pop(dispatches_get_db, None)


def test_bulk_play_dispatches_requeues_followup(client, db_session):
    """
    Valida que ao reexecutar disparos em lote (bulk-play),
    os follow-ups existentes associados a cada disparo são reagendados
    e retornam para a fila (status 'queued').
    """
    app.dependency_overrides[dispatches_get_db] = lambda: db_session
    try:
        db = db_session

        test_client = models.Client(name="Bulk Play Client")
        db.add(test_client)
        db.commit()
        db.refresh(test_client)

        integration_id = uuid.uuid4()
        integration = models.WebhookIntegration(
            id=integration_id,
            client_id=test_client.id,
            name="Bulk Play Integration",
            platform="kiwify",
            status="active"
        )
        db.add(integration)

        # Disparo 1 (pai + filho follow-up)
        p1 = models.ScheduledTrigger(
            client_id=test_client.id,
            integration_id=integration_id,
            event_type="compra_aprovada",
            scheduled_time=datetime.now(timezone.utc) - timedelta(hours=2),
            status="failed",
            is_bulk=False,
            contact_phone="5511444444444",
            template_name="boas_vindas"
        )
        db.add(p1)
        db.commit()
        db.refresh(p1)

        fu1 = models.ScheduledTrigger(
            client_id=test_client.id,
            integration_id=integration_id,
            event_type="compra_aprovada",
            scheduled_time=datetime.now(timezone.utc) - timedelta(hours=1),
            status="failed",
            is_followup=True,
            parent_id=p1.id,
            contact_phone="5511444444444",
            template_name="followup_bem_vindo"
        )
        db.add(fu1)
        db.commit()

        from core.security import create_access_token
        token = create_access_token({"sub": "bulkfu@test.com", "role": "super_admin"})
        user = models.User(email="bulkfu@test.com", role="super_admin", client_id=test_client.id)
        db.add(user)
        db.commit()

        headers = {
            "X-Client-ID": str(test_client.id),
            "Authorization": f"Bearer {token}"
        }

        # Aciona o bulk-play enviando a lista de IDs
        response = client.post(
            f"/api/webhook-integrations/{integration_id}/dispatches/bulk-play",
            json=[p1.id],
            headers=headers
        )
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "success"
        assert result["triggered_count"] == 1

        # Verifica que o pai p1 foi para 'processing'
        db.refresh(p1)
        assert p1.status == "processing"

        # Verifica que o follow-up fu1 associado foi reagendado e voltou para 'queued'
        db.refresh(fu1)
        assert fu1.status == "queued"
        assert fu1.scheduled_time.replace(tzinfo=None) > datetime.now()
    finally:
        app.dependency_overrides.pop(dispatches_get_db, None)

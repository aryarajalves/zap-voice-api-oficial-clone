import pytest
import models
from datetime import datetime, timezone, timedelta
from main import app
from core.deps import get_current_user, get_validated_client_id
from routers.webhooks.integrations import get_db as integrations_get_db

def test_webhook_integration_manychat_alternative_tag_saving(db_session, client):
    # 1. Configurar dependências de autenticação mockadas
    mock_user = db_session.query(models.User).filter(models.User.email == "admin@test.com").first()
    if not mock_user:
        mock_user = models.User(email="admin@test.com", role="super_admin")
        db_session.add(mock_user)
        db_session.commit()

    async def override_get_current_user():
        return mock_user
        
    async def override_get_validated_client_id():
        return 1

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_validated_client_id] = override_get_validated_client_id
    app.dependency_overrides[integrations_get_db] = lambda: db_session

    try:
        start_date = datetime(2026, 6, 5, 8, 0, 0, tzinfo=timezone.utc)
        start_date_str = start_date.isoformat()

        # 2. Payload para criar integração com mapeamento contendo manychat_start_date e manychat_tag_alternative
        create_payload = {
            "name": "Integração Teste ManyChat Alt",
            "platform": "outros",
            "status": "active",
            "mappings": [
                {
                    "event_type": "compra_aprovada",
                    "template_id": None,
                    "template_name": "template_principal",
                    "delay_minutes": 5,
                    "variables_mapping": [],
                    "private_note": "true",
                    "chatwoot_label": [],
                    "publish_external_event": True,
                    "is_active": True,
                    # Campos de data e tag do ManyChat
                    "manychat_active": True,
                    "manychat_name": "{{name}}",
                    "manychat_phone": "{{phone}}",
                    "manychat_tag": "tag_padrao",
                    "manychat_start_date": start_date_str,
                    "manychat_tag_alternative": "tag_alternativa"
                }
            ]
        }

        # 3. Enviar requisição de criação
        response = client.post("/api/webhook-integrations", json=create_payload, headers={"X-Client-ID": "1"})
        assert response.status_code == 200, response.text
        data = response.json()
        
        integration_id = data["id"]
        assert len(data["mappings"]) == 1
        
        # Validar campos do ManyChat retornados na resposta
        mapping_data = data["mappings"][0]
        assert mapping_data["manychat_active"] is True
        assert mapping_data["manychat_tag"] == "tag_padrao"
        assert mapping_data["manychat_tag_alternative"] == "tag_alternativa"
        assert mapping_data["manychat_start_date"] is not None

        # Validar diretamente no banco de dados
        import uuid
        integration_uuid = uuid.UUID(integration_id)
        db_mapping = db_session.query(models.WebhookEventMapping).filter(
            models.WebhookEventMapping.integration_id == integration_uuid
        ).first()
        
        assert db_mapping is not None
        assert db_mapping.manychat_active is True
        assert db_mapping.manychat_tag == "tag_padrao"
        assert db_mapping.manychat_tag_alternative == "tag_alternativa"
        # Compara as datas (removendo tzinfo se for naive no model)
        db_date = db_mapping.manychat_start_date
        if db_date.tzinfo is not None:
            assert db_date == start_date
        else:
            assert db_date == start_date.replace(tzinfo=None)
        
        # 4. Payload para atualizar a integração (modificando campos)
        new_start_date = start_date + timedelta(days=2)
        new_start_date_str = new_start_date.isoformat()
        
        update_payload = {
            "name": "Integração Teste ManyChat Alt Atualizada",
            "platform": "outros",
            "status": "active",
            "mappings": [
                {
                    "event_type": "compra_aprovada",
                    "template_id": None,
                    "template_name": "template_principal",
                    "delay_minutes": 5,
                    "variables_mapping": [],
                    "private_note": "true",
                    "chatwoot_label": [],
                    "publish_external_event": True,
                    "is_active": True,
                    "manychat_active": True,
                    "manychat_name": "{{name}}",
                    "manychat_phone": "{{phone}}",
                    "manychat_tag": "tag_padrao_nova",
                    "manychat_start_date": new_start_date_str,
                    "manychat_tag_alternative": "tag_alternativa_nova"
                }
            ]
        }

        # 5. Enviar requisição de atualização (PUT)
        response_put = client.put(f"/api/webhook-integrations/{integration_id}", json=update_payload, headers={"X-Client-ID": "1"})
        assert response_put.status_code == 200, response_put.text
        data_put = response_put.json()
        
        # Validar novos valores
        mapping_data_put = data_put["mappings"][0]
        assert mapping_data_put["manychat_tag"] == "tag_padrao_nova"
        assert mapping_data_put["manychat_tag_alternative"] == "tag_alternativa_nova"
        assert mapping_data_put["manychat_start_date"] is not None

    finally:
        # Limpar desvios de injeção
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_validated_client_id, None)
        app.dependency_overrides.pop(integrations_get_db, None)

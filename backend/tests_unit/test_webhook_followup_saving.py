import pytest
import models
from main import app
from core.deps import get_current_user, get_validated_client_id
from routers.webhooks.integrations import get_db as integrations_get_db

@pytest.mark.asyncio
async def test_webhook_integration_followup_saving(db_session, client):
    # 1. Configurar dependências de autenticação mockadas
    mock_user = models.User(id=1, email="admin@test.com", role="super_admin")
    db_session.add(mock_user)
    
    # Criar um WhatsAppTemplateCache mockado no banco para podermos resolver o nome do template de follow-up
    mock_template = models.WhatsAppTemplateCache(
        id=77,
        client_id=1,
        name="followup_template_test",
        language="pt_BR",
        body="Olá, você ainda está aí?"
    )
    db_session.add(mock_template)
    db_session.commit()

    async def override_get_current_user():
        return mock_user
        
    async def override_get_validated_client_id():
        return 1

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_validated_client_id] = override_get_validated_client_id
    app.dependency_overrides[integrations_get_db] = lambda: db_session

    try:
        # 2. Payload para criar integração com mapeamento de follow-up
        create_payload = {
            "name": "Integração Teste FollowUp",
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
                    # Novos campos de follow-up
                    "followup_active": True,
                    "followup_template_id": 77,
                    "followup_delay_value": 3,
                    "followup_delay_unit": "hours",
                    "followup_variables_mapping": [{"key": "1", "value": "contact.name", "type": "body"}]
                }
            ]
        }

        # 3. Enviar requisição de criação
        response = client.post("/api/webhook-integrations", json=create_payload, headers={"X-Client-ID": "1"})
        assert response.status_code == 200, response.text
        data = response.json()
        
        integration_id = data["id"]
        assert len(data["mappings"]) == 1
        
        # Validar campos de follow-up retornados na resposta
        mapping_data = data["mappings"][0]
        assert mapping_data["followup_active"] is True
        assert mapping_data["followup_template_id"] == 77
        assert mapping_data["followup_template_name"] == "followup_template_test"
        assert mapping_data["followup_delay_value"] == 3
        assert mapping_data["followup_delay_unit"] == "hours"
        assert len(mapping_data["followup_variables_mapping"]) == 1
        assert mapping_data["followup_variables_mapping"][0]["key"] == "1"

        # Validar diretamente no banco de dados
        import uuid
        integration_uuid = uuid.UUID(integration_id)
        db_mapping = db_session.query(models.WebhookEventMapping).filter(
            models.WebhookEventMapping.integration_id == integration_uuid
        ).first()
        
        assert db_mapping is not None
        assert db_mapping.followup_active is True
        assert db_mapping.followup_template_id == 77
        assert db_mapping.followup_template_name == "followup_template_test"
        assert db_mapping.followup_delay_value == 3
        assert db_mapping.followup_delay_unit == "hours"
        
        # 4. Payload para atualizar a integração (modificando campos de follow-up)
        update_payload = {
            "name": "Integração Teste FollowUp Atualizada",
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
                    # Modificando campos do follow-up
                    "followup_active": False,
                    "followup_template_id": None,
                    "followup_delay_value": 15,
                    "followup_delay_unit": "minutes",
                    "followup_variables_mapping": []
                }
            ]
        }

        # 5. Enviar requisição de atualização (PUT)
        response_put = client.put(f"/api/webhook-integrations/{integration_id}", json=update_payload, headers={"X-Client-ID": "1"})
        assert response_put.status_code == 200, response_put.text
        data_put = response_put.json()
        
        # Validar novos valores
        mapping_data_put = data_put["mappings"][0]
        assert mapping_data_put["followup_active"] is False
        assert mapping_data_put["followup_template_id"] is None
        assert mapping_data_put["followup_template_name"] is None
        assert mapping_data_put["followup_delay_value"] == 15
        assert mapping_data_put["followup_delay_unit"] == "minutes"
        assert len(mapping_data_put["followup_variables_mapping"]) == 0

    finally:
        # Limpar desvios de injeção
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_validated_client_id, None)
        app.dependency_overrides.pop(integrations_get_db, None)

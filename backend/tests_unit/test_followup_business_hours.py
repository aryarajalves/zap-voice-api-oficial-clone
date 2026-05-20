import pytest
import models
import json
import hashlib
from datetime import datetime, timedelta
from core.engine.utils import BRAZIL_TZ
from core.engine.business_hours import is_within_business_hours_generic, get_next_business_hour_start_generic
from services.webhooks import process_webhook_automation

@pytest.mark.asyncio
async def test_followup_business_hours_saving(db_session, client):
    # Validar se os campos de horário comercial de follow-up estão sendo salvos e retornados corretamente na API
    from main import app
    from core.deps import get_current_user, get_validated_client_id
    from routers.webhooks.integrations import get_db as integrations_get_db

    mock_user = models.User(id=1, email="admin@test.com", role="super_admin")
    db_session.add(mock_user)

    mock_template = models.WhatsAppTemplateCache(
        id=88,
        client_id=1,
        name="followup_template_test_hours",
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
        create_payload = {
            "name": "Integracao Horario Comercial FollowUp",
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
                    # Campos de follow-up com Horário Comercial
                    "followup_active": True,
                    "followup_template_id": 88,
                    "followup_delay_value": 1,
                    "followup_delay_unit": "hours",
                    "followup_variables_mapping": [],
                    "followup_business_hours_active": True,
                    "followup_business_hours_start": "09:00",
                    "followup_business_hours_end": "17:00",
                    "followup_business_hours_days": [0, 1, 2, 3] # Seg a Qui
                }
            ]
        }

        response = client.post("/api/webhook-integrations", json=create_payload, headers={"X-Client-ID": "1"})
        assert response.status_code == 200, response.text
        data = response.json()
        
        mapping_data = data["mappings"][0]
        assert mapping_data["followup_business_hours_active"] is True
        assert mapping_data["followup_business_hours_start"] == "09:00"
        assert mapping_data["followup_business_hours_end"] == "17:00"
        assert mapping_data["followup_business_hours_days"] == [0, 1, 2, 3]

        # Validar no banco
        db_mapping = db_session.query(models.WebhookEventMapping).filter(
            models.WebhookEventMapping.followup_template_name == "followup_template_test_hours"
        ).first()
        
        assert db_mapping is not None
        assert db_mapping.followup_business_hours_active is True
        assert db_mapping.followup_business_hours_start == "09:00"
        assert db_mapping.followup_business_hours_end == "17:00"
        assert db_mapping.followup_business_hours_days == [0, 1, 2, 3]

    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_validated_client_id, None)
        app.dependency_overrides.pop(integrations_get_db, None)


def test_business_hours_generic_logic():
    # Testar a lógica pura de decisão de horário comercial
    # Configuração: Horário comercial de Seg a Sex das 08:00 às 18:00
    allowed_days = [0, 1, 2, 3, 4]
    start_str = "08:00"
    end_str = "18:00"

    # Caso 1: Uma quarta-feira (weekday=2) às 10:00 (Dentro do horário)
    dt_inside = datetime(2026, 5, 20, 10, 0, tzinfo=BRAZIL_TZ) # Quarta-feira
    assert is_within_business_hours_generic(dt_inside, allowed_days, start_str, end_str) is True

    # Caso 2: Uma quarta-feira às 21:00 (Fora do horário - noite)
    dt_outside_night = datetime(2026, 5, 20, 21, 0, tzinfo=BRAZIL_TZ)
    assert is_within_business_hours_generic(dt_outside_night, allowed_days, start_str, end_str) is False

    # Caso 3: Um sábado (weekday=5) às 14:00 (Fora do horário - fim de semana)
    dt_saturday = datetime(2026, 5, 23, 14, 0, tzinfo=BRAZIL_TZ)
    assert is_within_business_hours_generic(dt_saturday, allowed_days, start_str, end_str) is False

    # Caso 4: Calcular a próxima data de início a partir de quarta-feira 21:00 (deve ir para quinta-feira 08:00)
    next_start = get_next_business_hour_start_generic(dt_outside_night, allowed_days, start_str)
    # Convertemos de volta para Brasília para validar
    next_start_br = next_start.astimezone(BRAZIL_TZ)
    assert next_start_br.day == 21
    assert next_start_br.hour == 8
    assert next_start_br.minute == 0

    # Caso 5: Calcular a próxima data a partir de sábado (deve ir para segunda-feira 08:00)
    next_start_sat = get_next_business_hour_start_generic(dt_saturday, allowed_days, start_str)
    next_start_sat_br = next_start_sat.astimezone(BRAZIL_TZ)
    assert next_start_sat_br.day == 25 # 23 + 2 = 25 (segunda)
    assert next_start_sat_br.hour == 8
    assert next_start_sat_br.minute == 0


@pytest.mark.asyncio
async def test_process_webhook_automation_with_business_hours(db_session):
    # Testar o agendamento real de follow-up com restrição de horário comercial ativada.
    # Criar integração e mapeamento
    import uuid
    integration_id = uuid.uuid4()
    integration = models.WebhookIntegration(
        id=integration_id,
        client_id=1,
        name="Automacao Horas",
        platform="outros",
        status="active"
    )
    db_session.add(integration)

    # Mapeamento com delay do trigger principal = 0 min, follow-up = 1 hora
    mapping = models.WebhookEventMapping(
        integration_id=integration.id,
        event_type="compra_aprovada",
        template_name="principal",
        delay_minutes=0,
        is_active=True,
        # Follow-up
        followup_active=True,
        followup_template_name="followup_test",
        followup_delay_value=1,
        followup_delay_unit="hours",
        # Horário comercial
        followup_business_hours_active=True,
        followup_business_hours_start="09:00",
        followup_business_hours_end="17:00",
        followup_business_hours_days=[0, 1, 2, 3] # Seg a Qui
    )
    db_session.add(mapping)

    # Criar um histórico
    payload = {"name": "Arya", "phone": "5585999999999", "email": "arya@test.com"}
    history = models.WebhookHistory(
        integration_id=integration.id,
        payload=payload,
        event_type="compra_aprovada",
        status="pending"
    )
    db_session.add(history)
    db_session.commit()

    variables = {
        "name": "Arya",
        "phone": "5585999999999",
        "email": "arya@test.com",
        "product_name": "Curso de Testes",
        "price": "97.00"
    }

    from unittest.mock import patch, MagicMock
    mock_rabbitmq = MagicMock()
    original_execute = db_session.execute
    def mock_execute(statement, *args, **kwargs):
        from sqlalchemy.sql.elements import TextClause
        if isinstance(statement, TextClause) and "pg_advisory_xact_lock" in statement.text:
            return MagicMock()
        return original_execute(statement, *args, **kwargs)

    # Executar process_webhook_automation mockando SessionLocal
    with patch("database.SessionLocal", return_value=db_session), \
         patch.object(db_session, "close", MagicMock()), \
         patch.object(db_session, "execute", mock_execute), \
         patch("rabbitmq_client.rabbitmq", mock_rabbitmq):
        
        await process_webhook_automation(
            client_id=1,
            mapping=mapping,
            variables=variables,
            history_id=history.id
        )

    # Buscar os ScheduledTriggers criados
    scheduled_triggers = db_session.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.integration_id == integration.id
    ).all()

    # Deve ter o principal (is_followup=False) e o follow-up (is_followup=True)
    assert len(scheduled_triggers) == 2
    
    st_principal = next(t for t in scheduled_triggers if not t.is_followup)
    st_followup = next(t for t in scheduled_triggers if t.is_followup)

    assert st_principal.template_name == "principal"
    assert st_followup.template_name == "followup_test"
    assert st_followup.parent_id == st_principal.id

    # Validar se o horário do follow-up caiu no horário comercial
    fu_time_br = st_followup.scheduled_time.astimezone(BRAZIL_TZ)
    # Seg a Qui (0 a 3)
    assert fu_time_br.weekday() in [0, 1, 2, 3]
    # Horário entre 09:00 e 17:00
    assert 9 <= fu_time_br.hour < 17

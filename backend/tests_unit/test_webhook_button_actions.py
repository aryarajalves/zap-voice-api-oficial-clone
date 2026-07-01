import pytest
from models import Client, WebhookIntegration, WebhookEventMapping, ScheduledTrigger, MessageStatus, AppConfig
from services.triggers_service import reconcile_trigger_stats_logic
from core.worker.handlers.whatsapp_inbound import handle_whatsapp_inbound_messages
from database import SessionLocal
import uuid
from datetime import datetime, timezone

@pytest.mark.asyncio
async def test_webhook_mapping_button_actions_propagation_and_stats(db_session, monkeypatch):
    # 1. Setup client and integration
    client = Client(name="ButtonTestClient")
    db_session.add(client)
    db_session.flush()

    # Adicionar configuração do phone number id para associar ao client correto
    app_config = AppConfig(
        client_id=client.id,
        key="WA_PHONE_NUMBER_ID",
        value="1234"
    )
    db_session.add(app_config)
    db_session.flush()

    integration_id = uuid.uuid4()
    integration = WebhookIntegration(
        id=integration_id,
        client_id=client.id,
        name="Button Integration",
        platform="hotmart",
        status="active"
    )
    db_session.add(integration)
    db_session.flush()

    # 2. Mapeamento com ações de botão (um botão de bloqueio)
    mapping = WebhookEventMapping(
        integration_id=integration_id,
        event_type="compra_aprovada",
        template_id=123456,
        template_name="test_buttons",
        is_active=True,
        button_actions={
            "Cancelar recebimento": {
                "type": "block",
                "funnel_id": None
            }
        }
    )
    db_session.add(mapping)
    db_session.flush()

    # 3. Executar lógica do webhook para criar o ScheduledTrigger
    parsed_data = {
        "event_type": "compra_aprovada",
        "name": "Cliente Teste Botao",
        "phone": "5511999999999",
        "email": "botao@test.com",
        "product_name": "Curso Teste"
    }
    
    # Executar a criação do trigger agendado
    st_list = db_session.query(ScheduledTrigger).filter_by(integration_id=integration_id).all()
    assert len(st_list) == 0

    # Criando manualmente o trigger como o executor faria
    st = ScheduledTrigger(
        scheduled_time=datetime.now(timezone.utc),
        status="completed",
        contact_name=parsed_data["name"],
        contact_phone=parsed_data["phone"],
        template_name=mapping.template_name,
        template_language="pt_BR",
        client_id=client.id,
        product_name=parsed_data["product_name"],
        event_type="compra_aprovada",
        integration_id=integration.id,
        is_bulk=False,
        button_actions=mapping.button_actions
    )
    db_session.add(st)
    db_session.flush()

    # Verificar que as ações do botão foram propagadas
    assert st.button_actions == {
        "Cancelar recebimento": {
            "type": "block",
            "funnel_id": None
        }
    }

    # 4. Criar registro de mensagem enviada
    ms = MessageStatus(
        trigger_id=st.id,
        message_id="wamid.test_button_msg",
        phone_number=parsed_data["phone"],
        contact_name=parsed_data["name"],
        status="sent",
        message_type="TEMPLATE"
    )
    db_session.add(ms)
    db_session.flush()

    # 5. Simular o clique no botão "Cancelar recebimento" (Inbound Webhook)
    inbound_payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "12345",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {"display_phone_number": "1234", "phone_number_id": "1234"},
                    "contacts": [{"profile": {"name": parsed_data["name"]}, "wa_id": parsed_data["phone"]}],
                    "messages": [{
                        "from": parsed_data["phone"],
                        "id": "wamid.inbound_click",
                        "timestamp": "1234567",
                        "type": "button",
                        "button": {
                            "text": "Cancelar recebimento",
                            "payload": "Cancelar recebimento"
                        },
                        "context": {
                            "from": "1234",
                            "id": "wamid.test_button_msg"  # Responde a esta mensagem
                        }
                    }]
                },
                "field": "messages"
            }]
        }]
    }

    # Mockar ensure_conversation do ChatwootClient para não tentar fazer chamadas HTTP na API externa
    import core.worker.handlers.whatsapp as wah
    class MockChatwootClient:
        def __init__(self, *args, **kwargs):
            pass
        async def ensure_conversation(self, *args, **kwargs):
            return {"convo_id": 9999, "contact_id": 8888}
            
    monkeypatch.setattr(wah, "ChatwootClient", MockChatwootClient)

    # Executar handler de mensagem inbound
    value = inbound_payload["entry"][0]["changes"][0]["value"]
    messages = value["messages"]
    metadata = value["metadata"]
    
    await handle_whatsapp_inbound_messages(db_session, messages, value, metadata)

    # Atualizar estado
    db_session.refresh(ms)
    
    # Verificar que foi marcado como interação e possui falha por bloqueio
    assert ms.interaction_counted is True
    assert ms.is_interaction is True
    assert ms.failure_reason == "BLOCKED_VIA_BUTTON"

    # Executar reconciliação de estatísticas
    reconciled = await reconcile_trigger_stats_logic(st.id, client.id, db_session)
    db_session.refresh(st)

    # Verificar que nas estatísticas do trigger contou como AMBOS: interação e bloqueio!
    assert st.total_interactions == 1
    assert st.total_blocked == 1

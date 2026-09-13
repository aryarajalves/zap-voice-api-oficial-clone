import pytest
from datetime import datetime
import schemas
from schemas_domain import (
    FunnelCreate,
    FunnelStep,
    ScheduledTrigger,
    RecurringTriggerCreate,
    WhatsAppTemplateRequest,
    WebhookEventMappingCreate,
    WebhookLeadCreate,
    CheckoutConfigCreate,
)


def test_schemas_barrel_reexports_all_models():
    # Testa acesso via schemas.<Model>
    assert hasattr(schemas, "FunnelCreate")
    assert hasattr(schemas, "ScheduledTrigger")
    assert hasattr(schemas, "RecurringTriggerCreate")
    assert hasattr(schemas, "WhatsAppTemplateRequest")
    assert hasattr(schemas, "WebhookEventMappingCreate")
    assert hasattr(schemas, "WebhookLeadCreate")
    assert hasattr(schemas, "CheckoutConfigCreate")


def test_funnel_schemas_validation():
    step = FunnelStep(type="message", content="Olá teste!")
    assert step.type == "message"
    assert step.content == "Olá teste!"

    funnel = FunnelCreate(
        name="Funil de Vendas",
        steps=[step.model_dump()]
    )
    assert funnel.name == "Funil de Vendas"
    assert len(funnel.steps) == 1


def test_scheduled_trigger_field_validators():
    trigger_data = {
        "id": 1,
        "created_at": datetime.now(),
        "is_pinned": None,
        "is_dynamic_label": 1,
        "button_actions": '{"0": {"type": "interaction", "funnel_id": 2}}',
        "chatwoot_label": "etiqueta1, etiqueta2",
        "processed_data": '{"test": 123}'
    }

    trigger = ScheduledTrigger(**trigger_data)
    assert trigger.is_pinned is False
    assert trigger.is_dynamic_label is True
    assert isinstance(trigger.button_actions, dict)
    assert trigger.button_actions["0"]["type"] == "interaction"
    assert "etiqueta1" in trigger.chatwoot_label
    assert trigger.processed_data == {"test": 123}


def test_webhook_event_mapping_coercions():
    mapping = WebhookEventMappingCreate(
        event_type="pix_gerado",
        funnel_id="",
        template_id="null",
        chatwoot_label=["vip", "pix"],
        cancel_event_types='["compra_cancelada"]'
    )
    assert mapping.funnel_id is None
    assert mapping.template_id is None
    assert "vip" in mapping.chatwoot_label
    assert mapping.cancel_event_types == ["compra_cancelada"]

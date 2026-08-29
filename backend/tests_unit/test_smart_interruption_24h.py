import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch
import models
from database import SessionLocal
from services.webhooks import process_webhook_automation
from services.template_history_service import is_template_sent_in_last_24h
from core.worker.handlers.funnel import handle_funnel_execution

@pytest.mark.asyncio
async def test_smart_interruption_blocks_templates_for_24h(db_session):
    """
    Valida que a Interrupção Inteligente cancela triggers pendentes,
    bloqueia os templates por 24h no ContactTemplateHistory e impede
    que novos webhooks disparem o template bloqueado para o mesmo contato.
    """
    db = db_session
    
    # 1. Configurar cliente e integração
    client = models.Client(name="Cliente 24h Test")
    db.add(client)
    db.commit()
    db.refresh(client)
    
    integration = models.WebhookIntegration(
        client_id=client.id,
        name="Hotmart 24h Interruption Test",
        platform="hotmart",
        status="active"
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)
    
    # 2. Criar Mapeamentos
    # Mapeamento 1: Carrinho Abandonado (usa 'abandonado_template')
    mapping_abandonado = models.WebhookEventMapping(
        integration_id=integration.id,
        event_type="carrinho_abandonado",
        template_name="abandonado_template",
        is_active=True,
        variables_mapping=[]
    )
    # Mapeamento 2: Pix Gerado (usa 'pix_template')
    mapping_pix = models.WebhookEventMapping(
        integration_id=integration.id,
        event_type="pix_gerado",
        template_name="pix_template",
        is_active=True,
        variables_mapping=[]
    )
    # Mapeamento 3: Compra Aprovada com Interrupção Inteligente para carrinho e pix
    mapping_compra = models.WebhookEventMapping(
        integration_id=integration.id,
        event_type="compra_aprovada",
        template_name="aprovado_template",
        is_active=True,
        cancel_pending_on_trigger=True,
        cancel_event_types=["carrinho_abandonado", "pix_gerado"],
        variables_mapping=[]
    )
    db.add_all([mapping_abandonado, mapping_pix, mapping_compra])
    db.commit()
    db.refresh(mapping_abandonado)
    db.refresh(mapping_pix)
    db.refresh(mapping_compra)
    
    test_phone = "5511988887777"
    
    # 3. Criar disparo pendente prévio de Carrinho Abandonado (criado há 5 minutos)
    pending_abandonado = models.ScheduledTrigger(
        client_id=client.id,
        contact_phone=test_phone,
        status="pending",
        template_name="abandonado_template",
        integration_id=integration.id,
        event_type="carrinho_abandonado",
        scheduled_time=datetime.now(timezone.utc) + timedelta(hours=1),
        created_at=datetime.now(timezone.utc) - timedelta(minutes=5)
    )
    db.add(pending_abandonado)
    db.commit()
    db.refresh(pending_abandonado)
    
    # Antes da compra, os templates não estão bloqueados
    assert is_template_sent_in_last_24h(db, client.id, test_phone, "abandonado_template") is False
    assert is_template_sent_in_last_24h(db, client.id, test_phone, "pix_template") is False
    
    # 4. Recebe Webhook de Compra Aprovada
    history_compra = models.WebhookHistory(
        integration_id=integration.id,
        event_type="compra_aprovada",
        payload={"phone": test_phone, "name": "Comprador VIP"},
        status="received"
    )
    db.add(history_compra)
    db.commit()
    db.refresh(history_compra)
    
    from unittest.mock import AsyncMock
    mock_rabbitmq = MagicMock()
    mock_rabbitmq.publish = AsyncMock()
    original_execute = db.execute
    def mock_execute(statement, *args, **kwargs):
        from sqlalchemy.sql.elements import TextClause
        if isinstance(statement, TextClause) and "pg_advisory_xact_lock" in statement.text:
            return MagicMock()
        return original_execute(statement, *args, **kwargs)
        
    with patch("database.SessionLocal", return_value=db), \
         patch.object(db, "close", MagicMock()), \
         patch.object(db, "execute", mock_execute), \
         patch("rabbitmq_client.rabbitmq", mock_rabbitmq):
         
        await process_webhook_automation(
            client_id=client.id,
            mapping=mapping_compra,
            variables={"phone": test_phone, "name": "Comprador VIP"},
            history_id=history_compra.id
        )
        
    db.refresh(pending_abandonado)
    
    # Validação 1: Disparo pendente anterior foi cancelado
    assert pending_abandonado.status == "cancelled"
    assert "Interrompido pelo evento" in pending_abandonado.failure_reason
    
    # Validação 2: Templates dos gatilhos interrompidos agora estão bloqueados por 24h!
    assert is_template_sent_in_last_24h(db, client.id, test_phone, "abandonado_template") is True
    assert is_template_sent_in_last_24h(db, client.id, test_phone, "pix_template") is True
    
    # 5. Simular chegada de um novo webhook posterior de Carrinho Abandonado para o mesmo contato
    history_novo_abandonado = models.WebhookHistory(
        integration_id=integration.id,
        event_type="carrinho_abandonado",
        payload={"phone": test_phone, "name": "Comprador VIP"},
        status="received"
    )
    db.add(history_novo_abandonado)
    db.commit()
    db.refresh(history_novo_abandonado)
    
    triggers_count_before = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client.id,
        models.ScheduledTrigger.contact_phone == test_phone,
        models.ScheduledTrigger.template_name == "abandonado_template",
        models.ScheduledTrigger.status.notin_(["failed", "cancelled"])
    ).count()
    
    with patch("database.SessionLocal", return_value=db), \
         patch.object(db, "close", MagicMock()), \
         patch.object(db, "execute", mock_execute), \
         patch("rabbitmq_client.rabbitmq", mock_rabbitmq):
         
        await process_webhook_automation(
            client_id=client.id,
            mapping=mapping_abandonado,
            variables={"phone": test_phone, "name": "Comprador VIP"},
            history_id=history_novo_abandonado.id
        )
        
    db.refresh(history_novo_abandonado)
    
    # Validação 3: O webhook novo foi pulado (skipped) e não gerou novo trigger
    assert history_novo_abandonado.status == "skipped"
    assert "bloqueado pela regra de 24h" in history_novo_abandonado.error_message
    
    triggers_count_after = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client.id,
        models.ScheduledTrigger.contact_phone == test_phone,
        models.ScheduledTrigger.template_name == "abandonado_template",
        models.ScheduledTrigger.status.notin_(["failed", "cancelled"])
    ).count()
    assert triggers_count_after == triggers_count_before

@pytest.mark.asyncio
async def test_worker_cancels_trigger_if_template_blocked_in_24h(db_session):
    """
    Valida que o worker em handle_funnel_execution cancela disparos
    diretos se o template estiver travado na janela de 24h.
    """
    db = db_session
    
    client = models.Client(name="Worker 24h Test")
    db.add(client)
    db.commit()
    db.refresh(client)
    
    test_phone = "5511966665555"
    template_name = "promocional_template"
    
    # 1. Registrar bloqueio prévio de 24h
    history_cth = models.ContactTemplateHistory(
        client_id=client.id,
        phone=test_phone,
        template_name=template_name,
        dispatched_at=datetime.now(timezone.utc)
    )
    db.add(history_cth)
    db.commit()
    
    # 2. Criar trigger que chegou ao worker
    trigger = models.ScheduledTrigger(
        client_id=client.id,
        contact_phone=test_phone,
        template_name=template_name,
        status="processing",
        skip_block_check=False
    )
    db.add(trigger)
    db.commit()
    db.refresh(trigger)
    
    with patch("database.SessionLocal", return_value=db), \
         patch.object(db, "close", MagicMock()), \
         patch("chatwoot_client.ChatwootClient.send_template") as mock_send:
         
        await handle_funnel_execution({"trigger_id": trigger.id, "contact_phone": test_phone})
        
        # O envio via API do WhatsApp não deve ter sido chamado
        mock_send.assert_not_called()
        
    db.refresh(trigger)
    assert trigger.status == "cancelled"
    assert "Template bloqueado pela regra de 24h" in trigger.failure_reason
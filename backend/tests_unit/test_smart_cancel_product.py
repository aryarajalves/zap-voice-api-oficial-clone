import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch
import models
from database import SessionLocal
from services.webhooks import process_webhook_automation

def test_smart_cancel_with_product_filter(db_session):
    db = db_session
    
    # 1. Configurar cliente e integração
    client = models.Client(name="Smart Cancel Client")
    db.add(client)
    db.commit()
    db.refresh(client)
    
    integration = models.WebhookIntegration(
        client_id=client.id,
        name="Hotmart Smart Cancel Test",
        platform="hotmart",
        status="active"
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)
    
    # 2. Criar Mapeamento com cancelamento inteligente ativado
    mapping = models.WebhookEventMapping(
        integration_id=integration.id,
        event_type="compra_aprovada",
        template_id=123,
        template_name="aprovado_template",
        is_active=True,
        cancel_pending_on_trigger=True,
        cancel_event_types=["carrinho_abandonado"],
        variables_mapping=[]
    )
    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    
    # 3. Criar Disparos Pendentes:
    # Um disparo pendente para o MESMO produto (Produto A)
    trigger_same_product = models.ScheduledTrigger(
        client_id=client.id,
        contact_phone="5511999991111",
        status="pending",
        template_name="abandonado_template",
        integration_id=integration.id,
        event_type="carrinho_abandonado",
        product_name="Produto A",
        scheduled_time=datetime.now(timezone.utc) + timedelta(hours=1),
        created_at=datetime.now(timezone.utc)
    )
    # Um disparo pendente para OUTRO produto (Produto B)
    trigger_diff_product = models.ScheduledTrigger(
        client_id=client.id,
        contact_phone="5511999991111",
        status="pending",
        template_name="abandonado_template",
        integration_id=integration.id,
        event_type="carrinho_abandonado",
        product_name="Produto B",
        scheduled_time=datetime.now(timezone.utc) + timedelta(hours=1),
        created_at=datetime.now(timezone.utc)
    )
    db.add(trigger_same_product)
    db.add(trigger_diff_product)
    db.commit()
    db.refresh(trigger_same_product)
    db.refresh(trigger_diff_product)
    
    # 4. Criar histórico para o evento de Compra Aprovada do "Produto A"
    history = models.WebhookHistory(
        integration_id=integration.id,
        event_type="compra_aprovada",
        payload={"phone": "5511999991111", "name": "Cliente Teste", "product_name": "Produto A"},
        status="received"
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    
    mock_rabbitmq = MagicMock()
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
         
        loop = asyncio.get_event_loop()
        loop.run_until_complete(process_webhook_automation(
            client_id=client.id,
            mapping=mapping,
            variables={"phone": "5511999991111", "name": "Cliente Teste", "product_name": "Produto A"},
            history_id=history.id
        ))
        
    db.refresh(trigger_same_product)
    db.refresh(trigger_diff_product)
    
    # Validações:
    # 1. O trigger do MESMO produto ("Produto A") deve ter sido cancelado
    assert trigger_same_product.status == "cancelled"
    assert "Interrompido pelo evento" in trigger_same_product.failure_reason
    
    # 2. O trigger do OUTRO produto ("Produto B") deve continuar pendente!
    assert trigger_diff_product.status == "pending"

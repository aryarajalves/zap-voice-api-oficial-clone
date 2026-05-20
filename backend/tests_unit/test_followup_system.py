import pytest
import os
import sys
from datetime import datetime, timezone, timedelta

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from database import Base
import models
from services.triggers_service import cancel_pending_followups_for_phone
from services.scheduler import run_stale_triggers_cleanup

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client_obj(db):
    c = models.Client(name="FollowupTestClient")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

def test_cancel_pending_followups_for_phone(db, client_obj):
    # 1. Criar um gatilho de follow-up que deve ser cancelado
    phone = "5511999999999"
    t_fu_to_cancel = models.ScheduledTrigger(
        client_id=client_obj.id,
        contact_phone=phone,
        status="queued",
        is_followup=True,
        scheduled_time=datetime.now(timezone.utc) + timedelta(hours=2)
    )
    
    # 2. Criar um gatilho de follow-up de outro telefone (não deve ser afetado)
    other_phone = "5511888888888"
    t_fu_keep = models.ScheduledTrigger(
        client_id=client_obj.id,
        contact_phone=other_phone,
        status="queued",
        is_followup=True,
        scheduled_time=datetime.now(timezone.utc) + timedelta(hours=2)
    )
    
    # 3. Criar um gatilho comum do mesmo telefone (não-followup) (não deve ser afetado)
    t_normal = models.ScheduledTrigger(
        client_id=client_obj.id,
        contact_phone=phone,
        status="queued",
        is_followup=False,
        scheduled_time=datetime.now(timezone.utc) + timedelta(hours=2)
    )
    
    db.add_all([t_fu_to_cancel, t_fu_keep, t_normal])
    db.commit()
    
    # Executar cancelamento
    cancel_pending_followups_for_phone(db, phone)
    
    db.refresh(t_fu_to_cancel)
    db.refresh(t_fu_keep)
    db.refresh(t_normal)
    
    # Validações
    assert t_fu_to_cancel.status == "canceled"
    assert "Cancelado por interacao do usuario detectada" in t_fu_to_cancel.failure_reason
    assert t_fu_keep.status == "queued"
    assert t_normal.status == "queued"

def test_reaper_does_not_cleanup_future_queued_triggers(db, client_obj):
    # 1. Criar um gatilho 'queued' agendado para o futuro (ex: +3 horas)
    t_future = models.ScheduledTrigger(
        client_id=client_obj.id,
        status="queued",
        scheduled_time=datetime.now(timezone.utc) + timedelta(hours=3),
        updated_at=datetime.now(timezone.utc) - timedelta(hours=3) # criado há 3 horas, atualizado há 3 horas
    )
    
    # 2. Criar um gatilho 'queued' agendado para o passado (ex: -3 horas)
    t_past_queued = models.ScheduledTrigger(
        client_id=client_obj.id,
        status="queued",
        scheduled_time=datetime.now(timezone.utc) - timedelta(hours=3),
        updated_at=datetime.now(timezone.utc) - timedelta(hours=3) # travado
    )
    
    # 3. Criar um gatilho 'processing' com atualização há mais de 2 horas (deve expirar)
    t_processing_stale = models.ScheduledTrigger(
        client_id=client_obj.id,
        status="processing",
        scheduled_time=datetime.now(timezone.utc) - timedelta(hours=3),
        updated_at=datetime.now(timezone.utc) - timedelta(hours=3)
    )
    
    db.add_all([t_future, t_past_queued, t_processing_stale])
    db.commit()
    
    # Resetar log local de limpeza de stale para permitir rodar no mesmo ciclo de teste
    import services.scheduler as scheduler_mod
    scheduler_mod._last_cleanup_stale = None
    
    # Executar a limpeza de stale triggers de forma síncrona passando a sessão de testes db
    import asyncio
    loop = asyncio.get_event_loop()
    loop.run_until_complete(run_stale_triggers_cleanup(db_session=db))
    
    db.refresh(t_future)
    db.refresh(t_past_queued)
    db.refresh(t_processing_stale)
    
    # Validações
    assert t_future.status == "queued" # NÃO deve ser cancelado (bug corrigido!)
    assert t_past_queued.status == "failed" # Deve ser cancelado porque já era pra ter rodado há >2h
    assert t_processing_stale.status == "failed" # Deve ser cancelado

def test_webhook_automation_forces_private_note_and_memory_active_by_default(db, client_obj):
    from unittest.mock import patch, MagicMock
    from services.webhooks import process_webhook_automation
    
    # 1. Criar Integração
    integration = models.WebhookIntegration(
        client_id=client_obj.id,
        name="Test Integration",
        platform="hotmart"
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)
    
    # 2. Criar Mapeamento no banco com Nota Privada e Disparar Memória desativados (ou falsos/nulos)
    mapping = models.WebhookEventMapping(
        integration_id=integration.id,
        event_type="compra_aprovada",
        template_id=123456,
        template_name="test_template_name",
        is_active=True,
        private_note="false", # Desativado no legado
        publish_external_event=False, # Desativado no legado
        variables_mapping=[]
    )
    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    
    # 3. Criar Histórico de Webhook
    history = models.WebhookHistory(
        integration_id=integration.id,
        event_type="compra_aprovada",
        payload={"phone": "5511999999999", "name": "Arya Stark"},
        status="received"
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    
    # Mock para rabbitmq
    mock_rabbitmq = MagicMock()
    
    # Wrapper para db.execute para ignorar pg_advisory_xact_lock no SQLite de testes
    original_execute = db.execute
    def mock_execute(statement, *args, **kwargs):
        from sqlalchemy.sql.elements import TextClause
        if isinstance(statement, TextClause) and "pg_advisory_xact_lock" in statement.text:
            return MagicMock()
        return original_execute(statement, *args, **kwargs)
    
    # Executar process_webhook_automation mockando SessionLocal e impedindo fechamento precoce da sessão
    import asyncio
    with patch("database.SessionLocal", return_value=db), \
         patch.object(db, "close", MagicMock()), \
         patch.object(db, "execute", mock_execute), \
         patch("rabbitmq_client.rabbitmq", mock_rabbitmq):
        
        loop = asyncio.get_event_loop()
        loop.run_until_complete(process_webhook_automation(
            client_id=client_obj.id,
            mapping=mapping,
            variables={"phone": "5511999999999", "name": "Arya Stark"},
            history_id=history.id
        ))
        
    # Buscar o trigger gerado
    st = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client_obj.id,
        models.ScheduledTrigger.event_type == "compra_aprovada"
    ).first()
    
    assert st is not None
    # Valida se a Nota Privada foi ativada por padrão ("true")
    assert st.private_message == "true"
    # Valida se o Disparo de Memória foi ativado por padrão (True)
    assert st.publish_external_event is True


def test_webhook_automation_duplicity_prevention(db, client_obj):
    from unittest.mock import patch, MagicMock
    from services.webhooks import process_webhook_automation
    
    # 1. Criar Integração
    integration = models.WebhookIntegration(
        client_id=client_obj.id,
        name="Duplicity Test Integration",
        platform="kiwify"
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)
    
    # 2. Criar Mapeamento
    mapping = models.WebhookEventMapping(
        integration_id=integration.id,
        event_type="compra_aprovada",
        template_id=999888,
        template_name="duplicity_template",
        is_active=True,
        variables_mapping=[]
    )
    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    
    # 3. Criar um ScheduledTrigger pré-existente (simulando que o lead já recebeu o template)
    pre_existing_st = models.ScheduledTrigger(
        client_id=client_obj.id,
        contact_phone="5511999991234",
        status="sent",
        template_name="duplicity_template",
        integration_id=integration.id,
        event_type="compra_aprovada",
        scheduled_time=datetime.now(timezone.utc) - timedelta(minutes=5),
        created_at=datetime.now(timezone.utc) - timedelta(minutes=10)
    )
    db.add(pre_existing_st)
    db.commit()
    
    # 4. Criar Novo Histórico de Webhook para processamento
    history = models.WebhookHistory(
        integration_id=integration.id,
        event_type="compra_aprovada",
        payload={"phone": "5511999991234", "name": "Tony Stark"},
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
        
    # Executar process_webhook_automation
    import asyncio
    with patch("database.SessionLocal", return_value=db), \
         patch.object(db, "close", MagicMock()), \
         patch.object(db, "execute", mock_execute), \
         patch("rabbitmq_client.rabbitmq", mock_rabbitmq):
        
        loop = asyncio.get_event_loop()
        loop.run_until_complete(process_webhook_automation(
            client_id=client_obj.id,
            mapping=mapping,
            variables={"phone": "5511999991234", "name": "Tony Stark"},
            history_id=history.id
        ))
        
    db.refresh(history)
    
    # Validações
    # O histórico deve ser ignorado devido à duplicidade
    assert history.status == "ignored"
    assert "Disparo duplicado evitado" in history.error_message
    
    # Contar total de ScheduledTriggers para este contato e template. Deve continuar sendo apenas 1 (o pré-existente)
    total_triggers = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client_obj.id,
        models.ScheduledTrigger.contact_phone == "5511999991234",
        models.ScheduledTrigger.template_name == "duplicity_template"
    ).count()
    
    assert total_triggers == 1



import pytest
from datetime import datetime, timezone, timedelta
from database import SessionLocal
import models
from services.scheduler import process_recurring_triggers

@pytest.mark.asyncio
async def test_recurring_trigger_within_tolerance(db_session):
    """
    Testa se um agendamento recorrente que executa dentro da tolerância de 30 minutos
    é agendado normalmente com status 'queued'.
    """
    # 1. Setup - Criar dados no banco de testes
    client = models.Client(name="Cliente Teste Recorrência")
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)
    
    now = datetime.now(timezone.utc)
    # Agendado para 10 minutos atrás (dentro da tolerância de 30 minutos)
    ten_mins_ago = now - timedelta(minutes=10)
    
    rt = models.RecurringTrigger(
        client_id=client.id,
        frequency="weekly",
        scheduled_time="12:00",
        is_active=True,
        next_run_at=ten_mins_ago,
        contacts_list=[{"phone": "5511999999999", "name": "João Teste"}]
    )
    db_session.add(rt)
    db_session.commit()
    db_session.refresh(rt)
    
    # 2. Executar a função do scheduler
    await process_recurring_triggers(db_session, now)
    
    # 3. Assert - Verificar se ScheduledTrigger foi criado como queued
    st = db_session.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client.id,
        models.ScheduledTrigger.recurring_trigger_id == rt.id
    ).first()
    
    assert st is not None
    assert st.status == 'queued'
    assert st.is_recurring is True
    assert st.failure_reason is None

@pytest.mark.asyncio
async def test_recurring_trigger_exceeds_tolerance_aborted(db_session):
    """
    Testa se um agendamento recorrente que executa após a tolerância de 30 minutos
    é abortado com status 'aborted' e motivo de falha correspondente.
    """
    # 1. Setup - Criar cliente e recorrência atrasada
    client = models.Client(name="Cliente Teste Recorrência Atrasada")
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)
    
    now = datetime.now(timezone.utc)
    # Agendado para 45 minutos atrás (fora da tolerância de 30 minutos)
    forty_five_mins_ago = now - timedelta(minutes=45)
    
    rt = models.RecurringTrigger(
        client_id=client.id,
        frequency="weekly",
        scheduled_time="12:00",
        is_active=True,
        next_run_at=forty_five_mins_ago,
        contacts_list=[{"phone": "5511888888888", "name": "Maria Atrasada"}]
    )
    db_session.add(rt)
    db_session.commit()
    db_session.refresh(rt)
    
    # 2. Executar a função do scheduler
    await process_recurring_triggers(db_session, now)
    
    # 3. Assert - Verificar se ScheduledTrigger foi criado como aborted
    st = db_session.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client.id,
        models.ScheduledTrigger.recurring_trigger_id == rt.id
    ).first()
    
    assert st is not None
    assert st.status == 'aborted'
    assert st.is_recurring is True
    assert "Disparo abortado: Limite de atraso (30 minutos) excedido" in st.failure_reason

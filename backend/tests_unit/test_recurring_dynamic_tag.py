import pytest
from datetime import datetime, timezone, timedelta
import models
from services.scheduler import process_recurring_triggers
from routers.schedules import get_recurring_contacts


@pytest.mark.asyncio
async def test_recurring_trigger_dynamic_tag_audience(db_session):
    """
    Testa se um agendamento recorrente configurado com tag e sem contacts_list
    resolve dinamicamente o público-alvo a partir do banco local WebhookLead.
    """
    # 1. Setup - Criar cliente
    client = models.Client(name="Cliente Teste Dinâmico")
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)

    now = datetime.now(timezone.utc)
    ten_mins_ago = now - timedelta(minutes=10)

    # 2. Criar recorrência dinâmica (contacts_list = None, tag = 'aryaraj')
    rt = models.RecurringTrigger(
        client_id=client.id,
        frequency="weekly",
        scheduled_time="12:00",
        is_active=True,
        next_run_at=ten_mins_ago,
        tag="aryaraj",
        contacts_list=None
    )
    db_session.add(rt)
    db_session.commit()
    db_session.refresh(rt)

    # 3. Adicionar 2 leads locais com a etiqueta
    lead1 = models.WebhookLead(client_id=client.id, phone="5511999999991", name="Lead Um", tags="aryaraj")
    lead2 = models.WebhookLead(client_id=client.id, phone="5511999999992", name="Lead Dois", tags="aryaraj")
    db_session.add_all([lead1, lead2])
    db_session.commit()

    # 4. Executar primeiro processamento do scheduler
    await process_recurring_triggers(db_session, now)

    # Verificar se ScheduledTrigger foi criado com 2 contatos dinâmicos
    st1 = db_session.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client.id,
        models.ScheduledTrigger.recurring_trigger_id == rt.id
    ).first()

    assert st1 is not None
    assert st1.status == 'queued'
    assert len(st1.contacts_list) == 2
    phones_st1 = {c['phone'] for c in st1.contacts_list}
    assert "5511999999991" in phones_st1
    assert "5511999999992" in phones_st1

    # 5. Adicionar um terceiro lead com a etiqueta
    lead3 = models.WebhookLead(client_id=client.id, phone="5511999999993", name="Lead Três", tags="aryaraj")
    db_session.add(lead3)
    
    rt.next_run_at = now + timedelta(hours=1) - timedelta(minutes=10)
    db_session.commit()

    # 6. Executar segundo processamento do scheduler
    await process_recurring_triggers(db_session, now + timedelta(hours=1))

    # Buscar o segundo ScheduledTrigger gerado
    triggers = db_session.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client.id,
        models.ScheduledTrigger.recurring_trigger_id == rt.id
    ).all()

    assert len(triggers) == 2
    st2 = [t for t in triggers if t.id != st1.id][0]

    assert st2.status == 'queued'
    assert len(st2.contacts_list) == 3
    phones_st2 = {c['phone'] for c in st2.contacts_list}
    assert "5511999999991" in phones_st2
    assert "5511999999992" in phones_st2
    assert "5511999999993" in phones_st2

    # 7. Simular remoção de etiqueta no banco local (lead2 perde a tag)
    lead2.tags = "outra-tag"
    rt.next_run_at = now + timedelta(hours=2) - timedelta(minutes=10)
    db_session.commit()

    # Executar terceiro processamento
    await process_recurring_triggers(db_session, now + timedelta(hours=2))

    triggers = db_session.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client.id,
        models.ScheduledTrigger.recurring_trigger_id == rt.id
    ).all()

    assert len(triggers) == 3
    st3 = [t for t in triggers if t.id not in [st1.id, st2.id]][0]

    # O lead removido da etiqueta NÃO deve aparecer no disparo
    assert st3.status == 'queued'
    assert len(st3.contacts_list) == 2
    phones_st3 = {c['phone'] for c in st3.contacts_list}
    assert "5511999999991" in phones_st3
    assert "5511999999993" in phones_st3
    assert "5511999999992" not in phones_st3


@pytest.mark.asyncio
async def test_recurring_tag_chatwoot_fallback_to_local_db(db_session):
    """
    Testa que o sistema resolve os contatos da tag usando o banco local.
    """
    client = models.Client(name="Cliente Fallback")
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)

    # Criar leads no banco local com a tag
    lead_a = models.WebhookLead(client_id=client.id, phone="5521888888881", name="Lead A", tags="fallback-tag")
    db_session.add(lead_a)

    now = datetime.now(timezone.utc)
    rt = models.RecurringTrigger(
        client_id=client.id,
        frequency="daily",
        scheduled_time="08:00",
        is_active=True,
        next_run_at=now - timedelta(minutes=5),
        tag="fallback-tag",
        contacts_list=None
    )
    db_session.add(rt)
    db_session.commit()

    await process_recurring_triggers(db_session, now)

    st = db_session.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client.id,
        models.ScheduledTrigger.recurring_trigger_id == rt.id
    ).first()

    assert st is not None
    assert st.status == 'queued'
    assert len(st.contacts_list) == 1
    assert st.contacts_list[0]['phone'] == "5521888888881"


@pytest.mark.asyncio
async def test_recurring_tag_contacts_merge_endpoint(db_session):
    client = models.Client(name="Cliente Merge Tag")
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)
    
    # Criar leads na etiqueta no banco local
    # Contato A tem a etiqueta
    # Contato B não tem mais a etiqueta, mas está no snapshot
    # Contato C foi removido manualmente (está na exclusion_list)
    lead_a = models.WebhookLead(client_id=client.id, phone="5511999990001", name="Contato A", tags="tag-merge")
    lead_b = models.WebhookLead(client_id=client.id, phone="5511999990002", name="Contato B", tags="outra-tag")
    db_session.add_all([lead_a, lead_b])
    db_session.commit()

    rt = models.RecurringTrigger(
        client_id=client.id,
        frequency="weekly",
        tag="tag-merge",
        contacts_list=[
            {"phone": "5511999990001", "name": "Contato A"},
            {"phone": "5511999990002", "name": "Contato B"}
        ],
        exclusion_list=["5511999990003"]
    )
    db_session.add(rt)
    db_session.commit()
    db_session.refresh(rt)
    
    result = await get_recurring_contacts(
        rt_id=rt.id,
        x_client_id=str(client.id),
        db=db_session,
        current_user=None
    )
        
    assert result["mode"] == "tag"
    
    # Deve conter Contato A, Contato B e Contato C
    assert len(result["contacts"]) == 3
    
    # Contato A (etiqueta ativa) ativo
    contact_a = next(c for c in result["contacts"] if c["phone"] == "5511999990001")
    assert contact_a["is_excluded"] is False
    
    # Contato B (só no snapshot/removido da etiqueta) marcado como excluído
    contact_b = next(c for c in result["contacts"] if c["phone"] == "5511999990002")
    assert contact_b["is_excluded"] is True
    
    # Contato C (excluído manualmente do agendamento) marcado como excluído
    contact_c = next(c for c in result["contacts"] if c["phone"] == "5511999990003")
    assert contact_c["is_excluded"] is True
    assert contact_c["name"] == "Contato Removido"
    
    # Todos os excluídos (B e C) na exclusion_list final
    assert "5511999990002" in result["exclusion_list"]
    assert "5511999990003" in result["exclusion_list"]

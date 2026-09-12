import pytest
from datetime import datetime, timezone
import models
from services.bulk import refresh_dynamic_label_contacts

@pytest.mark.asyncio
async def test_dynamic_inclusion_increases_contacts(db_session):
    """
    Testa se ao entrar novos contatos na etiqueta de destinatario,
    a re-consulta dinamica inclui os novos contatos e aumenta o total.
    """
    client = models.Client(name="Cliente Inclusao Dinamica")
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)

    # Criar 2 leads iniciais com tag 'interessados'
    lead1 = models.WebhookLead(client_id=client.id, phone="5511999990001", name="Lead 1", tags="interessados")
    lead2 = models.WebhookLead(client_id=client.id, phone="5511999990002", name="Lead 2", tags="interessados")
    db_session.add_all([lead1, lead2])
    db_session.commit()

    trigger = models.ScheduledTrigger(
        client_id=client.id,
        is_dynamic_label=True,
        dynamic_label_name="interessados",
        chatwoot_label=["interessados"],
        contacts_list=[{"phone": "5511999990001", "name": "Lead 1"}, {"phone": "5511999990002", "name": "Lead 2"}],
        total_contacts=2,
        status="queued"
    )
    db_session.add(trigger)
    db_session.commit()
    db_session.refresh(trigger)

    # Entra um 3º contato na tag antes do disparo
    lead3 = models.WebhookLead(client_id=client.id, phone="5511999990003", name="Lead 3", tags="interessados")
    db_session.add(lead3)
    db_session.commit()

    # Executar re-consulta no momento do envio
    updated = await refresh_dynamic_label_contacts(trigger, db=db_session)

    assert updated is not None
    assert len(updated) == 3
    phones = {c["phone"] for c in updated}
    assert "5511999990001" in phones
    assert "5511999990002" in phones
    assert "5511999990003" in phones

@pytest.mark.asyncio
async def test_dynamic_exclusion_removes_excluded_tags(db_session):
    """
    Testa se contatos que possuem a etiqueta de exclusao sao removidos
    dinamicamente na hora do disparo, mesmo que tenham a etiqueta de destinatario.
    """
    client = models.Client(name="Cliente Exclusao Dinamica")
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)

    # Lead 1: interessados (qualificado)
    # Lead 2: interessados, comprou (deve ser excluido por tag)
    # Lead 3: interessados, cancelado (deve ser excluido por tag)
    # Lead 4: interessados (deve ser excluido por exclusion_list estatica)
    lead1 = models.WebhookLead(client_id=client.id, phone="5511999991111", name="Qualificado 1", tags="interessados")
    lead2 = models.WebhookLead(client_id=client.id, phone="5511999992222", name="Comprou", tags="interessados, comprou")
    lead3 = models.WebhookLead(client_id=client.id, phone="5511999993333", name="Cancelou", tags="interessados, cancelado")
    lead4 = models.WebhookLead(client_id=client.id, phone="5511999994444", name="Manual Excluido", tags="interessados")
    db_session.add_all([lead1, lead2, lead3, lead4])
    db_session.commit()

    trigger = models.ScheduledTrigger(
        client_id=client.id,
        is_dynamic_label=True,
        dynamic_label_name="interessados",
        chatwoot_label=["interessados"],
        exclusion_tags=["comprou", "cancelado"],
        exclusion_tag_mode="OR",
        exclusion_list=["5511999994444"],
        total_contacts=4,
        status="queued"
    )
    db_session.add(trigger)
    db_session.commit()
    db_session.refresh(trigger)

    # Executar re-consulta
    updated = await refresh_dynamic_label_contacts(trigger, db=db_session)

    assert updated is not None
    assert len(updated) == 1
    assert updated[0]["phone"] == "5511999991111"
    assert updated[0]["name"] == "Qualificado 1"

@pytest.mark.asyncio
async def test_dynamic_exclusion_and_mode(db_session):
    """
    Testa modo AND na exclusao: contato so e excluido se possuir TODAS as tags de exclusao.
    """
    client = models.Client(name="Cliente Modo AND")
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)

    # Lead 1: apenas 'aluno' (nao deve ser excluido no modo AND de [aluno, vip])
    # Lead 2: 'aluno' e 'vip' (deve ser excluido no modo AND)
    lead1 = models.WebhookLead(client_id=client.id, phone="5511999995555", name="Apenas Aluno", tags="base, aluno")
    lead2 = models.WebhookLead(client_id=client.id, phone="5511999996666", name="Aluno e VIP", tags="base, aluno, vip")
    db_session.add_all([lead1, lead2])
    db_session.commit()

    trigger = models.ScheduledTrigger(
        client_id=client.id,
        is_dynamic_label=True,
        dynamic_label_name="base",
        exclusion_tags=["aluno", "vip"],
        exclusion_tag_mode="AND",
        status="queued"
    )
    db_session.add(trigger)
    db_session.commit()
    db_session.refresh(trigger)

    updated = await refresh_dynamic_label_contacts(trigger, db=db_session)

    assert updated is not None
    assert len(updated) == 1
    assert updated[0]["phone"] == "5511999995555"

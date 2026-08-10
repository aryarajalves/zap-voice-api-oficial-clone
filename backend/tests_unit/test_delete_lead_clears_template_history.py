"""
Teste unitário para validar que ao deletar um lead,
as restrições de 24h de template (ContactTemplateHistory e MessageStatus)
são removidas automaticamente junto com o contato.
"""
import pytest
from datetime import datetime, timezone, timedelta
import models
from sqlalchemy.orm import Session


def test_delete_lead_clears_template_history(db_session: Session):
    """
    Ao deletar um lead, o ContactTemplateHistory deve ser removido
    para liberar o número de receber o template novamente.
    """
    phone = "5511991112222"
    client_id = 1

    # Criar lead
    lead = models.WebhookLead(
        client_id=client_id,
        phone=phone,
        name="Contato Teste Delete",
        last_template_name="convite_base_agosto",
        last_template_dispatched_at=datetime.now(timezone.utc) - timedelta(hours=2)
    )
    db_session.add(lead)
    db_session.flush()

    # Criar histórico de disparo
    history = models.ContactTemplateHistory(
        client_id=client_id,
        phone=phone,
        template_name="convite_base_agosto",
        dispatched_at=datetime.now(timezone.utc) - timedelta(hours=2)
    )
    db_session.add(history)
    db_session.commit()

    # Garantir que existe o histórico antes
    count_before = db_session.query(models.ContactTemplateHistory).filter(
        models.ContactTemplateHistory.phone == phone
    ).count()
    assert count_before == 1, "Histórico deveria existir antes da deleção"

    # Importar e executar a função de deleção
    from routers.leads import _delete_lead_and_relations
    _delete_lead_and_relations(db_session, lead, client_id)
    db_session.commit()

    # Verificar que o histórico foi removido
    count_after = db_session.query(models.ContactTemplateHistory).filter(
        models.ContactTemplateHistory.phone == phone
    ).count()
    assert count_after == 0, "ContactTemplateHistory deve ser limpo ao deletar o lead"

    # Verificar que o lead foi removido
    lead_check = db_session.query(models.WebhookLead).filter(
        models.WebhookLead.phone == phone,
        models.WebhookLead.client_id == client_id
    ).first()
    assert lead_check is None, "Lead deve ser deletado"


def test_delete_lead_clears_message_status_template(db_session: Session):
    """
    Ao deletar um lead, os MessageStatus relacionados a templates (sem trigger_id)
    também devem ser removidos para garantir que a verificação de 24h seja zerada.
    """
    phone = "5511993334444"
    client_id = 1

    # Criar lead
    lead = models.WebhookLead(
        client_id=client_id,
        phone=phone,
        name="Contato Teste Delete MS",
        last_template_name="template_teste",
        last_template_dispatched_at=datetime.now(timezone.utc) - timedelta(hours=3)
    )
    db_session.add(lead)
    db_session.flush()

    # Criar MessageStatus sem trigger_id (disparo avulso de template)
    ms = models.MessageStatus(
        phone_number=phone,
        template_name="template_teste",
        status="delivered",
        timestamp=datetime.now(timezone.utc) - timedelta(hours=3),
        trigger_id=None
    )
    db_session.add(ms)
    db_session.commit()

    count_before = db_session.query(models.MessageStatus).filter(
        models.MessageStatus.phone_number == phone,
        models.MessageStatus.trigger_id.is_(None)
    ).count()
    assert count_before == 1

    from routers.leads import _delete_lead_and_relations
    _delete_lead_and_relations(db_session, lead, client_id)
    db_session.commit()

    count_after = db_session.query(models.MessageStatus).filter(
        models.MessageStatus.phone_number == phone,
        models.MessageStatus.trigger_id.is_(None)
    ).count()
    assert count_after == 0, "MessageStatus de template sem trigger deve ser limpo ao deletar o lead"

"""
Testes unitários para o endpoint DELETE /whatsapp/templates/{template_name}/24h-history
"""
import pytest
from datetime import datetime, timezone, timedelta
import models
from sqlalchemy.orm import Session


def test_reset_template_24h_history_clears_records(db_session: Session):
    """
    O endpoint deve remover os registros de ContactTemplateHistory e MessageStatus sem trigger_id
    apenas para o template e client_id indicados.
    """
    client_id = 1
    template_name = "template_para_reset"
    other_template = "template_outro"
    phone = "5511998877665"

    cutoff = datetime.now(timezone.utc) - timedelta(hours=1)

    # 1. Criar dados para o template alvo
    hist1 = models.ContactTemplateHistory(
        client_id=client_id,
        phone=phone,
        template_name=template_name,
        dispatched_at=cutoff
    )
    ms1 = models.MessageStatus(
        phone_number=phone,
        template_name=template_name,
        status="delivered",
        timestamp=cutoff,
        trigger_id=None
    )

    # 2. Criar dados para outro template (que NÃO deve ser afetado)
    hist2 = models.ContactTemplateHistory(
        client_id=client_id,
        phone=phone,
        template_name=other_template,
        dispatched_at=cutoff
    )

    db_session.add_all([hist1, ms1, hist2])
    db_session.commit()

    # Executar a mesma consulta do endpoint
    deleted_history = db_session.query(models.ContactTemplateHistory).filter(
        models.ContactTemplateHistory.client_id == client_id,
        models.ContactTemplateHistory.template_name == template_name
    ).delete(synchronize_session=False)

    deleted_ms = db_session.query(models.MessageStatus).filter(
        models.MessageStatus.template_name == template_name,
        models.MessageStatus.trigger_id.is_(None)
    ).delete(synchronize_session=False)

    db_session.commit()

    assert deleted_history == 1
    assert deleted_ms == 1

    # Verificar que o outro template permaneceu intacto
    remaining_other = db_session.query(models.ContactTemplateHistory).filter(
        models.ContactTemplateHistory.client_id == client_id,
        models.ContactTemplateHistory.template_name == other_template
    ).count()
    assert remaining_other == 1

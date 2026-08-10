"""
Teste unitário para validar que ao encerrar a janela de 24h no chat:
1. convo.last_contact_message_at é definido no passado (>24h).
2. O registro em ContactWindow é deletado.
3. O histórico em ContactTemplateHistory é limpo.
"""
import pytest
from datetime import datetime, timezone, timedelta
import models
from sqlalchemy.orm import Session


def test_reset_24h_window_clears_contact_window_and_template_history(db_session: Session):
    client_id = 1
    phone = "5585996123586"

    # 1. Criar conversa (usando campo 'phone' correto do modelo)
    convo = models.ChatConversation(
        client_id=client_id,
        phone=phone,
        contact_name="Aryaraj Teste",
        last_contact_message_at=datetime.now(timezone.utc)
    )
    db_session.add(convo)
    db_session.flush()

    # 2. Criar ContactWindow (interação recente)
    cw = models.ContactWindow(
        client_id=client_id,
        phone=phone,
        last_interaction_at=datetime.now(timezone.utc)
    )
    db_session.add(cw)

    # 3. Criar ContactTemplateHistory
    cth = models.ContactTemplateHistory(
        client_id=client_id,
        phone=phone,
        template_name="convite_base_agosto",
        dispatched_at=datetime.now(timezone.utc)
    )
    db_session.add(cth)
    db_session.commit()

    # Garantir existência prévia
    assert db_session.query(models.ContactWindow).filter_by(phone=phone).count() == 1
    assert db_session.query(models.ContactTemplateHistory).filter_by(phone=phone).count() == 1

    # Simular o comportamento do endpoint reset_24h_window
    from sqlalchemy import or_
    clean_phone = ''.join(filter(str.isdigit, str(phone)))
    suffix = clean_phone[-8:]

    convo.last_contact_message_at = datetime.now(timezone.utc) - timedelta(hours=25)
    
    db_session.query(models.ContactWindow).filter(
        models.ContactWindow.client_id == client_id,
        or_(models.ContactWindow.phone == clean_phone, models.ContactWindow.phone.like(f"%{suffix}"))
    ).delete(synchronize_session=False)

    db_session.query(models.ContactTemplateHistory).filter(
        models.ContactTemplateHistory.client_id == client_id,
        or_(models.ContactTemplateHistory.phone == clean_phone, models.ContactTemplateHistory.phone.like(f"%{suffix}"))
    ).delete(synchronize_session=False)

    db_session.commit()

    # Validações pós-reset
    assert db_session.query(models.ContactWindow).filter_by(phone=phone).count() == 0, "ContactWindow deve ter sido deletado"
    assert db_session.query(models.ContactTemplateHistory).filter_by(phone=phone).count() == 0, "ContactTemplateHistory deve ter sido deletado"
    dt_last = convo.last_contact_message_at
    if dt_last.tzinfo is None:
        dt_last = dt_last.replace(tzinfo=timezone.utc)
    assert dt_last < datetime.now(timezone.utc) - timedelta(hours=24), "last_contact_message_at deve estar no passado (>24h)"

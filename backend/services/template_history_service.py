import models
from datetime import datetime, timezone, timedelta
from sqlalchemy import or_

def is_template_sent_in_last_24h(db, client_id: int, phone: str, template_name: str) -> bool:
    """
    Verifica se o mesmo template foi disparado para o número nas últimas 24 horas.
    """
    if not phone or not template_name:
        return False
        
    clean_phone = ''.join(filter(str.isdigit, str(phone)))
    if not clean_phone:
        return False

    suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    # 1. Verificar em ContactTemplateHistory
    history_entry = db.query(models.ContactTemplateHistory).filter(
        models.ContactTemplateHistory.client_id == client_id,
        models.ContactTemplateHistory.template_name == template_name,
        models.ContactTemplateHistory.dispatched_at >= cutoff,
        or_(
            models.ContactTemplateHistory.phone == clean_phone,
            models.ContactTemplateHistory.phone.like(f"%{suffix}")
        )
    ).first()

    if history_entry:
        return True

    # 2. Verificar também em MessageStatus para garantir retrospectiva
    msg_status = db.query(models.MessageStatus).filter(
        models.MessageStatus.template_name == template_name,
        models.MessageStatus.timestamp >= cutoff,
        models.MessageStatus.status.in_(["sent", "delivered", "read"]),
        or_(
            models.MessageStatus.phone_number == clean_phone,
            models.MessageStatus.phone_number.like(f"%{suffix}")
        )
    ).first()

    if msg_status:
        return True

    return False

def record_template_dispatch(db, client_id: int, phone: str, template_name: str, trigger_id: int = None):
    """
    Registra o disparo de template no histórico e atualiza os campos no WebhookLead.
    """
    if not phone or not template_name:
        return

    clean_phone = ''.join(filter(str.isdigit, str(phone)))
    if not clean_phone:
        return

    now_utc = datetime.now(timezone.utc)
    suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone

    try:
        # Registrar histórico individual
        history = models.ContactTemplateHistory(
            client_id=client_id,
            phone=clean_phone,
            template_name=template_name,
            trigger_id=trigger_id,
            dispatched_at=now_utc
        )
        db.add(history)

        # Atualizar o lead
        lead = db.query(models.WebhookLead).filter(
            models.WebhookLead.client_id == client_id,
            or_(
                models.WebhookLead.phone == clean_phone,
                models.WebhookLead.phone.like(f"%{suffix}")
            )
        ).first()

        if lead:
            lead.last_template_name = template_name
            lead.last_template_dispatched_at = now_utc

        db.commit()
    except Exception as e:
        db.rollback()
        import logging
        logging.getLogger("TemplateHistory").error(f"Erro ao registrar histórico de template para {phone}: {e}")

import pytest
from database import SessionLocal, engine, Base
import models
from services.template_history_service import record_template_dispatch, is_template_sent_in_last_24h

def test_reset_template_history_endpoint():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        client = db.query(models.Client).first()
        client_id = client.id if client else 1
        phone = "5511988887777"
        template_name = "tpl_test_reset_endpoint"

        # 1. Criar lead de teste
        lead = db.query(models.WebhookLead).filter(
            models.WebhookLead.client_id == client_id,
            models.WebhookLead.phone == phone
        ).first()

        if not lead:
            lead = models.WebhookLead(
                client_id=client_id,
                phone=phone,
                name="Contato Teste Reset"
            )
            db.add(lead)
            db.commit()
            db.refresh(lead)

        # 2. Registrar envio de template
        record_template_dispatch(db, client_id, phone, template_name)
        assert is_template_sent_in_last_24h(db, client_id, phone, template_name) is True

        # 3. Executar o reset manual (simulando a rota DELETE)
        db.query(models.ContactTemplateHistory).filter(
            models.ContactTemplateHistory.client_id == client_id,
            models.ContactTemplateHistory.phone == phone
        ).delete()
        lead.last_template_name = None
        lead.last_template_dispatched_at = None
        db.commit()

        # 4. Verificar se o contato foi liberado
        assert is_template_sent_in_last_24h(db, client_id, phone, template_name) is False
        db.refresh(lead)
        assert lead.last_template_name is None
        assert lead.last_template_dispatched_at is None

        # Limpeza
        db.delete(lead)
        db.commit()
    finally:
        db.close()

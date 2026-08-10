import pytest
from datetime import datetime, timezone, timedelta
from database import SessionLocal, engine, Base
import models
from services.template_history_service import is_template_sent_in_last_24h, record_template_dispatch

def test_template_24h_validation_flow():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        client = db.query(models.Client).first()
        client_id = client.id if client else 1
        phone = "5511999887766"
        template_name = "test_template_24h_val"

        # 1. Garantir ambiente limpo
        db.query(models.ContactTemplateHistory).filter(
            models.ContactTemplateHistory.client_id == client_id,
            models.ContactTemplateHistory.phone == phone
        ).delete()
        db.commit()

        # 2. Inicialmente, não deve ter sido enviado em 24h
        sent_before = is_template_sent_in_last_24h(db, client_id, phone, template_name)
        assert sent_before is False

        # 3. Registrar disparo de template
        record_template_dispatch(db, client_id, phone, template_name, trigger_id=None)

        # 4. Agora DEVE ser detectado como enviado nas últimas 24h
        sent_after = is_template_sent_in_last_24h(db, client_id, phone, template_name)
        assert sent_after is True

        # 5. Template DIFERENTE para o mesmo número em 24h NÃO deve ser bloqueado
        sent_diff = is_template_sent_in_last_24h(db, client_id, phone, "different_template")
        assert sent_diff is False

        # 6. Limpeza final
        db.query(models.ContactTemplateHistory).filter(
            models.ContactTemplateHistory.client_id == client_id,
            models.ContactTemplateHistory.phone == phone
        ).delete()
        db.commit()
    finally:
        db.close()

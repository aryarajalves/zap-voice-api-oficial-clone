"""
Testes unitários para is_template_sent_in_last_24h com a nova regra de bloqueio:
- Só bloqueia re-disparo se o WhatsApp CONFIRMOU entrega (status: delivered ou read).
- Status 'sent' (ACK da Meta API sem confirmação) NÃO bloqueia.
- ContactTemplateHistory NÃO é mais critério de bloqueio — só serve para o badge no lead.
"""
import pytest
from datetime import datetime, timezone, timedelta
from services.template_history_service import is_template_sent_in_last_24h, record_template_dispatch
import models
from sqlalchemy.orm import Session


TEMPLATE = "convite_02_meteorico_agosto"
CLIENT_ID = 1
PHONE = "5511999880001"
CUTOFF_OK = datetime.now(timezone.utc) - timedelta(hours=2)   # dentro das 24h
CUTOFF_OLD = datetime.now(timezone.utc) - timedelta(hours=25)  # fora das 24h


# ─── CENÁRIO 1: Não deve bloquear — status 'sent' apenas ────────────────────

def test_nao_bloqueia_se_apenas_sent(db_session: Session):
    """
    Status 'sent' = ACK da Meta API. Usuário pode não ter recebido.
    NÃO deve bloquear re-disparo.
    """
    ms = models.MessageStatus(
        phone_number=PHONE,
        template_name=TEMPLATE,
        status="sent",
        timestamp=CUTOFF_OK,
        trigger_id=None
    )
    db_session.add(ms)
    db_session.commit()

    result = is_template_sent_in_last_24h(db_session, CLIENT_ID, PHONE, TEMPLATE)
    assert result is False, "Status 'sent' NÃO deve bloquear — mensagem pode não ter chegado"


# ─── CENÁRIO 2: Deve bloquear — status 'delivered' ──────────────────────────

def test_bloqueia_se_delivered(db_session: Session):
    """
    Status 'delivered' = WhatsApp confirmou que chegou ao celular do usuário.
    DEVE bloquear re-disparo por 24h.
    """
    ms = models.MessageStatus(
        phone_number=PHONE,
        template_name=TEMPLATE,
        status="delivered",
        timestamp=CUTOFF_OK,
        trigger_id=None
    )
    db_session.add(ms)
    db_session.commit()

    result = is_template_sent_in_last_24h(db_session, CLIENT_ID, PHONE, TEMPLATE)
    assert result is True, "Status 'delivered' DEVE bloquear re-disparo"


# ─── CENÁRIO 3: Deve bloquear — status 'read' ───────────────────────────────

def test_bloqueia_se_read(db_session: Session):
    """
    Status 'read' = usuário abriu a mensagem. DEVE bloquear.
    """
    ms = models.MessageStatus(
        phone_number=PHONE,
        template_name=TEMPLATE,
        status="read",
        timestamp=CUTOFF_OK,
        trigger_id=None
    )
    db_session.add(ms)
    db_session.commit()

    result = is_template_sent_in_last_24h(db_session, CLIENT_ID, PHONE, TEMPLATE)
    assert result is True, "Status 'read' DEVE bloquear re-disparo"


# ─── CENÁRIO 4: Não deve bloquear — delivered, mas fora das 24h ─────────────

def test_nao_bloqueia_se_delivered_fora_24h(db_session: Session):
    """
    Mesmo entregue, se passou mais de 24h, não deve bloquear.
    """
    ms = models.MessageStatus(
        phone_number=PHONE,
        template_name=TEMPLATE,
        status="delivered",
        timestamp=CUTOFF_OLD,
        trigger_id=None
    )
    db_session.add(ms)
    db_session.commit()

    result = is_template_sent_in_last_24h(db_session, CLIENT_ID, PHONE, TEMPLATE)
    assert result is False, "Entregue há mais de 24h NÃO deve bloquear"


# ─── CENÁRIO 5: ContactTemplateHistory SOZINHO não deve bloquear ─────────────

def test_contact_template_history_sozinho_nao_bloqueia(db_session: Session):
    """
    Mesmo que ContactTemplateHistory exista (badge no lead foi criado),
    se não houver MessageStatus com delivered/read, NÃO deve bloquear.
    Isso garante que disparos que falharam silenciosamente podem ser repetidos.
    """
    history = models.ContactTemplateHistory(
        client_id=CLIENT_ID,
        phone=PHONE,
        template_name=TEMPLATE,
        dispatched_at=CUTOFF_OK
    )
    db_session.add(history)
    db_session.commit()

    result = is_template_sent_in_last_24h(db_session, CLIENT_ID, PHONE, TEMPLATE)
    assert result is False, "ContactTemplateHistory sozinho NÃO deve bloquear re-disparo"


# ─── CENÁRIO 6: failed + ContactTemplateHistory não bloqueia ─────────────────

def test_failed_nao_bloqueia(db_session: Session):
    """
    Se o status é 'failed' (erro confirmado), definitivamente não deve bloquear.
    """
    ms = models.MessageStatus(
        phone_number=PHONE,
        template_name=TEMPLATE,
        status="failed",
        failure_reason="Erro na Meta API",
        timestamp=CUTOFF_OK,
        trigger_id=None
    )
    db_session.add(ms)
    db_session.commit()

    result = is_template_sent_in_last_24h(db_session, CLIENT_ID, PHONE, TEMPLATE)
    assert result is False, "Status 'failed' NÃO deve bloquear"


# ─── CENÁRIO 7: Número com formato diferente mas mesmo sufixo ────────────────

def test_bloqueia_com_variacao_de_formato_de_telefone(db_session: Session):
    """
    Sistema normaliza o telefone pelo sufixo. Número com DDI diferente
    mas mesmo final deve ser bloqueado se delivered.
    """
    phone_sem_ddi = "11999880001"  # sem 55
    ms = models.MessageStatus(
        phone_number="5511999880001",  # com 55
        template_name=TEMPLATE,
        status="delivered",
        timestamp=CUTOFF_OK,
        trigger_id=None
    )
    db_session.add(ms)
    db_session.commit()

    result = is_template_sent_in_last_24h(db_session, CLIENT_ID, phone_sem_ddi, TEMPLATE)
    assert result is True, "Mesmo número com formato diferente DEVE ser bloqueado se delivered"

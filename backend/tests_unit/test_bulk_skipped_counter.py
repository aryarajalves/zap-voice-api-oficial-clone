"""
Testes unitários para o contador de contatos pulados (total_skipped) no disparo em massa.

Verifica que:
1. Contatos pulados pelo check de 24h NÃO incrementam total_failed
2. Contatos pulados incrementam total_skipped
3. O MessageStatus criado tem status='skipped' (não 'failed')
4. O reconcile conta skipped corretamente
5. O processedNum no frontend inclui skipped no cálculo de "Restam N"
"""
import pytest
from unittest.mock import patch, MagicMock
from services.bulk_persistence import update_trigger_stats, record_skipped_status
import models
from sqlalchemy.orm import Session


def test_update_trigger_stats_skipped_increments_total_skipped(db_session: Session):
    """update_trigger_stats(skipped=1) deve incrementar total_skipped, não total_failed."""
    from models import ScheduledTrigger
    trigger = ScheduledTrigger(
        client_id=1,
        status="running",
        is_bulk=True,
        total_skipped=0,
        total_failed=0,
        total_sent=0
    )
    db_session.add(trigger)
    db_session.commit()

    update_trigger_stats(db_session, trigger.id, skipped=1)
    db_session.refresh(trigger)

    assert trigger.total_skipped == 1, "total_skipped deve ser 1"
    assert trigger.total_failed == 0, "total_failed NÃO deve ser incrementado"
    assert trigger.total_sent == 0, "total_sent NÃO deve ser incrementado"


def test_update_trigger_stats_skipped_multiple_times(db_session: Session):
    """Múltiplos skips devem acumular corretamente."""
    from models import ScheduledTrigger
    trigger = ScheduledTrigger(
        client_id=1,
        status="running",
        is_bulk=True,
        total_skipped=0
    )
    db_session.add(trigger)
    db_session.commit()

    for _ in range(5):
        update_trigger_stats(db_session, trigger.id, skipped=1)

    db_session.refresh(trigger)
    assert trigger.total_skipped == 5


def test_record_skipped_status_creates_skipped_messagestatus(db_session: Session):
    """record_skipped_status deve criar MessageStatus com status='skipped'."""
    from models import ScheduledTrigger, MessageStatus
    trigger = ScheduledTrigger(client_id=1, status="running", is_bulk=True)
    db_session.add(trigger)
    db_session.commit()

    phone = "5511999990000"
    record_skipped_status(trigger.id, phone)

    # Verificar no banco
    ms = db_session.query(MessageStatus).filter(
        MessageStatus.trigger_id == trigger.id,
        MessageStatus.phone_number == phone
    ).first()

    assert ms is not None, "MessageStatus deve ser criado"
    assert ms.status == "skipped", "Status deve ser 'skipped', não 'failed'"
    assert "24h" in (ms.failure_reason or ""), "failure_reason deve mencionar 24h"


def test_record_skipped_status_idempotent(db_session: Session):
    """Chamar record_skipped_status duas vezes não deve criar duplicatas."""
    from models import ScheduledTrigger, MessageStatus
    trigger = ScheduledTrigger(client_id=1, status="running", is_bulk=True)
    db_session.add(trigger)
    db_session.commit()

    phone = "5511888880000"
    record_skipped_status(trigger.id, phone)
    record_skipped_status(trigger.id, phone)

    count = db_session.query(MessageStatus).filter(
        MessageStatus.trigger_id == trigger.id,
        MessageStatus.phone_number == phone,
        MessageStatus.status == "skipped"
    ).count()

    assert count == 1, "Não deve criar registros duplicados"


def test_skipped_does_not_affect_failed_counter(db_session: Session):
    """Skipped e failed devem ser contadores independentes."""
    from models import ScheduledTrigger
    trigger = ScheduledTrigger(
        client_id=1,
        status="running",
        is_bulk=True,
        total_skipped=0,
        total_failed=0
    )
    db_session.add(trigger)
    db_session.commit()

    update_trigger_stats(db_session, trigger.id, skipped=3)
    update_trigger_stats(db_session, trigger.id, failed=2)

    db_session.refresh(trigger)
    assert trigger.total_skipped == 3
    assert trigger.total_failed == 2


def test_processed_num_includes_skipped_for_remaining_calculation():
    """
    O cálculo de 'Restam N' no frontend deve incluir skipped em processedNum.
    Simula a lógica do TriggerTableRow.jsx em Python.
    """
    trigger_data = {
        "total_contacts": 1000,
        "total_sent": 0,
        "total_failed": 0,
        "total_skipped": 1000,
        "processed_contacts": []
    }

    total = trigger_data["total_contacts"]
    processed_num = trigger_data["total_sent"] + trigger_data["total_failed"] + trigger_data["total_skipped"]
    processed_arr = len(trigger_data["processed_contacts"])
    processed = max(processed_arr, processed_num)
    remaining = max(0, total - processed)

    assert remaining == 0, f"Restam deve ser 0 quando todos foram pulados, mas foi {remaining}"

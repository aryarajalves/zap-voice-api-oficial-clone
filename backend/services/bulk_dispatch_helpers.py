import zoneinfo
from datetime import datetime, timezone, timedelta
from typing import Optional, Set, Tuple, List, Dict, Any
from sqlalchemy.orm import Session

import models
from core.logger import setup_logger
from services.utils.phone_utils import normalize_phone
from services.bulk_persistence import get_sent_phones_set

logger = setup_logger(__name__)
BRAZIL_TZ = zoneinfo.ZoneInfo("America/Sao_Paulo")


def sanitize_and_deduplicate_contacts(contacts: list, trigger_id: int) -> Tuple[list, int, int]:
    """
    Higieniza e deduplica preventivamente a lista de contatos, mantendo apenas números válidos e únicos.
    """
    unique_contacts = []
    seen_phones_initial = set()
    duplicates_removed = 0
    invalid_removed = 0

    for c in (contacts or []):
        p_raw = c if isinstance(c, str) else (
            c.get('phone') or c.get('telefone') or c.get('whatsapp') or
            c.get('contact_phone') or c.get('number') or ''
        )
        p_norm = normalize_phone(p_raw)
        if not p_norm or len(p_norm) < 8:
            invalid_removed += 1
            continue
        if p_norm in seen_phones_initial:
            duplicates_removed += 1
            continue
        seen_phones_initial.add(p_norm)
        unique_contacts.append(c)

    if duplicates_removed > 0 or invalid_removed > 0:
        logger.info(
            f"🧹 [BULK CLEANUP] Trigger #{trigger_id} | Original: {len(contacts or [])} | "
            f"Duplicados removidos: {duplicates_removed} | Inválidos: {invalid_removed} | "
            f"Qualificados únicos: {len(unique_contacts)}"
        )

    return unique_contacts, duplicates_removed, invalid_removed


def check_initial_deadline_expiration(
    init_trig: models.ScheduledTrigger,
    contacts: list,
    template_name: str,
    db_init: Session,
    trigger_id: int
) -> bool:
    """
    Verifica se o max_dispatch_time já expirou no momento de iniciar o disparo.
    Retorna True se expirou e o disparo foi abortado.
    """
    now_start = datetime.now(timezone.utc)
    mdt = getattr(init_trig, "max_dispatch_time", None)

    if mdt and isinstance(mdt, datetime):
        if mdt.tzinfo is None:
            mdt = mdt.replace(tzinfo=timezone.utc)
        if now_start > mdt:
            formatted_mdt = mdt.astimezone(BRAZIL_TZ).strftime('%d/%m/%Y %H:%M')
            abort_msg = f"Prazo limite de envio já expirado ({formatted_mdt}). Disparo abortado."
            logger.warning(f"🛑 [BULK TIMEOUT] Trigger #{trigger_id} já iniciado após o prazo limite ({mdt.isoformat()}). Abortado.")

            for c in contacts:
                p_num = normalize_phone(c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or ''))
                if p_num:
                    db_init.add(models.MessageStatus(
                        trigger_id=trigger_id, phone_number=p_num, status='failed',
                        failure_reason=abort_msg, content=f"[Disparo Expirado] {template_name or 'Mensagem Direta'}"
                    ))

            from services.engine import log_node_execution
            log_node_execution(db_init, init_trig, node_id=init_trig.current_node_id or 'DELIVERY', status='failed', details=abort_msg)
            init_trig.status = "aborted"
            init_trig.failure_reason = abort_msg
            init_trig.total_failed = len(contacts)
            init_trig.total_contacts = len(contacts)
            init_trig.pending_contacts = []
            db_init.commit()
            return True

    return False


async def prefetch_blocked_and_resting(
    c_id: int,
    trig_exclusion_list: list,
    trigger_id: int,
    db: Session
) -> Tuple[Set[str], Set[str]]:
    """
    Pré-carrega o conjunto de telefones bloqueados, em descanso, de exclusão e já enviados.
    """
    blocked_set = set()
    sent_phones_set = set()

    try:
        client_ids = [c_id]
        client = db.query(models.Client).filter(models.Client.id == c_id).first()
        if client and client.project_id:
            sibling_clients = db.query(models.Client.id).filter(models.Client.project_id == client.project_id).all()
            client_ids = [c.id for c in sibling_clients]

        blocked_raw = db.query(models.BlockedContact.phone).filter(
            models.BlockedContact.client_id.in_(client_ids)
        ).all()
        for b in blocked_raw:
            p_norm = normalize_phone(b[0])
            if p_norm:
                blocked_set.add(p_norm)
                if len(p_norm) >= 8:
                    blocked_set.add(p_norm[-8:])

        now = datetime.utcnow()
        resting_raw = db.query(models.RestingContact.phone).filter(
            models.RestingContact.client_id.in_(client_ids),
            models.RestingContact.expires_at > now
        ).all()
        for r in resting_raw:
            p_norm = normalize_phone(r[0])
            if p_norm:
                blocked_set.add(p_norm)
                if len(p_norm) >= 8:
                    blocked_set.add(p_norm[-8:])

        if trig_exclusion_list:
            for excl in trig_exclusion_list:
                p_norm = normalize_phone(excl)
                if p_norm:
                    blocked_set.add(p_norm)
                    if len(p_norm) >= 8:
                        blocked_set.add(p_norm[-8:])

        sent_phones_set = await get_sent_phones_set(db, trigger_id)
    except Exception as e:
        logger.error(f"⚠️ [BULK] Erro ao carregar contatos bloqueados/descanso/exclusao: {e}")

    return blocked_set, sent_phones_set


async def check_batch_deadline_expiration(
    current_trig: models.ScheduledTrigger,
    contacts: list,
    current_idx: int,
    sent_phones_set: set,
    template_name: str,
    c_id: int,
    db_batch: Session,
    trigger_id: int,
    rabbitmq_client: Any
) -> bool:
    """
    Checagem de prazo limite e fallback de 24h a cada lote de envio.
    Retorna True se expirou e o disparo foi abortado.
    """
    now_check = datetime.now(timezone.utc)
    deadline = getattr(current_trig, "max_dispatch_time", None)
    if deadline and not isinstance(deadline, datetime):
        deadline = None

    if not deadline:
        started_at_str = (current_trig.processed_data or {}).get("started_at")
        if started_at_str and isinstance(started_at_str, str):
            try:
                started_dt = datetime.fromisoformat(started_at_str)
                if started_dt.tzinfo is None:
                    started_dt = started_dt.replace(tzinfo=timezone.utc)
                deadline = started_dt + timedelta(hours=24)
            except Exception:
                deadline = None

    if deadline and isinstance(deadline, datetime):
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)

        if now_check > deadline:
            remaining_contacts = contacts[current_idx:]
            formatted_deadline = deadline.astimezone(BRAZIL_TZ).strftime('%d/%m/%Y %H:%M')
            abort_reason = f"Prazo limite de envio atingido ({formatted_deadline}). Disparo abortado para contatos restantes."
            logger.warning(f"🛑 [BULK TIMEOUT] Trigger #{trigger_id} ultrapassou o prazo limite ({formatted_deadline}). Abortando {len(remaining_contacts)} contatos.")

            new_abort_fails = 0
            for rem_c in remaining_contacts:
                rem_p_raw = rem_c if isinstance(rem_c, str) else (rem_c.get('phone') or rem_c.get('telefone') or rem_c.get('whatsapp') or '')
                rem_p = normalize_phone(rem_p_raw)
                if rem_p and rem_p not in sent_phones_set:
                    db_batch.add(models.MessageStatus(
                        trigger_id=trigger_id, phone_number=rem_p, status='failed',
                        failure_reason=abort_reason, content=f"[Disparo Abortado] {template_name or 'Mensagem Direta'}"
                    ))
                    new_abort_fails += 1
                    sent_phones_set.add(rem_p)

            from services.engine import log_node_execution
            log_node_execution(db_batch, current_trig, node_id=current_trig.current_node_id or 'DELIVERY', status='failed', details=abort_reason)
            current_trig.status = 'aborted'
            current_trig.failure_reason = abort_reason
            current_trig.total_failed = (current_trig.total_failed or 0) + new_abort_fails
            current_trig.pending_contacts = []
            db_batch.commit()
            await rabbitmq_client.publish_event("trigger_updated", {"trigger_id": trigger_id, "status": "aborted", "client_id": c_id})
            return True

    return False


def extract_contact_vars(c: Any, name: str) -> Dict[str, str]:
    """
    Extrai variáveis parametrizadas (1 a 5) do contato ou de seus componentes.
    """
    cvars = {}
    per_contact_components = c.get('components') if isinstance(c, dict) else None

    for v_idx in range(1, 6):
        val = None
        if isinstance(c, dict):
            val = c.get(str(v_idx)) or c.get(f"{{{{{v_idx}}}}}") or c.get(v_idx)
        if not val and per_contact_components:
            for comp in per_contact_components:
                if str(comp.get("type", "")).lower() == "body":
                    params = comp.get("parameters", [])
                    if len(params) >= v_idx:
                        p = params[v_idx - 1]
                        val = p.get("text") if isinstance(p, dict) else p
                    break
        if v_idx == 1 and not val:
            val = name
        cvars[f"var{v_idx}"] = str(val) if val is not None else ""

    return cvars


def _safe_int(val: Any) -> int:
    if isinstance(val, (int, float)):
        return int(val)
    return 0


def build_progress_payload(
    trigger_id: int,
    c_id: int,
    current_trig: models.ScheduledTrigger,
    total_contacts: int,
    extra_fields: Optional[dict] = None
) -> dict:
    """
    Monta o payload uniforme de progresso para publicação no WebSocket via RabbitMQ.
    """
    sent_cnt = _safe_int(getattr(current_trig, "total_sent", 0))
    deliv_cnt = _safe_int(getattr(current_trig, "total_delivered", 0))
    failed_cnt = _safe_int(getattr(current_trig, "total_failed", 0))
    read_cnt = _safe_int(getattr(current_trig, "total_read", 0))
    inter_cnt = _safe_int(getattr(current_trig, "total_interactions", 0))
    block_cnt = _safe_int(getattr(current_trig, "total_blocked", 0))
    skip_cnt = _safe_int(getattr(current_trig, "total_skipped", 0))
    paid_cnt = _safe_int(getattr(current_trig, "total_paid_templates", 0))

    cost_val = getattr(current_trig, "total_cost", 0.0)
    cost_float = float(cost_val) if isinstance(cost_val, (int, float)) else 0.0

    payload = {
        "trigger_id": trigger_id,
        "client_id": c_id,
        "status": getattr(current_trig, "status", "processing"),
        "sent": sent_cnt,
        "total_sent": sent_cnt,
        "failed": failed_cnt,
        "total_failed": failed_cnt,
        "delivered": deliv_cnt,
        "total_delivered": deliv_cnt,
        "read": read_cnt,
        "total_read": read_cnt,
        "interactions": inter_cnt,
        "total_interactions": inter_cnt,
        "blocked": block_cnt,
        "total_blocked": block_cnt,
        "skipped": skip_cnt,
        "total_skipped": skip_cnt,
        "queue_count": max(0, sent_cnt - deliv_cnt),
        "cost": cost_float,
        "total_cost": cost_float,
        "total_paid_templates": paid_cnt,
        "total": total_contacts,
        "total_contacts": total_contacts
    }
    if extra_fields:
        payload.update(extra_fields)
    return payload

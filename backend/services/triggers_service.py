import asyncio
import csv
import io
import json
import random
import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from core.logger import logger
from rabbitmq_client import rabbitmq

async def reconcile_trigger_stats_logic(trigger_id: int, client_id: int, db: Session):
    """
    Recalcula todos os contadores do disparo baseando-se nos registros detalhados da tabela message_status.
    """
    trigger = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.id == trigger_id,
        models.ScheduledTrigger.client_id == client_id
    ).first()

    if not trigger:
        return None

    # 1. Buscar todos os status de mensagem associados
    statuses = db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id == trigger_id).all()

    # 2. Inicializar contadores
    sent = 0
    delivered = 0
    read = 0
    failed = 0
    total_cost = 0.0
    paid_templates = 0

    # 3. Processar cada registro
    for ms in statuses:
        if ms.status == 'sent':
            sent += 1
        elif ms.status == 'delivered':
            sent += 1
            delivered += 1
        elif ms.status == 'read' or ms.is_interaction:
            sent += 1
            delivered += 1
            read += 1
        elif ms.status == 'failed':
            failed += 1
        
        # Custo (Apenas se entregue ou lido)
        if ms.status in ['delivered', 'read'] or ms.is_interaction:
            if ms.meta_price_brl:
                total_cost += float(ms.meta_price_brl)
                if ms.meta_price_brl > 0:
                    paid_templates += 1
            elif trigger.cost_per_unit and ms.message_type != 'FREE_MESSAGE':
                 total_cost += float(trigger.cost_per_unit)
                 paid_templates += 1

    # 4. Atualizar o Trigger
    trigger.total_sent = sent
    trigger.total_delivered = delivered
    trigger.total_read = read
    trigger.total_failed = failed
    trigger.total_cost = total_cost
    trigger.total_paid_templates = paid_templates
    
    # Marcar registros como contados
    for ms in statuses:
        if ms.status in ['delivered', 'read']:
            ms.delivered_counted = True
        if ms.status == 'read' or ms.is_interaction:
            ms.read_counted = True

    db.commit()
    db.refresh(trigger)
    
    return {
        "sent": sent,
        "delivered": delivered,
        "read": read,
        "failed": failed,
        "cost": total_cost
    }

async def cancel_trigger_with_report_logic(trigger_id: int, payload: dict, db: Session):
    """
    Interrompe um disparo em andamento e retorna um relatório final.
    """
    trigger = db.query(models.ScheduledTrigger).get(trigger_id)
    if not trigger:
        return None
    
    if trigger.status in ['completed', 'failed', 'cancelled']:
        return "finished"
    
    # Mark as cancelling (worker will detect and stop)
    trigger.status = "cancelling"
    db.commit()
    
    if payload:
        trigger.processed_contacts = payload.get("processed", [])
        trigger.pending_contacts = payload.get("pending", [])
        if "sent" in payload: trigger.total_sent = payload["sent"]
        if "failed" in payload: trigger.total_failed = payload["failed"]
    else:
        await asyncio.sleep(1)
    
    db.refresh(trigger)
    trigger.status = "cancelled"
    db.commit()
    
    processed = trigger.processed_contacts or []
    pending = trigger.pending_contacts or []
    
    failed_messages = db.query(models.MessageStatus).filter(
        models.MessageStatus.trigger_id == trigger_id,
        models.MessageStatus.status == 'failed'
    ).all()
    failed = [msg.phone_number for msg in failed_messages]
    
    report = {
        "status": "cancelled",
        "trigger_id": trigger_id,
        "progress": {
            "total": len(trigger.contacts_list) if trigger.contacts_list else 0,
            "sent": trigger.total_sent or 0,
            "failed": trigger.total_failed or 0,
            "pending": len(pending)
        },
        "contacts": {
            "sent": processed,
            "failed": failed,
            "pending": pending
        },
        "message": f"Disparo cancelado. {len(processed)} enviados, {len(pending)} pendentes."
    }
    
    return report

async def retry_trigger_logic(trigger_id: int, db: Session):
    """
    Reinicia o disparo (individual ou falhas em massa).
    """
    trigger = db.query(models.ScheduledTrigger).get(trigger_id)
    if not trigger:
        return None

    # CASE 1: INDIVIDUAL TRIGGER
    if not trigger.is_bulk:
        logger.info(f"🔄 Retrying SINGLE trigger {trigger_id} for {trigger.contact_phone}")
        trigger.status = "queued"
        trigger.failure_reason = None
        trigger.current_node_id = None
        trigger.current_step_index = 0
        trigger.scheduled_time = datetime.now(timezone.utc)
        db.commit()

        await rabbitmq.publish("zapvoice_funnel_executions", {
            "trigger_id": trigger.id,
            "funnel_id": trigger.funnel_id,
            "conversation_id": trigger.conversation_id,
            "contact_phone": trigger.contact_phone,
            "contact_name": trigger.contact_name
        })
        return {"status": "success", "message": "Reenvio individual iniciado"}
    
    # CASE 2: BULK TRIGGER
    failed_contacts = db.query(models.MessageStatus).filter(
        models.MessageStatus.trigger_id == trigger_id,
        models.MessageStatus.status == 'failed'
    ).all()
    
    if not failed_contacts:
        return "no_failures"

    failed_phones = [m.phone_number for m in failed_contacts]
    
    # Limpar falhas do banco
    db.query(models.MessageStatus).filter(
        models.MessageStatus.trigger_id == trigger_id,
        models.MessageStatus.status == 'failed'
    ).delete()
    
    trigger.status = "queued"
    trigger.pending_contacts = failed_phones
    trigger.total_failed = 0
    if trigger.processed_contacts:
        trigger.processed_contacts = [p for p in trigger.processed_contacts if p not in failed_phones]
    
    db.commit()
    
    if trigger.funnel_id:
        await rabbitmq.publish("zapvoice_funnel_executions", {
            "trigger_id": trigger.id,
            "funnel_id": trigger.funnel_id,
            "contacts": [{"phone": p} for p in failed_phones],
            "delay": trigger.delay_seconds,
            "concurrency": trigger.concurrency_limit,
            "type": "funnel_bulk"
        })
    else:
        await rabbitmq.publish("zapvoice_bulk_sends", {
            "trigger_id": trigger.id,
            "template_name": trigger.template_name,
            "contacts": failed_phones,
            "delay": trigger.delay_seconds,
            "concurrency": trigger.concurrency_limit,
            "language": trigger.template_language,
            "components": trigger.template_components,
            "private_message_delay": trigger.private_message_delay,
            "private_message_concurrency": trigger.private_message_concurrency
        })

    return {"status": "success", "message": f"Retry iniciado para {len(failed_phones)} contatos"}

async def start_now_trigger_logic(trigger_id: int, db: Session):
    """
    Força o início imediato de um disparo que está em fila ou falhou.
    """
    trigger = db.query(models.ScheduledTrigger).get(trigger_id)
    if not trigger:
        return None

    if trigger.status == "processing":
        return "already_processing"

    logger.info(f"⚡ Forçando início imediato do trigger {trigger_id}")
    
    # Resetar para estado inicial de execução
    trigger.status = "queued"
    trigger.scheduled_time = datetime.now(timezone.utc)
    trigger.failure_reason = None
    
    # Se for bulk, garante que temos contatos pendentes
    if trigger.is_bulk:
        if not trigger.pending_contacts and trigger.contacts_list:
            trigger.pending_contacts = [normalize_phone(c if isinstance(c, str) else (c.get('phone') or '')) for c in trigger.contacts_list]
    
    db.commit()

    # Enviar para a fila correta
    if trigger.is_bulk:
        if trigger.funnel_id:
            await rabbitmq.publish("zapvoice_funnel_executions", {
                "trigger_id": trigger.id,
                "funnel_id": trigger.funnel_id,
                "contacts": trigger.contacts_list,
                "delay": trigger.delay_seconds,
                "concurrency": trigger.concurrency_limit,
                "type": "funnel_bulk"
            })
        else:
            await rabbitmq.publish("zapvoice_bulk_sends", {
                "trigger_id": trigger.id,
                "template_name": trigger.template_name,
                "contacts": trigger.contacts_list,
                "delay": trigger.delay_seconds,
                "concurrency": trigger.concurrency_limit,
                "language": trigger.template_language,
                "components": trigger.template_components
            })
    else:
        await rabbitmq.publish("zapvoice_funnel_executions", {
            "trigger_id": trigger.id,
            "funnel_id": trigger.funnel_id,
            "conversation_id": trigger.conversation_id,
            "contact_phone": trigger.contact_phone,
            "contact_name": trigger.contact_name
        })

    return {"status": "success", "message": "Disparo iniciado com sucesso"}

def process_bulk_csv_logic(csv_content: str):
    """
    Processa conteúdo de CSV e extrai contatos válidos.
    """
    contacts = []
    try:
        csv_reader = csv.DictReader(io.StringIO(csv_content))
        if csv_reader.fieldnames:
             csv_reader.fieldnames = [h.lower().replace(' ', '_') for h in csv_reader.fieldnames]

        for row in csv_reader:
            phone = row.get('phone') or row.get('telefone') or row.get('celular') or row.get('whatsapp')
            if phone:
                clean_phone = ''.join(filter(str.isdigit, phone))
                if len(clean_phone) >= 10:
                    row['phone'] = clean_phone
                    contacts.append(row)
    except Exception as e:
        logger.error(f"Erro ao processar CSV: {e}")
        return None
    
    return contacts

def increment_private_note_stats(db: Session, trigger_id: int):
    """
    Incrementa o contador de notas privadas enviadas para um disparo.
    """
    if not trigger_id:
        return
    
    try:
        trigger = db.query(models.ScheduledTrigger).get(trigger_id)
        if trigger:
            if trigger.total_private_notes is None:
                trigger.total_private_notes = 0
            trigger.total_private_notes += 1
            db.commit()
    except Exception as e:
        logger.error(f"Erro ao incrementar estatísticas de nota privada: {e}")
        db.rollback()

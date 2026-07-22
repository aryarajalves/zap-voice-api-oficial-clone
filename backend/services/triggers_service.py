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
from services.utils.phone_utils import normalize_phone

async def reconcile_trigger_stats_logic(trigger_id: int, client_id: int, db: Session):
    """
    Recalcula todos os contadores do disparo baseando-se nos registros detalhados da tabela message_status.
    Garante contagem de contatos únicos e regras idênticas ao modal do frontend.
    """
    trigger = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.id == trigger_id,
        models.ScheduledTrigger.client_id == client_id
    ).first()

    if not trigger:
        return None

    # 1. Buscar todos os status de mensagem associados (do próprio trigger ou de seus filhos)
    child_ids = [c[0] for c in db.query(models.ScheduledTrigger.id).filter(models.ScheduledTrigger.parent_id == trigger_id).all()]
    all_trigger_ids = [trigger_id] + child_ids
    
    # Buscar todos os registros de status de mensagem para esses triggers
    all_statuses = db.query(models.MessageStatus).filter(
        models.MessageStatus.trigger_id.in_(all_trigger_ids)
    ).all()

    if not all_statuses:
        return None

    # 2. Inicializar contadores
    sent = 0
    delivered = 0
    read = 0
    failed = 0
    blocked = 0
    interactions = 0
    total_cost = 0.0
    paid_templates = 0

    # 3. Agrupar por telefone em Python para consolidar contadores de contatos únicos
    phone_groups = {}
    for ms in all_statuses:
        phone = ms.phone_number
        if phone not in phone_groups:
            phone_groups[phone] = []
        phone_groups[phone].append(ms)

    for phone, group in phone_groups.items():
        has_interaction = any((ms.is_interaction or ms.interaction_counted) and ms.failure_reason != 'BLOCKED_VIA_BUTTON' for ms in group)
        has_sent = any(ms.status in ['sent', 'delivered', 'read', 'interaction'] or ms.delivered_counted or ms.read_counted for ms in group)
        has_delivered = any(ms.status in ['delivered', 'read', 'interaction'] or ms.delivered_counted or ms.is_interaction for ms in group)
        # Mensagens só são lidas (read) se tiverem status 'read' ou 'interaction' (ou sinalização de read_counted), 
        # sem nunca incluir status 'sent' que ainda está na fila
        has_read = any(ms.status in ['read', 'interaction'] or ms.read_counted or (ms.is_interaction and not ms.status == 'sent') for ms in group)
        has_blocked = any(ms.failure_reason == 'BLOCKED_VIA_BUTTON' for ms in group)
        
        # Para falha, consideramos se o status final (mais recente) do contato é falha
        latest_ms = max(group, key=lambda x: x.id)
        has_failed = latest_ms.status == 'failed' and latest_ms.failure_reason != 'BLOCKED_VIA_BUTTON'

        if has_sent: sent += 1
        if has_delivered: delivered += 1
        if has_read: read += 1
        
        if has_blocked: blocked += 1
        elif has_failed: failed += 1
        if has_interaction: interactions += 1

        # Calcular custo acumulando de todos os itens do grupo
        for ms in group:
            if ms.status in ['delivered', 'read', 'interaction'] or ms.delivered_counted or ms.is_interaction:
                if ms.meta_price_brl is not None:
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
    trigger.total_blocked = blocked
    trigger.total_interactions = interactions
    trigger.total_cost = total_cost
    trigger.total_paid_templates = paid_templates

    # Se houver mensagens falhas, sincronizar a razão do erro
    failed_msgs = [ms for ms in all_statuses if ms.status == 'failed' and ms.failure_reason]
    if failed_msgs:
        latest_failed_msg = max(failed_msgs, key=lambda x: x.id)
        trigger.failure_reason = latest_failed_msg.failure_reason


    # queue_count: mensagens enviadas à Meta que ainda não receberam confirmação de entrega
    # (status='sent', sem delivered_counted nem read_counted).
    # Usa subquery max(id) por telefone igual ao modal — NÃO usa fórmula aritmética
    # porque as categorias se sobrepõem e podem gerar valor negativo.
    try:
        from sqlalchemy import func as sqlfunc, select
        subq = db.query(sqlfunc.max(models.MessageStatus.id)).filter(
            models.MessageStatus.trigger_id.in_(all_trigger_ids)
        ).group_by(models.MessageStatus.phone_number).subquery()
        trigger.queue_count = db.query(models.MessageStatus).filter(
            models.MessageStatus.id.in_(select(subq)),
            models.MessageStatus.status == 'sent',
            models.MessageStatus.delivered_counted == False,
            models.MessageStatus.read_counted == False
        ).count()
    except Exception:
        trigger.queue_count = 0
    
    # Não alterar os registros no banco durante o cálculo para evitar efeitos colaterais
    db.commit()
    db.refresh(trigger)
    
    return {
        "sent": sent,
        "delivered": delivered,
        "read": read,
        "failed": failed,
        "blocked": blocked,
        "interactions": interactions,
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
        await rabbitmq.publish("zapvoice_bulk_sends", {
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

    if trigger.status == "processing" and not trigger.is_bulk:
        return "already_processing"

    # Verificar se já existe um worker ativo processando esse disparo (heartbeat recente nos últimos 30 segundos)
    is_worker_alive = False
    if trigger.is_bulk and trigger.processed_data and "last_heartbeat" in trigger.processed_data:
        try:
            last_hb = datetime.fromisoformat(trigger.processed_data["last_heartbeat"])
            if last_hb.tzinfo is not None:
                last_hb = last_hb.astimezone(timezone.utc).replace(tzinfo=None)
            diff = (datetime.utcnow() - last_hb).total_seconds()
            if diff < 30:
                is_worker_alive = True
        except Exception as e_hb:
            logger.error(f"Erro ao verificar heartbeat do worker: {e_hb}")

    if is_worker_alive:
        logger.info(f"⚡ [START_NOW] Worker ativo detectado para trigger {trigger_id} (heartbeat recente). Apenas atualizando status.")
        trigger.status = "processing"
        trigger.failure_reason = None
        db.commit()
        await rabbitmq.publish_event("trigger_updated", {"trigger_id": trigger_id, "status": "processing", "client_id": trigger.client_id})
        return {"status": "success", "message": "Disparo retomado com sucesso (worker ativo)"}

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
            await rabbitmq.publish("zapvoice_bulk_sends", {
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


def cancel_pending_followups_for_phone(db: Session, phone: str):
    """
    Cancela qualquer ScheduledTrigger de follow-up que esteja pendente de envio
    para o telefone especificado, pois houve interação do usuário.
    """
    if not phone:
        return
    
    clean_phone = "".join(filter(str.isdigit, phone))
    
    try:
        pending_followups = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.contact_phone == clean_phone,
            models.ScheduledTrigger.status == "queued",
            models.ScheduledTrigger.is_followup == True
        ).all()
        
        for fu in pending_followups:
            fu.status = "canceled"
            fu.failure_reason = "Cancelado por interacao do usuario detectada."
            logger.info(f"🚫 [FOLLOW-UP] Cancelando trigger de follow-up #{fu.id} para {clean_phone} devido a interacao.")
        
        if pending_followups:
            db.commit()
    except Exception as e:
        logger.error(f"Erro ao cancelar follow-ups pendentes para {clean_phone}: {e}")
        db.rollback()

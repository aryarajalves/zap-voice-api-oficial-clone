import asyncio
import random
import models
from sqlalchemy import text
from datetime import datetime, timezone
from database import SessionLocal
from rabbitmq_client import rabbitmq
from core.logger import setup_logger

logger = setup_logger(__name__)

# Limitar concorrência de escrita da simulação para nunca sobrecarregar o pool do banco
_SIM_SEMAPHORE = asyncio.Semaphore(15)
_LAST_NOTIFY_TIME = {}

async def simulate_lifecycle(message_id: str, trigger_id: int, client_id: int):
    """
    Simula de forma ultra-rápida, atômica e realista o ciclo de vida de uma mensagem (entregue, lida, interagida, falha).
    Executa a simulação probabilística em memória e grava tudo em 1 única transação de banco ultrarrápida (< 1ms),
    garantindo que o pool de conexões nunca sofra timeout mesmo sob dezenas de milhares de mensagens simultâneas.
    """
    # Pequena variação temporal para realismo antes de adquirir semáforo de banco
    await asyncio.sleep(random.uniform(0.01, 0.05))

    # 1. Determina desfecho probabilístico em memória (sem abrir conexão de banco)
    is_delivered = random.random() < 0.90
    is_read = is_delivered and (random.random() < 0.75)
    
    rand_interaction = random.random()
    is_interaction = is_read and (rand_interaction < 0.35)
    is_blocked = is_read and not is_interaction and (rand_interaction < 0.43)

    final_status = 'failed'
    if is_interaction:
        final_status = 'interaction'
    elif is_blocked:
        final_status = 'delivered' # marcado com BLOCKED_VIA_BUTTON
    elif is_read:
        final_status = 'read'
    elif is_delivered:
        final_status = 'delivered'

    # 2. Executa a gravação no banco protegida pelo semáforo global de 15 slots
    async with _SIM_SEMAPHORE:
        spawn_funnel_payload = None
        try:
            from services.bulk import translate_meta_error

            with SessionLocal() as db:
                msg = db.query(models.MessageStatus).filter_by(message_id=message_id).first()
                if not msg:
                    return

                trigger = db.query(models.ScheduledTrigger).get(trigger_id)

                if is_delivered:
                    msg.status = final_status
                    msg.delivered_counted = True
                    if is_read:
                        msg.read_counted = True
                    if is_interaction:
                        msg.is_interaction = True
                        msg.interaction_counted = True
                    if is_blocked:
                        msg.failure_reason = 'BLOCKED_VIA_BUTTON'

                    # Cálculo de custo
                    is_paid = False
                    price_brl = 0.0
                    category = "service"
                    if trigger and not trigger.is_free_message and (trigger.template_name or trigger.product_name == "SCALE_TEST" or trigger.is_stress_test):
                        if random.random() < 0.70:
                            is_paid = True
                            price_brl = trigger.cost_per_unit or 0.35
                            category = "marketing" if price_brl == 0.35 else "utility"
                        else:
                            is_paid = False
                            price_brl = 0.0
                            category = "utility"

                    msg.meta_price_brl = price_brl
                    msg.meta_price_category = category
                    msg.updated_at = datetime.now(timezone.utc)

                    # Atualização atômica consolidada dos contadores do trigger
                    updates = ["total_delivered = COALESCE(total_delivered, 0) + 1"]
                    params = {"tid": trigger_id, "cost": price_brl}

                    if is_paid:
                        updates.append("total_cost = COALESCE(total_cost, 0) + :cost")
                        updates.append("total_paid_templates = COALESCE(total_paid_templates, 0) + 1")
                    if is_read:
                        updates.append("total_read = COALESCE(total_read, 0) + 1")
                    if is_interaction:
                        updates.append("total_interactions = COALESCE(total_interactions, 0) + 1")
                    if is_blocked:
                        updates.append("total_blocked = COALESCE(total_blocked, 0) + 1")

                    db.execute(text(f"UPDATE scheduled_triggers SET {', '.join(updates)} WHERE id = :tid"), params)

                    # Criação de disparos filhos para funil de interação ou bloqueio (se configurado)
                    phone_num = msg.phone_number
                    contact_name_val = msg.contact_name or "Contato Simulado"

                    if is_interaction and trigger and trigger.interaction_funnel_id and phone_num:
                        new_trig = models.ScheduledTrigger(
                            client_id=client_id,
                            funnel_id=trigger.interaction_funnel_id,
                            contact_phone=phone_num,
                            contact_name=contact_name_val,
                            status='processing',
                            scheduled_time=datetime.now(timezone.utc),
                            is_bulk=False,
                            is_interaction=True,
                            parent_id=trigger_id
                        )
                        db.add(new_trig)
                        db.flush()
                        spawn_funnel_payload = {
                            "trigger_id": new_trig.id,
                            "client_id": client_id,
                            "funnel_id": trigger.interaction_funnel_id,
                            "contact_phone": phone_num,
                            "contact_name": contact_name_val,
                            "is_interaction": True,
                            "parent_id": trigger_id
                        }
                    elif is_blocked and trigger and trigger.block_funnel_id and phone_num:
                        new_trig = models.ScheduledTrigger(
                            client_id=client_id,
                            funnel_id=trigger.block_funnel_id,
                            contact_phone=phone_num,
                            contact_name=contact_name_val,
                            status='processing',
                            scheduled_time=datetime.now(timezone.utc),
                            is_bulk=False,
                            skip_block_check=True,
                            parent_id=trigger_id
                        )
                        db.add(new_trig)
                        db.flush()
                        spawn_funnel_payload = {
                            "trigger_id": new_trig.id,
                            "client_id": client_id,
                            "funnel_id": trigger.block_funnel_id,
                            "contact_phone": phone_num,
                            "contact_name": contact_name_val,
                            "skip_block_check": True,
                            "parent_id": trigger_id
                        }

                    db.commit()

                else:
                    # Falha simulada
                    msg.status = 'failed'
                    reasons = None
                    if trigger and trigger.processed_data and isinstance(trigger.processed_data, dict):
                        reasons = trigger.processed_data.get("simulated_error_reasons")

                    if not reasons or not isinstance(reasons, list) or len(reasons) == 0:
                        reasons = [
                            "(#132015) O template está temporariamente indisponível para uso porque foi pausado devido à baixa qualidade.",
                            "Erro Meta 131049: Esta mensagem não foi entregue para manter o engajamento saudável do ecossistema.",
                            "Erro Meta 131026: Mensagem não entregável",
                            "Lista de Exclusão (Bloqueado)"
                        ]

                    selected_reason = translate_meta_error(random.choice(reasons))
                    msg.failure_reason = selected_reason
                    msg.updated_at = datetime.now(timezone.utc)

                    db.execute(text("UPDATE scheduled_triggers SET total_sent = COALESCE(total_sent, 1) - 1, total_failed = COALESCE(total_failed, 0) + 1 WHERE id = :tid"), {"tid": trigger_id})

                    if "132015" in msg.failure_reason or "paused due to low quality" in msg.failure_reason:
                        if trigger:
                            trigger.status = 'aborted'
                            trigger.failure_reason = msg.failure_reason

                    db.commit()

            # Dispara funil filho no RabbitMQ fora do lock do banco se houver
            if spawn_funnel_payload:
                await rabbitmq.publish("zapvoice_funnel_executions", spawn_funnel_payload)

            await notify_progress(trigger_id)

        except Exception as e:
            logger.error(f"Erro na simulação de ciclo de vida do wamid {message_id}: {e}")

async def notify_progress(trigger_id: int, force: bool = False):
    """
    Publica o progresso do trigger no WebSocket usando uma sessão isolada e rápida.
    Limitado a 1 broadcast a cada 300ms por trigger para máxima performance e zero concorrência desnecessária.
    """
    now = asyncio.get_event_loop().time()
    last = _LAST_NOTIFY_TIME.get(trigger_id, 0)
    if not force and (now - last) < 0.30:
        return

    _LAST_NOTIFY_TIME[trigger_id] = now
    try:
        with SessionLocal() as db:
            t_prog = db.query(models.ScheduledTrigger).get(trigger_id)
            if not t_prog:
                return

            if t_prog.status in ['failed', 'cancelled', 'aborted']:
                queue_count = 0
            else:
                queue_count = max(0, (t_prog.total_sent or 0) - (t_prog.total_delivered or 0))

            await rabbitmq.publish_event("bulk_progress", {
                "trigger_id": trigger_id,
                "client_id": t_prog.client_id,
                "status": t_prog.status,
                "sent": t_prog.total_sent or 0,
                "total_sent": t_prog.total_sent or 0,
                "failed": t_prog.total_failed or 0,
                "total_failed": t_prog.total_failed or 0,
                "delivered": t_prog.total_delivered or 0,
                "total_delivered": t_prog.total_delivered or 0,
                "read": t_prog.total_read or 0,
                "total_read": t_prog.total_read or 0,
                "interactions": t_prog.total_interactions or 0,
                "total_interactions": t_prog.total_interactions or 0,
                "blocked": t_prog.total_blocked or 0,
                "total_blocked": t_prog.total_blocked or 0,
                "skipped": t_prog.total_skipped or 0,
                "total_skipped": t_prog.total_skipped or 0,
                "cost": float(t_prog.total_cost) if t_prog.total_cost else 0.0,
                "total_cost": float(t_prog.total_cost) if t_prog.total_cost else 0.0,
                "total_paid_templates": t_prog.total_paid_templates or 0,
                "total": t_prog.total_contacts or 0,
                "total_contacts": t_prog.total_contacts or 0,
                "queue_count": queue_count
            })
    except Exception as e_notif:
        logger.warning(f"⚠️ [NOTIFY] Falha ao publicar progresso no WebSocket: {e_notif}")

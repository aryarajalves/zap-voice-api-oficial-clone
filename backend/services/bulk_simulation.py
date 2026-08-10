import asyncio
import random
import models
from sqlalchemy import text
from datetime import datetime, timezone
from database import SessionLocal
from rabbitmq_client import rabbitmq
from core.logger import setup_logger

logger = setup_logger(__name__)

async def simulate_lifecycle(message_id: str, trigger_id: int, client_id: int):
    # Importação tardia/circular protegida de translate_meta_error
    from services.bulk import translate_meta_error

    logger.info(f"🔄 [SIMULATE] Iniciando simulação para message_id={message_id}, trigger_id={trigger_id}")

    # 1. Simular entrega (delivered) - ~90% de sucesso
    await asyncio.sleep(random.uniform(0.1, 0.3))
    
    db = SessionLocal()
    try:
        msg = db.query(models.MessageStatus).filter_by(message_id=message_id).first()
        if not msg:
            logger.warning(f"⚠️ [SIMULATE] Mensagem {message_id} não encontrada no banco para o Trigger {trigger_id}.")
            return
        
        trigger = db.query(models.ScheduledTrigger).get(trigger_id)
        
        # 90% chance to deliver
        if random.random() < 0.90:
            msg.status = 'delivered'
            msg.delivered_counted = True
            
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
            db.commit()
            
            db.execute(text("UPDATE scheduled_triggers SET total_delivered = COALESCE(total_delivered, 0) + 1 WHERE id = :tid"), {"tid": trigger_id})
            if is_paid:
                db.execute(
                    text("UPDATE scheduled_triggers SET total_cost = COALESCE(total_cost, 0) + :cost, total_paid_templates = COALESCE(total_paid_templates, 0) + 1 WHERE id = :tid"),
                    {"cost": price_brl, "tid": trigger_id}
                )
            db.commit()
            
            await notify_progress(db, trigger_id)
            
            # 2. Simular visualização (read) - ~75% de chance se entregue
            await asyncio.sleep(random.uniform(0.15, 0.4))
            db.refresh(msg)
            if random.random() < 0.75:
                msg.status = 'read'
                msg.read_counted = True
                msg.updated_at = datetime.now(timezone.utc)
                db.commit()
                
                db.execute(text("UPDATE scheduled_triggers SET total_read = COALESCE(total_read, 0) + 1 WHERE id = :tid"), {"tid": trigger_id})
                db.commit()
                
                await notify_progress(db, trigger_id)
                
                # 3. Simular interação ou bloqueio
                await asyncio.sleep(random.uniform(0.15, 0.4))
                db.refresh(msg)
                rand_val = random.random()
                if rand_val < 0.35: # ~35% de chance de interação
                    msg.status = 'interaction'
                    msg.is_interaction = True
                    msg.interaction_counted = True
                    msg.updated_at = datetime.now(timezone.utc)
                    db.commit()
                    
                    db.execute(text("UPDATE scheduled_triggers SET total_interactions = COALESCE(total_interactions, 0) + 1 WHERE id = :tid"), {"tid": trigger_id})
                    db.commit()
                    
                    await notify_progress(db, trigger_id)

                    if trigger and trigger.interaction_funnel_id:
                        try:
                            new_trig = models.ScheduledTrigger(
                                client_id=client_id,
                                funnel_id=trigger.interaction_funnel_id,
                                contact_phone=msg.phone_number,
                                contact_name=msg.contact_name or "Contato Simulado",
                                status='processing',
                                scheduled_time=datetime.now(timezone.utc),
                                is_bulk=False,
                                is_interaction=True,
                                parent_id=trigger_id
                            )
                            db.add(new_trig)
                            db.commit()
                            db.refresh(new_trig)
                            
                            await rabbitmq.publish("zapvoice_funnel_executions", {
                                "trigger_id": new_trig.id,
                                "funnel_id": trigger.interaction_funnel_id,
                                "contact_phone": msg.phone_number
                            })
                            logger.info(f"🚀 [SIMULATE] Funil de interação {trigger.interaction_funnel_id} iniciado para {msg.phone_number}")
                        except Exception as e_funnel:
                            logger.error(f"❌ [SIMULATE] Erro ao disparar funil de interação simulado: {e_funnel}")
                elif rand_val < 0.43: # ~8% de chance de bloqueio
                    msg.status = 'delivered'
                    msg.failure_reason = 'BLOCKED_VIA_BUTTON'
                    msg.updated_at = datetime.now(timezone.utc)
                    db.commit()
                    
                    db.execute(text("UPDATE scheduled_triggers SET total_blocked = COALESCE(total_blocked, 0) + 1 WHERE id = :tid"), {"tid": trigger_id})
                    db.commit()
                    
                    await notify_progress(db, trigger_id)

                    if trigger and trigger.block_funnel_id:
                        try:
                            new_trig = models.ScheduledTrigger(
                                client_id=client_id,
                                funnel_id=trigger.block_funnel_id,
                                contact_phone=msg.phone_number,
                                contact_name=msg.contact_name or "Contato Simulado",
                                status='processing',
                                scheduled_time=datetime.now(timezone.utc),
                                is_bulk=False,
                                is_interaction=False,
                                skip_block_check=True,
                                parent_id=trigger_id
                            )
                            db.add(new_trig)
                            db.commit()
                            db.refresh(new_trig)
                            
                            await rabbitmq.publish("zapvoice_funnel_executions", {
                                "trigger_id": new_trig.id,
                                "funnel_id": trigger.block_funnel_id,
                                "contact_phone": msg.phone_number
                            })
                            logger.info(f"🚀 [SIMULATE] Funil de bloqueio {trigger.block_funnel_id} iniciado para {msg.phone_number}")
                        except Exception as e_funnel:
                            logger.error(f"❌ [SIMULATE] Erro ao disparar funil de bloqueio simulado: {e_funnel}")
        else:
            logger.info(f"❌ [SIMULATE] Simulando falha de entrega para message_id={message_id}")
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
            db.commit()
            
            db.execute(text("UPDATE scheduled_triggers SET total_sent = COALESCE(total_sent, 1) - 1, total_failed = COALESCE(total_failed, 0) + 1 WHERE id = :tid"), {"tid": trigger_id})
            db.commit()
            
            if "132015" in msg.failure_reason or "paused due to low quality" in msg.failure_reason:
                if trigger:
                    trigger.status = 'aborted'
                    trigger.failure_reason = msg.failure_reason
                    db.commit()
                    logger.error(f"🛑 [ABORT - SIMULATE] Disparo {trigger_id} abortado. Template pausado por baixa qualidade.")
            
            await notify_progress(db, trigger_id)
    except Exception as e:
        logger.error(f"Erro na simulação de ciclo de vida do wamid {message_id}: {e}")
    finally:
        db.close()

async def notify_progress(db, trigger_id):
    db.commit()
    t_prog = db.query(models.ScheduledTrigger).get(trigger_id)
    if t_prog:
        if t_prog.status in ['failed', 'cancelled', 'aborted']:
            queue_count = 0
        else:
            try:
                from sqlalchemy import func, select
                base_queue_q = db.query(models.MessageStatus).filter(
                    models.MessageStatus.trigger_id == trigger_id,
                    models.MessageStatus.status == 'sent',
                    models.MessageStatus.delivered_counted == False,
                    models.MessageStatus.read_counted == False
                )
                if t_prog.is_bulk:
                    subquery = base_queue_q.with_entities(
                        func.max(models.MessageStatus.id).label("max_id")
                    ).group_by(models.MessageStatus.phone_number).subquery()
                    queue_count = db.query(models.MessageStatus).filter(
                        models.MessageStatus.id.in_(select(subquery.c.max_id))
                    ).count()
                else:
                    queue_count = base_queue_q.count()
            except Exception:
                queue_count = max(0, (t_prog.total_sent or 0) - (t_prog.total_delivered or 0) - (t_prog.total_failed or 0))

        await rabbitmq.publish_event("bulk_progress", {
            "trigger_id": trigger_id,
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
            "cost": float(t_prog.total_cost) if t_prog.total_cost else 0.0,
            "total_cost": float(t_prog.total_cost) if t_prog.total_cost else 0.0,
            "total_paid_templates": t_prog.total_paid_templates or 0,
            "total": t_prog.total_contacts or 0,
            "total_contacts": t_prog.total_contacts or 0,
            "queue_count": queue_count
        })

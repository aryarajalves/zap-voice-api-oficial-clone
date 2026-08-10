import asyncio
import models
from sqlalchemy import text
from datetime import datetime, timezone
from database import SessionLocal
from rabbitmq_client import rabbitmq
from config_loader import get_setting
from services.engine import execute_funnel
from core.logger import setup_logger
from services.utils.phone_utils import normalize_phone
from services.bulk_persistence import get_sent_phones_set

logger = setup_logger(__name__)

async def process_bulk_funnel(trigger_id: int, funnel_id: int, contacts: list, delay: int, concurrency: int):
    logger.info(f"Starting BULK FUNNEL {trigger_id} | Funnel: {funnel_id}")
    if not contacts:
        db = SessionLocal()
        try:
            t = db.query(models.ScheduledTrigger).get(trigger_id)
            if t: t.status = "completed"
            db.commit()
        finally:
            db.close()
        return

    total = len(contacts)
    sent_count = failed_count = 0
    concurrency = max(1, int(concurrency))
    delay = max(0, int(delay))

    db_init = SessionLocal()
    try:
        t = db_init.query(models.ScheduledTrigger).get(trigger_id)
        if t:
            from services.engine import log_node_execution
            client_name = get_setting("CLIENT_NAME", "ZAPVOICE", client_id=t.client_id)
            log_node_execution(db_init, t, node_id='DISCOVERY', status='completed', details=f'{client_name}: Iniciando disparo de funis...')
            log_node_execution(db_init, t, node_id='DELIVERY', status='processing', details=f'{client_name}: Processando {total} funis...')
            t.pending_contacts = [normalize_phone(c if isinstance(c, str) else (c.get('phone') or '')) for c in contacts]
            t.processed_contacts = []
            
            pdata = dict(t.processed_data or {})
            if "started_at" not in pdata:
                pdata["started_at"] = datetime.utcnow().isoformat()
            pdata.pop("finished_at", None)
            t.processed_data = pdata
            
            db_init.commit()
            c_id = t.client_id
            sent_phones_set = await get_sent_phones_set(db_init, trigger_id)
    finally:
        db_init.close()

    async def execute_item(c, blocked_list, blocked_suffixes):
        phone_raw = c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or c.get('meta', {}).get('sender', {}).get('phone_number') or '')
        phone = normalize_phone(phone_raw)
        
        name = ""
        if isinstance(c, dict):
            name = c.get('{{1}}') or c.get('1') or c.get('name') or c.get('nome') or c.get('cliente') or ""

        # 1. Validação de Telefone
        if not phone:
            return {"status": "failed", "phone": phone_raw or "Desconhecido", "reason": "Telefone inválido ou ausente."}

        if phone in sent_phones_set:
            return {"status": "skipped", "phone": phone, "reason": "Já enviado nesta sessão."}

        # 2. Check de Bloqueio
        is_blocked = phone in blocked_list or any(phone.endswith(s) for s in blocked_suffixes)
        if is_blocked:
            return {"status": "blocked", "phone": phone, "name": name, "reason": "Contato na lista de bloqueio."}
        
        # 3. Execução do Funil
        db_item = SessionLocal()
        try:
            conv_id = (c.get('id') or c.get('conversation_id') or 0) if isinstance(c, dict) else 0
            
            t_parent = db_item.query(models.ScheduledTrigger).get(trigger_id)
            child_trigger = models.ScheduledTrigger(
                client_id=c_id,
                funnel_id=funnel_id,
                conversation_id=conv_id,
                contact_phone=phone,
                contact_name=name,
                status='processing',
                scheduled_time=datetime.now(timezone.utc),
                is_bulk=False,
                parent_id=trigger_id,
                is_stress_test=getattr(t_parent, 'is_stress_test', False),
                product_name="HIDDEN_CHILD",
                chatwoot_label=t_parent.chatwoot_label if t_parent else None,
                private_message=t_parent.private_message if t_parent else None,
                private_message_delay=t_parent.private_message_delay if t_parent else 5,
                private_message_concurrency=t_parent.private_message_concurrency if t_parent else 1
            )
            db_item.add(child_trigger)
            db_item.commit()
            db_item.refresh(child_trigger)
            
            # Criar registro inicial de status de mensagem para aparecer no "Ver Enviados" imediatamente
            init_status = models.MessageStatus(
                trigger_id=child_trigger.id,
                message_id=f"funnel_init_{child_trigger.id}",
                phone_number=phone,
                contact_name=name or phone,
                status='sent',
                message_type='FREE_MESSAGE',
                content=f"[Funil Iniciado] {t_parent.funnel.name if t_parent and t_parent.funnel else 'Funil'}"
            )
            db_item.add(init_status)
            db_item.commit()
            
            await execute_funnel(funnel_id, conv_id, child_trigger.id, phone, db_item)
            return {"status": "sent", "phone": phone}
        except Exception as e:
            err_msg = str(e)
            logger.error(f"Error executing funnel for {phone}: {err_msg}")
            return {"status": "failed", "phone": phone, "name": name, "reason": f"Erro na execução: {err_msg}"}
        finally:
            db_item.close()

    for i in range(0, total, concurrency):
        db_check = SessionLocal()
        try:
            t = db_check.query(models.ScheduledTrigger).get(trigger_id)
            if not t or t.status in ['cancelled', 'cancelling', 'deleted_pending']:
                if t and t.status == 'deleted_pending': db_check.delete(t)
                db_check.commit()
                return
            
            # Atualizar heartbeat a cada iteração do funil
            pdata = dict(t.processed_data or {})
            pdata["last_heartbeat"] = datetime.utcnow().isoformat()
            t.processed_data = pdata
            db_check.commit()
            
            while t and t.status == 'paused':
                # Atualizar heartbeat enquanto pausado
                pdata = dict(t.processed_data or {})
                pdata["last_heartbeat"] = datetime.utcnow().isoformat()
                t.processed_data = pdata
                db_check.commit()
                db_check.close()
                await asyncio.sleep(5)
                db_check = SessionLocal()
                t = db_check.query(models.ScheduledTrigger).get(trigger_id)

            # Blocked list (with project sharing inheritance)
            client_ids = [c_id]
            client = db_check.query(models.Client).filter(models.Client.id == c_id).first()
            if client and client.project_id:
                sibling_clients = db_check.query(models.Client.id).filter(models.Client.project_id == client.project_id).all()
                client_ids = [c.id for c in sibling_clients]

            blocked_raw = db_check.query(models.BlockedContact.phone).filter(
                models.BlockedContact.client_id.in_(client_ids)
            ).all()
            blocked_list = {normalize_phone(b[0]) for b in blocked_raw}
            
            # Add resting contacts
            now = datetime.utcnow()
            resting_raw = db_check.query(models.RestingContact.phone).filter(
                models.RestingContact.client_id.in_(client_ids),
                models.RestingContact.expires_at > now
            ).all()
            for r in resting_raw:
                blocked_list.add(normalize_phone(r[0]))

            blocked_suffixes = {p[-8:] for p in blocked_list if len(p) >= 8}
            db_check.commit()
        finally:
            db_check.close()

        batch = contacts[i:i + concurrency]
        tasks = [execute_item(c, blocked_list, blocked_suffixes) for c in batch]
        results = await asyncio.gather(*tasks)
        
        db_persist = SessionLocal()
        try:
            for r in results:
                if r["status"] == "sent":
                    sent_count += 1
                    db_persist.execute(text("UPDATE scheduled_triggers SET total_sent = COALESCE(total_sent, 0) + 1 WHERE id = :tid"), {"tid": trigger_id})
                elif r["status"] == "blocked":
                    failed_count += 1
                    db_persist.execute(text("UPDATE scheduled_triggers SET total_failed = COALESCE(total_failed, 0) + 1 WHERE id = :tid"), {"tid": trigger_id})
                    fail_msg = models.MessageStatus(
                        trigger_id=trigger_id,
                        phone_number=r["phone"],
                        status='failed',
                        failure_reason=r.get("reason", "Contato na lista de bloqueio."),
                        content=f"Falha no Funil: {funnel_id}"
                    )
                    db_persist.add(fail_msg)
                elif r["status"] == "skipped":
                    failed_count += 1
                    db_persist.execute(text("UPDATE scheduled_triggers SET total_failed = COALESCE(total_failed, 0) + 1 WHERE id = :tid"), {"tid": trigger_id})
                    fail_msg = models.MessageStatus(
                        trigger_id=trigger_id,
                        phone_number=r["phone"],
                        status='failed',
                        failure_reason=r.get("reason", "Duplicidade de contato ou já enviado."),
                        content=f"Falha no Funil: {funnel_id}"
                    )
                    db_persist.add(fail_msg)
                elif r["status"] == "failed":
                    failed_count += 1
                    db_persist.execute(text("UPDATE scheduled_triggers SET total_failed = COALESCE(total_failed, 0) + 1 WHERE id = :tid"), {"tid": trigger_id})
                    # CRIAR REGISTRO DE FALHA PARA O RELATÓRIO
                    fail_msg = models.MessageStatus(
                        trigger_id=trigger_id,
                        phone_number=r["phone"],
                        status='failed',
                        failure_reason=r.get("reason", "Erro desconhecido"),
                        content=f"Falha no Funil: {funnel_id}"
                    )
                    db_persist.add(fail_msg)
            db_persist.commit()
        except Exception as e:
            logger.error(f"Erro ao persistir estatísticas do batch: {e}")
            db_persist.rollback()
        finally:
            db_persist.close()
        
        # Progress Event
        db_progress = SessionLocal()
        try:
            t_prog = db_progress.query(models.ScheduledTrigger).get(trigger_id)
            if t_prog:
                await rabbitmq.publish_event("bulk_progress", {
                    "trigger_id": trigger_id,
                    "status": "processing",
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
                    "total": total,
                    "total_contacts": total
                })
        finally:
            db_progress.close()
            
        if i + concurrency < total: await asyncio.sleep(delay)

    db_final = SessionLocal()
    try:
        t = db_final.query(models.ScheduledTrigger).get(trigger_id)
        if t and t.status != 'cancelled':
            from services.engine import log_node_execution
            log_node_execution(db_final, t, node_id='DELIVERY', status='completed')
            # Refresh / re-get the trigger to avoid losing changes due to db.expire in log_node_execution
            t = db_final.query(models.ScheduledTrigger).get(trigger_id)
            if t:
                pdata = dict(t.processed_data or {})
                pdata["finished_at"] = datetime.utcnow().isoformat()
                t.processed_data = pdata
                t.status = 'completed' if failed_count == 0 else 'processed'
                t.total_sent = sent_count
                t.total_failed = failed_count
                db_final.commit()
                
                # Executar reconciliação imediata após gravação dos status finais para limpar divergências
                try:
                    from services.triggers_service import reconcile_trigger_stats_logic
                    # reconcile_trigger_stats_logic já faz o commit/refresh internamente
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        loop.create_task(reconcile_trigger_stats_logic(t.id, t.client_id, db_final))
                    else:
                        loop.run_until_complete(reconcile_trigger_stats_logic(t.id, t.client_id, db_final))
                    db_final.refresh(t)
                except Exception:
                    pass
            
            await rabbitmq.publish_event("bulk_progress", {
                "trigger_id": trigger_id,
                "status": t.status,
                "processed_data": t.processed_data,
                "sent": t.total_sent or 0,
                "total_sent": t.total_sent or 0,
                "failed": t.total_failed or 0,
                "total_failed": t.total_failed or 0,
                "delivered": t.total_delivered or 0,
                "total_delivered": t.total_delivered or 0,
                "read": t.total_read or 0,
                "total_read": t.total_read or 0,
                "interactions": t.total_interactions or 0,
                "total_interactions": t.total_interactions or 0,
                "blocked": t.total_blocked or 0,
                "total_blocked": t.total_blocked or 0,
                "cost": float(t.total_cost) if t.total_cost else 0.0,
                "total_cost": float(t.total_cost) if t.total_cost else 0.0,
                "total_paid_templates": t.total_paid_templates or 0,
                "total": total,
                "total_contacts": total
            })
    finally:
        db_final.close()

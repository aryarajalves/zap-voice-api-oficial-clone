import logging
from datetime import datetime, timezone
from sqlalchemy import or_
import models
from chatwoot_client import ChatwootClient
from .utils import apply_vars
from .logging import log_node_execution
from .graph_executor import execute_graph_funnel
from .legacy_executor import execute_legacy_funnel

logger = logging.getLogger("FunnelEngine.Orchestrator")

async def execute_funnel(
    funnel_id: int, 
    conversation_id: int, 
    trigger_id: int, 
    contact_phone: str, 
    db, 
    skip_block_check: bool = False,
    chatwoot_contact_id: int = None,
    chatwoot_account_id: int = None,
    chatwoot_inbox_id: int = None
):
    funnel = db.query(models.Funnel).get(funnel_id)
    trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id).with_for_update(skip_locked=True).first()

    if not funnel or not trigger: return
    if trigger.status == 'completed': return

    chatwoot = ChatwootClient(client_id=trigger.client_id, account_id=chatwoot_account_id)
    global_vars = db.query(models.GlobalVariable).filter(models.GlobalVariable.client_id == trigger.client_id).all()
    global_map = {v.name: v.value for v in global_vars}
    
    def apply_vars_func(text): return apply_vars(text, trigger, global_map)

    # Status Lock
    if trigger.status != 'processing':
        trigger.status = 'processing'
        trigger.updated_at = datetime.now(timezone.utc)
        db.commit()

    # Block Check
    clean_phone = ''.join(filter(str.isdigit, contact_phone))
    if not skip_block_check:
        suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone
        if db.query(models.BlockedContact).filter(models.BlockedContact.client_id == trigger.client_id, or_(models.BlockedContact.phone == clean_phone, models.BlockedContact.phone.like(f"%{suffix}"))).first():
            trigger.status = 'failed'
            trigger.failure_reason = "Bloqueado na Plataforma"
            db.commit()
            return

    # Discovery Log
    logger.info(f"🔍 [ENGINE] Iniciando orquestração para Trigger {trigger_id} (Funil {funnel_id})")
    log_node_execution(db, trigger, 'DISCOVERY', 'completed', 'Contexto Sincronizado', {
        "account_id": chatwoot_account_id or trigger.chatwoot_account_id,
        "conversation_id": conversation_id or trigger.conversation_id,
        "contact_id": chatwoot_contact_id or trigger.chatwoot_contact_id
    })

    try:
        if isinstance(funnel.steps, list):
            logger.info(f"📜 [ENGINE] Executando Funil Legado (Steps: {len(funnel.steps)})")
            await execute_legacy_funnel(trigger, funnel.steps, chatwoot, conversation_id, contact_phone, db, apply_vars_func)
        else:
            logger.info(f"🕸️ [ENGINE] Executando Funil em Grafo")
            await execute_graph_funnel(trigger, funnel.steps, chatwoot, conversation_id, contact_phone, db, apply_vars_func, chatwoot_contact_id)
            
        db.refresh(trigger)
        logger.info(f"🏁 [ENGINE] Execução finalizada. Status final: {trigger.status}")
        if trigger.status not in ('queued', 'failed', 'cancelled'):
            trigger.status = 'completed'
            db.commit()
            
        from rabbitmq_client import rabbitmq
        await rabbitmq.publish_event("trigger_updated", {
            "trigger_id": trigger.id,
            "status": trigger.status,
            "client_id": trigger.client_id
        })
    except Exception as e:
        logger.error(f"❌ Erro crítico no funil {trigger_id}: {e}")
        db.rollback()
        log_node_execution(db, trigger, "CRITICAL_ERROR", "failed", f"❌ ERRO CRÍTICO: {e}")
        trigger.status = 'failed'
        trigger.failure_reason = str(e)
        db.commit()
        
        try:
            from rabbitmq_client import rabbitmq
            import asyncio
            loop = asyncio.get_running_loop()
            loop.create_task(rabbitmq.publish_event("trigger_updated", {
                "trigger_id": trigger.id,
                "status": trigger.status,
                "client_id": trigger.client_id
            }))
        except:
            pass

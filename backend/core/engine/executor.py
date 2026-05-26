from core.logger import setup_logger
from datetime import datetime, timezone
from sqlalchemy import or_
import asyncio
import models
from chatwoot_client import ChatwootClient
from config_loader import get_setting
from .utils import apply_vars
from .logging import log_node_execution
from .graph_executor import execute_graph_funnel
from .legacy_executor import execute_legacy_funnel

logger = setup_logger("FunnelEngine.Orchestrator")

# Delay (segundos) antes de buscar conversa existente quando conversation_id não está disponível.
# Garante que a conversa criada pela mensagem do próprio usuário já esteja no Chatwoot.
CONVERSATION_LOOKUP_DELAY_SECONDS = 5

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

    # Se o gatilho já estiver 'completed', não re-executa.
    if trigger.status == 'completed':
        logger.info(f"⏭️ [ENGINE] Trigger {trigger_id} já concluído. Pulando.")
        return

    # Garantir status 'processing'
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
    resolved_account_id = chatwoot_account_id or trigger.chatwoot_account_id
    if not resolved_account_id:
        cw_acc_str = get_setting("CHATWOOT_ACCOUNT_ID", "1", client_id=trigger.client_id)
        if cw_acc_str:
            try:
                resolved_account_id = int(cw_acc_str)
            except ValueError:
                resolved_account_id = cw_acc_str
            # Persistir no banco de dados para consultas futuras
            trigger.chatwoot_account_id = resolved_account_id
            db.commit()

    client_name = get_setting("CLIENT_NAME", "ZAPVOICE", client_id=trigger.client_id)
    logger.info(f"🔍 [ENGINE] Iniciando orquestração para Trigger {trigger_id} (Funil {funnel_id})")
    log_node_execution(db, trigger, 'DISCOVERY', 'completed', f'{client_name}: Contexto Sincronizado', {
        "account_id": resolved_account_id,
        "conversation_id": conversation_id or trigger.conversation_id,
        "contact_id": chatwoot_contact_id or trigger.chatwoot_contact_id
    })

    # Apply Labels (Sync)
    target_convo_id = conversation_id or trigger.conversation_id
    
    if not target_convo_id:
        # ETAPA 1: Aguardar para permitir que a conversa criada pela mensagem do usuário
        # esteja disponível no Chatwoot antes de buscar/criar uma nova.
        logger.info(f"⏳ [ENGINE] conversation_id ausente para {contact_phone}. Aguardando {CONVERSATION_LOOKUP_DELAY_SECONDS}s antes de buscar conversa existente...")
        await asyncio.sleep(CONVERSATION_LOOKUP_DELAY_SECONDS)

        # ETAPA 2: Tentar recuperar via ContactWindow (cache local)
        try:
            window = db.query(models.ContactWindow).filter(
                models.ContactWindow.phone == clean_phone,
                models.ContactWindow.client_id == trigger.client_id
            ).first()
            if window and window.chatwoot_conversation_id:
                target_convo_id = window.chatwoot_conversation_id
                trigger.conversation_id = target_convo_id
                conversation_id = target_convo_id
                db.commit()
                logger.info(f"🎯 [ENGINE] Conversa {target_convo_id} recuperada via ContactWindow para {clean_phone}")
        except Exception as e_win:
            logger.error(f"❌ [ENGINE] Erro ao recuperar conversa via ContactWindow: {e_win}")

        # ETAPA 3: Se ainda não encontrou, buscar via API do Chatwoot (SEM criar nova conversa)
        if not target_convo_id:
            try:
                logger.info(f"🔍 [ENGINE] Buscando conversa existente via API para {contact_phone}...")
                inbox_id_str = get_setting("CHATWOOT_SELECTED_INBOX_ID", client_id=trigger.client_id)
                inbox_id = int(inbox_id_str) if inbox_id_str and str(inbox_id_str).isdigit() else (chatwoot_inbox_id or None)
                
                # Busca apenas conversas existentes — sem criar nova conversa
                conv = await chatwoot.find_existing_conversation(contact_phone, inbox_id=inbox_id)
                if conv:
                    target_convo_id = conv.get("conversation_id")
                    trigger.conversation_id = target_convo_id
                    conversation_id = target_convo_id
                    db.commit()
                    logger.info(f"✅ [ENGINE] Conversa existente {target_convo_id} encontrada via API para {clean_phone}")
                else:
                    logger.warning(f"⚠️ [ENGINE] Nenhuma conversa existente encontrada para {clean_phone}. ensure_conversation criará uma nova se necessário.")
            except Exception as e_api:
                logger.error(f"❌ [ENGINE] Erro ao buscar conversa existente via API: {e_api}")
    
    if trigger.chatwoot_label:
        try:
            from core.utils import robust_extract_labels
            clean_labels = robust_extract_labels(trigger.chatwoot_label)
            if clean_labels:
                # Tentar encontrar a conversa se estiver ausente
                if not target_convo_id:
                    logger.info(f"🔍 [ENGINE] Buscando conversa para {contact_phone} para aplicar etiquetas")
                    conv = await chatwoot.ensure_conversation(contact_phone)
                    if conv:
                        target_convo_id = conv.get("conversation_id")
                        trigger.conversation_id = target_convo_id
                        db.commit()

                if target_convo_id:
                    logger.info(f"🏷️ [ENGINE] Aplicando etiquetas {clean_labels} na conversa {target_convo_id}")
                    await chatwoot.add_label_to_conversation(target_convo_id, clean_labels)
                else:
                    logger.warning(f"⚠️ [ENGINE] Não foi possível encontrar conversa para aplicar etiquetas para {contact_phone}")
        except Exception as e_lbl:
            logger.error(f"❌ [ENGINE] Erro ao aplicar etiquetas: {e_lbl}")

    # Apply Private Note (Sync with delay if needed)
    if trigger.private_message:
        try:
            delay = trigger.private_message_delay or 0
            if delay > 0:
                logger.info(f"⏳ [ENGINE] Aguardando {delay}s para enviar nota privada...")
                await asyncio.sleep(delay)
            
            # Tentar encontrar a conversa se estiver ausente
            if not target_convo_id:
                logger.info(f"🔍 [ENGINE] Buscando conversa para {contact_phone} para enviar nota privada")
                conv = await chatwoot.ensure_conversation(contact_phone)
                if conv:
                    target_convo_id = conv.get("conversation_id")
                    trigger.conversation_id = target_convo_id
                    db.commit()

            if target_convo_id:
                logger.info(f"📝 [ENGINE] Enviando nota privada para conversa {target_convo_id}")
                final_note = apply_vars_func(trigger.private_message)
                await chatwoot.create_private_note(target_convo_id, final_note)
                logger.info(f"✅ [ENGINE] Nota privada enviada com sucesso!")
            else:
                logger.warning(f"⚠️ [ENGINE] Não foi possível encontrar conversa para enviar nota privada para {contact_phone}")
        except Exception as e_note:
            logger.error(f"❌ [ENGINE] Erro ao enviar nota privada: {e_note}")

    try:
        if isinstance(funnel.steps, list):
            logger.info(f"📜 [ENGINE] Executando Funil Legado (Steps: {len(funnel.steps)})")
            await execute_legacy_funnel(trigger, funnel.steps, chatwoot, conversation_id, contact_phone, db, apply_vars_func)
        else:
            logger.info(f"🕸️ [ENGINE] Executando Funil em Grafo")
            await execute_graph_funnel(trigger, funnel.steps, chatwoot, conversation_id, contact_phone, db, apply_vars_func, chatwoot_contact_id)
            
        db.refresh(trigger)
        logger.info(f"🏁 [ENGINE] Execução finalizada. Status final: {trigger.status}")
        if trigger.status not in ('queued', 'failed', 'cancelled', 'suspended'):
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
            loop = asyncio.get_running_loop()
            loop.create_task(rabbitmq.publish_event("trigger_updated", {
                "trigger_id": trigger.id,
                "status": trigger.status,
                "client_id": trigger.client_id
            }))
        except:
            pass

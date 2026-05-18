import logging
import json
from datetime import datetime, timezone
from sqlalchemy import text
from database import SessionLocal
import models
from core.engine.executor import execute_funnel
from chatwoot_client import ChatwootClient
from core.logger import setup_logger

logger = setup_logger("Worker.Funnel")

async def handle_funnel_execution(data: dict):
    """
    Handler para execução de funis (processamento de jobs do RabbitMQ)
    """
    trigger_id = data.get("trigger_id")
    if not trigger_id:
        logger.error("❌ Job de Funil sem trigger_id")
        return

    db = SessionLocal()
    
    # 1. Trava de Segurança (Advisory Lock) por Trigger ID
    # Usamos um namespace diferente (2000000 + ID) para evitar conflitos com outros locks
    lock_id = 2000000 + int(trigger_id)
    
    # Lock não-bloqueante para evitar travar o event loop do worker
    while True:
        locked = db.execute(text("SELECT pg_try_advisory_xact_lock(:id)"), {"id": lock_id}).scalar()
        if locked: break
        import asyncio
        await asyncio.sleep(0.1)
    
    try:
        # Refresh do estado do trigger
        trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id).with_for_update(skip_locked=True).first()
        
        if not trigger:
            logger.warning(f"⚠️ Trigger {trigger_id} não encontrado ou já está sendo processado.")
            return

        if trigger.status in ['completed', 'failed'] and not data.get("force"):
            logger.info(f"⏭️ Trigger {trigger_id} já está em estado final ({trigger.status}). Pulando.")
            return

        contact_phone = data.get("contact_phone") or trigger.contact_phone
        client_id = trigger.client_id
        
        logger.info(f"🎡 [WORKER] Recebido Job de Funil! Trigger ID: {trigger_id} | Phone: {contact_phone}")

        try:
            # Marcar como processando antes de começar
            if trigger.status != 'processing':
                trigger.status = 'processing'
                trigger.updated_at = datetime.now(timezone.utc)
                db.commit()

            chatwoot_cl = ChatwootClient(client_id=client_id)
            
            # Inbox ID Efetivo (Trigger > Config Global)
            effective_inbox_id = trigger.chatwoot_inbox_id
            if not effective_inbox_id:
                from config_loader import get_setting
                inbox_id_str = get_setting("CHATWOOT_SELECTED_INBOX_ID", client_id=client_id)
                if inbox_id_str and str(inbox_id_str).isdigit():
                    effective_inbox_id = int(inbox_id_str)

            # CASO 1: TEMPLATE DIRETO (Sem Funil Grafo)
            if not trigger.funnel_id and trigger.template_name:
                logger.info(f"📄 Gatilho de Template Direto: {trigger.template_name} para {contact_phone} | Inbox: {effective_inbox_id}")
                
                # 1. Aplicar Etiquetas (Labels) se existirem
                if trigger.chatwoot_label:
                    try:
                        from core.utils import robust_extract_labels
                        clean_labels = robust_extract_labels(trigger.chatwoot_label)
                        if clean_labels:
                            # Tentar encontrar a conversa se estiver ausente
                            if not trigger.conversation_id:
                                logger.info(f"🔍 [DIRECT] Buscando conversa para {contact_phone} para aplicar etiquetas")
                                conv = await chatwoot_cl.ensure_conversation(contact_phone, trigger.contact_name, effective_inbox_id)
                                if conv:
                                    trigger.conversation_id = conv.get("conversation_id")
                                    db.commit()

                            if trigger.conversation_id:
                                logger.info(f"🏷️ [DIRECT] Aplicando etiquetas {clean_labels} na conversa {trigger.conversation_id}")
                                await chatwoot_cl.add_label_to_conversation(trigger.conversation_id, clean_labels)
                            else:
                                logger.warning(f"⚠️ [DIRECT] Não foi possível encontrar conversa para aplicar etiquetas para {contact_phone}")
                    except Exception as e_lbl:
                        logger.error(f"❌ [DIRECT] Erro ao aplicar etiquetas: {e_lbl}")

                # 2. Enviar Template via Meta
                res = await chatwoot_cl.send_template(
                    contact_phone, 
                    trigger.template_name, 
                    trigger.template_language or "pt_BR",
                    trigger.template_components or []
                )
                
                if res and not res.get("error"):
                    msg_id_raw = res.get("messages", [{}])[0].get("id") if res.get("messages") else "template_sent"
                    msg_id = str(msg_id_raw).replace("wamid.", "")
                    
                    # Registrar no histórico de mensagens
                    db.add(models.MessageStatus(
                        trigger_id=trigger.id,
                        message_id=msg_id,
                        phone_number=contact_phone,
                        status='sent',
                        message_type='TEMPLATE',
                        content=f"[Template: {trigger.template_name}]"
                    ))
                    trigger.total_sent = (trigger.total_sent or 0) + 1
                    trigger.status = 'completed'
                    db.commit() # Commit IMEDIATO para liberar o message_id para o webhook de entrega
                    logger.info(f"✅ Template enviado com sucesso para {contact_phone}")
                    
                    # 3. Enviar Nota Privada (Private Note) se existir
                    if trigger.private_message:
                        try:
                            import asyncio
                            delay = trigger.private_message_delay or 0
                            if delay > 0:
                                logger.info(f"⏳ [DIRECT] Aguardando {delay}s para enviar nota privada...")
                                await asyncio.sleep(delay)
                            
                            logger.info(f"📝 [DIRECT] Enviando nota privada para {contact_phone}")
                            from core.engine.utils import apply_vars
                            # Buscar variáveis globais para aplicar na nota se necessário
                            global_vars = db.query(models.GlobalVariable).filter(models.GlobalVariable.client_id == client_id).all()
                            global_map = {v.name: v.value for v in global_vars}
                            
                            final_note = apply_vars(trigger.private_message, trigger, global_map)
                            
                            # Se a nota for "true" (vinda do checkbox), buscamos o conteúdo real do template no cache
                            if trigger.private_message == "true" or not final_note:
                                template_cache = db.query(models.WhatsAppTemplateCache).filter(
                                    models.WhatsAppTemplateCache.client_id == client_id,
                                    models.WhatsAppTemplateCache.name == trigger.template_name
                                ).first()
                                if template_cache and template_cache.body:
                                    final_note = apply_vars(template_cache.body, trigger, global_map)
                                else:
                                    final_note = f"[Template: {trigger.template_name}]"

                            # Tentar encontrar a conversa se estiver ausente
                            if not trigger.conversation_id:
                                logger.info(f"🔍 [DIRECT] Buscando conversa para {contact_phone} para enviar nota privada")
                                conv = await chatwoot_cl.ensure_conversation(contact_phone, trigger.contact_name, effective_inbox_id)
                                if conv:
                                    trigger.conversation_id = conv.get("conversation_id")
                                    db.commit()

                            if trigger.conversation_id:
                                await chatwoot_cl.create_private_note(trigger.conversation_id, final_note)
                                logger.info(f"✅ [DIRECT] Nota privada enviada com sucesso!")
                            else:
                                logger.warning(f"⚠️ [DIRECT] Não foi possível encontrar conversa para enviar nota privada para {contact_phone}")
                        except Exception as e_note:
                            logger.error(f"❌ [DIRECT] Erro ao enviar nota privada: {e_note}")

                else:
                    trigger.status = 'failed'
                    trigger.failure_reason = str(res.get("detail") if res else "Erro desconhecido na Meta API")
                    logger.error(f"❌ Falha ao enviar template: {trigger.failure_reason}")
                
                db.commit()

            # CASO 2: EXECUÇÃO DE FUNIL (Grafo ou Legado)
            elif trigger.funnel_id:
                logger.info(f"🚀 Iniciando execução de Funil {trigger.funnel_id} para {contact_phone}")
                await execute_funnel(
                    funnel_id=trigger.funnel_id, 
                    conversation_id=trigger.conversation_id, 
                    trigger_id=trigger.id,
                    contact_phone=contact_phone, 
                    db=db, 
                    skip_block_check=getattr(trigger, 'skip_block_check', False),
                    chatwoot_contact_id=trigger.chatwoot_contact_id, 
                    chatwoot_account_id=trigger.chatwoot_account_id, 
                    chatwoot_inbox_id=effective_inbox_id
                )
                logger.info(f"✅ Execução de funil concluída para {contact_phone} (Trigger: {trigger_id})")
            
            else:
                logger.warning(f"⚠️ Job {trigger_id} sem ação definida (Sem Funil e Sem Template)")
                trigger.status = 'failed'
                trigger.failure_reason = "Sem ação definida (Funil ou Template)"
                db.commit()

        except Exception as e:
            logger.error(f"❌ Erro ao executar funil (Trigger {trigger_id}): {e}")
            trigger.status = 'failed'
            trigger.failure_reason = str(e)
            db.commit()

    finally:
        # pg_advisory_xact_lock libera automaticamente no commit/rollback
        db.commit()
        db.close()

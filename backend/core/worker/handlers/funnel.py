import logging
import json
import random
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
    # Lock não-bloqueante: se outra thread/worker já estiver processando este Trigger, descarta a duplicata imediatamente
    if db.bind.dialect.name == 'postgresql':
        locked = db.execute(text("SELECT pg_try_advisory_xact_lock(:id)"), {"id": lock_id}).scalar()
        if not locked:
            logger.warning(f"⚠️ [FUNNEL_LOCK] Trigger {trigger_id} já está bloqueado por outro worker ativo. Descartando job duplicado.")
            return

    try:
        # Refresh do estado do trigger
        trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id).first()
        
        if not trigger:
            logger.warning(f"⚠️ Trigger {trigger_id} não encontrado.")
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
            if trigger.template_name:
                logger.info(f"📄 Gatilho de Template Direto: {trigger.template_name} para {contact_phone} | Inbox: {effective_inbox_id}")

                # DRY-RUN: Teste de Escala — simula o disparo sem enviar para a API do WhatsApp
                if getattr(trigger, 'is_stress_test', False):
                    logger.info(f"🧪 [STRESS_TEST] Disparo simulado (dry-run) para {contact_phone} | Template: {trigger.template_name}")
                    # Simula métricas aleatórias realistas
                    sim_delivered = 1 if random.random() < 0.92 else 0
                    sim_read = 1 if sim_delivered and random.random() < 0.72 else 0
                    sim_interaction = 1 if sim_read and random.random() < 0.25 else 0
                    trigger.status = 'completed'
                    trigger.failure_reason = None
                    trigger.total_sent = 1
                    trigger.total_delivered = sim_delivered
                    trigger.total_read = sim_read
                    trigger.total_interactions = sim_interaction
                    db.add(models.MessageStatus(
                        trigger_id=trigger.id,
                        message_id=f"stress_test_{trigger.id}",
                        phone_number=contact_phone,
                        status='simulated',
                        message_type='TEMPLATE',
                        content=f"[SIMULADO] Template: {trigger.template_name}",
                        delivered_counted=bool(sim_delivered),
                        read_counted=bool(sim_read),
                        interaction_counted=bool(sim_interaction),
                    ))
                    db.commit()
                    return

                # 1. Enviar Template via Meta
                res = await chatwoot_cl.send_template(
                    contact_phone,
                    trigger.template_name,
                    trigger.template_language or "pt_BR",
                    trigger.template_components or []
                )

                if res and not res.get("error"):
                    msg_id_raw = res.get("messages", [{}])[0].get("id") if res.get("messages") else "template_sent"
                    msg_id = str(msg_id_raw).replace("wamid.", "")

                    # Buscar o conteúdo real do template do cache para enviar no webhook de memória
                    from core.engine.utils import apply_vars
                    global_vars = db.query(models.GlobalVariable).filter(
                        models.GlobalVariable.client_id == client_id
                    ).all()
                    global_map = {v.name: v.value for v in global_vars}

                    template_cache = db.query(models.WhatsAppTemplateCache).filter(
                        models.WhatsAppTemplateCache.client_id == client_id,
                        models.WhatsAppTemplateCache.name == trigger.template_name
                    ).first()

                    if template_cache and template_cache.body:
                        real_content = apply_vars(template_cache.body, trigger, global_map)
                        logger.info(f"📄 [DIRECT] Conteúdo real do template resolvido: {real_content[:80]}...")
                    else:
                        real_content = f"[Template: {trigger.template_name}]"
                        logger.warning(f"⚠️ [DIRECT] Template '{trigger.template_name}' não encontrado no cache. Usando nome como fallback.")

                    tpl_media_url = None
                    if trigger.template_components:
                        for comp in trigger.template_components:
                            if str(comp.get("type", "")).lower() == "header":
                                params = comp.get("parameters", [])
                                for param in params:
                                    param_type = str(param.get("type", "")).lower()
                                    if param_type in ["image", "video", "document"]:
                                        media_data = param.get(param_type, {})
                                        if isinstance(media_data, dict):
                                            tpl_media_url = media_data.get("link") or media_data.get("url")

                    # Registrar no histórico de mensagens com o conteúdo real e var5 contendo a URL da mídia
                    db.add(models.MessageStatus(
                        trigger_id=trigger.id,
                        message_id=msg_id,
                        phone_number=contact_phone,
                        status='sent',
                        message_type='TEMPLATE',
                        content=real_content,
                        var5=tpl_media_url
                    ))
                    trigger.total_sent = (trigger.total_sent or 0) + 1
                    trigger.status = 'paused_waiting_delivery' if trigger.funnel_id else 'completed'
                    db.commit() # Commit IMEDIATO para liberar o message_id para o webhook de entrega
                    logger.info(f"✅ Template enviado com sucesso para {contact_phone}")

                    # 2. Enviar Nota Privada (Private Note) se existir
                    if trigger.private_message:
                        try:
                            import asyncio
                            delay = trigger.private_message_delay or 0
                            if delay > 0:
                                logger.info(f"⏳ [DIRECT] Aguardando {delay}s para enviar nota privada...")
                                await asyncio.sleep(delay)

                            logger.info(f"📝 [DIRECT] Enviando nota privada para {contact_phone}")
                            from core.engine.utils import apply_vars
                            global_vars = db.query(models.GlobalVariable).filter(models.GlobalVariable.client_id == client_id).all()
                            global_map = {v.name: v.value for v in global_vars}

                            final_note = apply_vars(trigger.private_message, trigger, global_map)

                            if trigger.private_message == "true" or not final_note:
                                template_cache = db.query(models.WhatsAppTemplateCache).filter(
                                    models.WhatsAppTemplateCache.client_id == client_id,
                                    models.WhatsAppTemplateCache.name == trigger.template_name
                                ).first()
                                if template_cache and template_cache.body:
                                    final_note = apply_vars(template_cache.body, trigger, global_map)
                                else:
                                    final_note = f"[Template: {trigger.template_name}]"

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

                    # 3. Aplicar Etiquetas (Labels) se existirem — usa conversation_id já resolvido acima
                    logger.info(f"🏷️ [DIRECT] chatwoot_label={trigger.chatwoot_label!r} | conversation_id={trigger.conversation_id!r}")
                    if trigger.chatwoot_label:
                        try:
                            from core.utils import robust_extract_labels
                            clean_labels = robust_extract_labels(trigger.chatwoot_label)
                            logger.info(f"🏷️ [DIRECT] clean_labels após extração: {clean_labels!r}")
                            if clean_labels:
                                if not trigger.conversation_id:
                                    logger.info(f"🔍 [DIRECT] Buscando conversa para {contact_phone} para aplicar etiquetas")
                                    conv = await chatwoot_cl.ensure_conversation(contact_phone, trigger.contact_name, effective_inbox_id)
                                    if conv:
                                        trigger.conversation_id = conv.get("conversation_id")
                                        db.commit()

                                if trigger.conversation_id:
                                    logger.info(f"🏷️ [DIRECT] Aplicando etiquetas {clean_labels} na conversa {trigger.conversation_id}")
                                    await chatwoot_cl.add_label_to_conversation(trigger.conversation_id, clean_labels)
                                
                                # Sincronizar etiquetas localmente no banco do ZapVoice com notificação de sistema no Chat local
                                from services.chat_label_service import apply_webhook_labels
                                apply_webhook_labels(
                                    db=db,
                                    client_id=client_id,
                                    phone=contact_phone,
                                    raw_labels=clean_labels,
                                    source="Webhook / Disparo",
                                    contact_name=trigger.contact_name
                                )

                        except Exception as e_lbl:
                            logger.error(f"❌ [DIRECT] Erro ao aplicar etiquetas: {e_lbl}")

                    # 4. Se houver um Funil ZapVoice vinculado, aguardar confirmação de entrega
                    if trigger.funnel_id:
                        logger.info(f"⏳ [FUNIL-ZAPVOICE] Template enviado. Aguardando confirmação de entrega para iniciar o Funil {trigger.funnel_id}...")

                else:
                    trigger.status = 'failed'
                    trigger.failure_reason = str(res.get("detail") if res else "Erro desconhecido na Meta API")
                    logger.error(f"❌ Falha ao enviar template: {trigger.failure_reason}")
                
                db.commit()

            # CASO 2: EXECUÇÃO DE FUNIL (Grafo ou Legado)
            elif trigger.funnel_id:
                # DRY-RUN: Teste de Escala — simula o funil sem executar nós reais
                if getattr(trigger, 'is_stress_test', False):
                    logger.info(f"🧪 [STRESS_TEST] Funil #{trigger.funnel_id} simulado (dry-run) para {contact_phone}")
                    sim_delivered = 1 if random.random() < 0.92 else 0
                    sim_read = 1 if sim_delivered and random.random() < 0.72 else 0
                    sim_interaction = 1 if sim_read and random.random() < 0.25 else 0
                    trigger.status = 'completed'
                    trigger.failure_reason = None
                    trigger.total_sent = 1
                    trigger.total_delivered = sim_delivered
                    trigger.total_read = sim_read
                    trigger.total_interactions = sim_interaction
                    db.commit()
                    return

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

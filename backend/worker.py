
import asyncio
import logging
from rabbitmq_client import rabbitmq
from services.bulk import process_bulk_send, process_bulk_funnel
from services.engine import execute_funnel
from database import SessionLocal
import models
import models
import json
import httpx
from datetime import datetime, timezone
import os

# Configuração de logs para o Worker
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("Worker")

# Worker Configuration
PREFETCH_COUNT = int(os.getenv("RABBITMQ_PREFETCH_COUNT", 5))
MESSAGE_DELAY = float(os.getenv("RABBITMQ_MESSAGE_DELAY", 1.0))

async def handle_bulk_send(data: dict):
    """
    Processa mensagens de disparo em massa da fila 'zapvoice_bulk_sends'
    """
    logger.info(f"📨 Recebido Job de Bulk Send: {data.get('trigger_id')}")
    
    try:
        trigger_id = data.get("trigger_id")
        
        # Reconstrói os argumentos para a função original
        if data.get("type") == "funnel_bulk":
            await process_bulk_funnel(
                trigger_id=trigger_id,
                funnel_id=data.get("funnel_id"),
                contacts=data.get("contacts"),
                delay=data.get("delay", 5),
                concurrency=data.get("concurrency", 1)
            )
        else:
            await process_bulk_send(
                trigger_id=trigger_id,
                template_name=data.get("template_name"),
                contacts=data.get("contacts"),
                delay=data.get("delay", 5),
                concurrency=data.get("concurrency", 1),
                language=data.get("language", "pt_BR"),
                components=data.get("components")
            )
            
        logger.info(f"✅ Job de Bulk Send {trigger_id} concluído com sucesso!")
        
    except Exception as e:
        logger.error(f"❌ Erro ao processar Bulk Send: {e}")
    finally:
         # Throttling entre jobs
        if MESSAGE_DELAY > 0:
            logger.info(f"⏳ Aguardando {MESSAGE_DELAY}s antes de liberar slot...")
            await asyncio.sleep(MESSAGE_DELAY)

async def handle_funnel_execution(data: dict):
    """
    Processa execuções de funil da fila 'zapvoice_funnel_executions'
    """
    logger.info(f"🎡 Recebido Job de Funil: {data.get('contact_phone')}")
    
    try:
        db = SessionLocal()
        try:
            # Trigger fetch early to get client context
            trigger = db.query(models.ScheduledTrigger).filter(
                models.ScheduledTrigger.id == data.get("trigger_id")
            ).first()
            
            if not trigger:
                logger.error(f"❌ Trigger {data.get('trigger_id')} not found in worker")
                return

            client_id = trigger.client_id

            conversation_id = data.get("conversation_id")
            contact_phone = data.get("contact_phone")
            
            # Se não tiver conversation_id, buscar/criar no Chatwoot
            if not conversation_id and contact_phone:
                logger.info(f"🔍 Conversation ID não fornecido. Buscando/criando conversa para {contact_phone} (Client {client_id})...")
                
                from chatwoot_client import ChatwootClient
                chatwoot = ChatwootClient(client_id=client_id)
                
                try:
                    # Buscar contato pelo telefone
                    search_result = await chatwoot.search_contact(contact_phone)
                    
                    if search_result and search_result.get("payload"):
                        contacts = search_result.get("payload", [])
                        if contacts:
                            contact = contacts[0]
                            contact_id = contact.get("id")
                            
                            # Buscar conversas do contato
                            conv_result = await chatwoot.get_contact_conversations(contact_id)
                            conversations = conv_result.get("payload", []) if conv_result else []
                            
                            if conversations:
                                # Usar a primeira conversa ativa
                                conversation_id = conversations[0].get("id")
                                logger.info(f"✅ Conversa existente encontrada: {conversation_id}")
                            else:
                                logger.warning(f"⚠️ Contato encontrado mas sem conversas. ID de conversa permanece None.")
                        else:
                            logger.warning(f"⚠️ Nenhum contato encontrado no Chatwoot para {contact_phone}")
                    else:
                        logger.warning(f"⚠️ Busca retornou vazio para {contact_phone}")
                        
                except Exception as search_error:
                    logger.error(f"❌ Erro ao buscar/criar conversa: {search_error}")
                    # Continua com conversation_id = None (vai falhar, mas melhor logar)
            
            # Se ainda não tiver conversation_id, logar erro explícito
            if not conversation_id:
                logger.error(f"❌ ERRO CRÍTICO: Não foi possível obter conversation_id para {contact_phone}. Execução abortada.")
                # Marcar trigger como failed
                trigger.status = 'failed'
                db.commit()
                return
            
            await execute_funnel(
                funnel_id=data.get("funnel_id"),
                conversation_id=conversation_id,
                trigger_id=data.get("trigger_id"),
                contact_phone=contact_phone,
                db=db
            )
            logger.info(f"✅ Execução de funil concluída para {contact_phone}")
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ Erro ao executar funil: {e}")
    finally:
        # Throttling entre execuções
        if MESSAGE_DELAY > 0:
            await asyncio.sleep(MESSAGE_DELAY)

async def handle_whatsapp_event(data: dict):
    """
    Processa eventos crus do Webhook da Meta.
    """
    try:
        entry = data.get("entry", [])
        if not entry: return

        db = SessionLocal()
        
        # Cache de config de retorno
        return_config = db.query(models.AppConfig).filter(models.AppConfig.key == "META_RETURN_CONFIG").first()
        return_url = return_config.value if return_config else None
        
        processed_events = []

        for item in entry:
            changes = item.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                
                # 1. STATUS UPDATE (Sent, Delivered, Read, Failed)
                statuses = value.get("statuses", [])
                for status_obj in statuses:
                    msg_id = status_obj.get("id")
                    status = status_obj.get("status")
                    recipient = status_obj.get("recipient_id")
                    timestamp = status_obj.get("timestamp")
                    
                    if not msg_id or not status: continue

                    logger.info(f"🔍 Processing Status: msg_id={msg_id}, status={status}")

                    # Buscar mensagem no DB
                    message_record = db.query(models.MessageStatus).filter(
                        models.MessageStatus.message_id == msg_id
                    ).first()

                    if message_record:
                        old_status = message_record.status
                        
                        # Atualiza se mudou
                        if old_status != status:
                            message_record.status = status
                            message_record.updated_at = datetime.now()
                            
                            # Capturar erro se houver
                            errors = status_obj.get("errors")
                            if status == "failed" and errors:
                                error_detail = f"{errors[0].get('code')}: {errors[0].get('title')}"
                                message_record.failure_reason = error_detail
                            
                            # Atualizar Trigger Pai (Contadores)
                            trigger = message_record.trigger
                            if trigger:
                                is_delivery = status in ['delivered', 'read']
                                was_delivery = old_status in ['delivered', 'read']
                                
                                # Incremento Delivered
                                if is_delivery and not was_delivery:
                                    trigger.total_delivered = (trigger.total_delivered or 0) + 1
                                    if trigger.cost_per_unit:
                                        trigger.total_cost = trigger.total_delivered * trigger.cost_per_unit
                                
                                # Incremento Read
                                if status == 'read' and old_status != 'read':
                                    trigger.total_read = (trigger.total_read or 0) + 1

                                # Incremento Failed
                                if status == 'failed' and old_status != 'failed':
                                    trigger.total_failed = (trigger.total_failed or 0) + 1
                                    
                                    # Se falhou depois de ser dado como enviado, remove do contador de enviados
                                    if old_status == 'sent':
                                        trigger.total_sent = max(0, (trigger.total_sent or 0) - 1)
                                        
                                    # Decrement delivered se mudou de delivered -> failed (raro, mas possível)
                                    if was_delivery:
                                        trigger.total_delivered = max(0, (trigger.total_delivered or 0) - 1)
                            
                            async def notify_progress():
                                if not trigger: return
                                
                                progress_data = {
                                    "trigger_id": trigger.id,
                                    "status": trigger.status,
                                    "sent": trigger.total_sent or 0,
                                    "failed": trigger.total_failed or 0,
                                    "total": len(trigger.contacts_list or []),
                                    "delivered": trigger.total_delivered or 0,
                                    "read": trigger.total_read or 0,
                                    "interactions": trigger.total_interactions or 0,
                                    "blocked": trigger.total_blocked or 0,
                                    "cost": trigger.total_cost or 0.0,
                                    "processed_contacts": trigger.processed_contacts or [],
                                    "pending_contacts": trigger.pending_contacts or []
                                }
                                await rabbitmq.publish_event("bulk_progress", progress_data)

                            db.commit()
                            await notify_progress()
                            logger.info(f"📊 Status Meta: {msg_id} ({status})")
                            
                            processed_events.append({
                                "type": "status",
                                "phone": recipient,
                                "status": status,
                                "message_id": msg_id,
                                "timestamp": timestamp,
                                "trigger_id": trigger.id if trigger else None
                            })

                # 2. INTERAÇÃO (Mensagens/Botões)
                messages = value.get("messages", [])
                for msg in messages:
                    msg_type = msg.get("type")
                    from_phone = msg.get("from")
                    msg_id = msg.get("id")
                    context = msg.get("context", {}) # Se for resposta a algo
                    
                    # Interação Válida: Botão (button) ou Lista (interactive)
                    # Texto NÃO conta como interação de disparo neste contexto (mas pode ser processado pelo Chatwoot)
                    is_interaction = msg_type in ['button', 'interactive'] 
                    
                    if is_interaction:
                        # Detect button text
                        button_text = ""
                        if msg_type == 'button':
                            button_text = msg.get("button", {}).get("text", "").lower()
                        elif msg_type == 'interactive':
                            reply = msg.get("interactive", {})
                            button_text = (reply.get("button_reply", {}).get("title") or 
                                          reply.get("list_reply", {}).get("title") or "").lower()
                        
                        is_block_request = "bloquear" in button_text

                        # Tentar linkar com ID original wamid se houver contexto
                        original_wamid = context.get("id")
                        trigger = None
                        
                        if original_wamid:
                            # Tenta achar a mensagem original que gerou essa resposta
                            original_msg = db.query(models.MessageStatus).filter(
                                models.MessageStatus.message_id == original_wamid
                            ).first()
                            
                            if original_msg:
                                # Capture previous state to prevent duplicates
                                already_interacted = original_msg.is_interaction
                                original_msg.is_interaction = True
                                
                                trigger = original_msg.trigger
                                if trigger:
                                    if is_block_request:
                                        # Only increment block count if not already marked as blocked via button
                                        if original_msg.failure_reason != "BLOCKED_VIA_BUTTON":
                                            trigger.total_blocked = (trigger.total_blocked or 0) + 1
                                            
                                            # Add to blocked contacts table
                                            already_blocked = db.query(models.BlockedContact).filter(
                                                models.BlockedContact.client_id == trigger.client_id,
                                                models.BlockedContact.phone == from_phone
                                            ).first()
                                            
                                            if not already_blocked:
                                                db.add(models.BlockedContact(
                                                    client_id=trigger.client_id,
                                                    phone=from_phone,
                                                    reason=f"Auto-bloqueio via botão: {button_text}"
                                                ))
                                            
                                            # Tag queryable status
                                            original_msg.failure_reason = "BLOCKED_VIA_BUTTON"
                                            
                                    else:
                                        # Only count as interaction if NOT a block and NOT already interacted
                                        # This ensures unique interactions per message
                                        if not already_interacted:
                                            trigger.total_interactions = (trigger.total_interactions or 0) + 1
                                            
                                            # Trigger Funnel based on Button Text
                                            from sqlalchemy import func, or_
                                            # Find funnel that matches button text in trigger_phrase
                                            # We check for exact match or if it's inside a comma-separated list
                                            matched_funnel = db.query(models.Funnel).filter(
                                                models.Funnel.client_id == trigger.client_id,
                                                or_(
                                                    func.lower(models.Funnel.trigger_phrase) == button_text,
                                                    models.Funnel.trigger_phrase.ilike(f"%,{button_text},%"),
                                                    models.Funnel.trigger_phrase.ilike(f"{button_text},%"),
                                                    models.Funnel.trigger_phrase.ilike(f"%,{button_text}")
                                                )
                                            ).first()

                                            # ---------------------------------------------------------
                                            # NEW GROUPING LOGIC
                                            # ---------------------------------------------------------
                                            from sqlalchemy import cast, Date
                                            
                                            # 1. Determine Template Name context
                                            template_context = "Desconhecido"
                                            if trigger.template_name:
                                                template_context = trigger.template_name
                                            elif trigger.funnel:
                                                template_context = trigger.funnel.name
                                            else:
                                                template_context = f"Trigger {trigger.id}"
                                            
                                            group_name = f"Interação: {button_text} [Origem: {template_context}]"
                                            
                                            # 2. Find Aggregator Trigger for TODAY
                                            today = datetime.now().date()
                                            
                                            aggregator = db.query(models.ScheduledTrigger).filter(
                                                models.ScheduledTrigger.client_id == trigger.client_id,
                                                models.ScheduledTrigger.template_name == group_name,
                                                models.ScheduledTrigger.is_bulk == True, # Acts as bulk container
                                                cast(models.ScheduledTrigger.created_at, Date) == today
                                            ).first()
                                            
                                            if not aggregator:
                                                aggregator = models.ScheduledTrigger(
                                                    client_id=trigger.client_id,
                                                    funnel_id=matched_funnel.id, # Reference funnel
                                                    template_name=group_name, # Grouping Key
                                                    is_bulk=True, 
                                                    status='processing', # Always active to collect
                                                    scheduled_time=datetime.now(timezone.utc),
                                                    contacts_list=[], 
                                                    processed_contacts=[],
                                                    total_sent=0,
                                                    total_failed=0,
                                                    total_delivered=0,
                                                    total_read=0,
                                                    total_interactions=0
                                                )
                                                db.add(aggregator)
                                                db.commit()
                                                db.refresh(aggregator)
                                            
                                            # 3. Update Aggregator Stats
                                            # Avoid duplicates in the 'sent' count if user doubles clicks (optional but good)
                                            current_list = list(aggregator.contacts_list or [])
                                            updated_agg = False
                                            
                                            if from_phone not in current_list:
                                                current_list.append(from_phone)
                                                aggregator.contacts_list = current_list
                                                aggregator.total_sent = (aggregator.total_sent or 0) + 1
                                                aggregator.updated_at = datetime.now(timezone.utc)
                                                updated_agg = True
                                                
                                            if updated_agg:
                                                db.add(aggregator)
                                                db.commit()
                                            
                                            # 4. Create ACTUAL Execution Trigger (Hidden)
                                            contact_name = value.get("contacts", [{}])[0].get("profile", {}).get("name")
                                            
                                            logger.info(f"🎯 Funnel matched by button for {from_phone} ({contact_name}): '{button_text}' -> {matched_funnel.name}")
                                            new_trigger = models.ScheduledTrigger(
                                                client_id=trigger.client_id,
                                                funnel_id=matched_funnel.id,
                                                contact_phone=from_phone,
                                                contact_name=contact_name,
                                                status='queued',
                                                scheduled_time=datetime.now(timezone.utc),
                                                template_name="HIDDEN_CHILD", # Signal to Hide
                                                is_bulk=False 
                                            )
                                            db.add(new_trigger)

                                    db.commit()

                                    # Notify Frontend
                                    progress_data = {
                                        "trigger_id": trigger.id,
                                        "status": trigger.status,
                                        "sent": trigger.total_sent or 0,
                                        "failed": trigger.total_failed or 0,
                                        "total": len(trigger.contacts_list or []),
                                        "delivered": trigger.total_delivered or 0,
                                        "read": trigger.total_read or 0,
                                        "interactions": trigger.total_interactions or 0,
                                        "blocked": trigger.total_blocked or 0,
                                        "cost": trigger.total_cost or 0.0
                                    }
                                    await rabbitmq.publish_event("bulk_progress", progress_data)
                                    
                                    logger.info(f"👆 Interação detectada de {from_phone} (Trigger {trigger.id}) {'[BLOQUEIO]' if is_block_request else ''}")
                        
                        processed_events.append({
                            "type": "interaction",
                            "subtype": msg_type,
                            "phone": from_phone,
                            "is_block": is_block_request,
                            "payload": button_text,
                            "trigger_id": trigger.id if trigger else None
                        })

        db.close()

        # 3. RETORNO EXTERNO (Se configurado)
        if return_url and processed_events:
            async with httpx.AsyncClient() as client:
                try:
                    await client.post(return_url, json={"events": processed_events}, timeout=5.0)
                    logger.info(f"📤 Eventos encaminhados para {return_url}")
                except Exception as e:
                    logger.error(f"❌ Falha ao enviar para Return URL: {e}")

    except Exception as e:
        logger.error(f"❌ Erro fatal processando evento WhatsApp: {e}")

async def start_worker():
    """Inicia o worker e conecta às filas"""
    logger.info(f"👷 Iniciando ZapVoice Worker | Prefetch: {PREFETCH_COUNT} | Delay: {MESSAGE_DELAY}s")
    
    # Conecta ao RabbitMQ
    await rabbitmq.connect()
    
    # Define os consumidores com QoS apropriado
    # Bulk Sends são pesados, mantemos 1 ou PREFETCH_COUNT baixo se quiser paralelizar jobs
    # Para Bulks, 1 é mais seguro para não sobrecarregar memória se cada job for gigante
    await rabbitmq.consume("zapvoice_bulk_sends", handle_bulk_send, prefetch_count=1)
    
    # Fila de Eventos do WhatsApp (Meta Webhooks)
    # Processamento rápido, pode ter prefetch maior
    await rabbitmq.consume("whatsapp_events", handle_whatsapp_event, prefetch_count=20)
    
    # Funis usam a configuração do ENV
    await rabbitmq.consume("zapvoice_funnel_executions", handle_funnel_execution, prefetch_count=PREFETCH_COUNT)
    
    logger.info("🚀 Worker rodando e aguardando processamento...")
    
    # Mantém o worker rodando
    try:
        await asyncio.Future()
    except asyncio.CancelledError:
        logger.info("🛑 Worker parando...")
        await rabbitmq.close()

if __name__ == "__main__":
    try:
        asyncio.run(start_worker())
    except KeyboardInterrupt:
        print("Worker parado manualmente")

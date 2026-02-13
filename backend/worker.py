
import asyncio
import logging
from rabbitmq_client import rabbitmq
from services.bulk import process_bulk_send, process_bulk_funnel
from services.engine import execute_funnel
from database import SessionLocal
import models
import json
import httpx
from datetime import datetime, timezone
import os
from config_loader import get_setting

# Configuração de logs para o Worker
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("Worker")

# Worker Configuration
PREFETCH_COUNT = int(os.getenv("RABBITMQ_PREFETCH_COUNT", 5))
MESSAGE_DELAY = float(os.getenv("RABBITMQ_MESSAGE_DELAY", 1.0))

# Semaphores for private message concurrency control
semaphores = {}

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
                components=data.get("components"),
                # New fields
                direct_message=data.get("direct_message"),
                direct_message_params=data.get("direct_message_params")
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
                    # Tenta obter o inbox ID padrão para criar conversa se necessário
                    inbox_id = await chatwoot.get_default_whatsapp_inbox()
                    
                    # Usa ensure_conversation (busca robusta + auto-create)
                    conversation_id = await chatwoot.ensure_conversation(
                        phone_number=contact_phone,
                        name=data.get("contact_name") or contact_phone,
                        inbox_id=inbox_id
                    )
                    
                    if conversation_id:
                        logger.info(f"✅ Conversa obtida/criada com sucesso: {conversation_id}")
                    else:
                        logger.warning(f"⚠️ ensure_conversation falhou para {contact_phone}")

                except Exception as search_error:
                    logger.error(f"❌ Erro ao buscar/criar conversa: {search_error}")
            
            # Se ainda não tiver conversation_id, logar erro explícito
            if not conversation_id:
                # Add check for invalid phone to avoid spamming lookup failures
                if not contact_phone or len(str(contact_phone).strip()) < 8:
                     logger.error(f"❌ INVALID PHONE: Contact phone '{contact_phone}' is too short or empty. Skipping.")
                     trigger.status = 'failed'
                     db.commit()
                     return

                logger.error(f"❌ ERRO CRÍTICO: Não foi possível obter conversation_id para {contact_phone}. Execução abortada.")
                # Marcar trigger como failed
                trigger.status = 'failed'
                trigger.failure_reason = "Não foi possível criar/encontrar conversa no Chatwoot."
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

async def handle_chatwoot_private_message(data: dict):
    """
    Cria uma mensagem privada no Chatwoot para um contato disparado em massa.
    Garante intervalo de 5 segundos entre envios.
    """
    client_id = data.get("client_id")
    phone = data.get("phone")
    message = data.get("message")
    trigger_id = data.get("trigger_id")
    delay = data.get("delay", 5)
    concurrency = int(data.get("concurrency", 1))

    logger.info(f"💬 [PRIVATE_NOTE] Starting for {phone} (Trigger: {trigger_id}, Client: {client_id}, Delay: {delay}s, Concurrency: {concurrency})")
    
    # Get or create semaphore for this trigger
    if trigger_id not in semaphores:
        semaphores[trigger_id] = asyncio.Semaphore(concurrency)
    
    try:
        async with semaphores[trigger_id]:
            if not message:
                logger.warning(f"⚠️ [PRIVATE_NOTE] Message content is empty for {phone}. Skipping.")
                return

            from chatwoot_client import ChatwootClient
            chatwoot = ChatwootClient(client_id=client_id)
            
            # 1. Obter Inbox ID padrão
            inbox_id = await chatwoot.get_default_whatsapp_inbox()
            if not inbox_id:
                logger.error(f"❌ Nenhum inbox encontrado para o cliente {client_id}. Abortando nota privada.")
                return

            # 2. Garantir Conversa (Busca contato, cria se necessário, busca conversa, cria se necessário)
            conversation_id = await chatwoot.ensure_conversation(
                phone_number=phone,
                name=phone, # Nome padrão é o número
                inbox_id=inbox_id
            )
            
            if conversation_id:
                logger.info(f"✅ Conversa garantida no Chatwoot para {phone} (ID: {conversation_id})")
                
                # Check 24h window
                window_open = await chatwoot.is_within_24h_window(conversation_id)
                
                # FORCE PRIVATE NOTE (Internal Only)
                await chatwoot.send_message(conversation_id, message, private=True)
                logger.info(f"✅ Nota interna registrada para {phone} (Status Janela: {'ABERTA' if window_open else 'FECHADA'})")
            else:
                logger.error(f"❌ Falha ao garantir conversa para {phone}")

            # Dynamic interval for this queue
            logger.info(f"⏳ Aguardando {delay}s para o próximo item da fila de notas privadas do trigger {trigger_id}...")
            await asyncio.sleep(delay)

    except Exception as e:
        logger.error(f"❌ Erro ao enviar nota privada para {phone}: {e}")

async def delayed_sync_chatwoot_name(client_id: int, phone: str, name: str, delay: int = 15):
    """
    Aguarda X segundos e sincroniza o nome do contato no Chatwoot com o nome do perfil do WhatsApp.
    """
    if not name or not phone:
        return
        
    await asyncio.sleep(delay)
    logger.info(f"🔄 [SYNC] Iniciando sincronização atrasada para {phone} ({name})")
    
    try:
        from chatwoot_client import ChatwootClient
        chatwoot = ChatwootClient(client_id=client_id)
        
        # Formatar telefone para busca (garante que tenha o + se necessário)
        clean_phone = "".join(filter(str.isdigit, phone))
        search_query = f"+{clean_phone}"
        
        # 1. Buscar contato pelo telefone
        search_res = await chatwoot.search_contact(search_query)
        
        # Fallback se não achou com +
        if not (search_res and search_res.get("payload")):
             search_res = await chatwoot.search_contact(clean_phone)

        if search_res and search_res.get("payload"):
            contact = search_res["payload"][0]
            contact_id = contact["id"]
            current_name = contact.get("name")
            
            # Só atualiza se o nome for diferente e o novo nome for válido
            if name and current_name != name:
                logger.info(f"🔄 [SYNC] Atualizando nome no Chatwoot para {phone}: '{current_name}' -> '{name}'")
                await chatwoot.update_contact(contact_id, {"name": name})
            else:
                logger.info(f"✅ [SYNC] Nome já está atualizado ou coincide para {phone}")
        else:
            logger.warning(f"⚠️ [SYNC] Contato {phone} não encontrado no Chatwoot para atualizar nome.")
            
    except Exception as e:
        logger.error(f"❌ [SYNC] Erro na sincronização atrasada de nome para {phone}: {e}")

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
                
                # Mapa de contatos (wa_id -> profile_name) para sync de nome
                contacts_map = {}
                for c in value.get("contacts", []):
                    wa_id = c.get("wa_id")
                    p_name = c.get("profile", {}).get("name")
                    if wa_id and p_name:
                        contacts_map[wa_id] = p_name

                # 1. STATUS UPDATE (Sent, Delivered, Read, Failed)
                statuses = value.get("statuses", [])
                for status_obj in statuses:
                    msg_id = status_obj.get("id")
                    status = status_obj.get("status")
                    recipient = status_obj.get("recipient_id")
                    timestamp = status_obj.get("timestamp")
                    
                    if not msg_id or not status: continue
                    
                    logger.info(f"🔍 [DEBUG] Processing Status Update: msg_id={msg_id}, status={status}, recipient={recipient}")

                    # Sincronização de nome se disponível no status (raro, mas possível em alguns payloads)
                    # No status o 'recipient_id' é o telefone.
                    # Mas o nome só vem no objeto 'contacts' de mensagens de entrada.

                    # Buscar mensagem no DB com LOCK para evitar race conditions
                    message_record = db.query(models.MessageStatus).filter(
                        models.MessageStatus.message_id == msg_id
                    ).with_for_update().first()

                    if not message_record:
                         logger.warning(f"⚠️ [DEBUG] MessageStatus NOT FOUND for msg_id={msg_id}. Skipping status update.")
                    else:
                        logger.info(f"✅ [DEBUG] MessageStatus FOUND. Current Status: {message_record.status} -> New: {status}")
                        old_status = message_record.status
                        
                        # Atualiza se mudou
                        if old_status != status:
                            message_record.status = status
                            message_record.updated_at = datetime.now(timezone.utc)
                            
                            # Capturar erro se houver
                            errors = status_obj.get("errors")
                            if status == "failed" and errors:
                                error_detail = f"{errors[0].get('code')}: {errors[0].get('title')}"
                                message_record.failure_reason = error_detail
                                logger.error(f"❌ [DEBUG] Message failed: {error_detail}")
                            
                            # Atualizar Trigger Pai (Contadores)
                            trigger = message_record.trigger
                            if not trigger:
                                logger.warning(f"⚠️ [DEBUG] Orphan MessageStatus (No parent trigger) for {msg_id}")
                            else:
                                logger.info(f"🔗 [DEBUG] Updating Parent Trigger {trigger.id} (Sent: {trigger.total_sent}, Delivered: {trigger.total_delivered})")
                                is_delivery = status in ['delivered', 'read']
                                was_delivery = old_status in ['delivered', 'read']
                                
                                # Incremento Delivered
                                if is_delivery and not was_delivery:
                                    trigger.total_delivered = (trigger.total_delivered or 0) + 1
                                    # Custo só deve ser incrementado para TEMPLATE (Mensagens Livres/24h são grátis)
                                    if trigger.cost_per_unit and message_record.message_type != 'DIRECT_MESSAGE':
                                        trigger.total_cost = (trigger.total_cost or 0) + trigger.cost_per_unit
                                
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
                                        # Estornar custo se for template
                                        if trigger.cost_per_unit and message_record.message_type != 'DIRECT_MESSAGE':
                                            trigger.total_cost = max(0.0, (trigger.total_cost or 0.0) - trigger.cost_per_unit)
                            
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

                            # NEW: Trigger private note on delivery/read
                            # This ensures we only clutter Chatwoot AFTER we know the message reached the user
                            if status in ['delivered', 'read'] and message_record.pending_private_note and not message_record.private_note_posted:
                                logger.info(f"📬 [WEBHOOK] Message {msg_id} delivered! Enqueueing private note for {recipient}")
                                
                                # Mark as posted to avoid duplicates if 'read' comes shortly after 'delivered'
                                message_record.private_note_posted = True
                                db.commit()
                                
                                try:
                                    queue_data = {
                                        "client_id": trigger.client_id,
                                        "phone": message_record.phone_number,
                                        "message": message_record.pending_private_note,
                                        "trigger_id": trigger.id,
                                        "delay": trigger.private_message_delay or 5,
                                        "concurrency": trigger.private_message_concurrency or 1
                                    }
                                    # Use rabbitmq.publish to send to the dedicated private message queue
                                    await rabbitmq.publish("chatwoot_private_messages", queue_data)
                                    logger.info(f"✅ Private note enqueued for {recipient}")
                                except Exception as e_queue:
                                    logger.error(f"❌ Error enqueuing private note for {recipient}: {e_queue}")
                            
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
                    # Log RAW para debug
                    logger.info(f"📨 [DEBUG] Incoming Message Payload: {json.dumps(msg)}")
                    
                    msg_type = msg.get("type")
                    from_phone = msg.get("from")
                    context = msg.get("context", {})

                    # --- LÓGICA DE SINCRONIZAÇÃO DE NOME (15 Segundos de Delay) ---
                    profile_name = contacts_map.get(from_phone)
                    if profile_name:
                         # Tenta descobrir o client_id para instanciar o ChatwootClient correto
                         # Vamos usar Client ID 1 como default se não encontrar nada melhor rápido,
                         # mas o ideal é buscar pela conta vinculada ao phone_number_id que vem no metadata
                         metadata = value.get("metadata", {})
                         pnid = metadata.get("phone_number_id")
                         target_client_id = 1
                         if pnid:
                             conf = db.query(models.AppConfig).filter(models.AppConfig.key == "WA_PHONE_NUMBER_ID", models.AppConfig.value == str(pnid)).first()
                             if conf: target_client_id = conf.client_id
                         
                         logger.info(f"🕒 Agendando sincronização de nome para {from_phone} ({profile_name}) em 15s...")
                         asyncio.create_task(delayed_sync_chatwoot_name(target_client_id, from_phone, profile_name, 15))

                    # Determine if this message should trigger a funnel
                    is_triggerable = msg_type in ['button', 'interactive', 'text'] 
                    
                    if is_triggerable:
                        user_input = ""
                        if msg_type == 'button':
                            user_input = msg.get("button", {}).get("text", "")
                        elif msg_type == 'interactive':
                            reply = msg.get("interactive", {})
                            user_input = (reply.get("button_reply", {}).get("title") or 
                                         reply.get("list_reply", {}).get("title") or "")
                        elif msg_type == 'text':
                            user_input = msg.get("text", {}).get("body", "")
                        
                        # Normalize for comparison
                        user_input_clean = user_input.lower().strip()
                        
                        if not user_input_clean:
                            continue

                        logger.info(f"🎯 [DEBUG] Input detectado: '{user_input_clean}' (Type: {msg_type}) de {from_phone}")
                        button_text = user_input_clean # Compatibility with downstream block
                        
                        # 1. Identificar o CLIENTE (Identificação robusta)
                        current_msg_client_id = None
                        trigger = None
                        original_wamid = context.get("id")
                        
                        if original_wamid:
                            original_msg = db.query(models.MessageStatus).filter(
                                models.MessageStatus.message_id == original_wamid
                            ).first()
                            if original_msg:
                                trigger = original_msg.trigger
                                if trigger:
                                    current_msg_client_id = trigger.client_id
                                    # Marca que houve interação na mensagem original
                                    original_msg.is_interaction = True
                                    db.commit()

                        # Fallback: Se não achou pela mensagem, busca pela conta da Meta
                        if not current_msg_client_id:
                            phone_number_id = value.get("metadata", {}).get("phone_number_id")
                            if phone_number_id:
                                client_config = db.query(models.AppConfig).filter(
                                    models.AppConfig.key == "WA_PHONE_NUMBER_ID",
                                    models.AppConfig.value == str(phone_number_id)
                                ).first()
                                if client_config:
                                    current_msg_client_id = client_config.client_id

                        if not current_msg_client_id:
                            logger.error(f"❌ Não foi possível identificar o cliente para {from_phone}")
                            continue

                        # 2. LÓGICA DE BLOQUEIO / INTERAÇÃO
                        db_keywords = get_setting("AUTO_BLOCK_KEYWORDS", "", client_id=current_msg_client_id)
                        
                        if db_keywords:
                            block_keywords = [k.strip().lower() for k in db_keywords.split(",") if k.strip()]
                        else:
                            # Default fallback
                            block_keywords = ["bloquear", "parar", "sair", "cancelar", "não quero", "nao quero", "stop", "unsubscribe", "opt-out", "descadastrar"]
                        
                        is_block_request = any(k in user_input_clean for k in block_keywords)

                        if is_block_request:
                            logger.info(f"🚫 [DEBUG] Pedido de Bloqueio detectado de {from_phone}")
                            if trigger:
                                trigger.total_blocked = (trigger.total_blocked or 0) + 1
                            
                            # Add to blocked contacts
                            contact_name = value.get("contacts", [{}])[0].get("profile", {}).get("name")
                            
                            # Normalize from_phone
                            clean_from = "".join(filter(str.isdigit, from_phone))
                            suffix = clean_from[-8:] if len(clean_from) >= 8 else clean_from

                            already_blocked = db.query(models.BlockedContact).filter(
                                models.BlockedContact.client_id == current_msg_client_id,
                                models.BlockedContact.phone.like(f"%{suffix}")
                            ).first()
                            if not already_blocked:
                                db.add(models.BlockedContact(
                                    client_id=current_msg_client_id, 
                                    phone=from_phone, 
                                    name=contact_name,
                                    reason=f"Auto-bloqueio: {button_text}"
                                ))
                            db.commit()
                        else:
                            # Se NÃO é bloqueio, conta como interação se houver um trigger associado
                            if trigger:
                                trigger.total_interactions = (trigger.total_interactions or 0) + 1
                                db.commit()
                        
                        # Define client_id para o restante do fluxo (funis)
                        client_id = current_msg_client_id

                        # 3. LÓGICA DE GATILHO DE FUNIL
                        from sqlalchemy import func, or_
                        # Mapear funis que tenham a frase (comparação case-insensitive e multi-keyword)
                        matched_funnel = db.query(models.Funnel).filter(
                            models.Funnel.client_id == client_id,
                            or_(
                                func.lower(models.Funnel.trigger_phrase) == button_text,
                                models.Funnel.trigger_phrase.ilike(f"%,{button_text},%"),
                                models.Funnel.trigger_phrase.ilike(f"{button_text},%"),
                                models.Funnel.trigger_phrase.ilike(f"%,{button_text}"),
                                # Suporte para espaços após a vírgula
                                models.Funnel.trigger_phrase.ilike(f"%, {button_text},%"),
                                models.Funnel.trigger_phrase.ilike(f"%, {button_text}")
                            )
                        ).first()

                        if matched_funnel:
                            logger.info(f"🚀 Disparando funil: {matched_funnel.name} (ID: {matched_funnel.id})")
                            
                            # Individual Execution
                            contact_name = value.get("contacts", [{}])[0].get("profile", {}).get("name")
                            new_trigger = models.ScheduledTrigger(
                                client_id=client_id,
                                funnel_id=matched_funnel.id,
                                contact_phone=from_phone,
                                contact_name=contact_name,
                                status='queued',
                                scheduled_time=datetime.now(timezone.utc),
                                template_name=f"Interação: {button_text}", # Visible Name
                                is_bulk=False
                            )
                            db.add(new_trigger)
                            db.commit()
                            logger.info(f"✅ Execução individual criada para {from_phone}")
                        else:
                            if not is_block_request:
                                logger.warning(f"❓ Nenhum funil encontrado para a frase: '{button_text}' (Cliente {client_id})")

                        # Global Progress Notification for the original trigger (if exists)
                        if trigger:
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

async def process_scheduled_triggers():
    """
    Loop que verifica periodicamente o banco de dados por triggers agendados
    que chegaram no horário de execução.
    """
    while True:
        try:
            logger.info("⏰ Verificando agendamentos pendentes...")
            db = SessionLocal()
            now = datetime.now(timezone.utc)
            
            # Buscar triggers com status 'queued' (padrão do frontend) ou 'pending' que já passaram da hora
            # E que ainda não foram para 'processing' ou 'completed'
            pending_triggers = db.query(models.ScheduledTrigger).filter(
                models.ScheduledTrigger.status.in_(['pending', 'queued', 'Queued']),
                models.ScheduledTrigger.scheduled_time <= now
            ).all()

            count = 0
            for t in pending_triggers:
                logger.info(f"🚀 Disparando agendamento {t.id} (Scheduled: {t.scheduled_time})")
                
                # Construir payload
                payload = {
                    "trigger_id": t.id,
                    "contacts": t.contacts_list or [],
                    "delay": t.delay_seconds,
                    "concurrency": t.concurrency_limit
                }

                queue_name = "zapvoice_bulk_sends"
                
                # Diferenciar tipos
                if t.funnel_id:
                     payload["type"] = "funnel_bulk"
                     payload["funnel_id"] = t.funnel_id
                elif t.template_name:
                     payload["type"] = "template_bulk"
                     payload["template_name"] = t.template_name
                     payload["language"] = t.template_language
                     payload["components"] = t.template_components
                     payload["private_message"] = t.private_message
                     payload["private_message_delay"] = t.private_message_delay
                     payload["private_message_concurrency"] = t.private_message_concurrency
                     # New fields
                     payload["direct_message"] = t.direct_message
                     payload["direct_message_params"] = t.direct_message_params
                
                # Publicar
                success = await rabbitmq.publish(queue_name, payload)
                
                if success:
                    # Atualizar status APENAS se publicou com sucesso
                    t.status = 'processing'
                    t.updated_at = datetime.now(timezone.utc)
                    db.commit()
                    count += 1
                else:
                    logger.error(f"❌ Falha ao publicar trigger {t.id} no RabbitMQ. Mantendo status 'queued' para nova tentativa.")
                    db.rollback() # Reverte alteração de status se houver
            
            if count > 0:
                logger.info(f"✅ {count} agendamentos disparados para a fila com sucesso.")
            
            db.close()
            
        except Exception as e:
            logger.error(f"❌ Erro no processador de agendamentos: {e}")
            # Sleep extra em caso de erro de DB para não flodar log
            await asyncio.sleep(10)
            
        # Verificar a cada 30 segundos
        await asyncio.sleep(30)

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

    # Fila de Notas Privadas (Chatwoot) - Prefetch aumentado para suportar concorrência dinâmica
    await rabbitmq.consume("chatwoot_private_messages", handle_chatwoot_private_message, prefetch_count=50)
    
    # Start Scheduler Loop
    asyncio.create_task(process_scheduled_triggers())

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

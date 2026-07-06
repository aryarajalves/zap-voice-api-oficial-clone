import asyncio
import models
from core.logger import setup_logger
from datetime import datetime, timezone, timedelta
from sqlalchemy import text, or_

# Access attributes via the main namespace module to support unit test patching
import core.worker.handlers.whatsapp as wah

logger = setup_logger("Worker.WhatsAppInbound")

async def handle_whatsapp_inbound_messages(db, messages: list, value: dict, metadata: dict):
    """
    Processa mensagens de entrada brutas da Meta (Inbound / Interações)
    """
    contacts_map = {c.get("wa_id"): c.get("profile", {}).get("name") for c in value.get("contacts", [])}
    bsud_map = {c.get("wa_id"): c.get("user_id") for c in value.get("contacts", []) if c.get("user_id")}
    
    for msg in messages:
        raw_from = msg.get("from")
        from_phone = wah.normalize_phone_inbound(raw_from)
        msg_id = msg.get("id")
        
        db_lock_key = f"inbound_{from_phone}"
        # Lock não-bloqueante para evitar travar o event loop do worker
        has_pg_lock = False
        if hasattr(db, 'bind') and db.bind is not None:
            dialect = getattr(db.bind, 'dialect', None)
            if dialect is not None and getattr(dialect, 'name', None) == 'postgresql':
                has_pg_lock = True
        if has_pg_lock:
            while True:
                locked = db.execute(text("SELECT pg_try_advisory_xact_lock(hashtext(:key))"), {"key": db_lock_key}).scalar()
                if locked: break
                await asyncio.sleep(0.05)
        
        try:
            db.expire_all()
            
            # Cancelar follow-ups pendentes devido a interacao detectada no WhatsApp
            from services.triggers_service import cancel_pending_followups_for_phone
            cancel_pending_followups_for_phone(db, from_phone)
            
            mem_lock_key = f"mem_lock_{from_phone}_{msg_id}"
            now = datetime.now(timezone.utc)
            if mem_lock_key in wah.GLOBAL_PROCESSING_LOCKS:
                if now - wah.GLOBAL_PROCESSING_LOCKS[mem_lock_key] < timedelta(seconds=10):
                    logger.warning(f"🚫 [MEM_LOCK] Ignorando mensagem repetida {msg_id}")
                    continue
            wah.GLOBAL_PROCESSING_LOCKS[mem_lock_key] = now

            candidate_cids = [1]
            pnid = metadata.get("phone_number_id")
            if pnid:
                confs = db.query(models.AppConfig).filter(models.AppConfig.key == "WA_PHONE_NUMBER_ID", models.AppConfig.value == str(pnid)).all()
                if confs: 
                    candidate_cids = list(set([c.client_id for c in confs]))
            
            target_cid = candidate_cids[0] if candidate_cids else 1
            
            # --- NOVO: Sincronização em tempo real do ContactWindow via Meta ---
            cw = wah.ChatwootClient(client_id=target_cid)
            resolved_convo_id = None
            
            # Verificar se este telefone está associado a um disparo em massa ativo/recente para não criar conversa fantasma
            is_bulk_contact = False
            try:
                # Busca a última mensagem enviada nas últimas 2 horas para ver se veio de um bulk trigger
                two_hours_ago = datetime.now(timezone.utc) - timedelta(hours=2)
                last_msg = db.query(models.MessageStatus).filter(
                    models.MessageStatus.phone_number == from_phone,
                    models.MessageStatus.timestamp >= two_hours_ago
                ).order_by(models.MessageStatus.timestamp.desc()).first()
                if last_msg:
                    trigger_check = db.query(models.ScheduledTrigger).get(last_msg.trigger_id)
                    if trigger_check:
                        if trigger_check.is_bulk:
                            is_bulk_contact = True
                        elif trigger_check.parent_id:
                            parent_trigger = db.query(models.ScheduledTrigger).get(trigger_check.parent_id)
                            if parent_trigger and parent_trigger.is_bulk:
                                is_bulk_contact = True
            except Exception as e_check:
                logger.error(f"⚠️ Erro ao verificar bulk para contato {from_phone}: {e_check}")

            try:
                # Sincroniza conversa para garantir que ela exista no Chatwoot apenas se NÃO for contato de bulk (evitando criar conversa fantasma)
                if not is_bulk_contact:
                    conv_res = await cw.ensure_conversation(from_phone, contacts_map.get(raw_from, "Contato"))
                    if isinstance(conv_res, dict):
                        resolved_convo_id = conv_res.get("conversation_id")
                    elif isinstance(conv_res, int) or (isinstance(conv_res, str) and conv_res.isdigit()):
                        resolved_convo_id = int(conv_res)
                else:
                    logger.info(f"⏭️ [WINDOW-META] Contato {from_phone} é de disparo em massa (bulk). Pulando ensure_conversation para evitar conversa fantasma.")
            except Exception as e_conv:
                logger.error(f"⚠️ [WINDOW-META] Erro ao sincronizar conversa com Chatwoot: {e_conv}")

            now_utc = datetime.now(timezone.utc)
            window = db.query(models.ContactWindow).filter(
                models.ContactWindow.phone == from_phone,
                models.ContactWindow.client_id == target_cid
            ).first()
            
            if window:
                window.last_interaction_at = now_utc
                if resolved_convo_id:
                    window.chatwoot_conversation_id = resolved_convo_id
                logger.info(f"🕒 [WINDOW-META] Janela existente atualizada para {from_phone} (Client: {target_cid}, Convo: {resolved_convo_id})")
            else:
                new_window = models.ContactWindow(
                    client_id=target_cid,
                    phone=from_phone,
                    last_interaction_at=now_utc,
                    chatwoot_conversation_id=resolved_convo_id
                )
                db.add(new_window)
                logger.info(f"🆕 [WINDOW-META] Nova janela criada para {from_phone} (Client: {target_cid}, Convo: {resolved_convo_id})")
            db.commit()

            # Sincroniza o contato na tabela customizada do cliente (ex: contatos_monitorados)
            try:
                from services.window_manager import sync_contact_to_custom_table
                sender_name = contacts_map.get(raw_from, "Contato")
                # Busca o inbox_id correspondente caso esteja disponível
                inbox_id = None
                if resolved_convo_id:
                    # Tenta ler o inbox_id associado da janela
                    inbox_id = window.chatwoot_inbox_id if window else None
                
                sync_contact_to_custom_table(
                    db=db,
                    client_id=target_cid,
                    phone=from_phone,
                    name=sender_name,
                    inbox_id=inbox_id,
                    last_interaction_at=now_utc
                )
            except Exception as e_sync:
                logger.error(f"❌ Erro ao chamar sync_contact_to_custom_table no Meta Worker: {e_sync}")
            
            # --- ATUALIZAR OU CRIAR LEAD COM BSUD ---
            bsud_val = msg.get("from_user_id") or bsud_map.get(raw_from)
            if bsud_val:
                try:
                    suffix_l = from_phone[-8:] if len(from_phone) >= 8 else from_phone
                    lead = db.query(models.WebhookLead).filter(
                        models.WebhookLead.client_id == target_cid,
                        or_(
                            models.WebhookLead.phone == from_phone,
                            models.WebhookLead.phone.like(f"%{suffix_l}")
                        )
                    ).first()
                    if lead:
                        if lead.bsud != bsud_val:
                            lead.bsud = bsud_val
                            db.commit()
                            logger.info(f"✨ [BSUD-UPDATE] BSUD '{bsud_val}' associado ao Lead ID {lead.id} ({from_phone})")
                    else:
                        new_lead = models.WebhookLead(
                            client_id=target_cid,
                            name=contacts_map.get(raw_from, "Contato"),
                            phone=from_phone,
                            bsud=bsud_val,
                            platform="whatsapp",
                            total_events=1
                        )
                        db.add(new_lead)
                        db.commit()
                        logger.info(f"🆕 [BSUD-NEW-LEAD] Criado novo Lead com BSUD '{bsud_val}' para {from_phone}")
                except Exception as e_bsud:
                    logger.error(f"❌ Erro ao associar BSUD ao Lead: {e_bsud}")

            # Extrair o input do usuário (seja texto ou clique de botão)
            user_input = None
            msg_type = msg.get("type")
            if msg_type == "text":
                user_input = msg.get("text", {}).get("body")
            elif msg_type == "reaction":
                emoji = msg.get("reaction", {}).get("emoji", "")
                user_input = f"Reagiu com {emoji}" if emoji else "Reagiu com emoji"
            elif msg_type == "button":
                user_input = msg.get("button", {}).get("text")
            elif msg_type == "interactive":
                inter = msg.get("interactive", {})
                if inter.get("type") == "button_reply":
                    user_input = inter.get("button_reply", {}).get("title")
                elif inter.get("type") == "list_reply":
                    user_input = inter.get("list_reply", {}).get("title")

            # --- PRÉ-LOOKUP: Verificar activate_agent para cliques de botão ---
            # Antes de salvar o ChatMessage, verifica se o botão clicado tem activate_agent=True.
            # Isso determina se o AgentFlow webhook será acionado para este clique.
            btn_activate_agent = None  # None = mensagem de texto normal (não é clique de botão)
            is_btn_pre = msg_type in ("button", "interactive")
            if is_btn_pre and user_input:
                try:
                    pre_context = msg.get("context", {})
                    pre_replied_id = pre_context.get("id")
                    pre_trigger_ref = None
                    if pre_replied_id:
                        clean_pre_id = pre_replied_id.replace("wamid.", "")
                        pre_ms = db.query(models.MessageStatus).filter(
                            models.MessageStatus.message_id == clean_pre_id
                        ).first()
                        if pre_ms:
                            pre_trigger_ref = db.query(models.ScheduledTrigger).get(pre_ms.trigger_id)
                    # Fallback: último trigger deste número nas últimas 24h
                    if not pre_trigger_ref:
                        yesterday_pre = datetime.now(timezone.utc) - timedelta(hours=24)
                        suffix_pre = from_phone[-8:] if len(from_phone) >= 8 else from_phone
                        pre_ms_fb = db.query(models.MessageStatus).filter(
                            models.MessageStatus.phone_number.like(f"%{suffix_pre}"),
                            models.MessageStatus.timestamp >= yesterday_pre
                        ).order_by(models.MessageStatus.timestamp.desc()).first()
                        if pre_ms_fb:
                            pre_trigger_ref = db.query(models.ScheduledTrigger).get(pre_ms_fb.trigger_id)
                    if pre_trigger_ref:
                        pre_btn_actions = getattr(pre_trigger_ref, 'button_actions', None) or {}
                        # Fallback: buscar no trigger mais recente com mesmo template
                        if not pre_btn_actions and pre_trigger_ref.template_name:
                            fallback_pre = db.query(models.ScheduledTrigger).filter(
                                models.ScheduledTrigger.client_id == pre_trigger_ref.client_id,
                                models.ScheduledTrigger.template_name == pre_trigger_ref.template_name,
                                models.ScheduledTrigger.button_actions.isnot(None)
                            ).order_by(models.ScheduledTrigger.id.desc()).first()
                            if fallback_pre:
                                pre_btn_actions = fallback_pre.button_actions or {}
                        pre_action = pre_btn_actions.get(user_input.strip(), {})
                        btn_activate_agent = bool(pre_action.get("activate_agent", False))
                        logger.info(f"🤖 [ACTIVATE_AGENT] Botão '{user_input}' → activate_agent={btn_activate_agent} (trigger={pre_trigger_ref.id})")
                    else:
                        # Trigger não encontrado → não dispara agente por segurança
                        btn_activate_agent = False
                        logger.info(f"⚠️ [ACTIVATE_AGENT] Nenhum trigger encontrado para botão '{user_input}' de {from_phone} → activate_agent=False")
                except Exception as e_pre:
                    logger.error(f"❌ [ACTIVATE_AGENT] Erro no pré-lookup: {e_pre}")
                    btn_activate_agent = False

            # --- PRÉ-LOOKUP: Verificar se mensagem de TEXTO pertence a um funil com memória ativa ---
            # Mensagens soltas (fora de qualquer funil em andamento) NUNCA devem ir para a memória.
            # Só entram: (a) respostas dentro de um funil suspenso aguardando input, cujo nó tem
            # sendToMemory ativo, ou (b) cliques de botão com activate_agent=True (já tratado acima).
            text_memory_active = False
            if not is_btn_pre and user_input:
                try:
                    phone_suffix_mem = from_phone[-8:] if len(from_phone) >= 8 else from_phone
                    suspended_for_mem = db.query(models.ScheduledTrigger).filter(
                        models.ScheduledTrigger.client_id == target_cid,
                        or_(
                            models.ScheduledTrigger.contact_phone == from_phone,
                            models.ScheduledTrigger.contact_phone.like(f"%{phone_suffix_mem}")
                        ),
                        models.ScheduledTrigger.status == "suspended",
                        models.ScheduledTrigger.current_node_id != None
                    ).order_by(models.ScheduledTrigger.updated_at.desc()).first()
                    if suspended_for_mem and suspended_for_mem.funnel and suspended_for_mem.funnel.steps:
                        graph_mem = suspended_for_mem.funnel.steps
                        nodes_mem = {str(n["id"]): n for n in graph_mem.get("nodes", [])}
                        cur_node_mem = nodes_mem.get(suspended_for_mem.current_node_id)
                        if cur_node_mem:
                            text_memory_active = bool(cur_node_mem.get("data", {}).get("sendToMemory", True))
                            logger.info(f"🧠 [MEMORY_CHECK] Funil suspenso (Trigger #{suspended_for_mem.id}) Nó {suspended_for_mem.current_node_id} sendToMemory={text_memory_active} para {from_phone}")
                    if not suspended_for_mem:
                        logger.info(f"🧠 [MEMORY_CHECK] Nenhum funil suspenso com memória ativa para {from_phone} — mensagem normal não será enviada à memória")
                except Exception as e_mem_check:
                    logger.error(f"❌ [MEMORY_CHECK] Erro ao verificar memória ativa para mensagem de texto: {e_mem_check}")
                    text_memory_active = False

            # --- SALVAR NO CHAT LOCAL ---
            try:
                chat_convo = db.query(models.ChatConversation).filter(
                    models.ChatConversation.client_id == target_cid,
                    models.ChatConversation.phone == from_phone
                ).first()
                
                if not chat_convo:
                    chat_convo = models.ChatConversation(
                        client_id=target_cid,
                        phone=from_phone,
                        contact_name=contacts_map.get(raw_from, "Contato"),
                        status="open",
                        unread_count=0
                    )
                    db.add(chat_convo)
                    db.flush()
                
                # Definir conteúdo de exibição baseado no tipo de mensagem
                content_text = user_input
                m_type = msg.get("type", "text")
                media_url = None
                
                # Se for anexo/mídia, extrai o id de mídia
                media_obj = msg.get(m_type)
                if isinstance(media_obj, dict) and "id" in media_obj:
                    media_url = f"media_id:{media_obj['id']}"
                
                if m_type != "text" and not content_text:
                    if m_type == "image":
                        content_text = "📷 Imagem recebida"
                    elif m_type == "audio":
                        content_text = "🎵 Áudio recebido"
                    elif m_type == "video":
                        content_text = "🎥 Vídeo recebido"
                    elif m_type == "document":
                        content_text = "📄 Documento recebido"
                    elif m_type == "sticker":
                        content_text = "✨ Sticker recebido"
                    elif m_type == "reaction":
                        emoji = msg.get("reaction", {}).get("emoji", "")
                        content_text = f"Reagiu com {emoji}" if emoji else "Reagiu com emoji"
                    else:
                        content_text = f"📎 Arquivo ({m_type}) recebido"

                # ── REAÇÕES: atualizar meta_data da mensagem original ──────────
                if m_type == "reaction":
                    emoji = msg.get("reaction", {}).get("emoji", "")
                    reacted_msg_id = msg.get("reaction", {}).get("message_id", "")
                    should_create_standalone_message = False
                    if reacted_msg_id and emoji:
                        clean_reacted_id = reacted_msg_id.replace("wamid.", "")
                        target_msg = db.query(models.ChatMessage).filter(
                            or_(
                                models.ChatMessage.wa_message_id == reacted_msg_id,
                                models.ChatMessage.wa_message_id == clean_reacted_id
                            )
                        ).first()
                        if target_msg:
                            existing_meta = dict(target_msg.meta_data or {})
                            reactions = existing_meta.get("reactions", [])
                            # Remove reação prévia do mesmo sender e substitui
                            reactions = [r for r in reactions if r.get("sender") != "contact"]
                            if emoji:  # emoji vazio = remover reação
                                reactions.append({"emoji": emoji, "sender": "contact"})
                            existing_meta["reactions"] = reactions
                            target_msg.meta_data = existing_meta
                            from sqlalchemy.orm.attributes import flag_modified
                            flag_modified(target_msg, "meta_data")
                            db.commit()
                            logger.info(f"❤️ [CHAT-REACTION] Reação '{emoji}' adicionada à mensagem {reacted_msg_id}")
                        else:
                            logger.info(f"⚠️ [CHAT-REACTION] Mensagem alvo {reacted_msg_id} não encontrada, criando reação avulsa")
                            should_create_standalone_message = True
                    if not should_create_standalone_message:
                        continue

                # Para cliques de botão: marcar skip_agentflow se activate_agent=False
                chat_meta = {}
                if btn_activate_agent is not None and not btn_activate_agent:
                    chat_meta["skip_agentflow"] = True

                chat_message = models.ChatMessage(
                    conversation_id=chat_convo.id,
                    sender_type="contact",
                    message_type=m_type,
                    content=content_text,
                    media_url=media_url,
                    wa_message_id=msg_id,
                    meta_data=chat_meta if chat_meta else None
                )
                db.add(chat_message)

                chat_convo.last_message_content = content_text
                chat_convo.last_message_at = datetime.now(timezone.utc)
                chat_convo.unread_count += 1
                chat_convo.status = "open"
                chat_convo.last_contact_message_at = datetime.now(timezone.utc)

                db.commit()
                logger.info(f"💾 [CHAT-LOCAL] Mensagem de {from_phone} salva localmente (Convo ID: {chat_convo.id})")
                
                # --- NOTIFICAR WEBHOOK DE MEMÓRIA (MENSAGEM DO USUÁRIO) ---
                # Só dispara se o CHAT_MESSAGES_WEBHOOK_URL não estiver configurado.
                # Se estiver, o chat_webhook_service.py já envia a mensagem para o AgentFlow,
                # evitando duplicatas quando ambos os webhooks apontam para o mesmo endpoint.
                try:
                    if user_input:
                        from services.ai_memory import notify_agent_memory_webhook
                        from config_loader import get_setting
                        chat_webhook_url = get_setting("CHAT_MESSAGES_WEBHOOK_URL", "", client_id=target_cid)
                        memory_webhook_url = get_setting("AGENT_MEMORY_WEBHOOK_URL", "", client_id=target_cid)
                        # Pula se os dois webhooks apontam para o mesmo destino (duplo disparo)
                        same_url = (
                            chat_webhook_url and memory_webhook_url and
                            chat_webhook_url.strip().rstrip("/") == memory_webhook_url.strip().rstrip("/")
                        )
                        # Clique de botão com activate_agent=False → não notificar memória
                        if is_btn_pre and btn_activate_agent is False:
                            logger.info(f"⏭️ [MEMORIA-INBOUND] Botão '{user_input}' com activate_agent=False — memória inbound não notificada ({from_phone})")
                        # Mensagem de texto solta (fora de funil com memória ativa) → não notificar memória
                        elif not is_btn_pre and not text_memory_active:
                            logger.info(f"⏭️ [MEMORIA-INBOUND] Mensagem '{user_input}' fora de funil com memória ativa — memória inbound não notificada ({from_phone})")
                        elif same_url:
                            logger.info(f"⏭️ [MEMORIA-INBOUND] CHAT_MESSAGES_WEBHOOK_URL == AGENT_MEMORY_WEBHOOK_URL — pulando memória inbound para evitar duplicata ({from_phone})")
                        else:
                            # Buscar o contact_id se o lead existir
                            lead_id = None
                            try:
                                suffix_lead = from_phone[-8:] if len(from_phone) >= 8 else from_phone
                                lead_obj = db.query(models.WebhookLead).filter(
                                    models.WebhookLead.client_id == target_cid,
                                    or_(
                                        models.WebhookLead.phone == from_phone,
                                        models.WebhookLead.phone.like(f"%{suffix_lead}")
                                    )
                                ).first()
                                if lead_obj:
                                    lead_id = lead_obj.id
                            except Exception:
                                pass

                            # Disparar notificação na fila para processamento assíncrono
                            is_btn = msg.get("type") in ["button", "interactive"]
                            logger.info(f"🧠 [MEMORIA-INBOUND] Agendando envio de memória do usuário: '{user_input}' (botão: {is_btn}) ({from_phone})")
                            asyncio.create_task(notify_agent_memory_webhook(
                                client_id=target_cid,
                                phone=from_phone,
                                name=contacts_map.get(raw_from, "Contato"),
                                template_name="Clique de Botão" if is_btn else "Mensagem do Usuário",
                                content=user_input,
                                internal_contact_id=lead_id,
                                dono="usuario",
                                is_button_click=is_btn
                            ))
                except Exception as e_mem_inbound:
                    logger.error(f"❌ Erro ao enviar memória de entrada (inbound): {e_mem_inbound}")
            except Exception as e_chat_save:
                logger.error(f"❌ Erro ao salvar mensagem no chat local: {e_chat_save}")

            # --- Rastreamento de Interação em Mensagens Enviadas ---
            context = msg.get("context", {})
            replied_msg_id = context.get("id")
            message_record = None

            if replied_msg_id:
                clean_replied_id = replied_msg_id.replace("wamid.", "")
                message_record = db.query(models.MessageStatus).filter(models.MessageStatus.message_id == clean_replied_id).first()
                logger.info(f"🔍 [MSG_LOOKUP] context.id={replied_msg_id} → clean={clean_replied_id} → record={'FOUND (trigger=' + str(message_record.trigger_id) + ')' if message_record else 'NOT FOUND'}")

            if not message_record:
                # FALLBACK: Buscar a última mensagem enviada para este número nas últimas 24h via sufixo de telefone
                phone_suffix_fb = from_phone[-8:] if len(from_phone) >= 8 else from_phone
                yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
                message_record = db.query(models.MessageStatus).filter(
                    models.MessageStatus.phone_number.like(f"%{phone_suffix_fb}"),
                    models.MessageStatus.timestamp >= yesterday
                ).order_by(models.MessageStatus.timestamp.desc()).first()
                if replied_msg_id:
                    logger.info(f"🔁 [MSG_LOOKUP_FALLBACK] context.id não encontrou registro → fallback por sufixo {phone_suffix_fb} → {'FOUND (trigger=' + str(message_record.trigger_id) + ')' if message_record else 'NOT FOUND'}")
                else:
                    logger.info(f"🔁 [MSG_LOOKUP_FALLBACK] sem context.id → fallback por sufixo {phone_suffix_fb} → {'FOUND (trigger=' + str(message_record.trigger_id) + ')' if message_record else 'NOT FOUND'}")

            if message_record:
                trigger_ref = db.query(models.ScheduledTrigger).get(message_record.trigger_id)
                if trigger_ref:
                    target_cid = trigger_ref.client_id
                    # Se identificamos pelo histórico, ele é o candidato principal
                    if target_cid not in candidate_cids:
                        candidate_cids.insert(0, target_cid)
                    logger.info(f"🎯 [TARGET_CID] Identificado Client {target_cid} via histórico/contexto para {from_phone}")

            # --- Lógica de Auto-Bloqueio por Termo/Botão ---
            is_auto_blocked = False
            if False:
                pass

            if not is_auto_blocked:
                # Apenas incrementa se for de fato um clique em botão ou resposta interativa
                is_button_click = msg.get("type") in ["button", "interactive"]

                if is_button_click:
                    logger.info(f"🖱️ [BUTTON_CLICK] tipo={msg.get('type')} | user_input={user_input!r} | message_record={'SIM (trigger=' + str(message_record.trigger_id) + ')' if message_record else 'NÃO'} | trigger_ref={'SIM (button_actions=' + str(bool(getattr(trigger_ref, 'button_actions', None))) + ')' if message_record and trigger_ref else 'NÃO'}")

                # --- BUTTON_ACTIONS: Funil/Bloqueio por botão configurado no disparo ---
                action_type = None
                if is_button_click and user_input and message_record and trigger_ref:
                    button_actions = getattr(trigger_ref, 'button_actions', None) or {}
                    # Fallback: se button_actions está nulo, buscar em trigger anterior com mesmo template
                    if not button_actions and trigger_ref.template_name:
                        fallback_trigger = db.query(models.ScheduledTrigger).filter(
                            models.ScheduledTrigger.client_id == trigger_ref.client_id,
                            models.ScheduledTrigger.template_name == trigger_ref.template_name,
                            models.ScheduledTrigger.button_actions.isnot(None)
                        ).order_by(models.ScheduledTrigger.id.desc()).first()
                        if fallback_trigger:
                            button_actions = fallback_trigger.button_actions or {}
                            logger.info(f"🔁 [BUTTON_ACTION_FALLBACK] button_actions nulo no Trigger {trigger_ref.id}, usando fallback do Trigger {fallback_trigger.id}")
                    btn_key = user_input.strip()
                    action = button_actions.get(btn_key)
                    if action and action.get("type") in ("interaction", "block"):
                        action_type = action.get("type")

                # Se o clique de botão for do tipo 'block', deve incrementar total_interactions e total_blocked
                if is_button_click and message_record and not getattr(message_record, 'interaction_counted', False):
                    message_record.interaction_counted = True
                    message_record.is_interaction = True
                    if action_type == "block":
                        message_record.failure_reason = 'BLOCKED_VIA_BUTTON'
                        
                        # Adiciona o contato na lista de exclusão/bloqueados imediatamente
                        suffix_b = from_phone[-8:]
                        already = db.query(models.BlockedContact).filter(
                            models.BlockedContact.client_id == target_cid,
                            or_(
                                models.BlockedContact.phone == from_phone,
                                models.BlockedContact.phone.like(f"%{suffix_b}")
                            )
                        ).first()
                        if not already:
                            db.add(models.BlockedContact(
                                client_id=target_cid,
                                phone=from_phone,
                                name=contacts_map.get(raw_from, "Contato"),
                                reason="Botão de Bloqueio (Disparo em Massa)"
                            ))
                        db.commit()
                        
                        # Recalcular estatísticas
                        from services.triggers_service import reconcile_trigger_stats_logic
                        await reconcile_trigger_stats_logic(message_record.trigger_id, target_cid, db)
                        if trigger_ref.parent_id:
                            await reconcile_trigger_stats_logic(trigger_ref.parent_id, target_cid, db)
                            
                        logger.info(f"🚫 [BUTTON_BLOCK_COUNT] Bloqueio imediato via botão detectado para Trigger {message_record.trigger_id} (Phone: {from_phone})")
                    else:
                        message_record.is_interaction = True
                        db.commit()
                        
                        # Recalcular estatísticas
                        from services.triggers_service import reconcile_trigger_stats_logic
                        await reconcile_trigger_stats_logic(message_record.trigger_id, target_cid, db)
                        if trigger_ref.parent_id:
                            await reconcile_trigger_stats_logic(trigger_ref.parent_id, target_cid, db)
                            
                        logger.info(f"👆 [INTERACTION_COUNT] Clique em botão detectado para Trigger {message_record.trigger_id} (Phone: {from_phone})")

                if is_button_click and user_input and message_record and trigger_ref:
                    button_actions = getattr(trigger_ref, 'button_actions', None) or {}
                    # Fallback: se button_actions está nulo, buscar em trigger anterior com mesmo template
                    if not button_actions and trigger_ref.template_name:
                        fallback_trigger = db.query(models.ScheduledTrigger).filter(
                            models.ScheduledTrigger.client_id == trigger_ref.client_id,
                            models.ScheduledTrigger.template_name == trigger_ref.template_name,
                            models.ScheduledTrigger.button_actions.isnot(None)
                        ).order_by(models.ScheduledTrigger.id.desc()).first()
                        if fallback_trigger:
                            button_actions = fallback_trigger.button_actions or {}
                            logger.info(f"🔁 [BUTTON_ACTION_FALLBACK] button_actions nulo no Trigger {trigger_ref.id}, usando fallback do Trigger {fallback_trigger.id}")
                    btn_key = user_input.strip()
                    action = button_actions.get(btn_key)
                    if action and action.get("type") in ("interaction", "block"):
                        action_type = action.get("type")
                        action_funnel_id = action.get("funnel_id")
                        logger.info(f"🎯 [BUTTON_ACTION] Botão '{btn_key}' → tipo={action_type} funil={action_funnel_id} para {from_phone}")

                        async def _execute_button_action(act_type, act_funnel_id, phone, cid, convo_id, contact_name_val, block_trigger_id, meta_payload):
                            await asyncio.sleep(2)
                            db_btn = wah.SessionLocal()
                            try:
                                if act_type == "block":
                                    suffix_b = phone[-8:]
                                    already = db_btn.query(models.BlockedContact).filter(
                                        models.BlockedContact.client_id == cid,
                                        or_(
                                            models.BlockedContact.phone == phone,
                                            models.BlockedContact.phone.like(f"%{suffix_b}")
                                        )
                                    ).first()
                                    if not already:
                                        db_btn.add(models.BlockedContact(
                                            client_id=cid,
                                            phone=phone,
                                            name=contact_name_val or "Contato",
                                            reason="Botão de Bloqueio (Disparo em Massa)"
                                        ))
                                        db_btn.commit()
                                        logger.info(f"🚫 [BUTTON_BLOCK] Contato {phone} bloqueado via botão de disparo.")
                                    
                                    # Atualizar o status da mensagem original para registrar o bloqueio no histórico
                                    msg_rec = db_btn.query(models.MessageStatus).filter(
                                        models.MessageStatus.trigger_id == block_trigger_id,
                                        models.MessageStatus.phone_number == phone
                                    ).first()
                                    if msg_rec:
                                        msg_rec.failure_reason = 'BLOCKED_VIA_BUTTON'
                                        db_btn.commit()

                                if act_funnel_id:
                                    # Resolver conversation_id via ChatConversation local (ZapVoice-native, sem Chatwoot)
                                    resolved_cid = convo_id
                                    if not resolved_cid:
                                        try:
                                            suffix_conv = phone[-8:] if len(phone) >= 8 else phone
                                            chat_convo_btn = db_btn.query(models.ChatConversation).filter(
                                                models.ChatConversation.client_id == cid,
                                                models.ChatConversation.phone.like(f"%{suffix_conv}")
                                            ).first()
                                            if chat_convo_btn:
                                                resolved_cid = chat_convo_btn.id
                                            logger.info(f"🔍 [BUTTON_ACTION] conversation_id local resolvido para {phone}: {resolved_cid}")
                                        except Exception as e_resolve:
                                            logger.warning(f"⚠️ [BUTTON_ACTION] Não foi possível resolver conversation_id local para {phone}: {e_resolve}")

                                    new_t = models.ScheduledTrigger(
                                        client_id=cid,
                                        funnel_id=act_funnel_id,
                                        conversation_id=resolved_cid,
                                        contact_phone=phone,
                                        contact_name=contact_name_val or phone,
                                        status='processing',
                                        scheduled_time=datetime.now(timezone.utc),
                                        is_bulk=False,
                                        is_interaction=(act_type == "interaction"),
                                        skip_block_check=(act_type == "block"),
                                        parent_id=block_trigger_id,
                                        processed_data=meta_payload
                                    )
                                    db_btn.add(new_t)
                                    db_btn.commit()
                                    db_btn.refresh(new_t)
                                    await wah.rabbitmq.publish("zapvoice_funnel_executions", {
                                        "trigger_id": new_t.id,
                                        "funnel_id": act_funnel_id,
                                        "conversation_id": resolved_cid,
                                        "contact_phone": phone
                                    })
                                    logger.info(f"🚀 [BUTTON_ACTION_FUNNEL] Funil {act_funnel_id} iniciado para {phone} (tipo={act_type}, convo={resolved_cid})")
                            except Exception as e_btn:
                                logger.error(f"❌ [BUTTON_ACTION] Erro ao executar ação do botão para {phone}: {e_btn}")
                            finally:
                                db_btn.close()

                        meta_payload = {
                            "object": "whatsapp_business_account",
                            "entry": [
                                {
                                    "id": metadata.get("phone_number_id", "1234567890"),
                                    "changes": [
                                        {
                                            "value": value,
                                            "field": "messages"
                                        }
                                    ]
                                }
                            ]
                        }

                        asyncio.create_task(_execute_button_action(
                            action_type,
                            action_funnel_id,
                            from_phone,
                            target_cid,
                            resolved_convo_id,
                            contacts_map.get(raw_from, "Contato"),
                            message_record.trigger_id,
                            meta_payload
                        ))
                        continue

            # --- [REATIVADO] GATILHO DE FUNIL VIA META ---
            if user_input:
                # --- Verificar se o contato possui um funil pausado em botões ---
                # Usa sufixo de 8 dígitos para tolerância de variações do 9° dígito brasileiro
                phone_suffix_sus = from_phone[-8:] if len(from_phone) >= 8 else from_phone
                suspended_trigger = db.query(models.ScheduledTrigger).filter(
                    models.ScheduledTrigger.client_id == target_cid,
                    or_(
                        models.ScheduledTrigger.contact_phone == from_phone,
                        models.ScheduledTrigger.contact_phone.like(f"%{phone_suffix_sus}")
                    ),
                    models.ScheduledTrigger.status == "suspended",
                    models.ScheduledTrigger.current_node_id != None
                ).order_by(models.ScheduledTrigger.updated_at.desc()).first()

                if not suspended_trigger:
                    logger.info(f"🔍 [WA-RESUME] Nenhum funil suspenso encontrado para {from_phone} (client {target_cid}, sufixo {phone_suffix_sus})")

                if suspended_trigger:
                    logger.info(f"⏸️ [WA-RESUME] Funil suspenso encontrado: Trigger #{suspended_trigger.id} | Funil #{suspended_trigger.funnel_id} | Nó atual: {suspended_trigger.current_node_id}")
                    funnel_obj = suspended_trigger.funnel
                    if funnel_obj and funnel_obj.steps:
                        graph_data = funnel_obj.steps
                        nodes = {str(n["id"]): n for n in graph_data.get("nodes", [])}
                        edges = graph_data.get("edges", [])

                        current_node = nodes.get(suspended_trigger.current_node_id)
                        if not current_node:
                            logger.warning(f"⚠️ [WA-RESUME] Nó {suspended_trigger.current_node_id} não encontrado no grafo. Nós disponíveis: {list(nodes.keys())}")
                        
                        node_type = current_node.get("type") if current_node else None
                        if current_node and node_type in ["message", "messageNode", "inputDataNode", "input_data"]:
                            target_node_id = None
                            
                            if node_type in ["inputDataNode", "input_data"]:
                                # Processar validação e extração de dados
                                node_data = current_node.get("data", {})
                                var_name = node_data.get("varName")
                                error_message = node_data.get("errorMessage")
                                if not error_message or not error_message.strip():
                                    error_message = "Entrada inválida. Digite novamente."
                                
                                import re
                                from services.input_data_parser import parse_and_extract_input_data, generate_ai_error_message
                                is_valid, extracted_val = await parse_and_extract_input_data(
                                    db=db,
                                    user_input=user_input,
                                    node_data=node_data,
                                    client_id=target_cid,
                                    trigger=suspended_trigger
                                )
                                        
                                if is_valid:
                                    # Salvar variável na trigger (se existir a coluna)
                                    if not hasattr(suspended_trigger, 'processed_data') or suspended_trigger.processed_data is None:
                                        suspended_trigger.processed_data = {}
                                    suspended_trigger.processed_data[var_name] = extracted_val
                                    from sqlalchemy.orm.attributes import flag_modified
                                    flag_modified(suspended_trigger, "processed_data")
                                    
                                    # Extrair e salvar a variável também no WebhookLead do contato correspondente
                                    phone_suffix = from_phone[-8:] if len(from_phone) >= 8 else from_phone
                                    lead = db.query(models.WebhookLead).filter(
                                        models.WebhookLead.client_id == target_cid,
                                        or_(
                                            models.WebhookLead.phone == from_phone,
                                            models.WebhookLead.phone.like(f"%{phone_suffix}")
                                        )
                                    ).first()
                                    
                                    if lead:
                                        if lead.variables is None:
                                            lead.variables = {}
                                        lead.variables[var_name] = extracted_val
                                        flag_modified(lead, "variables")
                                        logger.info(f"💾 [WA-RESUME-INPUT] Variável '{var_name}' salva com valor '{extracted_val}' no WebhookLead ID {lead.id}")
                                    else:
                                        logger.warning(f"⚠️ [WA-RESUME-INPUT] WebhookLead não encontrado para o telefone {from_phone} para salvar a variável '{var_name}'")
                                    
                                    # Seguir pela porta default/sucesso
                                    edge = next((e for e in edges if e.get("source") == suspended_trigger.current_node_id and (not e.get("sourceHandle") or e.get("sourceHandle") == "default" or e.get("sourceHandle") == "success")), None)
                                    if edge:
                                        target_node_id = edge.get("target")
                                        logger.info(f"✅ [WA-RESUME-INPUT] Entrada válida. Avançando para o Nó {target_node_id}")
                                else:
                                    if node_data.get("errorByAi"):
                                        logger.info(f"🧠 [WA-RESUME-INPUT] Erro por IA ativado. Solicitando geração de erro...")
                                        error_message = await generate_ai_error_message(user_input, node_data, target_cid)
                                    elif node_data.get("validationRule") == "cpf":
                                        nums = re.sub(r"\D", "", user_input)
                                        if len(nums) != 11:
                                            error_message = f"O CPF enviado está inválido pois possui {len(nums)} dígitos, mas um CPF deve ter exatamente 11 dígitos. Por favor, envie os 11 dígitos do seu CPF. 😊"

                                    logger.info(f"❌ [WA-RESUME-INPUT] Entrada inválida. Enviando mensagem de erro: {error_message}")
                                    # Enviar mensagem de erro
                                    if resolved_convo_id and int(resolved_convo_id) > 0:
                                        await cw.send_message(resolved_convo_id, error_message)
                                    else:
                                        await cw.send_text_official(from_phone, error_message)
                                    # Continuar no mesmo nó (manter suspenso)
                                    continue
                            else:
                                # Nó de Mensagem comum
                                buttons = [b.strip() for b in current_node.get("data", {}).get("buttons", []) if b.strip()]
                                logger.info(f"🔘 [WA-RESUME] Botões do nó: {buttons} | Input do usuário: '{user_input}'")
                                
                                source_handle = None
                                input_clean = user_input.strip().lower()
                                matched_btn_idx = -1
                                for idx, btn_text in enumerate(buttons):
                                    if btn_text.strip().lower() == input_clean:
                                        matched_btn_idx = idx
                                        break
                                        
                                if matched_btn_idx != -1:
                                    # Seguir a conexão do botão específico
                                    source_handle = f"button_{matched_btn_idx}"
                                    edge = next((e for e in edges if e.get("source") == suspended_trigger.current_node_id and e.get("sourceHandle") == source_handle), None)
                                    if edge:
                                        target_node_id = edge.get("target")
                                        logger.info(f"👆 [WA-RESUME] Clique em botão '{user_input}' (índice {matched_btn_idx}) mapeado para o Nó {target_node_id}")
                                else:
                                    # Tenta seguir o caminho padrão (sem sourceHandle ou default)
                                    edge = next((e for e in edges if e.get("source") == suspended_trigger.current_node_id and (not e.get("sourceHandle") or e.get("sourceHandle") == "default" or not str(e.get("sourceHandle", "")).startswith("button_"))), None)
                                    if edge:
                                        target_node_id = edge.get("target")
                                        logger.info(f"💬 [WA-RESUME] Resposta de texto/desconhecida '{user_input}' mapeada para o caminho padrão (Nó {target_node_id})")

                        if target_node_id:
                            # Verificar se o nó de destino tem horário comercial ativo e estamos fora do horário
                            is_outside_hours = False
                            target_node = nodes.get(target_node_id)
                            if target_node:
                                target_data = target_node.get("data", {})
                                if target_data.get("onlyBusinessHours") and not wah.is_within_business_hours(funnel_obj):
                                    is_outside_hours = True

                            if is_outside_hours:
                                next_run = wah.get_next_business_hour_start(funnel_obj)
                                suspended_trigger.current_node_id = target_node_id
                                suspended_trigger.status = "queued"
                                suspended_trigger.scheduled_time = next_run
                                db.commit()
                                logger.info(f"⏳ [WA-RESUME] Fora do horário comercial. Agendando Funil {funnel_obj.id} ({funnel_obj.name}) para {next_run} no nó {target_node_id}")
                            else:
                                suspended_trigger.current_node_id = target_node_id
                                suspended_trigger.status = "processing"
                                suspended_trigger.scheduled_time = datetime.now(timezone.utc)
                                db.commit()
                                
                                await wah.rabbitmq.publish("zapvoice_funnel_executions", {
                                    "trigger_id": suspended_trigger.id,
                                    "funnel_id": funnel_obj.id,
                                    "conversation_id": resolved_convo_id or suspended_trigger.conversation_id,
                                    "contact_phone": from_phone
                                })
                                logger.info(f"🔄 [WA-RESUME] Retomando Funil {funnel_obj.id} ({funnel_obj.name}) para {from_phone} no nó {target_node_id}")
                            continue

            # Lógica de gatilho por palavra-chave (trigger_phrase) desativada conforme solicitação
            logger.info(f"ℹ️ [WA-TRIGGER] Gatilho por palavra-chave desativado. Ignorando input '{user_input}' para novos funis.")
        except Exception as e_inner:
            logger.error(f"❌ Erro ao processar mensagem individual: {e_inner}")
            db.rollback()
        finally:
            db.commit()

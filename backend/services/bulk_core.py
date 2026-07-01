import asyncio
from datetime import datetime, timezone, timedelta
import zoneinfo
from core.logger import setup_logger
from services.utils.bulk_helpers import render_template_body, sanitize_template_components, extract_body_from_components

logger = setup_logger(__name__)
BRAZIL_TZ = zoneinfo.ZoneInfo("America/Sao_Paulo")


def _extract_header_media(components: list):
    """Extrai (media_type, media_url) do componente header de um template, ou None."""
    for comp in components or []:
        if str(comp.get("type", "")).lower() == "header":
            for param in comp.get("parameters", []):
                for media_type in ["video", "image", "document"]:
                    if param.get("type") == media_type:
                        media_data = param.get(media_type, {})
                        url = media_data.get("link") or media_data.get("url")
                        if url:
                            return (media_type, url)
    return None


async def _post_send(chatwoot, phone: str, contact_name: str, conversation_id, note_content: str, chatwoot_label, trigger_id: int = None, wamid: str = None):
    """Após envio bem-sucedido: garante conversa, envia nota privada e aplica etiquetas."""
    try:
        # 1. Verificar se é disparo em massa (bulk) antes de resolver ou criar conversa
        is_bulk = False
        if trigger_id:
            from database import SessionLocal
            import models
            db_trig = SessionLocal()
            try:
                trigger = db_trig.query(models.ScheduledTrigger).get(trigger_id)
                if trigger:
                    if trigger.is_bulk:
                        is_bulk = True
                    elif trigger.parent_id:
                        parent_trigger = db_trig.query(models.ScheduledTrigger).get(trigger.parent_id)
                        if parent_trigger and parent_trigger.is_bulk:
                            is_bulk = True
            except Exception as e_trig:
                logger.error(f"❌ [BULK] Erro ao verificar se trigger #{trigger_id} é bulk: {e_trig}")
            finally:
                db_trig.close()

        resolved_conv_id = conversation_id
        if not resolved_conv_id:
            # Se for bulk, NÃO criamos a conversa de forma proativa. 
            # Tentamos apenas localizar uma conversa existente.
            if is_bulk:
                logger.info(f"⏭️ [BULK] Pós-envio detectou disparo em massa para Trigger #{trigger_id}. Buscando apenas conversa existente para {phone}...")
                try:
                    existing_conv = await chatwoot.find_existing_conversation(phone)
                    if existing_conv:
                        resolved_conv_id = existing_conv.get("conversation_id")
                        logger.info(f"✅ [BULK] Encontrou conversa existente {resolved_conv_id} para {phone}.")
                except Exception as e_find:
                    logger.warning(f"⚠️ [BULK] Erro ao buscar conversa existente para {phone}: {e_find}")
            else:
                try:
                    inbox_id = None
                    cfg_inbox_id = chatwoot.settings.get("CHATWOOT_SELECTED_INBOX_ID")
                    if cfg_inbox_id and str(cfg_inbox_id).isdigit():
                        inbox_id = int(cfg_inbox_id)
                    conv = await chatwoot.ensure_conversation(phone, contact_name or "", inbox_id=inbox_id)
                    if conv:
                        resolved_conv_id = conv.get("conversation_id")
                except Exception as e_conv:
                    logger.warning(f"⚠️ [BULK] Não foi possível resolver conversa para {phone}: {e_conv}")

        # --- SINCRONIZAÇÃO COM O CHAT LOCAL ---
        try:
            from database import SessionLocal
            import models
            from rabbitmq_client import rabbitmq
            
            db_chat = SessionLocal()
            try:
                clean_phone = "".join(filter(str.isdigit, str(phone)))
                suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone
                
                # Buscar conversa local ZapVoice correspondente a este cliente com correspondência de 8 dígitos
                chat_convo = db_chat.query(models.ChatConversation).filter(
                    models.ChatConversation.client_id == chatwoot.client_id,
                    models.ChatConversation.phone.like(f"%{suffix}")
                ).first()
                
                if not chat_convo:
                    chat_convo = models.ChatConversation(
                        client_id=chatwoot.client_id,
                        phone=clean_phone,
                        contact_name=contact_name or clean_phone,
                        status="open",
                        unread_count=0
                    )
                    db_chat.add(chat_convo)
                    db_chat.flush()
                    logger.info(f"🆕 [CHAT-LOCAL] Criada nova conversa local para {clean_phone} (Client: {chatwoot.client_id})")
                
                # Tentar encontrar o template_name e metadados no trigger correspondente
                template_name = None
                meta_data = None
                trig_obj = None
                if trigger_id:
                    try:
                        trig_obj = db_chat.query(models.ScheduledTrigger).filter(
                            models.ScheduledTrigger.id == trigger_id
                        ).first()
                        if trig_obj:
                            template_name = trig_obj.template_name
                            
                            # Tentar extrair do cache
                            if template_name:
                                tpl_cache = db_chat.query(models.WhatsAppTemplateCache).filter(
                                    models.WhatsAppTemplateCache.client_id == chatwoot.client_id,
                                    models.WhatsAppTemplateCache.name == template_name
                                ).first()
                                if tpl_cache:
                                    meta_data = {
                                        "is_template": True,
                                        "template_name": template_name,
                                        "language": tpl_cache.language,
                                        "header": None,
                                        "buttons": []
                                    }
                                    if isinstance(tpl_cache.components, list):
                                        for comp in tpl_cache.components:
                                            comp_type = comp.get("type")
                                            if comp_type == "HEADER":
                                                meta_data["header"] = {
                                                    "format": comp.get("format"),
                                                    "text": comp.get("text")
                                                }
                                            elif comp_type == "BUTTONS":
                                                btns = comp.get("buttons")
                                                if isinstance(btns, list):
                                                    for btn in btns:
                                                        btn_text = btn.get("text")
                                                        if btn_text:
                                                            meta_data["buttons"].append(btn_text)
                    except Exception as e_meta:
                        logger.error(f"⚠️ [CHAT-LOCAL] Erro ao obter metadados no bulk: {e_meta}")

                # Registrar a mensagem do template na timeline do chat local
                tpl_media_url = None
                if trig_obj and trig_obj.template_components:
                    media_res = _extract_header_media(trig_obj.template_components)
                    if media_res:
                        tpl_media_url = media_res[1]

                chat_message = models.ChatMessage(
                    conversation_id=chat_convo.id,
                    sender_type="user", # user = enviado pelo agente / sistema
                    message_type="template",
                    content=note_content or f"[Template: {trigger_id}]",
                    meta_data=meta_data,
                    media_url=tpl_media_url,
                    wa_message_id=wamid
                )
                db_chat.add(chat_message)
                
                chat_convo.last_message_content = note_content
                chat_convo.unread_count = 0
                chat_convo.last_message_at = datetime.now(timezone.utc)
                db_chat.commit()
                logger.info(f"💾 [CHAT-LOCAL] Mensagem de template disparada salva localmente (Convo ID: {chat_convo.id})")
                
                # Emitir evento para o WebSocket atualizar o frontend em tempo real
                payload_ws = {
                    "id": chat_message.id,
                    "conversation_id": chat_message.conversation_id,
                    "sender_type": chat_message.sender_type,
                    "message_type": chat_message.message_type,
                    "content": chat_message.content,
                    "timestamp": chat_message.timestamp.isoformat() if chat_message.timestamp else datetime.now(timezone.utc).isoformat(),
                    "wa_message_id": chat_message.wa_message_id,
                    "client_id": chatwoot.client_id,
                    "meta_data": meta_data
                }
                asyncio.create_task(rabbitmq.publish_event("new_message", payload_ws))
            except Exception as e_inner:
                logger.error(f"❌ [CHAT-LOCAL] Erro ao sincronizar mensagem localmente: {e_inner}")
            finally:
                db_chat.close()
        except Exception as e_outer:
            logger.error(f"❌ [CHAT-LOCAL] Erro ao iniciar sessão de sincronização do chat: {e_outer}")

        if not resolved_conv_id:
            if is_bulk:
                logger.info(f"⏭️ [BULK] Conversa não existente para {phone} no disparo em massa #{trigger_id}. Pulando nota e etiquetas (conforme regra de negócio).")
            else:
                logger.warning(f"⚠️ [BULK] Conversa não encontrada para {phone}, pulando nota e etiquetas")
            return

        # Nota privada com o conteúdo da mensagem enviada
        if note_content:
            if is_bulk:
                logger.info(f"⏭️ [BULK] Disparo em massa detectado para Trigger #{trigger_id}. Ignorando envio de nota privada.")
                if trigger_id:
                    from database import SessionLocal
                    import models
                    db = SessionLocal()
                    try:
                        clean_phone = "".join(filter(str.isdigit, str(phone)))
                        msg_rec = db.query(models.MessageStatus).filter(
                            models.MessageStatus.trigger_id == trigger_id,
                            models.MessageStatus.phone_number.like(f"%{clean_phone[-10:]}")
                        ).first()
                        if msg_rec:
                            msg_rec.private_note_posted = False
                            msg_rec.chatwoot_conversation_id = resolved_conv_id
                            db.commit()
                    except Exception as e_db:
                        logger.error(f"❌ [BULK-POST-SEND] Erro ao atualizar status no banco: {e_db}")
                    finally:
                        db.close()
            else:
                logger.info(f"📝 [BULK] Enfileirando nota privada na conversa {resolved_conv_id} via RabbitMQ")
                from rabbitmq_client import rabbitmq
                await rabbitmq.publish("chatwoot_private_messages", {
                    "client_id": chatwoot.client_id,
                    "phone": phone,
                    "message": note_content,
                    "trigger_id": trigger_id,
                    "conversation_id": resolved_conv_id,
                    "delay": 5
                })
                
                if trigger_id:
                    from database import SessionLocal
                    import models
                    db = SessionLocal()
                    try:
                        clean_phone = "".join(filter(str.isdigit, str(phone)))
                        msg_rec = db.query(models.MessageStatus).filter(
                            models.MessageStatus.trigger_id == trigger_id,
                            models.MessageStatus.phone_number.like(f"%{clean_phone[-10:]}")
                        ).first()
                        if msg_rec:
                            msg_rec.private_note_posted = True
                            msg_rec.chatwoot_conversation_id = resolved_conv_id
                            db.commit()
                            logger.info(f"✅ [BULK-POST-SEND] Marcou private_note_posted como True para {phone} no Trigger {trigger_id}")
                        else:
                            logger.warning(f"⚠️ [BULK-POST-SEND] Registro MessageStatus não encontrado para {phone} no Trigger {trigger_id}")
                    except Exception as e_db:
                        logger.error(f"❌ [BULK-POST-SEND] Erro ao atualizar private_note_posted no banco: {e_db}")
                    finally:
                        db.close()

        # Etiquetas (se configuradas)
        if chatwoot_label:
            from core.utils import robust_extract_labels
            clean_labels = robust_extract_labels(chatwoot_label)
            if clean_labels:
                logger.info(f"🏷️ [BULK] Aplicando etiquetas {clean_labels} na conversa {resolved_conv_id}")
                await chatwoot.add_label_to_conversation(resolved_conv_id, clean_labels)

    except Exception as e:
        logger.error(f"❌ [BULK] Erro no pós-envio para {phone}: {e}")



async def send_smart_message(
    chatwoot,
    phone: str,
    trigger_id: int,
    template_name: str,
    language: str,
    components: list = None,
    direct_message: str = None,
    direct_message_params: dict = None,
    last_interaction: datetime = None,
    template_body_cache: str = None,
    template_btn_info: dict = None,
    contact_name: str = None,
    chatwoot_label: list = None,
    conversation_id: int = None
):
    try:
        effective_components = components

        # 1. Verificação Local da Janela 24h
        can_use_smart_send = True
        if template_btn_info and template_btn_info.get("has_special_buttons"):
            can_use_smart_send = False
            logger.info(f"⏭️ [Smart Send] Ignorado para {phone}: Template contém botões de URL/Link.")

        if can_use_smart_send and last_interaction and (direct_message or template_body_cache):
            if last_interaction.tzinfo is None:
                last_interaction = last_interaction.replace(tzinfo=timezone.utc)

            now = datetime.now(timezone.utc)
            diff = now - last_interaction
            safety_limit = timedelta(hours=23, minutes=59)

            if diff < safety_limit:
                logger.info(f"🟢 [Smart Send] Janela ABERTA para {phone} (Última: {diff.total_seconds()/3600:.2f}h atrás).")

                free_text = render_template_body(direct_message, effective_components or [], contact_name=contact_name) if direct_message else None

                if not free_text and template_body_cache:
                    try:
                        free_text = render_template_body(template_body_cache, effective_components or [], contact_name=contact_name)
                        logger.info(f"📝 [Smart Send] Renderização Automática para {phone}: {free_text[:80]}...")
                    except Exception as render_err:
                        logger.warning(f"⚠️ [Smart Send] Falha na renderização automática: {render_err}. Tentando template oficial.")
                        free_text = None

                if free_text:
                    # Envia mídia do header do template como mensagem de sessão separada (gratuita)
                    header_media = _extract_header_media(effective_components)
                    if header_media:
                        media_type, media_url = header_media
                        logger.info(f"📤 [Smart Send] Janela aberta — enviando mídia do template ({media_type}) como sessão para {phone}...")
                        try:
                            if media_type == "video":
                                await chatwoot.send_video_official(phone, media_url)
                            elif media_type == "image":
                                await chatwoot.send_image_official(phone, media_url)
                            elif media_type == "document":
                                await chatwoot.send_document_official(phone, media_url)
                            logger.info(f"✅ [Smart Send] Mídia ({media_type}) enviada. Aguardando 7s antes do texto para {phone}...")
                            await asyncio.sleep(7)
                        except Exception as e_media:
                            logger.warning(f"⚠️ [Smart Send] Falha ao enviar mídia do header: {e_media}. Continuando com texto...")

                    btn_texts = []
                    if direct_message and direct_message_params:
                        buttons = direct_message_params if isinstance(direct_message_params, list) else direct_message_params.get("buttons", [])
                        for b in buttons:
                            btn_texts.append(b if isinstance(b, str) else b.get("text", "Botão"))

                    if not btn_texts and template_btn_info and template_btn_info.get("quick_replies"):
                        btn_texts = template_btn_info["quick_replies"][:3]

                    logger.info(f"📤 [Smart Send] Tentando Mensagem Livre (Sessão) para {phone}...")
                    res = await chatwoot.send_interactive_buttons(phone, free_text, btn_texts) if btn_texts else await chatwoot.send_text_direct(phone, free_text)

                    is_success = False
                    if isinstance(res, dict):
                        if res.get("messages") or res.get("id") or res.get("success") is True or (not res.get("error") and res.get("messaging_product") == "whatsapp"):
                            is_success = True

                    if is_success:
                        now_br = datetime.now(BRAZIL_TZ).strftime("%d/%m/%Y %H:%M:%S")
                        logger.info(f"🚀 [DISPARO] [Trigger {trigger_id}] [{now_br}] [{phone}] Tipo: LIVRE (Sessão) | Sucesso")
                        free_wamid = None
                        if isinstance(res, dict):
                            msgs = res.get("messages") or []
                            if msgs: free_wamid = msgs[0].get("id")
                            if not free_wamid: free_wamid = res.get("id")
                        asyncio.create_task(_post_send(chatwoot, phone, contact_name, conversation_id, free_text, chatwoot_label, trigger_id, wamid=free_wamid))
                        return {"result": res, "type": "FREE_MESSAGE", "success": True}

                    err_msg = str(res.get("detail", "")).lower() if isinstance(res, dict) else str(res).lower()
                    if any(msg in err_msg for msg in ["within 24 hours", "window", "expired", "session"]):
                        logger.info(f"🔄 [Smart Send] Erro de janela detectado. Fazendo fallback para Template Oficial.")
                    else:
                        return {"error": True, "detail": f"Falha na Mensagem Livre: {err_msg}", "success": False}

        # 2. Envio Via Template Oficial
        if template_name:
            now_br = datetime.now(BRAZIL_TZ).strftime("%d/%m/%Y %H:%M:%S")
            logger.info(f"🚀 [DISPARO] [Trigger {trigger_id}] [{now_br}] [{phone}] Tipo: TEMPLATE ({template_name})")

            clean_components = sanitize_template_components(effective_components or [], contact_name=contact_name, contact_phone=phone)
            res = await chatwoot.send_template(phone, template_name, language, components=clean_components)
            if res and not res.get("error"):
                # Prioridade 1: Renderizar o body do cache com as variáveis do contato
                if template_body_cache:
                    note_content = render_template_body(template_body_cache, effective_components or [], contact_name=contact_name)
                else:
                    # Prioridade 2: Extrair diretamente dos components preenchidos (já têm valores reais)
                    note_content = extract_body_from_components(clean_components)
                    if note_content:
                        logger.info(f"📝 [Smart Send] Conteúdo extraído dos components para nota: {note_content[:80]}")
                    else:
                        # Fallback final: apenas se não houver body nem components utilizáveis
                        note_content = f"[Template: {template_name}]"
                        logger.warning(f"⚠️ [Smart Send] Não foi possível extrair conteúdo do template '{template_name}'. Usando nome como fallback.")
                tpl_wamid = None
                if isinstance(res, dict):
                    msgs = res.get("messages") or []
                    if msgs: tpl_wamid = msgs[0].get("id")
                asyncio.create_task(_post_send(chatwoot, phone, contact_name, conversation_id, note_content, chatwoot_label, trigger_id, wamid=tpl_wamid))
                return {"result": res, "type": "TEMPLATE"}


            return res

        return {"error": True, "detail": "Nenhum conteúdo configurado"}
    except Exception as e:
        logger.error(f"❌ [Smart Send CRITICAL] Exceção inesperada: {e}")
        return {"error": True, "detail": str(e), "success": False}

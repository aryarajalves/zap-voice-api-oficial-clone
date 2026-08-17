import asyncio
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from sqlalchemy import or_
import models
from core.logger import setup_logger
import core.worker.handlers.whatsapp as wah

logger = setup_logger("Worker.WhatsAppInbound.ButtonActions")


def lookup_message_and_trigger(
    db,
    from_phone: str,
    replied_msg_id: Optional[str],
    msg_type: str,
    target_cid: int,
    candidate_cids: list
) -> Tuple[Optional[models.MessageStatus], Optional[models.ScheduledTrigger], int]:
    """
    Localiza o MessageStatus e ScheduledTrigger de origem, utilizando fallbacks contextuais
    e suportando templates enviados via painel de atendimento (ChatMessage).
    Retorna (message_record, trigger_ref, target_cid).
    """
    message_record = None
    if replied_msg_id:
        clean_replied_id = replied_msg_id.replace("wamid.", "")
        message_record = db.query(models.MessageStatus).filter(
            models.MessageStatus.message_id == clean_replied_id
        ).first()

    if not message_record:
        # Fallback por sufixo de telefone nas últimas 24h
        phone_suffix_fb = from_phone[-8:] if len(from_phone) >= 8 else from_phone
        yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
        message_record = db.query(models.MessageStatus).filter(
            models.MessageStatus.phone_number.like(f"%{phone_suffix_fb}"),
            models.MessageStatus.timestamp >= yesterday
        ).order_by(models.MessageStatus.timestamp.desc()).first()

    trigger_ref = None
    if message_record:
        trigger_ref = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.id == message_record.trigger_id
        ).first()
        if trigger_ref:
            ref_client = db.query(models.Client).filter(models.Client.id == trigger_ref.client_id).first()
            if ref_client and ref_client.is_active:
                target_cid = trigger_ref.client_id
                if target_cid not in candidate_cids:
                    candidate_cids.insert(0, target_cid)
                logger.info(f"🎯 [TARGET_CID] Identificado Client {target_cid} via histórico/contexto para {from_phone}")

    # Fallback ChatMessage: templates enviados diretamente do chat
    if not message_record and msg_type in ("button", "interactive"):
        try:
            chat_trigger_ref = None
            if replied_msg_id:
                clean_id = replied_msg_id.replace("wamid.", "")
                chat_msg = db.query(models.ChatMessage).filter(
                    or_(
                        models.ChatMessage.wa_message_id == replied_msg_id,
                        models.ChatMessage.wa_message_id == clean_id
                    )
                ).first()
                if chat_msg and chat_msg.conversation_id:
                    chat_trigger_ref = db.query(models.ScheduledTrigger).filter(
                        models.ScheduledTrigger.conversation_id == chat_msg.conversation_id,
                        models.ScheduledTrigger.button_actions.isnot(None),
                        models.ScheduledTrigger.status == 'sent'
                    ).order_by(models.ScheduledTrigger.id.desc()).first()

            if not chat_trigger_ref:
                phone_suffix_chat = from_phone[-8:] if len(from_phone) >= 8 else from_phone
                yesterday_chat = datetime.now(timezone.utc) - timedelta(hours=24)
                chat_trigger_ref = db.query(models.ScheduledTrigger).filter(
                    models.ScheduledTrigger.contact_phone.like(f"%{phone_suffix_chat}"),
                    models.ScheduledTrigger.button_actions.isnot(None),
                    models.ScheduledTrigger.status == 'sent',
                    models.ScheduledTrigger.scheduled_time >= yesterday_chat
                ).order_by(models.ScheduledTrigger.id.desc()).first()

            if chat_trigger_ref:
                trigger_ref = chat_trigger_ref
                logger.info(f"🎯 [CHAT_BUTTON_TRIGGER] Usando ScheduledTrigger do chat (id={trigger_ref.id}) para button_actions de {from_phone}")
        except Exception as e_chat_fallback:
            logger.error(f"❌ [CHAT_BUTTON_TRIGGER] Erro ao buscar trigger de chat para botão: {e_chat_fallback}")

    return message_record, trigger_ref, target_cid


async def handle_button_actions(
    db,
    target_cid: int,
    from_phone: str,
    raw_from: str,
    user_input: Optional[str],
    msg: dict,
    trigger_ref: Optional[models.ScheduledTrigger],
    message_record: Optional[models.MessageStatus],
    resolved_convo_id: Optional[int],
    contacts_map: dict,
    metadata: dict,
    value: dict
) -> bool:
    """
    Avalia e despacha ações associadas ao clique de botões (bloqueio, contagem de interação e funil).
    Retorna True se uma ação de botão foi tratada.
    """
    is_button_click = msg.get("type") in ["button", "interactive"]
    if not is_button_click or not user_input:
        return False

    btn_key = user_input.strip()
    action = None
    action_type = None

    if trigger_ref:
        button_actions = getattr(trigger_ref, 'button_actions', None) or {}
        if not button_actions and trigger_ref.template_name:
            fallback_trigger = db.query(models.ScheduledTrigger).filter(
                models.ScheduledTrigger.client_id == trigger_ref.client_id,
                models.ScheduledTrigger.template_name == trigger_ref.template_name,
                models.ScheduledTrigger.button_actions.isnot(None)
            ).order_by(models.ScheduledTrigger.id.desc()).first()
            if fallback_trigger:
                button_actions = fallback_trigger.button_actions or {}
                logger.info(f"🔁 [BUTTON_ACTION_FALLBACK] button_actions nulo no Trigger {trigger_ref.id}, usando fallback do Trigger {fallback_trigger.id}")
        action = button_actions.get(btn_key)

    # Fallback para Lembretes de Agendamento
    if not action and target_cid:
        try:
            from config_loader import get_settings
            cl_settings = get_settings(client_id=target_cid)
            is_enabled = cl_settings.get("APPOINTMENTS_ENABLED") in (True, "true", "True")
            if is_enabled:
                buttons_str = cl_settings.get("APPOINTMENTS_REMINDER_BUTTONS", "{}")
                reminder_buttons = json.loads(buttons_str) if buttons_str else {}
                action = reminder_buttons.get(btn_key)
                if action:
                    logger.info(f"⏰ [BUTTON_ACTION_APPOINTMENT] Botão '{btn_key}' mapeado nas configs de Agendamento do Client {target_cid}")
        except Exception as e_apt_btn:
            logger.error(f"❌ [BUTTON_ACTION_APPOINTMENT] Erro ao buscar botão de agendamento: {e_apt_btn}")

    if action and action.get("type") in ("interaction", "block"):
        action_type = action.get("type")

    # Bloqueio direto via botão
    if action_type == "block":
        try:
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
                    reason="Botão de Bloqueio (Template - Atendimento)"
                ))
                db.commit()
                logger.info(f"🚫 [BLOCK_VIA_BUTTON] Contato {from_phone} bloqueado via botão. Client {target_cid}")

                if resolved_convo_id:
                    try:
                        from services.block_note import send_block_note_async
                        await send_block_note_async(
                            client_id=target_cid,
                            conversation_id=resolved_convo_id,
                            phone=from_phone,
                            reason="Botão de Bloqueio (Template - Atendimento)"
                        )
                    except Exception as e_note:
                        logger.warning(f"⚠️ [BLOCK_NOTE] Falha ao enviar nota privada: {e_note}")
        except Exception as e_block_direct:
            logger.error(f"❌ [BLOCK_VIA_BUTTON] Erro ao bloquear {from_phone}: {e_block_direct}")

    # Atualizar estatísticas no message_record
    if message_record and not getattr(message_record, 'interaction_counted', False):
        message_record.interaction_counted = True
        message_record.is_interaction = True
        if action_type == "block":
            message_record.failure_reason = 'BLOCKED_VIA_BUTTON'
        db.commit()
        try:
            from services.triggers_service import reconcile_trigger_stats_logic
            await reconcile_trigger_stats_logic(message_record.trigger_id, target_cid, db)
            if trigger_ref and trigger_ref.parent_id:
                await reconcile_trigger_stats_logic(trigger_ref.parent_id, target_cid, db)
        except Exception as e_stats:
            logger.error(f"❌ Erro ao reconciliar stats: {e_stats}")

    # Execução assíncrona da ação do botão
    if action and action.get("type") in ("interaction", "block"):
        action_funnel_id = action.get("funnel_id")
        block_trig_id = message_record.trigger_id if message_record else (trigger_ref.id if trigger_ref else None)

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

        async def _execute_button_action():
            await asyncio.sleep(2)
            db_btn = wah.SessionLocal()
            try:
                if action_type == "block":
                    suffix_b = from_phone[-8:]
                    already = db_btn.query(models.BlockedContact).filter(
                        models.BlockedContact.client_id == target_cid,
                        or_(
                            models.BlockedContact.phone == from_phone,
                            models.BlockedContact.phone.like(f"%{suffix_b}")
                        )
                    ).first()
                    if not already:
                        db_btn.add(models.BlockedContact(
                            client_id=target_cid,
                            phone=from_phone,
                            name=contacts_map.get(raw_from, "Contato"),
                            reason="Botão de Bloqueio (Disparo em Massa)"
                        ))
                        db_btn.commit()
                        logger.info(f"🚫 [BUTTON_BLOCK] Contato {from_phone} bloqueado via botão de disparo.")

                        if resolved_convo_id:
                            try:
                                from services.block_note import send_block_note_async
                                await send_block_note_async(
                                    client_id=target_cid,
                                    conversation_id=resolved_convo_id,
                                    phone=from_phone,
                                    reason="Botão de Bloqueio (Disparo em Massa)"
                                )
                            except Exception as e_note:
                                logger.warning(f"⚠️ [BLOCK_NOTE] Falha ao enviar nota de bloqueio: {e_note}")

                    if block_trig_id:
                        msg_rec = db_btn.query(models.MessageStatus).filter(
                            models.MessageStatus.trigger_id == block_trig_id,
                            models.MessageStatus.phone_number == from_phone
                        ).first()
                        if msg_rec:
                            msg_rec.failure_reason = 'BLOCKED_VIA_BUTTON'
                            db_btn.commit()

                if action_funnel_id:
                    recent_cutoff = datetime.now(timezone.utc) - timedelta(seconds=10)
                    suffix_dup = from_phone[-8:] if len(from_phone) >= 8 else from_phone
                    recent_duplicate = db_btn.query(models.ScheduledTrigger).filter(
                        models.ScheduledTrigger.client_id == target_cid,
                        models.ScheduledTrigger.funnel_id == action_funnel_id,
                        or_(
                            models.ScheduledTrigger.contact_phone == from_phone,
                            models.ScheduledTrigger.contact_phone.like(f"%{suffix_dup}")
                        ),
                        models.ScheduledTrigger.scheduled_time >= recent_cutoff
                    ).first()

                    if recent_duplicate:
                        logger.warning(f"🚫 [BUTTON_ACTION_DEDUP] Ignorando disparo duplicado do Funil {action_funnel_id} para {from_phone}")
                        return

                    resolved_cid = resolved_convo_id
                    if not resolved_cid:
                        try:
                            suffix_conv = from_phone[-8:] if len(from_phone) >= 8 else from_phone
                            chat_convo_btn = db_btn.query(models.ChatConversation).filter(
                                models.ChatConversation.client_id == target_cid,
                                models.ChatConversation.phone.like(f"%{suffix_conv}")
                            ).first()
                            if chat_convo_btn:
                                resolved_cid = chat_convo_btn.id
                        except Exception as e_resolve:
                            logger.warning(f"⚠️ [BUTTON_ACTION] Não foi possível resolver conversation_id: {e_resolve}")

                    parent_trigger_for_check = db_btn.query(models.ScheduledTrigger).filter(
                        models.ScheduledTrigger.id == block_trig_id
                    ).first() if block_trig_id else None
                    parent_skip = getattr(parent_trigger_for_check, 'skip_block_check', False) if parent_trigger_for_check else False
                    inherited_skip = (action_type == "block") or parent_skip

                    new_t = models.ScheduledTrigger(
                        client_id=target_cid,
                        funnel_id=action_funnel_id,
                        conversation_id=resolved_cid,
                        contact_phone=from_phone,
                        contact_name=contacts_map.get(raw_from, "Contato") or from_phone,
                        status='processing',
                        scheduled_time=datetime.now(timezone.utc),
                        is_bulk=False,
                        is_interaction=(action_type == "interaction"),
                        skip_block_check=inherited_skip,
                        parent_id=block_trig_id,
                        processed_data=meta_payload
                    )
                    db_btn.add(new_t)
                    db_btn.commit()
                    db_btn.refresh(new_t)
                    await wah.rabbitmq.publish("zapvoice_funnel_executions", {
                        "trigger_id": new_t.id,
                        "funnel_id": action_funnel_id,
                        "conversation_id": resolved_cid,
                        "contact_phone": from_phone
                    })
                    logger.info(f"🚀 [BUTTON_ACTION_FUNNEL] Funil {action_funnel_id} iniciado para {from_phone}")
            except Exception as e_btn:
                logger.error(f"❌ [BUTTON_ACTION] Erro ao executar ação do botão para {from_phone}: {e_btn}")
            finally:
                db_btn.close()

        asyncio.create_task(_execute_button_action())
        return True

    return False

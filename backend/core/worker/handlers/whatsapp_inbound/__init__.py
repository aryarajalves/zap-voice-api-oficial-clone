import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy import text
import models
from core.logger import setup_logger
import core.worker.handlers.whatsapp as wah

from .client_resolver import (
    resolve_target_client,
    check_is_bulk_contact,
    sync_contact_window,
    sync_lead_bsud,
)
from .chat_recorder import (
    save_inbound_chat_message,
    dispatch_ai_memory,
)
from .button_actions import (
    lookup_message_and_trigger,
    handle_button_actions,
)
from .trigger_evaluator import (
    evaluate_suspended_funnel_resume,
    evaluate_auto_reply,
    evaluate_keyword_triggers,
)

logger = setup_logger("Worker.WhatsAppInbound")

__all__ = [
    "handle_whatsapp_inbound_messages",
    "wah",
    "logger",
]


def _get_logger():
    import core.worker.handlers.whatsapp_inbound as inb
    return getattr(inb, "logger", logger)


async def handle_whatsapp_inbound_messages(db, messages: list, value: dict, metadata: dict):
    """
    Processa mensagens de entrada brutas da Meta (Inbound / Interações).
    """
    log = _get_logger()
    contacts_map = {c.get("wa_id"): c.get("profile", {}).get("name") for c in value.get("contacts", [])}
    bsud_map = {c.get("wa_id"): c.get("user_id") for c in value.get("contacts", []) if c.get("user_id")}

    for msg in messages:
        raw_from = msg.get("from")
        from_phone = wah.normalize_phone_inbound(raw_from)
        msg_id = msg.get("id")

        db_lock_key = f"inbound_{from_phone}"
        has_pg_lock = False
        if hasattr(db, 'bind') and db.bind is not None:
            dialect = getattr(db.bind, 'dialect', None)
            if dialect is not None and getattr(dialect, 'name', None) == 'postgresql':
                has_pg_lock = True
        if has_pg_lock:
            while True:
                locked = db.execute(text("SELECT pg_try_advisory_xact_lock(hashtext(:key))"), {"key": db_lock_key}).scalar()
                if locked:
                    break
                await asyncio.sleep(0.05)

        try:
            db.expire_all()

            # 1. Cancelar follow-ups pendentes devido a interação detectada no WhatsApp
            from services.triggers_service import cancel_pending_followups_for_phone
            cancel_pending_followups_for_phone(db, from_phone)

            # 2. Lock de memória anti-duplicação de webhook
            mem_lock_key = f"mem_lock_{from_phone}_{msg_id}"
            now = datetime.now(timezone.utc)
            if mem_lock_key in wah.GLOBAL_PROCESSING_LOCKS:
                if now - wah.GLOBAL_PROCESSING_LOCKS[mem_lock_key] < timedelta(seconds=10):
                    log.warning(f"🚫 [MEM_LOCK] Ignorando mensagem repetida {msg_id}")
                    continue
            wah.GLOBAL_PROCESSING_LOCKS[mem_lock_key] = now

            # 3. Resolução de cliente alvo e multi-tenant
            target_client, target_cid, candidate_cids = resolve_target_client(db, metadata, from_phone)
            if not target_client or not target_client.is_active:
                log.warning(f"🚫 [INBOUND] Mensagem ignorada. O cliente ID {target_cid} está inativo ou não existe.")
                continue

            # 4. Sincronização de Janela 24h e ContactWindow
            cw = wah.ChatwootClient(client_id=target_cid)
            is_bulk_contact = check_is_bulk_contact(db, from_phone)
            resolved_convo_id = await sync_contact_window(
                db, target_cid, from_phone, raw_from, contacts_map, is_bulk_contact, cw
            )

            # 5. Sincronização de BSUD
            sync_lead_bsud(db, target_cid, from_phone, raw_from, msg, bsud_map, contacts_map)

            # 6. Extração de input e pré-lookup de activate_agent para botões
            user_input = None
            msg_type = msg.get("type")
            context = msg.get("context", {})
            replied_msg_id = context.get("id")
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

            btn_activate_agent = None
            is_btn_pre = msg_type in ("button", "interactive")
            if is_btn_pre and user_input:
                try:
                    pre_msg_rec, pre_trig, _ = lookup_message_and_trigger(
                        db, from_phone, replied_msg_id, msg_type, target_cid, candidate_cids
                    )
                    if pre_trig:
                        pre_btn_actions = getattr(pre_trig, 'button_actions', None) or {}
                        if not pre_btn_actions and pre_trig.template_name:
                            fb_pre = db.query(models.ScheduledTrigger).filter(
                                models.ScheduledTrigger.client_id == pre_trig.client_id,
                                models.ScheduledTrigger.template_name == pre_trig.template_name,
                                models.ScheduledTrigger.button_actions.isnot(None)
                            ).order_by(models.ScheduledTrigger.id.desc()).first()
                            if fb_pre:
                                pre_btn_actions = fb_pre.button_actions or {}
                        pre_action = pre_btn_actions.get(user_input.strip(), {})
                        btn_activate_agent = bool(pre_action.get("activate_agent", False))
                        log.info(f"🤖 [ACTIVATE_AGENT] Botão '{user_input}' → activate_agent={btn_activate_agent} (trigger={pre_trig.id})")
                    else:
                        btn_activate_agent = False
                        log.info(f"⚠️ [ACTIVATE_AGENT] Nenhum trigger encontrado para botão '{user_input}' de {from_phone} → activate_agent=False")
                except Exception as e_pre:
                    log.error(f"❌ [ACTIVATE_AGENT] Erro no pré-lookup: {e_pre}")
                    btn_activate_agent = False

            # 7. Salvar mensagem no chat local do ZapVoice
            chat_convo = save_inbound_chat_message(
                db, target_cid, from_phone, raw_from, msg, user_input, btn_activate_agent, contacts_map
            )
            if msg_type == "reaction":
                continue

            # 8. Notificar memória de IA
            dispatch_ai_memory(
                db, target_cid, from_phone, raw_from, user_input, msg, is_btn_pre, btn_activate_agent, contacts_map
            )

            # 9. Lookup contextual de disparos e triggers de origem
            message_record, trigger_ref, target_cid = lookup_message_and_trigger(
                db, from_phone, replied_msg_id, msg_type, target_cid, candidate_cids
            )

            # 10. Processar ações de clique em botão (bloqueio e funil)
            btn_handled = await handle_button_actions(
                db, target_cid, from_phone, raw_from, user_input, msg,
                trigger_ref, message_record, resolved_convo_id, contacts_map, metadata, value
            )
            if btn_handled:
                continue

            # 11. Verificar se há funil suspenso aguardando resposta
            if user_input:
                resumed = await evaluate_suspended_funnel_resume(
                    db, target_cid, from_phone, user_input, resolved_convo_id, cw
                )
                if resumed:
                    continue

            # 12. Resposta automática (Auto-Reply)
            evaluate_auto_reply(target_cid, from_phone, raw_from, msg_type, contacts_map)

            # 13. Gatilhos por palavra-chave (Trigger Phrase)
            if user_input:
                await evaluate_keyword_triggers(
                    db, target_cid, from_phone, raw_from, user_input, resolved_convo_id, contacts_map
                )

        except Exception as e_inner:
            log.error(f"❌ Erro ao processar mensagem individual: {e_inner}")
            db.rollback()
        finally:
            db.commit()

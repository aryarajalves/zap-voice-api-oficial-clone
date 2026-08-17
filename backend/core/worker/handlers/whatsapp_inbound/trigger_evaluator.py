import asyncio
import re
import zoneinfo
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy import or_
from sqlalchemy.orm.attributes import flag_modified
import models
from core.logger import setup_logger
from core.engine.utils import normalize_text
import core.worker.handlers.whatsapp as wah

logger = setup_logger("Worker.WhatsAppInbound.TriggerEvaluator")


async def evaluate_suspended_funnel_resume(
    db,
    target_cid: int,
    from_phone: str,
    user_input: str,
    resolved_convo_id: Optional[int],
    cw
) -> bool:
    """
    Verifica se o contato possui um funil suspenso aguardando resposta e retoma a execução.
    Retorna True se um funil suspenso foi encontrado e processado.
    """
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
        return False

    logger.info(f"⏸️ [WA-RESUME] Funil suspenso encontrado: Trigger #{suspended_trigger.id} | Funil #{suspended_trigger.funnel_id} | Nó atual: {suspended_trigger.current_node_id}")
    funnel_obj = suspended_trigger.funnel
    if not funnel_obj or not funnel_obj.steps:
        return False

    graph_data = funnel_obj.steps
    nodes = {str(n["id"]): n for n in graph_data.get("nodes", [])}
    edges = graph_data.get("edges", [])

    current_node = nodes.get(suspended_trigger.current_node_id)
    if not current_node:
        logger.warning(f"⚠️ [WA-RESUME] Nó {suspended_trigger.current_node_id} não encontrado no grafo.")
        return False

    node_type = current_node.get("type")
    target_node_id = None

    if node_type in ["inputDataNode", "input_data"]:
        node_data = current_node.get("data", {})
        var_name = node_data.get("varName")
        error_message = node_data.get("errorMessage")
        if not error_message or not error_message.strip():
            error_message = "Entrada inválida. Digite novamente."

        from services.input_data_parser import parse_and_extract_input_data, generate_ai_error_message
        is_valid, extracted_val = await parse_and_extract_input_data(
            db=db,
            user_input=user_input,
            node_data=node_data,
            client_id=target_cid,
            trigger=suspended_trigger
        )

        if is_valid:
            if not hasattr(suspended_trigger, 'processed_data') or suspended_trigger.processed_data is None:
                suspended_trigger.processed_data = {}
            suspended_trigger.processed_data[var_name] = extracted_val
            flag_modified(suspended_trigger, "processed_data")

            # Salvar no WebhookLead
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
                logger.info(f"💾 [WA-RESUME-INPUT] Variável '{var_name}' salva no WebhookLead ID {lead.id}")

            edge = next((e for e in edges if e.get("source") == suspended_trigger.current_node_id and (not e.get("sourceHandle") or e.get("sourceHandle") in ("default", "success"))), None)
            if edge:
                target_node_id = edge.get("target")
                logger.info(f"✅ [WA-RESUME-INPUT] Entrada válida. Avançando para o Nó {target_node_id}")
        else:
            if node_data.get("errorByAi"):
                error_message = await generate_ai_error_message(user_input, node_data, target_cid)
            elif node_data.get("validationRule") == "cpf":
                nums = re.sub(r"\D", "", user_input)
                if len(nums) != 11:
                    error_message = f"O CPF enviado está inválido pois possui {len(nums)} dígitos, mas um CPF deve ter exatamente 11 dígitos. Por favor, envie os 11 dígitos do seu CPF. 😊"

            logger.info(f"❌ [WA-RESUME-INPUT] Entrada inválida. Enviando mensagem de erro: {error_message}")
            if resolved_convo_id and int(resolved_convo_id) > 0:
                await cw.send_message(resolved_convo_id, error_message)
            else:
                await cw.send_text_official(from_phone, error_message)
            return True

    elif node_type in ["message", "messageNode"]:
        buttons = [b.strip() for b in current_node.get("data", {}).get("buttons", []) if b.strip()]
        input_clean = user_input.strip().lower()
        matched_btn_idx = -1
        for idx, btn_text in enumerate(buttons):
            if btn_text.strip().lower() == input_clean:
                matched_btn_idx = idx
                break

        if matched_btn_idx != -1:
            source_handle = f"button_{matched_btn_idx}"
            edge = next((e for e in edges if e.get("source") == suspended_trigger.current_node_id and e.get("sourceHandle") == source_handle), None)
            if edge:
                target_node_id = edge.get("target")
                logger.info(f"👆 [WA-RESUME] Clique em botão '{user_input}' mapeado para o Nó {target_node_id}")
        else:
            edge = next((e for e in edges if e.get("source") == suspended_trigger.current_node_id and (not e.get("sourceHandle") or e.get("sourceHandle") == "default" or not str(e.get("sourceHandle", "")).startswith("button_"))), None)
            if edge:
                target_node_id = edge.get("target")
                logger.info(f"💬 [WA-RESUME] Resposta de texto '{user_input}' mapeada para o caminho padrão (Nó {target_node_id})")

    if target_node_id:
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
            logger.info(f"⏳ [WA-RESUME] Fora do horário comercial. Agendando Funil {funnel_obj.id} para {next_run}")
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
            logger.info(f"🔄 [WA-RESUME] Retomando Funil {funnel_obj.id} para {from_phone} no nó {target_node_id}")
        return True

    return False


def evaluate_auto_reply(
    target_cid: int,
    from_phone: str,
    raw_from: str,
    msg_type: str,
    contacts_map: dict
):
    """Verifica e dispara resposta automática se ativada nas configurações."""
    auto_reply_enabled = wah.get_setting("WA_AUTO_REPLY_ENABLED", "false", client_id=target_cid) == "true"
    auto_reply_message = wah.get_setting("WA_AUTO_REPLY_MESSAGE", "", client_id=target_cid)
    is_valid_type = msg_type in ("text", "image", "video", "document", "audio", "voice")

    if not (auto_reply_enabled and auto_reply_message and is_valid_type):
        return

    logger.info(f"🤖 [AUTO-REPLY] Auto-reply ativo para o Client {target_cid}. Agendando envio para {from_phone}...")
    try:
        delay_val = wah.get_setting("WA_AUTO_REPLY_DELAY", "3", client_id=target_cid)
        try:
            delay_seconds = float(delay_val)
        except ValueError:
            delay_seconds = 3.0

        async def send_with_delay():
            if delay_seconds > 0:
                await asyncio.sleep(delay_seconds)
            from core.clients.whatsapp.client import WhatsAppClient
            wa_client = WhatsAppClient(client_id=target_cid)
            await wa_client.send_text_official(from_phone, auto_reply_message)
            logger.info(f"🤖 [AUTO-REPLY] Auto-reply enviado para {from_phone} após {delay_seconds}s")

            # Sincronização Chatwoot
            try:
                from config_loader import get_setting
                from chatwoot_client import ChatwootClient
                inbox_id_str = get_setting("CHATWOOT_SELECTED_INBOX_ID", client_id=target_cid)
                effective_inbox_id = int(inbox_id_str) if (inbox_id_str and str(inbox_id_str).isdigit()) else None

                cw_client = ChatwootClient(client_id=target_cid)
                convo_res = await cw_client.ensure_conversation(
                    contact_phone=from_phone,
                    contact_name=contacts_map.get(raw_from, "Contato"),
                    inbox_id=effective_inbox_id
                )
                convo_id = convo_res.get("conversation_id") if convo_res else None
                if convo_id:
                    await cw_client.send_message(convo_id, auto_reply_message, message_type="outgoing")
            except Exception as e_sync:
                logger.error(f"❌ [AUTO-REPLY] Erro ao sincronizar auto-reply no Chatwoot: {e_sync}")

            # Sincronização Chat Local
            db_local = None
            try:
                db_local = wah.SessionLocal()
                from core.engine.sync_utils import sync_message_to_local_chat
                await sync_message_to_local_chat(
                    db=db_local,
                    client_id=target_cid,
                    phone=from_phone,
                    contact_name=contacts_map.get(raw_from, "Contato"),
                    content=auto_reply_message,
                    message_type="text"
                )
                db_local.commit()
            except Exception as e_local:
                if db_local:
                    db_local.rollback()
                logger.error(f"❌ [AUTO-REPLY] Erro ao sincronizar no chat local: {e_local}")
            finally:
                if db_local:
                    db_local.close()

        asyncio.create_task(send_with_delay())
    except Exception as e_reply:
        logger.error(f"❌ [AUTO-REPLY] Erro ao disparar resposta automática com delay: {e_reply}")


async def evaluate_keyword_triggers(
    db,
    target_cid: int,
    from_phone: str,
    raw_from: str,
    user_input: Optional[str],
    resolved_convo_id: Optional[int],
    contacts_map: dict
):
    """Verifica e dispara funis associados a palavras-chave (trigger_phrase) recebidas do usuário."""
    if not user_input or not isinstance(user_input, str) or not user_input.strip():
        return

    try:
        clean_input = normalize_text(user_input)
        if not clean_input:
            return

        candidate_funnels = db.query(models.Funnel).filter(
            models.Funnel.client_id == target_cid,
            models.Funnel.is_active == True,
            models.Funnel.is_archived == False,
            models.Funnel.is_trigger_active == True,
            models.Funnel.trigger_phrase.isnot(None)
        ).all()

        for funnel in candidate_funnels:
            if not funnel.trigger_phrase or not funnel.trigger_phrase.strip():
                continue

            keywords = [k.strip() for k in funnel.trigger_phrase.split(",") if k.strip()]
            matched_keyword = None
            match_type = funnel.trigger_match_type or "contains"

            for kw in keywords:
                norm_kw = normalize_text(kw)
                if not norm_kw:
                    continue
                if match_type == "exact":
                    if clean_input == norm_kw:
                        matched_keyword = kw
                        break
                else:
                    if norm_kw in clean_input:
                        matched_keyword = kw
                        break

            if not matched_keyword:
                continue

            # 1. Validação de Whitelist / Blacklist
            if funnel.allowed_phones and isinstance(funnel.allowed_phones, list) and len(funnel.allowed_phones) > 0:
                allowed_list = ["".join(filter(str.isdigit, str(p))) for p in funnel.allowed_phones if str(p).strip()]
                if allowed_list and from_phone not in allowed_list:
                    logger.info(f"🚫 [KEYWORD_TRIGGER] Contato {from_phone} não está na Whitelist do Funil {funnel.id}. Ignorando.")
                    continue

            if funnel.blocked_phones and isinstance(funnel.blocked_phones, list) and len(funnel.blocked_phones) > 0:
                blocked_list = ["".join(filter(str.isdigit, str(p))) for p in funnel.blocked_phones if str(p).strip()]
                if blocked_list and from_phone in blocked_list:
                    logger.info(f"🚫 [KEYWORD_TRIGGER] Contato {from_phone} está na Blacklist do Funil {funnel.id}. Ignorando.")
                    continue

            # 2. Validação de Trava Anti-Repetição / Frequência
            limit_type = funnel.trigger_limit_type or "none"
            now_utc = datetime.now(timezone.utc)
            skip_by_limit = False

            if limit_type == "once_per_day":
                tz_sp = zoneinfo.ZoneInfo("America/Sao_Paulo")
                now_sp = datetime.now(tz_sp)
                start_of_day_sp = now_sp.replace(hour=0, minute=0, second=0, microsecond=0)
                start_of_day_utc = start_of_day_sp.astimezone(timezone.utc)

                existing_trigger_today = db.query(models.ScheduledTrigger).filter(
                    models.ScheduledTrigger.client_id == target_cid,
                    models.ScheduledTrigger.funnel_id == funnel.id,
                    models.ScheduledTrigger.contact_phone == from_phone,
                    models.ScheduledTrigger.created_at >= start_of_day_utc,
                    models.ScheduledTrigger.status.notin_(["failed", "aborted", "error"])
                ).first()

                if existing_trigger_today:
                    logger.info(f"🚫 [KEYWORD_LIMIT] Contato {from_phone} já ativou o Funil {funnel.id} hoje ({now_sp.strftime('%d/%m/%Y')}). Trava diária aplicada.")
                    skip_by_limit = True

            elif limit_type == "once_24h":
                cutoff_24h = now_utc - timedelta(hours=24)
                existing_trigger_24h = db.query(models.ScheduledTrigger).filter(
                    models.ScheduledTrigger.client_id == target_cid,
                    models.ScheduledTrigger.funnel_id == funnel.id,
                    models.ScheduledTrigger.contact_phone == from_phone,
                    models.ScheduledTrigger.created_at >= cutoff_24h,
                    models.ScheduledTrigger.status.notin_(["failed", "aborted", "error"])
                ).first()

                if existing_trigger_24h:
                    logger.info(f"🚫 [KEYWORD_LIMIT] Contato {from_phone} já ativou o Funil {funnel.id} nas últimas 24h. Trava de 24h aplicada.")
                    skip_by_limit = True

            elif limit_type == "once_lifetime":
                existing_trigger_ever = db.query(models.ScheduledTrigger).filter(
                    models.ScheduledTrigger.client_id == target_cid,
                    models.ScheduledTrigger.funnel_id == funnel.id,
                    models.ScheduledTrigger.contact_phone == from_phone,
                    models.ScheduledTrigger.status.notin_(["failed", "aborted", "error"])
                ).first()

                if existing_trigger_ever:
                    logger.info(f"🚫 [KEYWORD_LIMIT] Contato {from_phone} já ativou o Funil {funnel.id} anteriormente. Trava vitalícia aplicada.")
                    skip_by_limit = True

            if skip_by_limit:
                continue

            # 3. Disparar Funil
            contact_name_val = contacts_map.get(raw_from, "Contato")
            new_trigger = models.ScheduledTrigger(
                client_id=target_cid,
                funnel_id=funnel.id,
                conversation_id=resolved_convo_id,
                contact_phone=from_phone,
                contact_name=contact_name_val,
                status='processing',
                scheduled_time=now_utc,
                is_bulk=False,
                is_interaction=True,
                processed_data={"trigger_source": "whatsapp_keyword", "keyword": matched_keyword, "input": user_input}
            )
            db.add(new_trigger)
            db.commit()
            db.refresh(new_trigger)

            await wah.rabbitmq.publish("zapvoice_funnel_executions", {
                "trigger_id": new_trigger.id,
                "funnel_id": funnel.id,
                "conversation_id": resolved_convo_id,
                "contact_phone": from_phone
            })
            logger.info(f"🚀 [KEYWORD_TRIGGER] Funil {funnel.id} ('{funnel.name}') ativado para {from_phone} via palavra-chave '{matched_keyword}' (Trigger ID: {new_trigger.id})")
            break
    except Exception as e_kw:
        logger.error(f"❌ [KEYWORD_TRIGGER] Erro ao processar gatilho de palavra-chave: {e_kw}")

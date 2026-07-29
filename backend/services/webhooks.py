# Grupo 1: Bibliotecas padrão do Python
import json
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union

# Grupo 3: Arquivos e módulos locais do projeto
from core.logger import logger
from core.utils import robust_extract_labels
from services.webhooks_utils import (
    compute_dynamic_manychat_tag,
    extract_mapped_variables,
    extract_nested_custom_fields,
    get_brasilia_now,
    parse_webhook_payload,
    replace_variables_in_string,
)


async def process_webhook_automation(client_id: int, mapping: any, variables: dict, history_id: int):
    """
    Processa a automação principal do webhook (disparo de funil ou template).
    """
    from database import SessionLocal
    import models
    from rabbitmq_client import rabbitmq
    
    db = SessionLocal()
    try:
        # Carrega mapping e history se necessário (estamos em background_tasks)
        history = db.query(models.WebhookHistory).filter(models.WebhookHistory.id == history_id).first()
        if not history:
            logger.error(f"AUTO_PROCESS | Webhook #{history_id} não encontrado no banco.")
            return

        payload = history.payload or {}
        phone = variables.get("phone")
        
        # --- IDEMPOTENCY LOCK (Postgres Advisory Lock) ---
        # Bloqueia o processamento para este telefone e mapeamento específico
        if phone:
            from sqlalchemy import text
            db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": f"webhook_{phone}_{mapping.id}"})
            
        # --- RE-CHECK após o lock (Idempotency definitiva) ---
        # 1. Verificar se já existe um gatilho para este mapping + fone nos últimos 10 segundos
        if phone:
            last_st = db.query(models.ScheduledTrigger).filter(
                models.ScheduledTrigger.client_id == client_id,
                models.ScheduledTrigger.contact_phone == phone,
                models.ScheduledTrigger.integration_id == str(mapping.integration_id),
                models.ScheduledTrigger.event_type == history.event_type,
                models.ScheduledTrigger.created_at >= datetime.now(timezone.utc) - timedelta(seconds=10)
            ).first()
            
            if last_st:
                logger.warning(f"🚫 [AUTO_IDEMPOTENCY] Webhook #{history_id} ignorado. Trigger #{last_st.id} já criado recentemente para {phone}")
                # Encontra o histórico original e incrementa duplicate_count
                orig_history = db.query(models.WebhookHistory).filter(
                    models.WebhookHistory.integration_id == history.integration_id,
                    models.WebhookHistory.event_type == history.event_type,
                    models.WebhookHistory.id != history.id
                ).order_by(models.WebhookHistory.created_at.desc()).first()
                if orig_history:
                    current_count = orig_history.duplicate_count or 0
                    orig_history.duplicate_count = current_count + 1
                db.delete(history)
                db.commit()
                return

        # Mapeamento já vem no argumento, mas vamos garantir que temos os dados
        template_name = mapping.template_name
        funnel_id = mapping.funnel_id
        
        # Fallback: se o nome estiver nulo, busca no cache pelo ID
        if not template_name and mapping.template_id:
            tpl_cache = db.query(models.WhatsAppTemplateCache).filter(
                models.WhatsAppTemplateCache.id == mapping.template_id
            ).first()
            if tpl_cache:
                template_name = tpl_cache.name

        # --- VALIDAÇÃO DE UNICIDADE DO LEAD POR INTEGRAÇÃO E TEMPLATE/FUNIL ---
        if phone:
            if template_name:
                existing_trigger = db.query(models.ScheduledTrigger).filter(
                    models.ScheduledTrigger.client_id == client_id,
                    models.ScheduledTrigger.contact_phone == phone,
                    models.ScheduledTrigger.integration_id == str(mapping.integration_id),
                    models.ScheduledTrigger.template_name == template_name,
                    models.ScheduledTrigger.status.notin_(["failed", "cancelled"])
                ).first()
                
                if existing_trigger:
                    logger.warning(f"🚫 [DUPLICITY_CHECK] Webhook #{history_id} ignorado. O lead {phone} já possui um disparo ativo/enviado para o template '{template_name}' nesta integração (Trigger #{existing_trigger.id}).")
                    # Encontra o histórico original e incrementa duplicate_count
                    orig_history = db.query(models.WebhookHistory).filter(
                        models.WebhookHistory.integration_id == history.integration_id,
                        models.WebhookHistory.event_type == history.event_type,
                        models.WebhookHistory.id != history.id
                    ).order_by(models.WebhookHistory.created_at.desc()).first()
                    if orig_history:
                        current_count = orig_history.duplicate_count or 0
                        orig_history.duplicate_count = current_count + 1
                    db.delete(history)
                    db.commit()
                    return
            
            elif funnel_id:
                existing_trigger = db.query(models.ScheduledTrigger).filter(
                    models.ScheduledTrigger.client_id == client_id,
                    models.ScheduledTrigger.contact_phone == phone,
                    models.ScheduledTrigger.integration_id == str(mapping.integration_id),
                    models.ScheduledTrigger.funnel_id == funnel_id,
                    models.ScheduledTrigger.status.notin_(["failed", "cancelled"])
                ).first()
                
                if existing_trigger:
                    logger.warning(f"🚫 [DUPLICITY_CHECK] Webhook #{history_id} ignorado. O lead {phone} já possui um disparo ativo/enviado para o funil #{funnel_id} nesta integração (Trigger #{existing_trigger.id}).")
                    # Encontra o histórico original e incrementa duplicate_count
                    orig_history = db.query(models.WebhookHistory).filter(
                        models.WebhookHistory.integration_id == history.integration_id,
                        models.WebhookHistory.event_type == history.event_type,
                        models.WebhookHistory.id != history.id
                    ).order_by(models.WebhookHistory.created_at.desc()).first()
                    if orig_history:
                        current_count = orig_history.duplicate_count or 0
                        orig_history.duplicate_count = current_count + 1
                    db.delete(history)
                    db.commit()
                    return

        # --- LÓGICA DE INTERRUPÇÃO INTELIGENTE (CANCELAMENTO) ---
        if getattr(mapping, "cancel_pending_on_trigger", False) and mapping.cancel_event_types:
            event_types_to_cancel = mapping.cancel_event_types
            
            if phone and event_types_to_cancel:
                logger.info(f"🛡️ SMART_CANCEL | Iniciando cancelamento para {phone} nos eventos: {event_types_to_cancel}")
                
                current_product = variables.get("product_name")
                
                # Busca disparos pendentes/enfileirados para este contato e eventos
                query_triggers = db.query(models.ScheduledTrigger).filter(
                    models.ScheduledTrigger.client_id == client_id,
                    models.ScheduledTrigger.contact_phone == phone,
                    models.ScheduledTrigger.status.in_(["pending", "queued"]),
                    models.ScheduledTrigger.event_type.in_(event_types_to_cancel)
                )
                
                # Filtra pelo mesmo produto se o produto estiver preenchido
                if current_product:
                    query_triggers = query_triggers.filter(
                        models.ScheduledTrigger.product_name == current_product
                    )
                
                pending_triggers = query_triggers.all()
                
                for pt in pending_triggers:
                    logger.info(f"🚫 SMART_CANCEL | Cancelando trigger #{pt.id} (Evento: {pt.event_type}, Produto: {pt.product_name})")
                    pt.status = "cancelled"
                    pt.failure_reason = f"Interrompido pelo evento: {history.event_type}"
                
                if pending_triggers:
                    db.commit()
                    logger.info(f"✅ SMART_CANCEL | {len(pending_triggers)} disparos cancelados com sucesso.")

        if not template_name and not funnel_id:
            logger.info(f"AUTO_SKIP | Mapeamento #{mapping.id} sem template nem funil definido — aplicando etiquetas e salvando lead...")
            
            # 1. Monta tags internas (ZapVoice)
            auto_tag_list = []
            if getattr(mapping, "internal_tags", None):
                auto_tag_list.extend([t.strip() for t in mapping.internal_tags.split(',') if t.strip()])
            if not auto_tag_list and history.event_type:
                auto_tag_list.append(history.event_type.replace("_", " ").title())
            auto_tag = ", ".join(list(dict.fromkeys(auto_tag_list))) if auto_tag_list else None

            # 2. Injeta metadados
            integration = db.query(models.WebhookIntegration).filter_by(id=mapping.integration_id).first()
            if integration:
                variables["created_by_webhook"] = True
                variables["webhook_name"] = integration.name

                # 3. Sincroniza Lead (aba contatos)
                if getattr(mapping, "update_contact_on_trigger", True):
                    from services.leads import upsert_webhook_lead
                    try:
                        upsert_webhook_lead(
                            db,
                            client_id=client_id,
                            platform=integration.platform,
                            parsed_data=variables,
                            tag=auto_tag,
                            contact_save_fields=getattr(mapping, "contact_save_fields", None)
                        )
                    except Exception as lead_err:
                        logger.error(f"Erro ao salvar lead no AUTO_SKIP: {lead_err}")

            # 4. Aplica etiquetas locais de conversação (Chat Local)
            if phone and getattr(mapping, "chatwoot_label", None):
                try:
                    from services.chat_label_service import apply_webhook_labels
                    apply_webhook_labels(
                        db=db,
                        client_id=client_id,
                        phone=phone,
                        raw_labels=mapping.chatwoot_label,
                        source=f"Webhook ({integration.name if integration else 'Integrador'})",
                        contact_name=variables.get("name")
                    )
                except Exception as label_err:
                    logger.error(f"Erro ao aplicar etiquetas de chat no AUTO_SKIP: {label_err}")


            history.status = "skipped"
            history.error_message = f"AUTO_SKIP: Mapeamento #{mapping.id} sem template nem funil definido — disparo não criado."
            db.commit()
            return

        # Extrai variáveis para o template
        header_format = None
        if mapping.template_id:
            try:
                tpl = db.query(models.WhatsAppTemplateCache).filter(
                    models.WhatsAppTemplateCache.id == mapping.template_id
                ).first()
                if tpl and tpl.components:
                    header_comp = next((c for c in tpl.components if c.get("type") == "HEADER"), None)
                    if header_comp:
                        header_format = header_comp.get("format")
            except Exception as e:
                logger.error(f"Erro ao obter header_format para mapping {mapping.id}: {e}")

        components = extract_mapped_variables(payload, variables, mapping.variables_mapping or {}, header_format)
        
        # Nota privada (Forçando ativo por padrão, a não ser que seja nota customizada no legado)
        private_msg_text = "true"
        mapping_note = getattr(mapping, "private_note", None)
        if mapping_note and mapping_note.lower() not in ("true", "false", ""):
            private_msg_text = mapping_note
        
        # Calcula delay
        delay_min = mapping.delay_minutes or 0
        delay_seconds_map = mapping.delay_seconds or 0
        total_delay_sec = (delay_min * 60) + delay_seconds_map

        scheduled_time = datetime.now(timezone.utc)
        if total_delay_sec > 0:
            scheduled_time = scheduled_time + timedelta(seconds=total_delay_sec)
            status = "queued"
        else:
            status = "processing"

        # Gera Chave de Idempotência Única
        import hashlib
        payload_str = json.dumps(payload, sort_keys=True)
        idempotency_key = f"webhook_{mapping.id}_{hashlib.sha256(payload_str.encode()).hexdigest()[:16]}"

        # Extrai conversation_id do payload do webhook (ex: botão do Chatwoot)
        # Tenta múltiplos caminhos: campo mapeado nas variáveis, payload.conversation.id, payload.conversation_id
        _raw_conv_id = (
            variables.get("chatwoot_conversation_id") or
            variables.get("conversation_id") or
            payload.get("conversation", {}).get("id") or
            payload.get("conversation_id")
        )
        webhook_conversation_id = int(_raw_conv_id) if _raw_conv_id and str(_raw_conv_id).isdigit() else None
        if webhook_conversation_id:
            logger.info(f"🗂️ [WEBHOOK] conversation_id={webhook_conversation_id} extraído do payload para {phone}")

        # Extrai contact_id, inbox_id e account_id do payload do Chatwoot
        _raw_contact_id = (
            variables.get("chatwoot_contact_id") or
            payload.get("contact", {}).get("id") or
            payload.get("contact_id")
        )
        webhook_contact_id = int(_raw_contact_id) if _raw_contact_id and str(_raw_contact_id).isdigit() else None

        _raw_inbox_id = (
            variables.get("chatwoot_inbox_id") or
            payload.get("inbox", {}).get("id") or
            payload.get("conversation", {}).get("inbox_id") or
            payload.get("inbox_id")
        )
        webhook_inbox_id = int(_raw_inbox_id) if _raw_inbox_id and str(_raw_inbox_id).isdigit() else None

        _raw_account_id = (
            variables.get("chatwoot_account_id") or
            payload.get("account", {}).get("id") or
            payload.get("account_id")
        )
        webhook_account_id = int(_raw_account_id) if _raw_account_id and str(_raw_account_id).isdigit() else None

        # Cria o Disparo
        st = models.ScheduledTrigger(
            scheduled_time=scheduled_time,
            status=status,
            contact_name=variables.get("name"),
            contact_phone=phone,
            template_name=template_name,
            template_components=components,
            template_language=mapping.template_language or "pt_BR",
            client_id=client_id,
            product_name=variables.get("product_name"),
            private_message=private_msg_text,
            publish_external_event=True,
            chatwoot_label=robust_extract_labels(mapping.chatwoot_label),
            is_free_message=getattr(mapping, 'send_as_free_message', False),
            cost_per_unit=0.0 if getattr(mapping, 'send_as_free_message', False) else (getattr(mapping, 'cost_per_message', 0.0) or 0.35),
            sent_as="FREE_MESSAGE" if getattr(mapping, 'send_as_free_message', False) else "TEMPLATE",
            event_type=history.event_type,
            integration_id=mapping.integration_id,
            funnel_id=funnel_id,
            is_bulk=False,
            idempotency_key=idempotency_key,
            conversation_id=webhook_conversation_id,
            chatwoot_contact_id=webhook_contact_id,
            chatwoot_inbox_id=webhook_inbox_id,
            chatwoot_account_id=webhook_account_id,
            is_stress_test=bool((history.processed_data or {}).get("is_stress_test"))
        )
        db.add(st)
        try:
            db.commit()
            db.refresh(st)
            
            # --- AGENDAMENTO DO GATILHO DE FOLLOW-UP ---
            if getattr(mapping, "followup_active", False) and mapping.followup_template_name:
                fu_value = getattr(mapping, "followup_delay_value", 0) or 0
                fu_unit = getattr(mapping, "followup_delay_unit", "minutes") or "minutes"
                
                fu_delay_sec = fu_value * 60
                if fu_unit == "hours":
                    fu_delay_sec = fu_value * 3600
                    
                total_fu_delay = total_delay_sec + fu_delay_sec
                fu_scheduled_time = datetime.now(timezone.utc) + timedelta(seconds=total_fu_delay)
                fu_header_format = None
                if mapping.followup_template_id:
                    try:
                        fu_tpl = db.query(models.WhatsAppTemplateCache).filter(
                            models.WhatsAppTemplateCache.id == mapping.followup_template_id
                        ).first()
                        if fu_tpl and fu_tpl.components:
                            fu_header_comp = next((c for c in fu_tpl.components if c.get("type") == "HEADER"), None)
                            if fu_header_comp:
                                fu_header_format = fu_header_comp.get("format")
                    except Exception as e:
                        logger.error(f"Erro ao obter fu_header_format para mapping {mapping.id}: {e}")

                fu_components = extract_mapped_variables(payload, variables, mapping.followup_variables_mapping or {}, fu_header_format)
                
                fu_idempotency_key = f"fu_{mapping.id}_{hashlib.sha256(payload_str.encode()).hexdigest()[:16]}"
                
                # --- VALIDAÇÃO DE HORÁRIO COMERCIAL DO FOLLOW-UP ---
                if getattr(mapping, "followup_business_hours_active", False):
                    from core.engine.business_hours import is_within_business_hours_generic, get_next_business_hour_start_generic
                    
                    fu_days = getattr(mapping, "followup_business_hours_days", None) or [0, 1, 2, 3, 4]
                    fu_start = getattr(mapping, "followup_business_hours_start", None) or "08:00"
                    fu_end = getattr(mapping, "followup_business_hours_end", None) or "18:00"
                    
                    if not is_within_business_hours_generic(fu_scheduled_time, fu_days, fu_start, fu_end):
                        old_time = fu_scheduled_time
                        fu_scheduled_time = get_next_business_hour_start_generic(fu_scheduled_time, fu_days, fu_start)
                        logger.info(f"🕒 [FOLLOW-UP-BUSINESS-HOURS] Ajustando horario de follow-up {fu_idempotency_key} de {old_time} para {fu_scheduled_time} (fora do comercial)")
                fu_st = models.ScheduledTrigger(
                    scheduled_time=fu_scheduled_time,
                    status="queued",
                    contact_name=st.contact_name,
                    contact_phone=st.contact_phone,
                    template_name=mapping.followup_template_name,
                    template_components=fu_components,
                    template_language=mapping.template_language or "pt_BR",
                    client_id=client_id,
                    product_name=st.product_name,
                    private_message="true",  # Sempre envia nota privada com o corpo do follow-up
                    publish_external_event=True,
                    chatwoot_label=robust_extract_labels(mapping.chatwoot_label),
                    is_free_message=False,
                    cost_per_unit=mapping.cost_per_message or 0.35,
                    sent_as="TEMPLATE",
                    event_type=st.event_type,
                    integration_id=mapping.integration_id,
                    funnel_id=None,
                    is_bulk=False,
                    is_followup=True,
                    parent_id=st.id,
                    idempotency_key=fu_idempotency_key,
                    skip_block_check=True
                )
                db.add(fu_st)
                try:
                    db.commit()
                    logger.info(f"⏳ [FOLLOW-UP] Agendado follow-up #{fu_st.id} para #{st.id} as {fu_scheduled_time}")
                except Exception as fu_err:
                    db.rollback()
                    logger.error(f"⚠️ [FOLLOW-UP] Erro ao salvar follow-up para trigger #{st.id}: {fu_err}")
                    
        except Exception as e_st:
            db.rollback()
            if "UNIQUE constraint failed" in str(e_st) or "duplicate key" in str(e_st).lower():
                logger.warning(f"🚫 [AUTO_IDEMPOTENCY] Race condition evitada via UNIQUE key para {phone}")
                return
            raise e_st
        
        # Se não houver delay, publica direto no RabbitMQ
        if total_delay_sec <= 0:
            await rabbitmq.publish("zapvoice_funnel_executions", {
                "trigger_id": st.id,
                "funnel_id": funnel_id,
                "conversation_id": webhook_conversation_id,
                "contact_phone": phone,
                "contact_name": variables.get("name")
            })
            
        history.status = "processed"
        db.commit()
        logger.info(f"✅ AUTO_SUCCESS | Webhook #{history_id} processado. Trigger ID: {st.id}")

    except Exception as e:
        logger.error(f"❌ AUTO_ERROR | Falha ao processar automação #{history_id}: {e}")
        import traceback
        logger.error(traceback.format_exc())
        if history:
            history.status = "failed"
            history.error_message = str(e)
            db.commit()
    finally:
        db.close()

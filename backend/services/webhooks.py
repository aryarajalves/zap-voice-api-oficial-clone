from typing import Union, List, Optional, Any, Dict
from datetime import datetime, timezone, timedelta
import re
import json
from core.logger import logger
from core.utils import robust_extract_labels

# Importa as funções auxiliares extraídas para respeitar o limite de 1000 linhas por arquivo
from services.webhooks_utils import (
    get_brasilia_now,
    compute_dynamic_manychat_tag,
    parse_webhook_payload,
    extract_mapped_variables,
    extract_nested_custom_fields,
    replace_variables_in_string
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
                models.ScheduledTrigger.integration_id == mapping.integration_id,
                models.ScheduledTrigger.event_type == history.event_type,
                models.ScheduledTrigger.created_at >= datetime.now(timezone.utc) - timedelta(seconds=10)
            ).first()
            
            if last_st:
                logger.warning(f"🚫 [AUTO_IDEMPOTENCY] Webhook #{history_id} ignorado. Trigger #{last_st.id} já criado recentemente para {phone}")
                history.status = "ignored"
                history.error_message = f"Duplicidade evitada (Trigger #{last_st.id})"
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
                    models.ScheduledTrigger.integration_id == mapping.integration_id,
                    models.ScheduledTrigger.template_name == template_name,
                    models.ScheduledTrigger.status.notin_(["failed", "cancelled"])
                ).first()
                
                if existing_trigger:
                    logger.warning(f"🚫 [DUPLICITY_CHECK] Webhook #{history_id} ignorado. O lead {phone} já possui um disparo ativo/enviado para o template '{template_name}' nesta integração (Trigger #{existing_trigger.id}).")
                    history.status = "ignored"
                    history.error_message = f"Disparo duplicado evitado. Lead já possui disparo para este template nesta integração (Trigger #{existing_trigger.id})"
                    db.commit()
                    return
            
            elif funnel_id:
                existing_trigger = db.query(models.ScheduledTrigger).filter(
                    models.ScheduledTrigger.client_id == client_id,
                    models.ScheduledTrigger.contact_phone == phone,
                    models.ScheduledTrigger.integration_id == mapping.integration_id,
                    models.ScheduledTrigger.funnel_id == funnel_id,
                    models.ScheduledTrigger.status.notin_(["failed", "cancelled"])
                ).first()
                
                if existing_trigger:
                    logger.warning(f"🚫 [DUPLICITY_CHECK] Webhook #{history_id} ignorado. O lead {phone} já possui um disparo ativo/enviado para o funil #{funnel_id} nesta integração (Trigger #{existing_trigger.id}).")
                    history.status = "ignored"
                    history.error_message = f"Disparo duplicado evitado. Lead já possui disparo para este funil nesta integração (Trigger #{existing_trigger.id})"
                    db.commit()
                    return

        # --- LÓGICA DE INTERRUPÇÃO INTELIGENTE (CANCELAMENTO) ---
        if getattr(mapping, "cancel_pending_on_trigger", False) and mapping.cancel_event_types:
            event_types_to_cancel = mapping.cancel_event_types
            
            if phone and event_types_to_cancel:
                logger.info(f"🛡️ SMART_CANCEL | Iniciando cancelamento para {phone} nos eventos: {event_types_to_cancel}")
                
                # Busca disparos pendentes/enfileirados para este contato e eventos
                pending_triggers = db.query(models.ScheduledTrigger).filter(
                    models.ScheduledTrigger.client_id == client_id,
                    models.ScheduledTrigger.contact_phone == phone,
                    models.ScheduledTrigger.status.in_(["pending", "queued"]),
                    models.ScheduledTrigger.event_type.in_(event_types_to_cancel)
                ).all()
                
                for pt in pending_triggers:
                    logger.info(f"🚫 SMART_CANCEL | Cancelando trigger #{pt.id} (Evento: {pt.event_type})")
                    pt.status = "cancelled"
                    pt.failure_reason = f"Interrompido pelo evento: {history.event_type}"
                
                if pending_triggers:
                    db.commit()
                    logger.info(f"✅ SMART_CANCEL | {len(pending_triggers)} disparos cancelados com sucesso.")

        if not template_name and not funnel_id and not mapping.private_note:
            logger.info(f"AUTO_SKIP | Mapeamento #{mapping.id} sem conteúdo de disparo.")
            return

        # Extrai variáveis para o template
        components = extract_mapped_variables(payload, variables, mapping.variables_mapping or {})
        
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
            idempotency_key=idempotency_key
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
                
                fu_components = extract_mapped_variables(payload, variables, mapping.followup_variables_mapping or {})
                
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
                    private_message=None,
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
                "conversation_id": None,
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

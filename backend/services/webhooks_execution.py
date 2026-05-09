import asyncio
import uuid
import json
import models
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from core.logger import logger
from rabbitmq_client import rabbitmq
from services.webhooks import (
    parse_webhook_payload,
    extract_mapped_variables,
    replace_variables_in_string,
    compute_dynamic_manychat_tag
)
from core.utils import robust_extract_labels

async def execute_webhook_resend_logic(
    history_id: int,
    x_client_id: int,
    db: Session,
    background_tasks = None
):
    """
    Lógica centralizada para reprocessar um registro de histórico de webhook.
    """
    logger.info(f"RESEND_START | Iniciando reenvio do registro #{history_id}")
    history = db.query(models.WebhookHistory).filter(
        models.WebhookHistory.id == history_id
    ).first()
    
    if not history:
        logger.warning(f"❌ [RESEND_ERROR] Registro #{history_id} não encontrado")
        return {"status": "error", "message": f"Registro {history_id} não encontrado"}
        
    # Verificar propriedade
    integration = db.query(models.WebhookIntegration).filter(
        models.WebhookIntegration.id == history.integration_id,
        models.WebhookIntegration.client_id == x_client_id
    ).first()
    if not integration:
        logger.warning(f"🚫 [RESEND_FORBIDDEN] Acesso negado ao registro #{history_id} para cliente {x_client_id}")
        return {"status": "error", "message": f"Acesso negado ao registro {history_id}"}

    # Re-processar o payload
    payload = history.payload
    parsed_data = parse_webhook_payload(integration.platform, payload)
    
    event_type = str(parsed_data.get("event_type") or "").lower()
    phone = parsed_data.get("phone")
    name = parsed_data.get("name")

    if not phone:
        logger.warning(f"⚠️ [RESEND_FAILED] Webhook #{history_id} não possui telefone no payload.")
        return {"status": "failed", "message": f"Nenhum telefone encontrado no payload do webhook {history_id}."}

    # Encontrar mapeamentos correspondentes
    mappings = db.query(models.WebhookEventMapping).filter(
        models.WebhookEventMapping.integration_id == integration.id,
        models.WebhookEventMapping.event_type == event_type
    ).all()
    
    # Fallback para mapeamento 'outros' se não houver mapeamento específico
    if not mappings and event_type != "outros":
        logger.info(f"RESEND_FALLBACK | Webhook #{history_id} | Tentando fallback para 'outros'")
        mappings = db.query(models.WebhookEventMapping).filter(
            models.WebhookEventMapping.integration_id == integration.id,
            models.WebhookEventMapping.event_type == "outros"
        ).all()
    
    logger.info(f"RESEND_SEARCH | Webhook #{history_id} | Evento: '{event_type}' | Mapeamentos: {len(mappings)}")

    if not mappings:
        logger.info(f"RESEND_SKIP | Webhook #{history_id} ignorado: Nenhum mapeamento encontrado.")
        return {
            "status": "ignored", 
            "message": f"O evento '{event_type}' foi ignorado porque não existe nenhum mapeamento configurado (nem mesmo o fallback 'outros')."
        }

    # Executar disparos
    count = 0
    for mapping in mappings:
        template_name = mapping.template_name
        funnel_id = getattr(mapping, 'funnel_id', None)

        # Fallback para o cache do template se o nome estiver nulo
        if not template_name and mapping.template_id:
            tpl_cache = db.query(models.WhatsAppTemplateCache).filter(
                models.WhatsAppTemplateCache.id == mapping.template_id
            ).first()
            if tpl_cache:
                template_name = tpl_cache.name

        if not template_name and not funnel_id:
             # Permitir continuar se houver label ou nota privada
             pass
            
        components = extract_mapped_variables(payload, parsed_data, mapping.variables_mapping or {})
        
        private_msg_text = None
        mapping_note = getattr(mapping, "private_note", None)
        
        if mapping_note:
            if mapping_note.lower() == "true":
                # Nota automática baseada no corpo do template
                if template_name:
                    template = db.query(models.WhatsAppTemplateCache).filter(
                        models.WhatsAppTemplateCache.name == template_name,
                        models.WhatsAppTemplateCache.client_id == integration.client_id
                    ).first()
                    if template:
                        private_msg_text = template.body
                        
                        body_params = []
                        for comp in components:
                            if comp.get("type") == "body":
                                body_params = comp.get("parameters", [])
                                break
                        
                        for idx, p in enumerate(body_params):
                            text_val = p.get("text", "-")
                            private_msg_text = private_msg_text.replace(f"{{{{{idx+1}}}}}", str(text_val))
                        
                        private_msg_text = f"🔐 NOTA PRIVADA AUTOMÁTICA:\n{private_msg_text}"
            else:
                # Nota customizada direta
                private_msg_text = mapping_note
        
        # Calcular atraso
        delay_min = mapping.delay_minutes or 0
        delay_sec = mapping.delay_seconds or 0
        total_delay_sec = (delay_min * 60) + delay_sec

        scheduled_time = datetime.now(timezone.utc)
        if total_delay_sec > 0:
            scheduled_time = scheduled_time + timedelta(seconds=total_delay_sec)
            status = "queued"
        else:
            status = "processing"

        # 1. Sincronização ManyChat
        is_mc_active = getattr(mapping, "manychat_active", False)
        
        # Atualiza o histórico para o frontend saber que deve exibir a seção
        # Re-atribuição completa para garantir persistência no campo JSON
        updated_data = dict(history.processed_data or {})
        updated_data["manychat_enabled"] = is_mc_active
        history.processed_data = updated_data
        db.commit()

        if is_mc_active:
            from services.manychat import sync_to_manychat_and_update_history
            
            mc_name = replace_variables_in_string(mapping.manychat_name or "{{name}}", payload, parsed_data)
            mc_phone = replace_variables_in_string(mapping.manychat_phone or "{{phone}}", payload, parsed_data)
            
            if getattr(mapping, "manychat_tag_automation", False):
                mc_tag = compute_dynamic_manychat_tag(mapping)
            else:
                mc_tag = mapping.manychat_tag
            
            logger.info(f"RESEND_MANYCHAT | Agendando sincronização para {mc_phone} ({mc_name}) com tag '{mc_tag}'")
            if background_tasks:
                background_tasks.add_task(sync_to_manychat_and_update_history, integration.client_id, mc_name, mc_phone, mc_tag, parsed_data.get("email"), history.id)
            else:
                asyncio.create_task(sync_to_manychat_and_update_history(integration.client_id, mc_name, mc_phone, mc_tag, parsed_data.get("email"), history.id))

        # 2. Ignorar se não houver conteúdo para disparo
        if not template_name and not funnel_id and not private_msg_text:
            logger.info(f"RESEND_SKIP | Sem conteúdo para disparo no mapeamento {mapping.id}.")
            continue

        st = models.ScheduledTrigger(
            scheduled_time=scheduled_time,
            status=status,
            contact_name=name,
            contact_phone=phone,
            template_name=template_name,
            template_components=components,
            template_language="pt_BR",
            client_id=integration.client_id,
            product_name=parsed_data.get("product_name"),
            private_message=private_msg_text,
            publish_external_event=mapping.publish_external_event,
            chatwoot_label=robust_extract_labels(mapping.chatwoot_label),
            is_free_message=False, # Decidido automaticamente pelo Worker via Smart Dispatch
            event_type=event_type,
            integration_id=integration.id,
            funnel_id=funnel_id,
            is_bulk=False,
            skip_block_check=True # Forçar envio manual ignorando travas de supressão
        )
        db.add(st)
        db.commit()
        db.refresh(st)
        
        # Publicar no RabbitMQ se for imediato
        if total_delay_sec <= 0:
            await rabbitmq.publish("zapvoice_funnel_executions", {
                "trigger_id": st.id,
                "funnel_id": funnel_id,
                "conversation_id": None,
                "contact_phone": phone,
                "contact_name": name
            })
            count += 1

    logger.info(f"RESEND_SUCCESS | Webhook #{history_id} processado. Disparos gerados: {count}")
    return {
        "status": "success", 
        "message": f"Reenvio concluído: {count} disparo(s) gerado(s).",
        "count": count
    }

async def process_bulk_resend_task(history_ids: list[int], x_client_id: int):
    """
    Tarefa de background para reprocessamento em massa.
    """
    from database import SessionLocal
    db = SessionLocal()
    total = len(history_ids)
    total_dispatches = 0
    
    logger.info(f"BULK_RESEND_TASK | Iniciando processamento de {total} registros para cliente {x_client_id}")
    
    try:
        for idx, hid in enumerate(history_ids):
            # Progresso via WebSocket
            await rabbitmq.publish_event("bulk_progress", {
                "type": "webhook_resend",
                "current": idx + 1,
                "total": total,
                "status": "processing",
                "id": hid,
                "client_id": x_client_id
            })
            
            try:
                res = await execute_webhook_resend_logic(hid, x_client_id, db, None)
                if res.get("status") == "success":
                    total_dispatches += res.get("count", 0)
            except Exception as e:
                logger.error(f"❌ [BULK_RESEND_TASK] Erro ao processar ID {hid}: {e}")
            
            if total > 50:
                await asyncio.sleep(0.05)
                
        # Conclusão
        await rabbitmq.publish_event("bulk_progress", {
            "type": "webhook_resend",
            "current": total,
            "total": total,
            "status": "completed",
            "total_dispatches": total_dispatches,
            "client_id": x_client_id
        })
        logger.info(f"BULK_RESEND_TASK_DONE | Concluído! {total_dispatches} disparos gerados.")
        
    except Exception as e:
        logger.error(f"💥 [BULK_RESEND_TASK] Erro crítico: {e}")
    finally:
        db.close()

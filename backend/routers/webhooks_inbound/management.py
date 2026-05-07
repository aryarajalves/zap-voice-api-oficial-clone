from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
import models
from datetime import datetime, timezone
from core.deps import get_db
from core.logger import setup_logger
from services.webhook_processing_service import recalculate_webhook_stats_logic
from core.utils import extract_value_by_path, format_phone, find_phone_in_payload, find_name_in_payload
from chatwoot_client import ChatwootClient
from sqlalchemy import text

logger = setup_logger(__name__)
router = APIRouter()

@router.get("/{webhook_id}/events")
async def list_webhook_events(webhook_id: str, db: Session = Depends(get_db)):
    events = db.query(models.WebhookEvent).filter(
        models.WebhookEvent.webhook_id == webhook_id
    ).order_by(models.WebhookEvent.created_at.desc()).limit(50).all()
    return events

@router.post("/{webhook_id}/recalculate")
async def recalculate_webhook_stats(webhook_id: int, db: Session = Depends(get_db)):
    """ Rota para forçar o recalculo das estatísticas do webhook. """
    recalculate_webhook_stats_logic(webhook_id, db)
    return {"status": "ok"}

@router.post("/events/{event_id}/retry")
async def retry_webhook_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(models.WebhookEvent).filter(models.WebhookEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event.retry_count += 1
    db.commit()
    
    webhook = event.webhook
    try:
        mapping = webhook.field_mapping or {}
        payload = event.payload
        
        phone_key = mapping.get("phone_field")
        raw_phone, phone_matched = find_phone_in_payload(payload, phone_key)
        
        name_key = mapping.get("name_field")
        name, name_matched = find_name_in_payload(payload, name_key)
        
        custom_vars = {}
        custom_vars_paths = {}
        translations = mapping.get("translations", {})
        if mapping.get("custom_variables"):
            for var_name, json_path in mapping["custom_variables"].items():
                 val, matched_p = extract_value_by_path(payload, json_path)
                 if val:
                    val_str = str(val).strip()
                    if var_name in translations:
                        field_trans = translations[var_name]
                        if val_str in field_trans:
                            val_str = field_trans[val_str]
                        elif val_str.upper() in field_trans:
                            val_str = field_trans[val_str.upper()]
                    custom_vars[var_name] = val_str
                    custom_vars_paths[var_name] = matched_p

        if not raw_phone:
            event.processed_data = {
                "extracted_phone": {"value": None, "path": phone_key, "matched": phone_matched},
                "extracted_name": {"value": name, "path": name_key, "matched": name_matched},
            }
            db.commit()
            return {"status": "error", "message": "Phone still missing"}

        country_or_path = mapping.get("default_ddi", "Brasil")
        country_matched = "static"
        if "." in country_or_path and country_or_path not in ["Brasil", "Portugal", "Espanha", "Estados Unidos"]:
             extracted, matched_p = extract_value_by_path(payload, country_or_path)
             country = extracted if extracted and isinstance(extracted, str) else "Brasil"
             if extracted: country_matched = matched_p
        else:
             country = country_or_path

        clean_phone = format_phone(raw_phone, country)
        chatwoot = ChatwootClient(client_id=webhook.client_id)
        conv_res = await chatwoot.ensure_conversation(clean_phone, name)
        convo_id = conv_res.get("conversation_id") if conv_res else None

        final_funnel_id = webhook.funnel_id
        conditional = mapping.get("conditional_routing")
        routing_debug = {"triggered": False}
        
        if conditional and conditional.get("field_path") and conditional.get("rules"):
            check_path = conditional["field_path"]
            if check_path in custom_vars:
                check_value = str(custom_vars[check_path]).strip()
                check_path_matched = f"variable:{check_path}"
            elif check_path == "phone":
                check_value = str(clean_phone).strip()
                check_path_matched = "variable:phone"
            elif check_path == "name":
                check_value = str(name).strip()
                check_path_matched = "variable:name"
            else:
                check_value_raw, check_path_matched = extract_value_by_path(payload, check_path)
                check_value = str(check_value_raw or "").strip()
                if mapping.get("custom_variables"):
                    for var_name, json_path in mapping["custom_variables"].items():
                        if json_path == check_path:
                             if var_name in translations:
                                 field_trans = translations[var_name]
                                 if check_value in field_trans: check_value = field_trans[check_value]
                                 elif check_value.upper() in field_trans: check_value = field_trans[check_value.upper()]
                             break

            for rule in conditional["rules"]:
                rule_val = str(rule.get("value") or "").strip()
                if rule_val.lower() == check_value.lower():
                    target_funnel = rule.get("funnel_id")
                    if target_funnel:
                        final_funnel_id = int(target_funnel)
                        routing_debug = {"triggered": True, "field": check_path, "field_matched": check_path_matched, "value_found": check_value, "matched_rule": rule_val, "target_funnel": target_funnel}
                        break

        trigger = models.ScheduledTrigger(
            client_id=webhook.client_id, funnel_id=final_funnel_id, conversation_id=convo_id,
            contact_phone=clean_phone, contact_name=str(name) if name else None,
            status='queued', template_components=custom_vars, scheduled_time=datetime.now(timezone.utc)
        )
        db.add(trigger)
        event.status = "processed"
        event.processed_at = datetime.now(timezone.utc)
        event.error_message = None
        
        processed_data_builder = {
            "extracted_phone": {"value": clean_phone, "path": phone_key, "matched": phone_matched},
            "extracted_name": {"value": name, "path": name_key, "matched": name_matched},
            "country_used": {"value": country, "path": country_or_path, "matched": country_matched}
        }
        
        custom_data = {}
        if mapping.get("custom_variables"):
             for k, v in custom_vars.items():
                 path_defined = mapping["custom_variables"].get(k)
                 custom_data[k] = {"value": v, "path": path_defined, "matched": custom_vars_paths.get(k)}
        
        processed_data_builder["custom_vars"] = custom_data
        if routing_debug.get("triggered"): processed_data_builder["routing_info"] = routing_debug
        event.processed_data = processed_data_builder
        
        # Sincronização Status Info (Simplificado para o Retry)
        # TODO: Refatorar isso para um serviço comum se necessário
        
        db.commit()
        return {"status": "retried", "trigger_id": trigger.id}
    except Exception as e:
        db.rollback()
        return {"status": "failed", "error": str(e)}

@router.delete("/events/{event_id}")
async def delete_webhook_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(models.WebhookEvent).filter(models.WebhookEvent.id == event_id).first()
    if not event: raise HTTPException(status_code=404, detail="Event not found")
    
    webhook_id = event.webhook_id
    db.delete(event)
    db.commit()
    recalculate_webhook_stats_logic(webhook_id, db)
    return {"message": "Event deleted"}

@router.post("/events/bulk-delete")
async def bulk_delete_webhook_events(event_ids: List[int] = Body(...), db: Session = Depends(get_db)):
    if not event_ids: return {"message": "No events provided"}
    
    webhook_ids = db.query(models.WebhookEvent.webhook_id).filter(models.WebhookEvent.id.in_(event_ids)).distinct().all()
    affected_webhook_ids = [w[0] for w in webhook_ids]
    
    db.query(models.WebhookEvent).filter(models.WebhookEvent.id.in_(event_ids)).delete(synchronize_session=False)
    db.commit()
    
    for wid in affected_webhook_ids:
        recalculate_webhook_stats_logic(wid, db)
        
    return {"message": f"{len(event_ids)} events deleted"}

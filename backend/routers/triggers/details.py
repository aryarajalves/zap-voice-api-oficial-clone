from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional
import models, schemas
import csv, io
from core.deps import get_current_user, get_db
from config_loader import get_setting

router = APIRouter()

@router.get("/{trigger_id}/messages", summary="Listar Mensagens de um Disparo")
def get_trigger_messages(
    trigger_id: int,
    status_filter: Optional[str] = None,
    message_type: Optional[str] = None,
    limit: int = 20,
    skip: int = 0,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id, models.ScheduledTrigger.client_id == client_id).first()
    
    if not trigger: raise HTTPException(status_code=404, detail="Disparo não encontrado")
        
    child_ids = [c[0] for c in db.query(models.ScheduledTrigger.id).filter(models.ScheduledTrigger.parent_id == trigger_id).all()]
    all_trigger_ids = [trigger_id] + child_ids
    
    if trigger.is_bulk:
        from sqlalchemy import func
        subquery = db.query(func.max(models.MessageStatus.id)).filter(models.MessageStatus.trigger_id.in_(all_trigger_ids)).group_by(models.MessageStatus.phone_number).subquery()
        base_query = db.query(models.MessageStatus).filter(models.MessageStatus.id.in_(subquery))
    else:
        base_query = db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id.in_(all_trigger_ids))
    
    if status_filter:
        if status_filter == 'delivered':
            base_query = base_query.filter(or_(models.MessageStatus.status.in_(['delivered', 'read', 'interaction']), models.MessageStatus.delivered_counted == True, models.MessageStatus.is_interaction == True))
        elif status_filter == 'read':
            base_query = base_query.filter(or_(models.MessageStatus.status.in_(['read', 'interaction']), models.MessageStatus.is_interaction == True, models.MessageStatus.read_counted == True))
        elif status_filter == 'failed':
            base_query = base_query.filter(models.MessageStatus.status == 'failed')
        elif status_filter == 'sent':
            base_query = base_query.filter(or_(models.MessageStatus.status.in_(['sent', 'delivered', 'read', 'interaction']), models.MessageStatus.delivered_counted == True, models.MessageStatus.read_counted == True))
        elif status_filter == 'blocked':
            base_query = base_query.filter(models.MessageStatus.failure_reason == 'BLOCKED_VIA_BUTTON')
        elif status_filter in ('interaction', 'interactions'):
            base_query = base_query.filter(or_(models.MessageStatus.is_interaction == True, models.MessageStatus.interaction_counted == True), or_(models.MessageStatus.failure_reason == None, models.MessageStatus.failure_reason != 'BLOCKED_VIA_BUTTON'))
        elif status_filter == 'private_note':
            base_query = base_query.filter(models.MessageStatus.private_note_posted == True)

    if message_type:
        if message_type == 'template': 
            base_query = base_query.filter(models.MessageStatus.message_type == 'TEMPLATE', models.MessageStatus.meta_price_brl > 0)
        elif message_type == 'free': 
            base_query = base_query.filter(or_(
                models.MessageStatus.message_type.in_(['FREE_MESSAGE', 'DIRECT_MESSAGE']),
                models.MessageStatus.meta_price_brl == 0,
                models.MessageStatus.meta_price_brl == None
            ))

    total = base_query.count()
    items = base_query.order_by(models.MessageStatus.updated_at.desc()).offset(skip).limit(limit).all()
    
    # Fallback virtual para quando não há registros no MessageStatus (por ex: disparos de funil antigos ou em lote em andamento)
    virtual_items = []
    if total == 0 and trigger.is_bulk:
        children = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.parent_id == trigger_id).all()
        if children:
            for child in children:
                # Filtrar pelo status solicitado se aplicável
                if status_filter == 'failed' and child.status not in ('failed', 'aborted', 'cancelled'):
                    continue
                if status_filter in ('delivered', 'read') and child.status not in ('completed', 'processing'):
                    continue
                
                virtual_items.append({
                    "id": child.id,
                    "trigger_id": trigger_id,
                    "message_id": f"virtual_{child.id}",
                    "phone_number": child.contact_phone,
                    "status": "sent" if child.status in ('completed', 'processing') else ("failed" if child.status == 'failed' else "cancelled"),
                    "failure_reason": child.failure_reason,
                    "is_interaction": False,
                    "message_type": "FREE_MESSAGE",
                    "meta_price_category": None,
                    "meta_price_brl": 0.0,
                    "content": f"[Funil] {trigger.funnel.name if trigger.funnel else 'Funil'}",
                    "private_note_posted": False,
                    "memory_webhook_status": None,
                    "memory_webhook_error": None,
                    "chatwoot_conversation_id": child.conversation_id,
                    "chatwoot_account_id": child.chatwoot_account_id,
                    "chatwoot_inbox_id": child.chatwoot_inbox_id,
                    "timestamp": child.created_at.isoformat() if child.created_at else None,
                    "updated_at": child.updated_at.isoformat() if child.updated_at else None,
                    "contact_name": child.contact_name or child.contact_phone,
                    "chatwoot_url": None,
                    "lead_tags": None
                })
            total = len(virtual_items)
            virtual_items = virtual_items[skip:skip+limit]

    base_url = get_setting("CHATWOOT_URL", "https://app.chatwoot.com", client_id=trigger.client_id)
    if base_url.endswith("/"): base_url = base_url[:-1]

    contacts_map = {}
    if trigger.is_bulk and trigger.contacts_list:
        for c in trigger.contacts_list:
            if isinstance(c, dict):
                p = c.get('phone') or c.get('telefone') or c.get('whatsapp') or ''
                if p:
                    clean_p = "".join(filter(str.isdigit, str(p)))
                    name = c.get('{{1}}') or c.get('1') or c.get('nome') or c.get('name') or c.get('full_name') or c.get('contact_name') or ""
                    if clean_p: contacts_map[clean_p] = name

    # Buscar os leads do client_id para obter as tags
    leads = db.query(models.WebhookLead).filter(
        models.WebhookLead.client_id == client_id
    ).all()
    
    lead_tags_map = {}
    for lead in leads:
        if lead.phone:
            clean_p = "".join(filter(str.isdigit, str(lead.phone)))
            last8 = clean_p[-8:] if len(clean_p) >= 8 else clean_p
            if last8:
                lead_tags_map[last8] = lead.tags

    serialized_items = []
    if len(virtual_items) > 0:
        serialized_items = virtual_items
    else:
        for item in items:
            clean_item_p = "".join(filter(str.isdigit, str(item.phone_number)))
            item.contact_name = contacts_map.get(clean_item_p) or trigger.contact_name
            convo_id = item.chatwoot_conversation_id or (trigger.conversation_id if not trigger.is_bulk else None)
            account_id = item.chatwoot_account_id or trigger.chatwoot_account_id
            if convo_id and account_id: item.chatwoot_url = f"{base_url}/app/accounts/{account_id}/conversations/{convo_id}"
            else: item.chatwoot_url = None
            
            last8 = clean_item_p[-8:] if len(clean_item_p) >= 8 else clean_item_p
            lead_tags = lead_tags_map.get(last8) if last8 else None

            item_dict = {
                "id": item.id,
                "trigger_id": item.trigger_id,
                "message_id": item.message_id,
                "phone_number": item.phone_number,
                "status": item.status,
                "failure_reason": item.failure_reason,
                "is_interaction": item.is_interaction,
                "message_type": item.message_type,
                "meta_price_category": item.meta_price_category,
                "meta_price_brl": item.meta_price_brl,
                "content": item.content,
                "private_note_posted": item.private_note_posted,
                "memory_webhook_status": item.memory_webhook_status,
                "memory_webhook_error": item.memory_webhook_error,
                "chatwoot_conversation_id": item.chatwoot_conversation_id,
                "chatwoot_account_id": item.chatwoot_account_id,
                "chatwoot_inbox_id": item.chatwoot_inbox_id,
                "timestamp": item.timestamp.isoformat() if item.timestamp else None,
                "updated_at": item.updated_at.isoformat() if item.updated_at else None,
                "contact_name": item.contact_name,
                "chatwoot_url": item.chatwoot_url,
                "lead_tags": lead_tags
            }
            serialized_items.append(item_dict)

    full_query = db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id == trigger_id)
    if message_type:
        if message_type == 'template': full_query = full_query.filter(models.MessageStatus.message_type == 'TEMPLATE')
        elif message_type == 'free': full_query = full_query.filter(models.MessageStatus.message_type.in_(['FREE_MESSAGE', 'DIRECT_MESSAGE']))
    
    if full_query.count() == 0 and trigger.is_bulk:
        counts = {
            "all": trigger.total_contacts or 0,
            "sent": trigger.total_sent or 0,
            "delivered": trigger.total_delivered or 0,
            "read": trigger.total_read or 0,
            "failed": trigger.total_failed or 0,
            "free": trigger.total_sent or 0,
            "template": 0,
            "blocked": trigger.total_blocked or 0,
            "interaction": trigger.total_interactions or 0,
            "private_note": trigger.total_private_notes or 0
        }
    else:
        counts = {
            "all": full_query.count(),
            "sent": full_query.filter(or_(models.MessageStatus.status.in_(['sent', 'delivered', 'read', 'interaction']), models.MessageStatus.delivered_counted == True, models.MessageStatus.read_counted == True)).count(),
            "delivered": full_query.filter(or_(models.MessageStatus.status.in_(['delivered', 'read', 'interaction']), models.MessageStatus.delivered_counted == True, models.MessageStatus.is_interaction == True)).count(),
            "read": full_query.filter(or_(models.MessageStatus.status.in_(['read', 'interaction']), models.MessageStatus.is_interaction == True, models.MessageStatus.read_counted == True)).count(),
            "failed": full_query.filter(models.MessageStatus.status == 'failed').count(),
            "free": full_query.filter(models.MessageStatus.message_type.in_(['FREE_MESSAGE', 'DIRECT_MESSAGE'])).count(),
            "template": full_query.filter(models.MessageStatus.message_type == 'TEMPLATE').count(),
            "blocked": full_query.filter(models.MessageStatus.failure_reason == 'BLOCKED_VIA_BUTTON').count(),
            "interaction": full_query.filter(or_(models.MessageStatus.is_interaction == True, models.MessageStatus.interaction_counted == True)).count(),
            "private_note": full_query.filter(models.MessageStatus.private_note_posted == True).count()
        }

    return {"items": serialized_items, "counts": counts, "total": total}

@router.get("/{trigger_id}/failures-csv", summary="Exportar Falhas CSV")
def export_failures_csv(trigger_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    failures = db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id == trigger_id, models.MessageStatus.status == 'failed').all()
    if not failures: raise HTTPException(status_code=404, detail="Nenhuma falha encontrada")

    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(['Telefone', 'Motivo da Falha', 'Data'])
    for fail in failures:
        writer.writerow([fail.phone_number, fail.failure_reason or "Erro desconhecido", fail.updated_at.strftime("%d/%m/%Y %H:%M:%S") if fail.updated_at else "-"])
    
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=falhas_disparo_{trigger_id}.csv"})

@router.get("/{trigger_id}/failures", summary="Listar Falhas JSON")
def list_failures_json(trigger_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    failures = db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id == trigger_id, models.MessageStatus.status == 'failed').all()
    result = []
    for f in failures:
        # Normalizar failure_reason: pode ser booleano True, None ou string
        reason = f.failure_reason
        if reason is None or reason == '' or reason is True or str(reason).lower() in ('true', 'false', 'none'):
            reason = "Erro desconhecido (sem detalhe registrado)"
        # Usar updated_at individual de cada registro, fallback para timestamp
        dt = f.updated_at or f.timestamp
        time_str = dt.isoformat() if dt else None
        result.append({"phone": f.phone_number, "reason": str(reason), "time": time_str})
    return result

@router.get("/{aggregator_id}/details", summary="Detalhes do Agregador")
def get_aggregator_details(aggregator_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    aggregator = db.query(models.ScheduledTrigger).get(aggregator_id)
    if not aggregator: raise HTTPException(status_code=404, detail="Agregador não encontrado")
    if not aggregator.is_bulk: return [aggregator]
    return db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.client_id == aggregator.client_id, models.ScheduledTrigger.template_name == "HIDDEN_CHILD", models.ScheduledTrigger.funnel_id == aggregator.funnel_id).order_by(models.ScheduledTrigger.updated_at.desc()).limit(200).all()

@router.get("/{trigger_id}/children", response_model=List[schemas.ScheduledTrigger], summary="Listar Funis Filhos")
def list_trigger_children(trigger_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    query = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id)
    if current_user.role != 'super_admin': query = query.filter(models.ScheduledTrigger.client_id == current_user.client_id)
    trigger = query.first()
    if not trigger: raise HTTPException(status_code=404, detail="Disparo não encontrado.")
    
    children = db.query(models.ScheduledTrigger).options(joinedload(models.ScheduledTrigger.funnel)).filter(models.ScheduledTrigger.parent_id == trigger_id).order_by(models.ScheduledTrigger.created_at.desc()).all()
    for child in children:
        if child.sent_as is None and child.messages:
            from sqlalchemy import func
            first_msg = db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id == child.id).order_by(models.MessageStatus.id).first()
            if first_msg and first_msg.message_type: child.sent_as = first_msg.message_type
        child.child_count = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.parent_id == child.id).count()
        child.interaction_child_count = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.parent_id == child.id, models.ScheduledTrigger.is_interaction == True).count()
        child.block_child_count = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.parent_id == child.id, models.ScheduledTrigger.skip_block_check == True).count()
        child.total_private_notes = db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id == child.id, models.MessageStatus.private_note_posted == True).count()
    return children

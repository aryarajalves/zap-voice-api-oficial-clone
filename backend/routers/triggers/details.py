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
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id, models.ScheduledTrigger.client_id == client_id).first()
    
    if not trigger: raise HTTPException(status_code=404, detail="Disparo não encontrado")
        
    base_query = db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id == trigger_id)
    
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
        if message_type == 'template': base_query = base_query.filter(models.MessageStatus.message_type == 'TEMPLATE')
        elif message_type == 'free': base_query = base_query.filter(models.MessageStatus.message_type.in_(['FREE_MESSAGE', 'DIRECT_MESSAGE']))

    items = base_query.order_by(models.MessageStatus.updated_at.desc()).all()
    
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

    for item in items:
        clean_item_p = "".join(filter(str.isdigit, str(item.phone_number)))
        item.contact_name = contacts_map.get(clean_item_p) or trigger.contact_name
        convo_id = item.chatwoot_conversation_id or (trigger.conversation_id if not trigger.is_bulk else None)
        account_id = item.chatwoot_account_id or trigger.chatwoot_account_id
        if convo_id and account_id: item.chatwoot_url = f"{base_url}/app/accounts/{account_id}/conversations/{convo_id}"
        else: item.chatwoot_url = None

    full_query = db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id == trigger_id)
    if message_type:
        if message_type == 'template': full_query = full_query.filter(models.MessageStatus.message_type == 'TEMPLATE')
        elif message_type == 'free': full_query = full_query.filter(models.MessageStatus.message_type.in_(['FREE_MESSAGE', 'DIRECT_MESSAGE']))
    
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

    return {"items": items, "counts": counts}

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
    return [{"phone": f.phone_number, "reason": f.failure_reason or "Erro desconhecido", "time": f.updated_at} for f in failures]

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
    return children

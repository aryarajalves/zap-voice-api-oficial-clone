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
async def get_trigger_messages(
    trigger_id: int,
    status_filter: Optional[str] = None,
    message_type: Optional[str] = None,
    failure_reason: Optional[str] = None,
    search_phone: Optional[str] = None,
    filter_ddi: Optional[str] = None,
    filter_ddd: Optional[str] = None,
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
    
    base_query = db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id.in_(all_trigger_ids))
    
    # Guardar cópia da query base antes de aplicar filtros específicos para calcular a contagem total correta de cada tab
    counts_query = base_query
    
    # Extract unique failure reasons from the database for these triggers
    reasons_filter_cond = models.MessageStatus.status == 'failed'
    if status_filter == 'blocked':
        reasons_filter_cond = models.MessageStatus.failure_reason == 'BLOCKED_VIA_BUTTON'
    elif status_filter == 'failed':
        from sqlalchemy import and_
        reasons_filter_cond = and_(
            models.MessageStatus.status == 'failed',
            or_(
                models.MessageStatus.failure_reason == None,
                models.MessageStatus.failure_reason != 'BLOCKED_VIA_BUTTON'
            )
        )
 
    reasons_query = db.query(models.MessageStatus.failure_reason).\
        filter(models.MessageStatus.trigger_id.in_(all_trigger_ids), reasons_filter_cond, models.MessageStatus.failure_reason != None, models.MessageStatus.failure_reason != '')
    unique_reasons = sorted(list(set([r[0] for r in reasons_query.distinct().all() if r[0]])))
 
    if status_filter:
        if status_filter == 'delivered':
            base_query = base_query.filter(or_(models.MessageStatus.status.in_(['delivered', 'read', 'interaction']), models.MessageStatus.delivered_counted == True, models.MessageStatus.is_interaction == True))
        elif status_filter == 'read':
            base_query = base_query.filter(or_(models.MessageStatus.status.in_(['read', 'interaction']), models.MessageStatus.is_interaction == True, models.MessageStatus.read_counted == True))
        elif status_filter == 'failed':
            base_query = db.query(models.MessageStatus).filter(
                models.MessageStatus.trigger_id.in_(all_trigger_ids),
                models.MessageStatus.status == 'failed',
                or_(
                    models.MessageStatus.failure_reason == None,
                    models.MessageStatus.failure_reason != 'BLOCKED_VIA_BUTTON'
                )
            )
        elif status_filter == 'sent':
            base_query = base_query.filter(
                or_(
                    models.MessageStatus.status.in_(['sent', 'delivered', 'read', 'interaction']),
                    models.MessageStatus.delivered_counted == True,
                    models.MessageStatus.read_counted == True
                ),
                or_(
                    models.MessageStatus.failure_reason == None,
                    models.MessageStatus.failure_reason != 'BLOCKED_VIA_BUTTON'
                )
            )
        elif status_filter == 'queue':
            base_query = db.query(models.MessageStatus).filter(
                models.MessageStatus.trigger_id.in_(all_trigger_ids),
                models.MessageStatus.status == 'sent',
                models.MessageStatus.delivered_counted == False,
                models.MessageStatus.read_counted == False
            )
        elif status_filter == 'blocked':
            base_query = base_query.filter(models.MessageStatus.failure_reason == 'BLOCKED_VIA_BUTTON')
        elif status_filter in ('interaction', 'interactions'):
            if trigger.is_bulk:
                interaction_phones = db.query(models.MessageStatus.phone_number).filter(
                    models.MessageStatus.trigger_id.in_(all_trigger_ids),
                    or_(models.MessageStatus.is_interaction == True, models.MessageStatus.interaction_counted == True),
                    or_(models.MessageStatus.failure_reason == None, models.MessageStatus.failure_reason != 'BLOCKED_VIA_BUTTON')
                ).distinct().all()
                interaction_phones = [p[0] for p in interaction_phones if p[0]]
                base_query = base_query.filter(models.MessageStatus.phone_number.in_(interaction_phones))
            else:
                base_query = base_query.filter(or_(models.MessageStatus.is_interaction == True, models.MessageStatus.interaction_counted == True), or_(models.MessageStatus.failure_reason == None, models.MessageStatus.failure_reason != 'BLOCKED_VIA_BUTTON'))
        elif status_filter == 'skipped':
            base_query = base_query.filter(models.MessageStatus.status == 'skipped')
        elif status_filter == 'private_note':
            base_query = base_query.filter(models.MessageStatus.private_note_posted == True)

    if failure_reason and failure_reason != 'all':
        base_query = base_query.filter(models.MessageStatus.failure_reason == failure_reason)

    if message_type:
        if message_type == 'template': 
            base_query = base_query.filter(models.MessageStatus.message_type == 'TEMPLATE')
        elif message_type == 'free': 
            base_query = base_query.filter(models.MessageStatus.message_type.in_(['FREE_MESSAGE', 'DIRECT_MESSAGE']))

    # Filtros de Busca por Telefone, DDI e DDD
    if search_phone:
        # Remove caracteres não numéricos para garantir comparação correta
        clean_search = "".join(filter(str.isdigit, search_phone))
        if clean_search:
            base_query = base_query.filter(models.MessageStatus.phone_number.like(f"%{clean_search}%"))
            
    if filter_ddi:
        clean_ddi = "".join(filter(str.isdigit, filter_ddi))
        if clean_ddi:
            if clean_ddi == '55':
                from sqlalchemy import func
                base_query = base_query.filter(or_(
                    models.MessageStatus.phone_number.like("55%"),
                    func.length(models.MessageStatus.phone_number) == 10,
                    func.length(models.MessageStatus.phone_number) == 11
                ))
            else:
                base_query = base_query.filter(models.MessageStatus.phone_number.like(f"{clean_ddi}%"))
            
    if filter_ddd:
        clean_ddd = "".join(filter(str.isdigit, filter_ddd))
        if clean_ddd:
            if filter_ddi:
                clean_ddi = "".join(filter(str.isdigit, filter_ddi))
                base_query = base_query.filter(models.MessageStatus.phone_number.like(f"{clean_ddi}{clean_ddd}%"))
            else:
                base_query = base_query.filter(or_(
                    models.MessageStatus.phone_number.like(f"55{clean_ddd}%"),
                    models.MessageStatus.phone_number.like(f"1{clean_ddd}%"),
                    models.MessageStatus.phone_number.like(f"351{clean_ddd}%"),
                    models.MessageStatus.phone_number.like(f"34{clean_ddd}%"),
                    models.MessageStatus.phone_number.like(f"54{clean_ddd}%"),
                    models.MessageStatus.phone_number.like(f"52{clean_ddd}%"),
                    models.MessageStatus.phone_number.like(f"44{clean_ddd}%"),
                    models.MessageStatus.phone_number.like(f"39{clean_ddd}%"),
                    models.MessageStatus.phone_number.like(f"33{clean_ddd}%"),
                    models.MessageStatus.phone_number.like(f"49{clean_ddd}%"),
                    models.MessageStatus.phone_number.like(f"56{clean_ddd}%"),
                    models.MessageStatus.phone_number.like(f"57{clean_ddd}%"),
                    models.MessageStatus.phone_number.like(f"598{clean_ddd}%"),
                    models.MessageStatus.phone_number.like(f"595{clean_ddd}%"),
                    models.MessageStatus.phone_number.like(f"{clean_ddd}%")
                ))

    if trigger.is_bulk:
        from sqlalchemy import func
        subquery = base_query.with_entities(func.max(models.MessageStatus.id)).group_by(models.MessageStatus.phone_number)
        base_query = db.query(models.MessageStatus).filter(models.MessageStatus.id.in_(subquery))

    total = base_query.count()
    items = base_query.order_by(models.MessageStatus.updated_at.desc()).offset(skip).limit(limit).all()
    
    # Fallback virtual para quando não há registros no MessageStatus (por ex: disparos de funil antigos ou em lote em andamento)
    virtual_items = []
    if total == 0 and trigger.is_bulk:
        children = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.parent_id == trigger_id).all()
        if children:
            for child in children:
                # Collect failure reason from virtual items if failed
                if child.status == 'failed' and child.failure_reason:
                    if child.failure_reason not in unique_reasons:
                        unique_reasons.append(child.failure_reason)

                # Filtrar pelo status solicitado se aplicável
                if status_filter == 'failed' and child.status not in ('failed', 'aborted', 'cancelled'):
                    continue
                if status_filter in ('delivered', 'read') and child.status not in ('completed', 'processing'):
                    continue
                if status_filter in ('interaction', 'interactions') and not child.is_interaction:
                    continue
                if status_filter == 'blocked' and not child.skip_block_check:
                    continue
                
                # Filter virtual items by failure reason if requested
                if failure_reason and failure_reason != 'all' and child.failure_reason != failure_reason:
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
                    "lead_tags": None,
                    "failure_resolution": None,
                    "failure_resolved_at": None
                })
        elif trigger.contacts_list and status_filter in (None, 'all', 'total') and (trigger.total_sent or 0) == 0:
            raw = trigger.contacts_list or []
            for idx, c in enumerate(raw):
                phone = c if isinstance(c, str) else (c.get('phone') or c.get('whatsapp') or c.get('telefone') or c.get('number') or '')
                name = '' if isinstance(c, str) else (c.get('nome') or c.get('name') or c.get('full_name') or c.get('{{1}}') or c.get('1') or '')
                if not phone: continue

                clean_p = "".join(filter(str.isdigit, str(phone)))
                if search_phone and clean_p and "".join(filter(str.isdigit, search_phone)) not in clean_p:
                    continue
                if filter_ddi and clean_p and not clean_p.startswith("".join(filter(str.isdigit, filter_ddi))):
                    continue
                if filter_ddd:
                    c_ddd = "".join(filter(str.isdigit, filter_ddd))
                    if clean_p and not (clean_p.startswith(f"55{c_ddd}") or clean_p.startswith(c_ddd)):
                        continue

                virtual_items.append({
                    "id": idx + 1,
                    "trigger_id": trigger_id,
                    "message_id": f"virtual_raw_{idx+1}",
                    "phone_number": str(phone),
                    "status": "pending",
                    "failure_reason": None,
                    "is_interaction": False,
                    "message_type": "TEMPLATE" if trigger.template_name else "FREE_MESSAGE",
                    "meta_price_category": None,
                    "meta_price_brl": 0.0,
                    "content": trigger.template_name or "Disparo em Massa",
                    "private_note_posted": False,
                    "memory_webhook_status": None,
                    "memory_webhook_error": None,
                    "chatwoot_conversation_id": None,
                    "chatwoot_account_id": trigger.chatwoot_account_id,
                    "chatwoot_inbox_id": trigger.chatwoot_inbox_id,
                    "timestamp": trigger.created_at.isoformat() if trigger.created_at else None,
                    "updated_at": trigger.created_at.isoformat() if trigger.created_at else None,
                    "contact_name": name or str(phone),
                    "chatwoot_url": None,
                    "lead_tags": None,
                    "failure_resolution": None,
                    "failure_resolved_at": None
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

    # Extrair os sufixos de telefone dos itens da página atual para buscar tags apenas deles
    target_items = virtual_items if len(virtual_items) > 0 else items
    page_phone_suffixes = set()
    for item in target_items:
        p = item.get("phone_number") if isinstance(item, dict) else getattr(item, "phone_number", None)
        if p:
            clean_p = "".join(filter(str.isdigit, str(p)))
            if clean_p:
                page_phone_suffixes.add(clean_p[-8:] if len(clean_p) >= 8 else clean_p)

    lead_tags_map = {}
    if page_phone_suffixes:
        like_conds = [models.WebhookLead.phone.like(f"%{suf}") for suf in page_phone_suffixes]
        leads = db.query(models.WebhookLead.phone, models.WebhookLead.tags).filter(
            models.WebhookLead.client_id == client_id,
            or_(*like_conds)
        ).all()
        for lead_phone, tags in leads:
            if lead_phone:
                clean_p = "".join(filter(str.isdigit, str(lead_phone)))
                last8 = clean_p[-8:] if len(clean_p) >= 8 else clean_p
                if last8:
                    lead_tags_map[last8] = tags

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
                "lead_tags": lead_tags,
                "failure_resolution": item.failure_resolution,
                "failure_resolved_at": item.failure_resolved_at.isoformat() if item.failure_resolved_at else None
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
            "private_note": trigger.total_private_notes or 0,
            "queue": max(0, (trigger.total_sent or 0) - (trigger.total_delivered or 0) - (trigger.total_failed or 0))
        }
    else:
        # Se for bulk, calcular contadores baseado na query agrupada por telefone para garantir contagens únicas
        from sqlalchemy import and_
        if trigger.is_bulk:
            # Para bulk: usar os valores já salvos pelo reconcile no trigger.
            # Isso garante que os números nos tabs do modal são IDÊNTICOS aos dos ícones
            # da linha, sem recalcular com lógica SQL diferente que pode divergir.
            # Campos não armazenados no trigger (free, template, private_note) ainda são
            # calculados via SQL.
            counts = {
                "all": trigger.total_contacts or counts_query.count(),
                "sent": trigger.total_sent or 0,
                "delivered": trigger.total_delivered or 0,
                "read": trigger.total_read or 0,
                "failed": trigger.total_failed or 0,
                "blocked": trigger.total_blocked or 0,
                "skipped": trigger.total_skipped or 0,
                "interaction": trigger.total_interactions or 0,
                "queue": getattr(trigger, "queue_count", None) if getattr(trigger, "queue_count", None) is not None else max(0, (trigger.total_sent or 0) - (trigger.total_delivered or 0) - (trigger.total_failed or 0)),
                "free": counts_query.filter(models.MessageStatus.message_type.in_(['FREE_MESSAGE', 'DIRECT_MESSAGE'])).count(),
                "template": counts_query.filter(models.MessageStatus.message_type == 'TEMPLATE').count(),
                "private_note": trigger.total_private_notes or 0,
            }
        else:
            counts = {
                "all": full_query.count(),
                "sent": full_query.filter(or_(
                    models.MessageStatus.status.in_(['sent', 'delivered', 'read', 'interaction']),
                    models.MessageStatus.delivered_counted == True,
                    models.MessageStatus.read_counted == True
                )).count(),
                "delivered": full_query.filter(or_(
                    models.MessageStatus.status.in_(['delivered', 'read', 'interaction']),
                    models.MessageStatus.delivered_counted == True,
                    models.MessageStatus.is_interaction == True
                )).count(),
                "read": full_query.filter(or_(
                    models.MessageStatus.status.in_(['read', 'interaction']),
                    models.MessageStatus.read_counted == True,
                    and_(models.MessageStatus.is_interaction == True, models.MessageStatus.status != 'sent')
                )).count(),
                "failed": full_query.filter(models.MessageStatus.status == 'failed', or_(models.MessageStatus.failure_reason == None, models.MessageStatus.failure_reason != 'BLOCKED_VIA_BUTTON')).count(),
                "free": full_query.filter(models.MessageStatus.message_type.in_(['FREE_MESSAGE', 'DIRECT_MESSAGE'])).count(),
                "template": full_query.filter(models.MessageStatus.message_type == 'TEMPLATE').count(),
                "blocked": full_query.filter(models.MessageStatus.failure_reason == 'BLOCKED_VIA_BUTTON').count(),
                "skipped": full_query.filter(models.MessageStatus.status == 'skipped').count(),
                "interaction": full_query.filter(or_(models.MessageStatus.is_interaction == True, models.MessageStatus.interaction_counted == True)).count(),
                "private_note": full_query.filter(models.MessageStatus.private_note_posted == True).count(),
                "queue": 0 if trigger.status in ['completed', 'failed', 'cancelled', 'processed', 'aborted'] else full_query.filter(models.MessageStatus.status == 'sent', models.MessageStatus.delivered_counted == False, models.MessageStatus.read_counted == False).count()
            }

    return {"items": serialized_items, "counts": counts, "total": total, "failure_reasons": unique_reasons}

@router.get("/{trigger_id}/failures-csv", summary="Exportar Falhas CSV")
def export_failures_csv(trigger_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    failures = db.query(models.MessageStatus).filter(
        models.MessageStatus.trigger_id == trigger_id,
        models.MessageStatus.status == 'failed',
        or_(
            models.MessageStatus.failure_reason == None,
            ~models.MessageStatus.failure_reason.in_(['BLOCKED_VIA_BUTTON', 'Lista de Exclusão (Bloqueado)'])
        )
    ).all()
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
    failures = db.query(models.MessageStatus).filter(
        models.MessageStatus.trigger_id == trigger_id,
        models.MessageStatus.status == 'failed',
        or_(
            models.MessageStatus.failure_reason == None,
            ~models.MessageStatus.failure_reason.in_(['BLOCKED_VIA_BUTTON', 'Lista de Exclusão (Bloqueado)'])
        )
    ).all()
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

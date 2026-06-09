from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
import models, schemas
from core.deps import get_current_user, get_db
from rabbitmq_client import rabbitmq

router = APIRouter()

@router.get("/{trigger_id}", response_model=schemas.ScheduledTrigger, summary="Obter detalhes de um disparo específico")
def get_trigger(
    trigger_id: int,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retorna os detalhes de um disparo específico.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    from sqlalchemy.orm import joinedload
    trigger = db.query(models.ScheduledTrigger).options(
        joinedload(models.ScheduledTrigger.funnel),
        joinedload(models.ScheduledTrigger.interaction_funnel),
        joinedload(models.ScheduledTrigger.block_funnel)
    ).filter(
        models.ScheduledTrigger.id == trigger_id,
        models.ScheduledTrigger.client_id == client_id,
        models.ScheduledTrigger.status != 'deleted_pending'
    ).first()
    
    if not trigger:
        raise HTTPException(status_code=404, detail="Disparo não encontrado ou sem permissão.")

    # Sobrescrever ou instanciar o funil a partir do snapshot para manter fidelidade histórica
    if trigger.funnel_snapshot:
        if trigger.funnel:
            trigger.funnel.steps = trigger.funnel_snapshot
        else:
            # Criar funil temporário na memória se tiver sido excluído
            trigger.funnel = models.Funnel(
                id=trigger.funnel_id or 0,
                client_id=client_id,
                name="Funil (Histórico / Excluído)",
                steps=trigger.funnel_snapshot,
                is_active=False,
                is_archived=False,
                is_pinned=False
            )

    # Resolver chatwoot_account_id se nulo
    from config_loader import get_setting
    account_id = trigger.chatwoot_account_id
    if not account_id:
        cw_acc_str = get_setting("CHATWOOT_ACCOUNT_ID", "1", client_id=client_id)
        if cw_acc_str:
            try:
                account_id = int(cw_acc_str)
            except ValueError:
                account_id = cw_acc_str
            # Persistir no banco para consultas futuras
            trigger.chatwoot_account_id = account_id
            db.commit()
            db.refresh(trigger)

    # Resolver chatwoot_url
    base_url = get_setting("CHATWOOT_URL", "https://app.chatwoot.com", client_id=client_id)
    if base_url.endswith("/"):
        base_url = base_url[:-1]
    
    # Sempre buscar logs de execução dos filhos se existirem (e.g. disparos em lote ou botões)
    child_triggers = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.parent_id == trigger.id
    ).all()
    
    if child_triggers:
        # Se o pai não tem funnel_id direto, tenta obter do primeiro filho
        if not trigger.funnel_id:
            for child in child_triggers:
                if child.funnel_id:
                    trigger.funnel_id = child.funnel_id
                    trigger.funnel = child.funnel
                    break
        
        parent_hist = list(trigger.execution_history or [])
        # Enriquecer o histórico do pai
        parent_contact_name = trigger.contact_name or trigger.contact_phone or 'Contato ZapVoice'
        parent_contact_phone = trigger.contact_phone
        enriched_parent_hist = []
        for entry in parent_hist:
            enriched_entry = entry.copy()
            if 'extra' not in enriched_entry or not isinstance(enriched_entry['extra'], dict):
                enriched_entry['extra'] = {}
            else:
                enriched_entry['extra'] = enriched_entry['extra'].copy()
            enriched_entry['extra']['contact_name'] = parent_contact_name
            enriched_entry['extra']['contact_phone'] = parent_contact_phone
            enriched_entry['extra']['trigger_id'] = trigger.id
            enriched_parent_hist.append(enriched_entry)
            
        combined_child_hist = []
        for child in child_triggers:
            child_contact_name = child.contact_name or child.contact_phone or 'Contato ZapVoice'
            child_contact_phone = child.contact_phone
            for entry in (child.execution_history or []):
                enriched_entry = entry.copy()
                if 'extra' not in enriched_entry or not isinstance(enriched_entry['extra'], dict):
                    enriched_entry['extra'] = {}
                else:
                    enriched_entry['extra'] = enriched_entry['extra'].copy()
                enriched_entry['extra']['contact_name'] = child_contact_name
                enriched_entry['extra']['contact_phone'] = child_contact_phone
                enriched_entry['extra']['trigger_id'] = child.id
                combined_child_hist.append(enriched_entry)
        
        trigger.execution_history = enriched_parent_hist + combined_child_hist
        trigger.is_bulk = True
    else:
        # Single trigger - enriquecer seu próprio histórico
        parent_hist = list(trigger.execution_history or [])
        parent_contact_name = trigger.contact_name or trigger.contact_phone or 'Contato ZapVoice'
        parent_contact_phone = trigger.contact_phone
        enriched_parent_hist = []
        for entry in parent_hist:
            enriched_entry = entry.copy()
            if 'extra' not in enriched_entry or not isinstance(enriched_entry['extra'], dict):
                enriched_entry['extra'] = {}
            else:
                enriched_entry['extra'] = enriched_entry['extra'].copy()
            enriched_entry['extra']['contact_name'] = parent_contact_name
            enriched_entry['extra']['contact_phone'] = parent_contact_phone
            enriched_entry['extra']['trigger_id'] = trigger.id
            enriched_parent_hist.append(enriched_entry)
        trigger.execution_history = enriched_parent_hist

    convo_id = trigger.conversation_id
    if convo_id and account_id:
        trigger.chatwoot_url = f"{base_url}/app/accounts/{account_id}/conversations/{convo_id}"
    else:
        trigger.chatwoot_url = None

    if trigger.button_actions:
        resolved_actions = {}
        for btn_text, action in trigger.button_actions.items():
            if isinstance(action, dict):
                act_copy = action.copy()
                funnel_id = action.get("funnel_id")
                if funnel_id:
                    funnel = db.query(models.Funnel).filter(models.Funnel.id == funnel_id).first()
                    act_copy["funnel_name"] = funnel.name if funnel else "Funil não encontrado"
                resolved_actions[btn_text] = act_copy
            else:
                resolved_actions[btn_text] = action
        trigger.button_actions = resolved_actions
        
    return trigger

@router.get("", response_model=schemas.TriggerListResponse, summary="Listar Disparos e Agendamentos")
def list_triggers(
    skip: int = 0, 
    limit: int = 100, 
    funnel_name: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    trigger_type: Optional[str] = None,
    exclude_webhooks: bool = True,
    show_technical: bool = False,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retorna lista de disparos (triggers) paginada.
    """
    from sqlalchemy.orm import joinedload
    query = db.query(models.ScheduledTrigger).options(
        joinedload(models.ScheduledTrigger.funnel),
        joinedload(models.ScheduledTrigger.interaction_funnel),
        joinedload(models.ScheduledTrigger.block_funnel)
    )
    client_id = x_client_id if x_client_id else current_user.client_id
    query = query.filter(models.ScheduledTrigger.client_id == client_id)
    
    # Sempre ocultar registros em processo de deleção suave (evita deadlocks visíveis)
    query = query.filter(models.ScheduledTrigger.status != 'deleted_pending')
    
    if exclude_webhooks:
        query = query.filter(models.ScheduledTrigger.integration_id == None)
    
    if not show_technical:
        query = query.filter(or_(
            models.ScheduledTrigger.template_name != "HIDDEN_CHILD",
            models.ScheduledTrigger.template_name == None
        ))
        query = query.filter(or_(
            models.ScheduledTrigger.product_name != "HIDDEN_CHILD",
            models.ScheduledTrigger.product_name == None
        ))
        query = query.filter(models.ScheduledTrigger.parent_id == None)
    
    if funnel_name:
        query = query.join(models.Funnel).filter(models.Funnel.name.ilike(f"%{funnel_name}%"))
    if status:
        if status == 'pending':
            query = query.filter(models.ScheduledTrigger.status.in_(['pending', 'queued', 'Queued']))
        else:
            query = query.filter(models.ScheduledTrigger.status == status)
    
    # Datas podem vir como string do Header/Form
    from datetime import datetime
    if start_date:
        try: query = query.filter(models.ScheduledTrigger.created_at >= datetime.fromisoformat(start_date))
        except: pass
    if end_date:
        try: query = query.filter(models.ScheduledTrigger.created_at <= datetime.fromisoformat(end_date))
        except: pass
    
    if trigger_type:
        if trigger_type == 'bulk':
            query = query.filter(
                models.ScheduledTrigger.is_bulk == True,
                models.ScheduledTrigger.funnel_id == None,
                models.ScheduledTrigger.is_recurring == False,
                or_(models.ScheduledTrigger.product_name != 'SCALE_TEST', models.ScheduledTrigger.product_name == None)
            )
        elif trigger_type == 'single':
            query = query.filter(
                or_(
                    models.ScheduledTrigger.funnel_id != None,
                    models.ScheduledTrigger.is_bulk == False
                ),
                models.ScheduledTrigger.is_recurring == False
            )
        elif trigger_type == 'recurring':
            query = query.filter(models.ScheduledTrigger.is_recurring == True)
        elif trigger_type == 'scale_test':
            query = query.filter(models.ScheduledTrigger.product_name == 'SCALE_TEST')

    total = query.count()
    triggers = query.order_by(models.ScheduledTrigger.created_at.desc()).offset(skip).limit(limit).all()

    # Coletar todos os funnel_ids únicos nas button_actions dos triggers retornados
    funnel_ids = set()
    for trigger in triggers:
        if trigger.button_actions:
            for btn_text, action in trigger.button_actions.items():
                if isinstance(action, dict) and action.get("funnel_id"):
                    funnel_ids.add(action.get("funnel_id"))
                    
    # Buscar os funis correspondentes de uma vez
    funnel_names = {}
    if funnel_ids:
        funnels = db.query(models.Funnel).filter(models.Funnel.id.in_(list(funnel_ids))).all()
        funnel_names = {f.id: f.name for f in funnels}

    for trigger in triggers:
        if trigger.sent_as is None and trigger.messages:
            first_msg = min(trigger.messages, key=lambda m: m.id)
            if first_msg.message_type:
                trigger.sent_as = first_msg.message_type
        
        trigger.child_count = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.parent_id == trigger.id).count()
        trigger.interaction_child_count = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.parent_id == trigger.id,
            models.ScheduledTrigger.is_interaction == True
        ).count()
        trigger.block_child_count = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.parent_id == trigger.id,
            models.ScheduledTrigger.skip_block_check == True
        ).count()
        
        # Buscar follow-up filho associado
        followup = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.parent_id == trigger.id,
            models.ScheduledTrigger.is_followup == True
        ).first()
        if followup:
            trigger.followup_status = followup.status
            trigger.followup_scheduled_time = followup.scheduled_time

        # Resolver button_actions na memória
        if trigger.button_actions:
            resolved_actions = {}
            for btn_text, action in trigger.button_actions.items():
                if isinstance(action, dict):
                    act_copy = action.copy()
                    funnel_id = action.get("funnel_id")
                    if funnel_id:
                        act_copy["funnel_name"] = funnel_names.get(funnel_id, "Funil não encontrado")
                    resolved_actions[btn_text] = act_copy
                else:
                    resolved_actions[btn_text] = action
            trigger.button_actions = resolved_actions

    return {"items": triggers, "total": total}

@router.delete("/{trigger_id}", summary="Excluir Registro de Disparo")
async def delete_trigger(trigger_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Remove permanentemente o histórico de um disparo.
    """
    if current_user.role not in ['super_admin', 'admin']:
        raise HTTPException(status_code=403, detail="Apenas administradores podem excluir históricos")

    trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id).first()
    
    if not trigger:
        raise HTTPException(status_code=404, detail="Trigger not found")

    if current_user.role == 'admin' and trigger.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Capturar o client_id real do registro antes de deletar
    target_client_id = trigger.client_id
    
    if trigger.status == 'processing':
        # Se está processando, apenas marcamos para sumir da UI e sinalizar o worker
        trigger.status = 'deleted_pending'
    else:
        db.delete(trigger)
        
    db.commit()
    
    # Notificar via WebSocket usando o client_id do registro (corrige bug do Super Admin)
    await rabbitmq.publish_event("trigger_deleted", {
        "trigger_id": trigger_id,
        "client_id": target_client_id
    })
    
    return {"message": "Historic record deleted"}

@router.post("/bulk-delete", summary="Excluir múltiplos registros de disparo")
async def bulk_delete_triggers(
    payload: schemas.BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Exclui vários registros de uma vez usando uma única transação.
    """
    if current_user.role not in ['super_admin', 'admin']:
        raise HTTPException(status_code=403, detail="Apenas administradores podem excluir históricos")

    triggers = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id.in_(payload.ids)).all()
    
    if not triggers:
        return {"message": "Nenhum registro encontrado", "deleted_count": 0}

    deleted_count = 0
    for trigger in triggers:
        # Segurança: Admin comum só apaga do seu próprio cliente
        if current_user.role == 'admin' and trigger.client_id != current_user.client_id:
            continue
            
        t_id = trigger.id
        t_client_id = trigger.client_id
        
        if trigger.status == 'processing':
            # Se está processando, apenas marcamos para sumir da UI e sinalizar o worker
            # Isso evita o Deadlock brutal com o Worker que está tentando dar lock na mesma linha
            trigger.status = 'deleted_pending'
            db.flush()
        else:
            db.delete(trigger)
            deleted_count += 1
        
        # Notificar exclusão individual para atualização reativa da UI
        # Mesmo que seja soft delete, avisamos a UI para remover da lista
        await rabbitmq.publish_event("trigger_deleted", {
            "trigger_id": t_id,
            "client_id": t_client_id
        })

    db.commit()
    return {"message": f"{deleted_count} registros excluídos com sucesso", "deleted_count": deleted_count}

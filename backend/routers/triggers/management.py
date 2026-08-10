from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional
import models, schemas
from core.deps import get_current_user, get_db
from core.logger import logger
from rabbitmq_client import rabbitmq

router = APIRouter()

@router.get("/{trigger_id}", response_model=schemas.ScheduledTrigger, summary="Obter detalhes de um disparo específico")
async def get_trigger(
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

    # Reconciliar estatísticas dinamicamente antes de retornar os detalhes do disparo
    from services.triggers_service import reconcile_trigger_stats_logic
    try:
        await reconcile_trigger_stats_logic(trigger.id, client_id, db)
    except Exception:
        pass

    db.refresh(trigger)

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
        
    if not trigger.waba_card_last4:
        card_setting = db.query(models.AppConfig).filter(
            models.AppConfig.client_id == trigger.client_id,
            models.AppConfig.key == "WA_WABA_CARD_LAST4"
        ).first()
        if card_setting and card_setting.value:
            trigger.waba_card_last4 = card_setting.value.strip()

    if trigger.template_name:
        clean_tmpl = trigger.template_name.split('|')[0].strip()
        tmpl_cache = db.query(models.WhatsAppTemplateCache).filter(
            models.WhatsAppTemplateCache.client_id == trigger.client_id,
            models.WhatsAppTemplateCache.name == clean_tmpl
        ).first()
        if tmpl_cache and tmpl_cache.category:
            trigger.template_category = tmpl_cache.category

    return trigger

@router.get("", response_model=schemas.TriggerListResponse, summary="Listar Disparos e Agendamentos")
async def list_triggers(
    skip: int = 0, 
    limit: int = 100, 
    funnel_name: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    trigger_type: Optional[str] = None,
    exclude_webhooks: bool = True,
    show_technical: bool = False,
    pinned_only: bool = False,
    folder_id: Optional[int] = None,
    sort_by: Optional[str] = None,
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
        joinedload(models.ScheduledTrigger.block_funnel),
        joinedload(models.ScheduledTrigger.folder)
    )
    client_id = x_client_id if x_client_id else current_user.client_id
    try:
        from services.bulk import sync_queued_dynamic_triggers
        await sync_queued_dynamic_triggers(db, client_id)
    except Exception as e_sync:
        pass

    query = query.filter(models.ScheduledTrigger.client_id == client_id)

    # Sempre ocultar registros em processo de deleção suave (evita deadlocks visíveis)
    query = query.filter(models.ScheduledTrigger.status != 'deleted_pending')


    if pinned_only:
        query = query.filter(models.ScheduledTrigger.is_pinned == True)

    if folder_id is not None:
        query = query.filter(models.ScheduledTrigger.folder_id == folder_id)

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
                models.ScheduledTrigger.is_recurring == False
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
            query = query.filter(
                or_(
                    models.ScheduledTrigger.product_name == 'SCALE_TEST',
                    models.ScheduledTrigger.is_stress_test == True
                )
            )

    total = query.count()
    # Alguns registros antigos/em massa têm is_pinned NULL em vez de FALSE (não passaram
    # pelo default do ORM). No Postgres, NULL vem ANTES de TRUE em ORDER BY ... DESC,
    # então sem o coalesce os não-fixados (NULL) furariam a frente dos fixados.
    # Ordenação flexível (maiores disparos x mais recentes)
    if sort_by == 'largest':
        triggers = query.order_by(
            func.coalesce(models.ScheduledTrigger.is_pinned, False).desc(),
            models.ScheduledTrigger.total_contacts.desc(),
            models.ScheduledTrigger.created_at.desc()
        ).offset(skip).limit(limit).all()
    else:
        triggers = query.order_by(
            func.coalesce(models.ScheduledTrigger.is_pinned, False).desc(),
            models.ScheduledTrigger.created_at.desc()
        ).offset(skip).limit(limit).all()

    # Coletar todos os funnel_ids únicos nas button_actions dos triggers retornados
    funnel_ids = set()
    for trigger in triggers:
        if trigger.button_actions:
            for btn_text, action in trigger.button_actions.items():
                if isinstance(action, dict) and action.get("funnel_id"):
                    funnel_ids.add(action.get("funnel_id"))
                    
    # Buscar mapa de funis para button_actions
    funnel_names = {}
    if funnel_ids:
        fn_rows = db.query(models.Funnel.id, models.Funnel.name).filter(models.Funnel.id.in_(list(funnel_ids))).all()
        funnel_names = {f[0]: f[1] for f in fn_rows}

    # Buscar configuração dos últimos 4 dígitos do cartão WABA do cliente
    card_setting = db.query(models.AppConfig).filter(
        models.AppConfig.client_id == client_id,
        models.AppConfig.key == "WA_WABA_CARD_LAST4"
    ).first()
    card_last4_val = card_setting.value.strip() if (card_setting and card_setting.value) else None

    # Buscar mapa de categorias de templates do cliente para resolver de uma vez
    tmpl_caches = db.query(models.WhatsAppTemplateCache.name, models.WhatsAppTemplateCache.category).filter(
        models.WhatsAppTemplateCache.client_id == client_id
    ).all()
    tmpl_cat_map = {tc[0]: tc[1] for tc in tmpl_caches if tc[0]}

    # Otimização N+1: Pré-buscar dados em lote para todos os disparos da página
    trigger_ids = [t.id for t in triggers]
    child_counts_map = {}
    interaction_child_counts_map = {}
    block_child_counts_map = {}
    followups_map = {}
    queue_counts_map = {}
    failed_counts_map = {}

    if trigger_ids:
        try:
            # 1. Busca agrupada de contagem de filhos
            c_rows = db.query(
                models.ScheduledTrigger.parent_id,
                func.count(models.ScheduledTrigger.id)
            ).filter(
                models.ScheduledTrigger.parent_id.in_(trigger_ids)
            ).group_by(models.ScheduledTrigger.parent_id).all()
            child_counts_map = {r[0]: r[1] for r in c_rows}

            # 2. Busca agrupada de contagem de interações filhas
            ic_rows = db.query(
                models.ScheduledTrigger.parent_id,
                func.count(models.ScheduledTrigger.id)
            ).filter(
                models.ScheduledTrigger.parent_id.in_(trigger_ids),
                models.ScheduledTrigger.is_interaction == True
            ).group_by(models.ScheduledTrigger.parent_id).all()
            interaction_child_counts_map = {r[0]: r[1] for r in ic_rows}

            # 3. Busca agrupada de contagem de bloqueios filhos
            bc_rows = db.query(
                models.ScheduledTrigger.parent_id,
                func.count(models.ScheduledTrigger.id)
            ).filter(
                models.ScheduledTrigger.parent_id.in_(trigger_ids),
                models.ScheduledTrigger.skip_block_check == True
            ).group_by(models.ScheduledTrigger.parent_id).all()
            block_child_counts_map = {r[0]: r[1] for r in bc_rows}

            # 4. Busca em lote de follow-ups filhos
            fu_rows = db.query(models.ScheduledTrigger).filter(
                models.ScheduledTrigger.parent_id.in_(trigger_ids),
                models.ScheduledTrigger.is_followup == True
            ).all()
            followups_map = {f.parent_id: f for f in fu_rows}

            bulk_triggers = [t for t in triggers if t.is_bulk]
            if bulk_triggers:
                bulk_ids = [t.id for t in bulk_triggers]
                # Buscar IDs de disparos filhos para incluir no cálculo das estatísticas do lote
                child_records = db.query(models.ScheduledTrigger.id, models.ScheduledTrigger.parent_id).filter(
                    models.ScheduledTrigger.parent_id.in_(bulk_ids)
                ).all()

                parent_map = {t_id: t_id for t_id in bulk_ids}
                for c_id, p_id in child_records:
                    parent_map[c_id] = p_id

                all_bulk_target_ids = list(parent_map.keys())

                from sqlalchemy import func as sqlfunc, select
                # 1. Fila de envio (queue)
                base_queue_q = db.query(models.MessageStatus).filter(
                    models.MessageStatus.trigger_id.in_(all_bulk_target_ids),
                    models.MessageStatus.status == 'sent',
                    models.MessageStatus.delivered_counted == False,
                    models.MessageStatus.read_counted == False
                )

                subq = base_queue_q.with_entities(
                    models.MessageStatus.trigger_id.label("trig_id"),
                    models.MessageStatus.phone_number.label("phone"),
                    sqlfunc.max(models.MessageStatus.id).label("max_id")
                ).group_by(models.MessageStatus.trigger_id, models.MessageStatus.phone_number).subquery()

                queue_items = db.query(subq.c.trig_id, subq.c.phone).all()
                queue_phones_by_parent = {}
                for t_id, phone in queue_items:
                    p_id = parent_map.get(t_id)
                    if p_id:
                        if p_id not in queue_phones_by_parent:
                            queue_phones_by_parent[p_id] = set()
                        queue_phones_by_parent[p_id].add(phone)

                for p_id, phone_set in queue_phones_by_parent.items():
                    queue_counts_map[p_id] = len(phone_set)

                # 2. Cálculo de falhas (total_failed) agregando pai + filhos
                base_failed_q = db.query(models.MessageStatus).filter(
                    models.MessageStatus.trigger_id.in_(all_bulk_target_ids),
                    models.MessageStatus.status == 'failed',
                    or_(models.MessageStatus.failure_reason == None, models.MessageStatus.failure_reason != 'BLOCKED_VIA_BUTTON')
                )
                subq_failed = base_failed_q.with_entities(
                    models.MessageStatus.trigger_id.label("trig_id"),
                    models.MessageStatus.phone_number.label("phone"),
                    sqlfunc.max(models.MessageStatus.id).label("max_id")
                ).group_by(models.MessageStatus.trigger_id, models.MessageStatus.phone_number).subquery()

                failed_items = db.query(subq_failed.c.trig_id, subq_failed.c.phone).all()
                failed_phones_by_parent = {}
                for t_id, phone in failed_items:
                    p_id = parent_map.get(t_id)
                    if p_id:
                        if p_id not in failed_phones_by_parent:
                            failed_phones_by_parent[p_id] = set()
                        failed_phones_by_parent[p_id].add(phone)

                for p_id, phone_set in failed_phones_by_parent.items():
                    failed_counts_map[p_id] = len(phone_set)

        except Exception as e_batch:
            logger.error(f"⚠️ Erro ao pré-buscar estatísticas em lote: {e_batch}")

    for trigger in triggers:
        if not trigger.waba_card_last4 and card_last4_val:
            trigger.waba_card_last4 = card_last4_val

        if trigger.template_name:
            clean_tmpl = trigger.template_name.split('|')[0].strip()
            trigger.template_category = tmpl_cat_map.get(clean_tmpl)

        trigger.child_count = child_counts_map.get(trigger.id, 0)
        trigger.interaction_child_count = interaction_child_counts_map.get(trigger.id, 0)
        trigger.block_child_count = block_child_counts_map.get(trigger.id, 0)
        
        if trigger.is_bulk:
            trigger.queue_count = queue_counts_map.get(trigger.id, 0)
            if trigger.id in failed_counts_map:
                trigger.total_failed = failed_counts_map[trigger.id]

        # Preencher follow-up filho a partir do mapa pré-buscado
        followup = followups_map.get(trigger.id)
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

@router.patch("/{trigger_id}/pin", summary="Fixar/Desafixar Disparo no Topo")
async def toggle_pin_trigger(
    trigger_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id).first()
    if not trigger:
        raise HTTPException(status_code=404, detail="Disparo não encontrado")
    if current_user.role == 'admin' and trigger.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    trigger.is_pinned = not bool(trigger.is_pinned)
    db.commit()
    return {"id": trigger_id, "is_pinned": trigger.is_pinned}


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
    
    if trigger.status in ('processing', 'cancelling', 'paused'):
        # Se ainda está ativo/em encerramento, soft-delete: marca para o worker finalizar e limpar
        trigger.status = 'deleted_pending'
    else:
        # Hard delete em cascata: remove MessageStatus associados primeiro
        db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id == trigger_id).delete(synchronize_session=False)
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
        
        if trigger.status in ('processing', 'cancelling', 'paused'):
            # Soft-delete: evita deadlock com worker ativo
            trigger.status = 'deleted_pending'
            db.flush()
        else:
            db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id == trigger.id).delete(synchronize_session=False)
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


@router.patch("/{trigger_id}/update-params", summary="Atualizar parâmetros do disparo (delay, concorrência, horário e contatos)")
async def update_trigger_params(
    trigger_id: int,
    payload: schemas.UpdateTriggerParamsRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id).first()
    if not trigger:
        raise HTTPException(status_code=404, detail="Disparo não encontrado")

    if current_user.role == 'admin' and trigger.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Acesso negado")

    if payload.delay_seconds is not None:
        trigger.delay_seconds = payload.delay_seconds
    if payload.concurrency_limit is not None:
        trigger.concurrency_limit = payload.concurrency_limit
    if payload.scheduled_time is not None:
        trigger.scheduled_time = payload.scheduled_time
    if payload.contacts_list is not None:
        trigger.contacts_list = payload.contacts_list
        from services.bulk import normalize_phone
        trigger.pending_contacts = [normalize_phone(c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '')) for c in payload.contacts_list]
        trigger.total_contacts = len(payload.contacts_list)

    db.commit()
    db.refresh(trigger)

    # Notifica via WebSocket para sincronia imediata na UI
    await rabbitmq.publish_event("trigger_updated", {
        "trigger_id": trigger_id,
        "client_id": trigger.client_id,
        "delay_seconds": trigger.delay_seconds,
        "concurrency_limit": trigger.concurrency_limit
    })

    return {"message": "Parâmetros atualizados com sucesso", "id": trigger_id, "delay_seconds": trigger.delay_seconds, "concurrency_limit": trigger.concurrency_limit}


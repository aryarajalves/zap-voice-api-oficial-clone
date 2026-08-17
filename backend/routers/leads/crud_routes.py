import re
import os
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, cast, Text
from collections import defaultdict

import models
import schemas
from core.deps import get_db, get_current_user
from core.permissions import require_premium
from core.logger import setup_logger
from services.leads import upsert_webhook_lead

logger = setup_logger("LeadsRouter.CRUD")

router = APIRouter()


def _fix_mojibake(text: str) -> str:
    """Corrige encoding quebrado: UTF-8 lido como Latin-1. Ex: 'RogÃ©rio' → 'Rogério'"""
    if not text or not isinstance(text, str):
        return text
    try:
        return text.encode("latin-1").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return text


def _normalize_name(text: str) -> str:
    """Corrige encoding e aplica Title Case. Ex: 'ALBERTO levi' → 'Alberto Levi'"""
    if not text or not isinstance(text, str):
        return text
    return _fix_mojibake(text).strip().title()


def _delete_lead_and_relations(db: Session, lead: models.WebhookLead, client_id: int):
    """
    Deleta o lead e todo o seu histórico/agendamentos atrelados.
    Também remove restrições de 24h de template para que o número possa
    receber o mesmo template novamente caso seja re-adicionado.
    """
    if lead.phone:
        clean_phone = re.sub(r"\D", "", lead.phone)
        suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone

        # 1. Deletar Scheduled Triggers com esse telefone (e seus registros dependentes de message_status)
        trigger_ids = [t[0] for t in db.query(models.ScheduledTrigger.id).filter(
            models.ScheduledTrigger.client_id == client_id,
            models.ScheduledTrigger.contact_phone == lead.phone
        ).all()]
        
        if trigger_ids:
            db.query(models.MessageStatus).filter(
                models.MessageStatus.trigger_id.in_(trigger_ids)
            ).delete(synchronize_session=False)

            db.query(models.ScheduledTrigger).filter(
                models.ScheduledTrigger.id.in_(trigger_ids)
            ).delete(synchronize_session=False)

        # 2. Deletar Histórico que contenha esse telefone
        integrations_subquery = db.query(models.WebhookIntegration.id).filter(
            models.WebhookIntegration.client_id == client_id
        ).subquery()

        histories = db.query(models.WebhookHistory).filter(
            models.WebhookHistory.integration_id.in_(integrations_subquery.select()),
            cast(models.WebhookHistory.processed_data, Text).like(f"%{lead.phone}%")
        ).all()
        for h in histories:
            db.delete(h)

        # 3. Limpar restrição de 24h: ContactTemplateHistory e MessageStatus de template
        db.query(models.ContactTemplateHistory).filter(
            models.ContactTemplateHistory.client_id == client_id,
            or_(
                models.ContactTemplateHistory.phone == clean_phone,
                models.ContactTemplateHistory.phone.like(f"%{suffix}")
            )
        ).delete(synchronize_session=False)

        db.query(models.MessageStatus).filter(
            models.MessageStatus.template_name.isnot(None),
            or_(
                models.MessageStatus.phone_number == clean_phone,
                models.MessageStatus.phone_number.like(f"%{suffix}")
            ),
            models.MessageStatus.trigger_id.is_(None)
        ).delete(synchronize_session=False)

        logger.info(f"🗑️ [Delete Lead] Restrições de 24h de template removidas para {clean_phone} junto com o lead.")

    # 4. Deletar Lead
    db.delete(lead)


@router.delete("/leads/{lead_id}/template-history", summary="Remover histórico de 24h do último template do contato")
def reset_lead_template_history(
    lead_id: int,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    lead = db.query(models.WebhookLead).filter(
        models.WebhookLead.id == lead_id,
        models.WebhookLead.client_id == client_id
    ).first()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Contato não encontrado.")

    clean_phone = re.sub(r"\D", "", lead.phone or "")
    template_name_to_clear = lead.last_template_name

    if clean_phone:
        suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone

        # 1. Limpar ContactTemplateHistory
        db.query(models.ContactTemplateHistory).filter(
            models.ContactTemplateHistory.client_id == client_id,
            or_(
                models.ContactTemplateHistory.phone == clean_phone,
                models.ContactTemplateHistory.phone.like(f"%{suffix}")
            )
        ).delete(synchronize_session=False)

        # 2. Limpar MessageStatus
        if template_name_to_clear:
            db.query(models.MessageStatus).filter(
                models.MessageStatus.template_name == template_name_to_clear,
                or_(
                    models.MessageStatus.phone_number == clean_phone,
                    models.MessageStatus.phone_number.like(f"%{suffix}")
                )
            ).delete(synchronize_session=False)

    lead.last_template_name = None
    lead.last_template_dispatched_at = None
    db.commit()

    logger.info(f"🗑️ [Template History] Histórico do template '{template_name_to_clear}' removido para {clean_phone}.")
    return {"success": True, "message": "Histórico do último template removido com sucesso. O contato pode receber o mesmo template novamente."}


@router.post("/leads", response_model=schemas.WebhookLead, summary="Criar ou atualizar lead manualmente")
def create_manual_lead(
    lead_in: schemas.WebhookLeadCreate,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Cria um novo lead ou atualiza um existente com base no telefone.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    clean_phone = re.sub(r"\D", "", lead_in.phone)
    
    if not clean_phone or len(clean_phone) < 8:
        raise HTTPException(status_code=400, detail="Telefone inválido. Deve conter pelo menos 8 dígitos.")

    lead_data = {
        "phone": clean_phone,
        "name": lead_in.name,
        "email": lead_in.email,
        "event_type": "manual_creation"
    }

    lead = upsert_webhook_lead(
        db=db, 
        client_id=client_id, 
        platform="manual", 
        parsed_data=lead_data, 
        tag=lead_in.tags
    )
    
    if not lead:
        raise HTTPException(status_code=500, detail="Erro ao criar/atualizar lead.")
        
    return lead


@router.delete("/leads/{lead_id}", summary="Deletar um lead específico")
def delete_lead(
    lead_id: int,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    lead = db.query(models.WebhookLead).filter(
        models.WebhookLead.id == lead_id,
        models.WebhookLead.client_id == client_id
    ).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")

    if getattr(lead, 'is_locked', False):
        raise HTTPException(status_code=403, detail="Este contato está protegido e não pode ser excluído.")

    _delete_lead_and_relations(db, lead, client_id)
    db.commit()
    return {"status": "success", "message": "Lead e vínculos removidos."}


@router.put("/leads/{lead_id}", response_model=schemas.WebhookLead, summary="Atualizar um lead específico")
def update_lead(
    lead_id: int,
    lead_in: schemas.WebhookLeadUpdate,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Atualiza manualmente os dados cadastrais e tags de um lead específico.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    lead = db.query(models.WebhookLead).filter(
        models.WebhookLead.id == lead_id,
        models.WebhookLead.client_id == client_id
    ).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")

    update_data = lead_in.model_dump(exclude_unset=True) if hasattr(lead_in, "model_dump") else lead_in.dict(exclude_unset=True)
    if "phone" in update_data and update_data["phone"]:
        clean_phone = re.sub(r"\D", "", update_data["phone"])
        if len(clean_phone) < 8:
            raise HTTPException(status_code=400, detail="Telefone inválido. Deve conter pelo menos 8 dígitos.")
        update_data["phone"] = clean_phone

    for key, value in update_data.items():
        setattr(lead, key, value)

    lead.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/leads/clean-corrupted-tags", summary="Sincronizar contatos: corrigir nomes e tags")
def clean_corrupted_tags(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Sincroniza todos os contatos do cliente:
    - Corrige encoding dos nomes (mojibake) e aplica Title Case
    - Remove tags corrompidas (barras, aspas, JSON malformado)
    - Unifica contatos duplicados com o mesmo telefone em um único registro
    """
    client_id = x_client_id if x_client_id else current_user.client_id

    leads = db.query(models.WebhookLead).filter(
        models.WebhookLead.client_id == client_id
    ).all()

    tags_removed = 0
    names_fixed = 0
    leads_affected = 0
    leads_merged = 0

    phone_groups = defaultdict(list)

    # 1. Agrupar leads por telefone normalizado
    for lead in leads:
        if lead.phone:
            clean_p = re.sub(r"\D", "", lead.phone)
            if len(clean_p) >= 8:
                phone_groups[clean_p].append(lead)

    # 2. Mesclar e remover duplicados
    for clean_phone, group in phone_groups.items():
        if len(group) > 1:
            sorted_group = sorted(group, key=lambda x: x.id)
            principal = sorted_group[0]
            duplicados = sorted_group[1:]
            principal_changed = False

            # Nome
            for dup in duplicados:
                if dup.name:
                    if not principal.name or len(dup.name) > len(principal.name):
                        principal.name = dup.name
                        principal_changed = True

            # E-mail
            if not principal.email:
                for dup in duplicados:
                    if dup.email:
                        principal.email = dup.email
                        principal_changed = True
                        break

            # BSUD
            if not principal.bsud:
                for dup in duplicados:
                    if dup.bsud:
                        principal.bsud = dup.bsud
                        principal_changed = True
                        break

            # Metadados de Venda
            if not principal.product_name:
                for dup in duplicados:
                    if dup.product_name:
                        principal.product_name = dup.product_name
                        principal_changed = True
                        break
            if not principal.platform:
                for dup in duplicados:
                    if dup.platform:
                        principal.platform = dup.platform
                        principal_changed = True
                        break
            if not principal.payment_method:
                for dup in duplicados:
                    if dup.payment_method:
                        principal.payment_method = dup.payment_method
                        principal_changed = True
                        break
            if not principal.price:
                for dup in duplicados:
                    if dup.price:
                        principal.price = dup.price
                        principal_changed = True
                        break

            # Chatwoot e Projetos
            if not principal.chatwoot_conversation_id:
                for dup in duplicados:
                    if dup.chatwoot_conversation_id:
                        principal.chatwoot_conversation_id = dup.chatwoot_conversation_id
                        principal_changed = True
                        break
            if not principal.chatwoot_account_id:
                for dup in duplicados:
                    if dup.chatwoot_account_id:
                        principal.chatwoot_account_id = dup.chatwoot_account_id
                        principal_changed = True
                        break
            if not principal.chatwoot_inbox_id:
                for dup in duplicados:
                    if dup.chatwoot_inbox_id:
                        principal.chatwoot_inbox_id = dup.chatwoot_inbox_id
                        principal_changed = True
                        break
            if not principal.project_id:
                for dup in duplicados:
                    if dup.project_id:
                        principal.project_id = dup.project_id
                        principal_changed = True
                        break
            if not principal.imported_by_client_id:
                for dup in duplicados:
                    if dup.imported_by_client_id:
                        principal.imported_by_client_id = dup.imported_by_client_id
                        principal_changed = True
                        break

            # total_events
            for dup in duplicados:
                principal.total_events = (principal.total_events or 1) + (dup.total_events or 1)
                principal_changed = True

            # variables
            if not isinstance(principal.variables, dict):
                principal.variables = {}
            merged_vars = dict(principal.variables or {})
            vars_changed = False
            for dup in duplicados:
                if isinstance(dup.variables, dict) and dup.variables:
                    merged_vars.update(dup.variables)
                    vars_changed = True
            if vars_changed:
                principal.variables = merged_vars
                principal_changed = True

            # last_event_at / last_event_type
            most_recent = principal
            for dup in duplicados:
                if dup.last_event_at and (not most_recent.last_event_at or dup.last_event_at > most_recent.last_event_at):
                    most_recent = dup
            if most_recent != principal:
                principal.last_event_at = most_recent.last_event_at
                principal.last_event_type = most_recent.last_event_type
                principal_changed = True

            # Tags
            all_tags = []
            if principal.tags:
                all_tags.extend([t.strip() for t in principal.tags.split(',') if t.strip()])
            for dup in duplicados:
                if dup.tags:
                    all_tags.extend([t.strip() for t in dup.tags.split(',') if t.strip()])

            unique_tags = []
            for t in all_tags:
                if t not in unique_tags:
                    unique_tags.append(t)

            clean_tags = [t for t in unique_tags if re.match(r'^[\w\s\-]+$', t, re.UNICODE)]
            new_tags_str = ', '.join(clean_tags) if clean_tags else None
            
            if new_tags_str != principal.tags:
                principal.tags = new_tags_str
                principal_changed = True

            if principal_changed:
                leads_affected += 1

            for dup in duplicados:
                db.delete(dup)
                leads_merged += 1

        else:
            lead = group[0]
            changed = False
            if lead.name:
                normalized = _normalize_name(lead.name)
                if normalized != lead.name:
                    lead.name = normalized
                    names_fixed += 1
                    changed = True

            if lead.tags:
                raw_tags = [t.strip() for t in lead.tags.split(',') if t.strip()]
                clean_tags = [t for t in raw_tags if re.match(r'^[\w\s\-]+$', t, re.UNICODE)]
                removed = len(raw_tags) - len(clean_tags)
                if removed > 0:
                    lead.tags = ', '.join(clean_tags) if clean_tags else None
                    tags_removed += removed
                    changed = True

            if changed:
                leads_affected += 1

    db.commit()
    
    msg_detail = f"Sincronização concluída. "
    if leads_merged > 0:
        msg_detail += f"{leads_merged} contato(s) duplicado(s) unificado(s). "
    msg_detail += f"{names_fixed} nome(s) corrigido(s) e {tags_removed} tag(s) limpa(s)."

    return {
        "status": "success",
        "leads_affected": leads_affected,
        "names_fixed": names_fixed,
        "tags_removed": tags_removed,
        "leads_merged": leads_merged,
        "message": msg_detail
    }


@router.patch("/leads/{lead_id}/lock", summary="Proteger ou desproteger um lead contra exclusão")
def toggle_lead_lock(
    lead_id: int,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    lead = db.query(models.WebhookLead).filter(
        models.WebhookLead.id == lead_id,
        models.WebhookLead.client_id == client_id
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")

    lead.is_locked = not getattr(lead, 'is_locked', False)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    status = "protegido" if lead.is_locked else "desprotegido"
    return {"status": "success", "is_locked": lead.is_locked, "message": f"Contato {status} com sucesso."}


@router.post("/leads/validate-contacts", summary="Validar contatos antes de um disparo em massa (janela 24h / bloqueio)")
async def validate_contacts_for_bulk(
    payload: dict,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Valida uma lista de números antes de um disparo em massa usando dados locais.
    """
    from sqlalchemy import text
    from config_loader import get_setting

    client_id = x_client_id if x_client_id else current_user.client_id
    contacts = payload.get("phones", [])
    semaphore = asyncio.Semaphore(500)

    try:
        # 1. Tabela customizada (SYNC_CONTACTS_TABLE)
        sync_table_raw = get_setting("SYNC_CONTACTS_TABLE", "", client_id=client_id)
        custom_mapping = {}
        clean_phones_input = [''.join(filter(str.isdigit, str(p))) for p in contacts]

        if sync_table_raw and clean_phones_input:
            safe_table = "".join(c for c in sync_table_raw if c.isalnum() or c == '_')
            try:
                phones_tuple = tuple(clean_phones_input)
                if phones_tuple:
                    sql = text(f"SELECT phone, name, last_interaction_at FROM {safe_table} WHERE phone IN :phones")
                    result = db.execute(sql, {"phones": phones_tuple}).fetchall()
                    for row in result:
                        p_cleaned = str(row[0])
                        custom_mapping[p_cleaned] = {"name": row[1], "last_interaction": row[2]}
            except Exception as e:
                logger.error(f"⚠️ [VALIDATE] Erro ao consultar tabela customizada {sync_table_raw}: {e}")

        # 2. Cache local (ContactWindow)
        window_map = {}
        if clean_phones_input:
            cached_windows = db.query(models.ContactWindow).filter(
                models.ContactWindow.client_id == client_id
            ).all()
            for w in cached_windows:
                clean_w_phone = "".join(filter(str.isdigit, str(w.phone)))
                window_map[clean_w_phone] = w
                if len(clean_w_phone) >= 8:
                    window_map[clean_w_phone[-8:]] = w

        # 3. Sufixos bloqueados/em repouso
        blocked_suffixes = set()
        try:
            blocked_entries = db.query(models.BlockedContact.phone).filter(
                models.BlockedContact.client_id == client_id
            ).all()
            blocked_suffixes = {b.phone[-8:] for b in blocked_entries if len(b.phone) >= 8}

            now = datetime.utcnow()
            resting_entries = db.query(models.RestingContact.phone).filter(
                models.RestingContact.client_id == client_id,
                models.RestingContact.expires_at > now
            ).all()
            for r in resting_entries:
                if len(r.phone) >= 8:
                    blocked_suffixes.add(r.phone[-8:])
        except Exception as e:
            logger.error(f"⚠️ [VALIDATE] Erro ao carregar sufixos bloqueados/repouso: {e}")

        async def check_contact(phone):
            async with semaphore:
                clean_phone = ''.join(filter(str.isdigit, str(phone)))
                status_data = {
                    "phone": clean_phone, "original": phone, "exists": False,
                    "window_open": False, "is_blocked": False,
                    "contact_name": None, "contact_id": None,
                    "conversation_id": None, "last_activity": None
                }

                if len(clean_phone) >= 8 and clean_phone[-8:] in blocked_suffixes:
                    status_data["is_blocked"] = True

                custom_entry = custom_mapping.get(clean_phone)
                if custom_entry:
                    status_data["exists"] = True
                    status_data["contact_name"] = custom_entry["name"]
                    status_data["last_activity"] = custom_entry["last_interaction"]

                window_entry = window_map.get(clean_phone)
                if not window_entry and len(clean_phone) >= 8:
                    window_entry = window_map.get(clean_phone[-8:])
                if window_entry:
                    status_data["exists"] = True
                    if not status_data["contact_name"]:
                        status_data["contact_name"] = window_entry.chatwoot_contact_name
                    status_data["conversation_id"] = window_entry.chatwoot_conversation_id
                    if not custom_entry:
                        status_data["last_activity"] = window_entry.last_interaction_at

                if status_data["last_activity"]:
                    last_activity = status_data["last_activity"]
                    if last_activity.tzinfo is None:
                        now_cmp = datetime.now()
                    else:
                        from datetime import timezone
                        now_cmp = datetime.now(timezone.utc)
                    if now_cmp - last_activity < timedelta(hours=24):
                        status_data["window_open"] = True
                    status_data["last_activity"] = status_data["last_activity"].isoformat()

                return status_data

        tasks = [check_contact(phone) for phone in contacts]
        results = await asyncio.gather(*tasks)
        return {r["phone"]: r for r in results}

    except Exception as e:
        logger.error(f"Error in validate_contacts_for_bulk: {e}")
        return {}

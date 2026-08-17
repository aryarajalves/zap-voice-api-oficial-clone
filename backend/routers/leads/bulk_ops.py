import re
from typing import Optional, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from pydantic import BaseModel

import models
from core.deps import get_db
from core.permissions import require_premium
from core.logger import setup_logger
from .common_filters import (
    BulkDeleteRequest,
    _apply_common_lead_filters,
    _get_related_client_ids,
    _get_blocked_suffixes,
    _get_resting_suffix_map,
    _phone_suffix,
)
from .crud_routes import _delete_lead_and_relations

logger = setup_logger("LeadsRouter.Bulk")

router = APIRouter()


class BulkDeleteAllRequest(BaseModel):
    search: Optional[str] = None
    event_type: Optional[str] = None
    tag: Optional[List[str]] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    imported_by_client_id: Optional[int] = None
    origin: Optional[str] = None


class BulkTagRequest(BaseModel):
    lead_ids: List[int]
    tag: str


class BulkTagAllRequest(BaseModel):
    tag: str
    search: Optional[str] = None
    event_type: Optional[str] = None
    tag_filter: Optional[List[str]] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    imported_by_client_id: Optional[int] = None
    origin: Optional[str] = None
    is_locked: Optional[str] = None
    has_bsud: Optional[str] = None
    filter_ddi: Optional[str] = None
    filter_ddd: Optional[str] = None


class BulkBlockRequest(BaseModel):
    lead_ids: List[int]


class BulkBlockAllRequest(BaseModel):
    search: Optional[str] = None
    event_type: Optional[str] = None
    tag_filter: Optional[List[str]] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    imported_by_client_id: Optional[int] = None
    origin: Optional[str] = None
    is_locked: Optional[str] = None
    has_bsud: Optional[str] = None
    filter_ddi: Optional[str] = None
    filter_ddd: Optional[str] = None


class BulkRestRequest(BaseModel):
    lead_ids: List[int]
    hours: Optional[int] = 24


class BulkRestAllRequest(BaseModel):
    hours: Optional[int] = 24
    search: Optional[str] = None
    event_type: Optional[str] = None
    tag_filter: Optional[List[str]] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    imported_by_client_id: Optional[int] = None
    origin: Optional[str] = None
    is_locked: Optional[str] = None
    has_bsud: Optional[str] = None
    filter_ddi: Optional[str] = None
    filter_ddd: Optional[str] = None


def _add_tags_to_lead(lead, new_tags_str: str, db: Optional[Session] = None) -> bool:
    """Adiciona etiqueta(s) ao campo 'tags' do lead sem apagar as existentes."""
    existing = [t.strip() for t in (lead.tags or '').split(',') if t.strip()]
    new_tags = [t.strip() for t in (new_tags_str or '').split(',') if t.strip()]
    changed = False
    for t in new_tags:
        if t not in existing:
            existing.append(t)
            changed = True
    if changed:
        from sqlalchemy.orm.attributes import flag_modified
        lead.tags = ', '.join(existing)
        lead.updated_at = datetime.now()
        flag_modified(lead, "tags")

        if db and lead.phone and lead.client_id:
            clean_phone = str(lead.phone).replace('+', '').strip()
            target_phones = [lead.phone, clean_phone, f"+{clean_phone}"]
            convos = db.query(models.ChatConversation).filter(
                models.ChatConversation.client_id == lead.client_id,
                models.ChatConversation.phone.in_(target_phones)
            ).all()
            for convo in convos:
                c_labels = convo.labels if isinstance(convo.labels, list) else []
                c_new = list(c_labels)
                c_changed = False
                for t in new_tags:
                    if t.lower() not in [x.lower() for x in c_new]:
                        c_new.append(t)
                        c_changed = True
                if c_changed:
                    convo.labels = c_new
                    flag_modified(convo, "labels")
    return changed


def _remove_tags_from_lead(lead, remove_tags_str: str, db: Optional[Session] = None) -> bool:
    """Remove etiqueta(s) do campo 'tags' do lead e das labels da conversa correspondente."""
    existing = [t.strip() for t in (lead.tags or '').split(',') if t.strip()]
    to_remove = [t.strip().lower() for t in (remove_tags_str or '').split(',') if t.strip()]
    if not existing or not to_remove:
        return False

    new_existing = [t for t in existing if t.lower() not in to_remove]
    changed = len(new_existing) != len(existing)

    if changed:
        from sqlalchemy.orm.attributes import flag_modified
        lead.tags = ', '.join(new_existing)
        lead.updated_at = datetime.now()
        flag_modified(lead, "tags")

        if db and lead.phone and lead.client_id:
            clean_phone = str(lead.phone).replace('+', '').strip()
            target_phones = [lead.phone, clean_phone, f"+{clean_phone}"]
            convos = db.query(models.ChatConversation).filter(
                models.ChatConversation.client_id == lead.client_id,
                models.ChatConversation.phone.in_(target_phones)
            ).all()
            for convo in convos:
                c_labels = convo.labels if isinstance(convo.labels, list) else []
                c_new = [x for x in c_labels if isinstance(x, str) and x.lower() not in to_remove]
                if len(c_new) != len(c_labels):
                    convo.labels = c_new
                    flag_modified(convo, "labels")
    return changed


def _filter_leads_by_active_filters(db: Session, client_id: int, filters):
    """Reconstrói a query de leads a partir de um objeto de filtros (Bulk*AllRequest)."""
    active_client = db.query(models.Client).filter(models.Client.id == client_id).first()
    proj_id = active_client.project_id if active_client else None

    if proj_id:
        query = db.query(models.WebhookLead).filter(models.WebhookLead.project_id == proj_id)
    else:
        query = db.query(models.WebhookLead).filter(models.WebhookLead.client_id == client_id)

    query = _apply_common_lead_filters(
        query, filters.search, filters.event_type, None, getattr(filters, 'tag_filter', None), "OR",
        getattr(filters, 'is_locked', None), getattr(filters, 'has_bsud', None),
        filters.date_from, filters.date_to, filters.imported_by_client_id, filters.origin
    )

    if getattr(filters, 'filter_ddi', None):
        clean_ddi = re.sub(r"\D", "", filters.filter_ddi)
        if clean_ddi:
            query = query.filter(models.WebhookLead.phone.like(f"{clean_ddi}%"))

    if getattr(filters, 'filter_ddd', None):
        clean_ddd = re.sub(r"\D", "", filters.filter_ddd)
        if clean_ddd:
            query = query.filter(or_(
                models.WebhookLead.phone.like(f"55{clean_ddd}%"),
                models.WebhookLead.phone.like(f"{clean_ddd}%")
            ))

    return query


@router.post("/leads/bulk-delete", summary="Deletar múltiplos leads")
def bulk_delete_leads(
    request: BulkDeleteRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    leads = db.query(models.WebhookLead).filter(
        models.WebhookLead.id.in_(request.lead_ids),
        models.WebhookLead.client_id == client_id
    ).all()

    deleted_count = 0
    skipped_locked = 0
    for lead in leads:
        if getattr(lead, 'is_locked', False):
            skipped_locked += 1
            continue
        _delete_lead_and_relations(db, lead, client_id)
        deleted_count += 1

    db.commit()
    msg = f"{deleted_count} lead(s) excluído(s)."
    if skipped_locked:
        msg += f" {skipped_locked} ignorado(s) por estarem protegidos."
    return {"status": "success", "deleted_count": deleted_count, "skipped_locked": skipped_locked, "message": msg}


@router.post("/leads/bulk-delete-all", summary="Deletar todos os leads dos filtros ativos")
def bulk_delete_all_leads(
    request: BulkDeleteAllRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id

    active_client = db.query(models.Client).filter(models.Client.id == client_id).first()
    proj_id = active_client.project_id if active_client else None

    if proj_id:
        query = db.query(models.WebhookLead).filter(models.WebhookLead.project_id == proj_id)
    else:
        query = db.query(models.WebhookLead).filter(models.WebhookLead.client_id == client_id)

    if request.imported_by_client_id:
        query = query.filter(
            or_(
                models.WebhookLead.imported_by_client_id == request.imported_by_client_id,
                and_(models.WebhookLead.imported_by_client_id.is_(None), models.WebhookLead.client_id == request.imported_by_client_id)
            )
        )
    if request.origin == "manual":
        query = query.filter(models.WebhookLead.platform == "manual")
    elif request.origin == "manual_bulk":
        query = query.filter(models.WebhookLead.platform == "manual_bulk")
    elif request.origin == "webhook":
        query = query.filter(and_(
            models.WebhookLead.platform != "manual",
            models.WebhookLead.platform != "manual_bulk",
            models.WebhookLead.platform != "chatwoot_import"
        ))

    if request.search:
        query = query.filter(or_(
            models.WebhookLead.name.ilike(f"%{request.search}%"),
            models.WebhookLead.phone.ilike(f"%{request.search}%"),
            models.WebhookLead.email.ilike(f"%{request.search}%")
        ))

    if request.event_type:
        query = query.filter(models.WebhookLead.last_event_type == request.event_type)

    if request.tag:
        tags_filter = [x.strip() for t in request.tag for x in t.split(",") if x.strip()]
        if tags_filter:
            query = query.filter(
                or_(*(
                    func.concat(',', func.replace(func.coalesce(models.WebhookLead.tags, ''), ', ', ','), ',').ilike(f"%,{t},%")
                    for t in tags_filter
                ))
            )

    if request.date_from:
        try:
            dt_from = datetime.strptime(request.date_from, "%Y-%m-%d")
            query = query.filter(models.WebhookLead.created_at >= dt_from)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de date_from inválido.")

    if request.date_to:
        try:
            dt_to = datetime.strptime(request.date_to, "%Y-%m-%d") + timedelta(days=1, seconds=-1)
            query = query.filter(models.WebhookLead.created_at <= dt_to)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de date_to inválido.")

    all_leads = query.all()
    deletable = [l for l in all_leads if not getattr(l, 'is_locked', False)]
    skipped_locked = len(all_leads) - len(deletable)

    if not deletable:
        return {"status": "success", "deleted_count": 0, "skipped_locked": skipped_locked, "message": f"Nenhum contato deletável. {skipped_locked} protegido(s)."}

    deletable_ids = [l.id for l in deletable]
    phones = list({l.phone for l in deletable if l.phone})

    BATCH = 500
    for i in range(0, len(phones), BATCH):
        batch_phones = phones[i:i + BATCH]
        trigger_ids = [t[0] for t in db.query(models.ScheduledTrigger.id).filter(
            models.ScheduledTrigger.client_id == client_id,
            models.ScheduledTrigger.contact_phone.in_(batch_phones)
        ).all()]

        if trigger_ids:
            db.query(models.MessageStatus).filter(
                models.MessageStatus.trigger_id.in_(trigger_ids)
            ).delete(synchronize_session=False)

            db.query(models.ScheduledTrigger).filter(
                models.ScheduledTrigger.id.in_(trigger_ids)
            ).delete(synchronize_session=False)

    for i in range(0, len(deletable_ids), 1000):
        batch_ids = deletable_ids[i:i + 1000]
        db.query(models.WebhookLead).filter(
            models.WebhookLead.id.in_(batch_ids)
        ).delete(synchronize_session=False)

    db.commit()
    deleted_count = len(deletable_ids)
    msg = f"{deleted_count} contato(s) excluído(s)."
    if skipped_locked:
        msg += f" {skipped_locked} ignorado(s) por estarem protegidos."
    return {"status": "success", "deleted_count": deleted_count, "skipped_locked": skipped_locked, "message": msg}


@router.post("/leads/bulk-tag", summary="Adicionar etiqueta a múltiplos leads selecionados")
def bulk_tag_leads(
    request: BulkTagRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    if not request.tag or not request.tag.strip():
        raise HTTPException(status_code=400, detail="Informe ao menos uma etiqueta.")

    client_id = x_client_id if x_client_id else current_user.client_id
    leads = db.query(models.WebhookLead).filter(
        models.WebhookLead.id.in_(request.lead_ids),
        models.WebhookLead.client_id == client_id
    ).all()

    tagged_count = sum(1 for lead in leads if _add_tags_to_lead(lead, request.tag, db=db))
    db.commit()

    return {
        "status": "success",
        "tagged_count": tagged_count,
        "total": len(leads),
        "message": f"Etiqueta aplicada a {tagged_count} de {len(leads)} contato(s) selecionado(s)."
    }


@router.post("/leads/bulk-tag-all", summary="Adicionar etiqueta a todos os leads dos filtros ativos")
def bulk_tag_all_leads(
    request: BulkTagAllRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    if not request.tag or not request.tag.strip():
        raise HTTPException(status_code=400, detail="Informe ao menos uma etiqueta.")

    client_id = x_client_id if x_client_id else current_user.client_id
    active_client = db.query(models.Client).filter(models.Client.id == client_id).first()
    proj_id = active_client.project_id if active_client else None

    if proj_id:
        query = db.query(models.WebhookLead).filter(models.WebhookLead.project_id == proj_id)
    else:
        query = db.query(models.WebhookLead).filter(models.WebhookLead.client_id == client_id)

    query = _apply_common_lead_filters(
        query, request.search, request.event_type, None, request.tag_filter, "OR",
        request.is_locked, request.has_bsud, request.date_from, request.date_to,
        request.imported_by_client_id, request.origin
    )

    if request.filter_ddi:
        clean_ddi = re.sub(r"\D", "", request.filter_ddi)
        if clean_ddi:
            query = query.filter(models.WebhookLead.phone.like(f"{clean_ddi}%"))

    if request.filter_ddd:
        clean_ddd = re.sub(r"\D", "", request.filter_ddd)
        if clean_ddd:
            query = query.filter(or_(
                models.WebhookLead.phone.like(f"55{clean_ddd}%"),
                models.WebhookLead.phone.like(f"{clean_ddd}%")
            ))

    leads = query.all()
    tagged_count = sum(1 for lead in leads if _add_tags_to_lead(lead, request.tag, db=db))
    db.commit()

    return {
        "status": "success",
        "tagged_count": tagged_count,
        "total": len(leads),
        "message": f"Etiqueta aplicada a {tagged_count} de {len(leads)} contato(s)."
    }


@router.post("/leads/bulk-untag", summary="Remover etiqueta de múltiplos leads selecionados")
def bulk_untag_leads(
    request: BulkTagRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    if not request.tag or not request.tag.strip():
        raise HTTPException(status_code=400, detail="Informe ao menos uma etiqueta para remover.")

    client_id = x_client_id if x_client_id else current_user.client_id
    leads = db.query(models.WebhookLead).filter(
        models.WebhookLead.id.in_(request.lead_ids),
        models.WebhookLead.client_id == client_id
    ).all()

    untagged_count = sum(1 for lead in leads if _remove_tags_from_lead(lead, request.tag, db=db))
    db.commit()

    return {
        "status": "success",
        "untagged_count": untagged_count,
        "total": len(leads),
        "message": f"Etiqueta removida de {untagged_count} de {len(leads)} contato(s) selecionado(s)."
    }


@router.post("/leads/bulk-untag-all", summary="Remover etiqueta de todos os leads dos filtros ativos")
def bulk_untag_all_leads(
    request: BulkTagAllRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    if not request.tag or not request.tag.strip():
        raise HTTPException(status_code=400, detail="Informe ao menos uma etiqueta para remover.")

    client_id = x_client_id if x_client_id else current_user.client_id
    query = _filter_leads_by_active_filters(db, client_id, request)

    leads = query.all()
    untagged_count = sum(1 for lead in leads if _remove_tags_from_lead(lead, request.tag, db=db))
    db.commit()

    return {
        "status": "success",
        "untagged_count": untagged_count,
        "total": len(leads),
        "message": f"Etiqueta removida de {untagged_count} de {len(leads)} contato(s)."
    }


@router.post("/leads/bulk-block", summary="Bloquear permanentemente múltiplos leads selecionados")
def bulk_block_leads(
    request: BulkBlockRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    leads = db.query(models.WebhookLead).filter(
        models.WebhookLead.id.in_(request.lead_ids),
        models.WebhookLead.client_id == client_id
    ).all()

    related_client_ids = _get_related_client_ids(db, client_id)
    existing_suffixes = _get_blocked_suffixes(db, related_client_ids)

    blocked_count = 0
    already_count = 0
    seen = set()
    for lead in leads:
        suffix = _phone_suffix(lead.phone)
        if not suffix or suffix in existing_suffixes or suffix in seen:
            already_count += 1
            continue
        seen.add(suffix)
        db.add(models.BlockedContact(client_id=client_id, phone=lead.phone, name=lead.name, reason="Bloqueado via Contatos"))
        blocked_count += 1

    db.commit()
    return {
        "status": "success",
        "blocked_count": blocked_count,
        "already_blocked_count": already_count,
        "message": f"{blocked_count} contato(s) bloqueado(s) permanentemente."
    }


@router.post("/leads/bulk-unblock", summary="Desbloquear múltiplos leads selecionados")
def bulk_unblock_leads(
    request: BulkBlockRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    leads = db.query(models.WebhookLead).filter(
        models.WebhookLead.id.in_(request.lead_ids),
        models.WebhookLead.client_id == client_id
    ).all()

    related_client_ids = _get_related_client_ids(db, client_id)
    suffixes = [_phone_suffix(lead.phone) for lead in leads if _phone_suffix(lead.phone)]

    unblocked_count = 0
    unrested_count = 0

    if suffixes:
        blocked_entries = db.query(models.BlockedContact).filter(
            models.BlockedContact.client_id.in_(related_client_ids)
        ).all()
        for b in blocked_entries:
            b_suf = _phone_suffix(b.phone)
            if b_suf and b_suf in suffixes:
                db.delete(b)
                unblocked_count += 1

        resting_entries = db.query(models.RestingContact).filter(
            models.RestingContact.client_id.in_(related_client_ids)
        ).all()
        for r in resting_entries:
            r_suf = _phone_suffix(r.phone)
            if r_suf and r_suf in suffixes:
                db.delete(r)
                unrested_count += 1

    db.commit()
    total_removed = unblocked_count + unrested_count
    return {
        "status": "success",
        "unblocked_count": unblocked_count,
        "unrested_count": unrested_count,
        "message": f"{total_removed} contato(s) desbloqueado(s) com sucesso."
    }


@router.post("/leads/bulk-unblock-all", summary="Desbloquear todos os leads dos filtros ativos")
def bulk_unblock_all_leads(
    request: BulkBlockAllRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    leads = _filter_leads_by_active_filters(db, client_id, request).all()

    related_client_ids = _get_related_client_ids(db, client_id)
    suffixes = set(_phone_suffix(lead.phone) for lead in leads if _phone_suffix(lead.phone))

    unblocked_count = 0
    unrested_count = 0

    if suffixes:
        blocked_entries = db.query(models.BlockedContact).filter(
            models.BlockedContact.client_id.in_(related_client_ids)
        ).all()
        for b in blocked_entries:
            b_suf = _phone_suffix(b.phone)
            if b_suf and b_suf in suffixes:
                db.delete(b)
                unblocked_count += 1

        resting_entries = db.query(models.RestingContact).filter(
            models.RestingContact.client_id.in_(related_client_ids)
        ).all()
        for r in resting_entries:
            r_suf = _phone_suffix(r.phone)
            if r_suf and r_suf in suffixes:
                db.delete(r)
                unrested_count += 1

    db.commit()
    total_removed = unblocked_count + unrested_count
    return {
        "status": "success",
        "unblocked_count": unblocked_count,
        "unrested_count": unrested_count,
        "message": f"{total_removed} contato(s) desbloqueado(s) com sucesso."
    }


@router.post("/leads/bulk-block-all", summary="Bloquear permanentemente todos os leads dos filtros ativos")
def bulk_block_all_leads(
    request: BulkBlockAllRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    leads = _filter_leads_by_active_filters(db, client_id, request).all()

    related_client_ids = _get_related_client_ids(db, client_id)
    existing_suffixes = _get_blocked_suffixes(db, related_client_ids)

    blocked_count = 0
    already_count = 0
    seen = set()
    for lead in leads:
        suffix = _phone_suffix(lead.phone)
        if not suffix or suffix in existing_suffixes or suffix in seen:
            already_count += 1
            continue
        seen.add(suffix)
        db.add(models.BlockedContact(client_id=client_id, phone=lead.phone, name=lead.name, reason="Bloqueado via Contatos"))
        blocked_count += 1

    db.commit()
    return {
        "status": "success",
        "blocked_count": blocked_count,
        "already_blocked_count": already_count,
        "message": f"{blocked_count} contato(s) bloqueado(s) permanentemente."
    }


@router.post("/leads/bulk-rest", summary="Colocar múltiplos leads selecionados em repouso temporário")
def bulk_rest_leads(
    request: BulkRestRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    leads = db.query(models.WebhookLead).filter(
        models.WebhookLead.id.in_(request.lead_ids),
        models.WebhookLead.client_id == client_id
    ).all()

    related_client_ids = _get_related_client_ids(db, client_id)
    existing_suffixes = set(_get_resting_suffix_map(db, related_client_ids).keys())
    now = datetime.utcnow()
    hours = request.hours or 24

    rested_count = 0
    already_count = 0
    seen = set()
    for lead in leads:
        suffix = _phone_suffix(lead.phone)
        if not suffix or suffix in existing_suffixes or suffix in seen:
            already_count += 1
            continue
        seen.add(suffix)
        db.add(models.RestingContact(
            client_id=client_id, phone=lead.phone, name=lead.name,
            reason="Repouso via Contatos", expires_at=now + timedelta(hours=hours)
        ))
        rested_count += 1

    db.commit()
    return {
        "status": "success",
        "rested_count": rested_count,
        "already_resting_count": already_count,
        "message": f"{rested_count} contato(s) colocado(s) em repouso por {hours}h."
    }


@router.post("/leads/bulk-rest-all", summary="Colocar todos os leads dos filtros ativos em repouso temporário")
def bulk_rest_all_leads(
    request: BulkRestAllRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    leads = _filter_leads_by_active_filters(db, client_id, request).all()

    related_client_ids = _get_related_client_ids(db, client_id)
    existing_suffixes = set(_get_resting_suffix_map(db, related_client_ids).keys())
    now = datetime.utcnow()
    hours = request.hours or 24

    rested_count = 0
    already_count = 0
    seen = set()
    for lead in leads:
        suffix = _phone_suffix(lead.phone)
        if not suffix or suffix in existing_suffixes or suffix in seen:
            already_count += 1
            continue
        seen.add(suffix)
        db.add(models.RestingContact(
            client_id=client_id, phone=lead.phone, name=lead.name,
            reason="Repouso via Contatos", expires_at=now + timedelta(hours=hours)
        ))
        rested_count += 1

    db.commit()
    return {
        "status": "success",
        "rested_count": rested_count,
        "already_resting_count": already_count,
        "message": f"{rested_count} contato(s) colocado(s) em repouso por {hours}h."
    }

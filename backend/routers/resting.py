from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from core.deps import get_db, get_current_user
from core.permissions import require_premium, require_user
from models import RestingContact, User, MessageStatus, ScheduledTrigger
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/resting", tags=["Resting Contacts"])

# Schemas
class RestingContactCreate(BaseModel):
    phone: str
    name: Optional[str] = None
    reason: Optional[str] = None
    hours: Optional[int] = 24  # tempo customizável, padrão 24h

class RestingContactResponse(BaseModel):
    id: int
    phone: str
    name: Optional[str]
    reason: Optional[str]
    created_at: datetime
    expires_at: datetime
    resting_by_client_name: Optional[str] = None

    class Config:
        from_attributes = True

class BulkCheckRequest(BaseModel):
    phones: List[str]

class BulkCheckResponse(BaseModel):
    resting_phones: List[str]

class BulkUnrestRequest(BaseModel):
    ids: List[int]

class BulkRestRequest(BaseModel):
    contacts: List[RestingContactCreate]

@router.get("/", response_model=List[RestingContactResponse])
def list_resting_contacts(
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID")
):
    """
    List all active resting contacts for the active client (inherited if in a project).
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    now = datetime.utcnow()
    
    # Check if client belongs to a project
    from models import Client
    client = db.query(Client).filter(Client.id == client_id).first()
    
    if client and client.project_id:
        sibling_clients = db.query(Client.id).filter(Client.project_id == client.project_id).all()
        client_ids = [c.id for c in sibling_clients]
        contacts = db.query(RestingContact).filter(
            RestingContact.client_id.in_(client_ids),
            RestingContact.expires_at > now
        ).order_by(RestingContact.created_at.desc()).all()
    else:
        contacts = db.query(RestingContact).filter(
            RestingContact.client_id == client_id,
            RestingContact.expires_at > now
        ).order_by(RestingContact.created_at.desc()).all()
    return contacts

@router.post("/", response_model=RestingContactResponse, status_code=status.HTTP_201_CREATED)
def rest_contact(
    data: RestingContactCreate,
    current_user: User = Depends(require_premium),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID")
):
    """
    Put a contact on resting mode (24h default).
    """
    client_id = x_client_id if x_client_id else current_user.client_id

    # Normalize phone
    clean_phone = "".join(filter(str.isdigit, data.phone))
    if not clean_phone:
         raise HTTPException(status_code=400, detail="Número processado é inválido/vazio.")

    suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone
    now = datetime.utcnow()

    # If in a project, check across all sibling clients too
    from models import Client
    client = db.query(Client).filter(Client.id == client_id).first()
    client_ids = [client_id]
    if client and client.project_id:
        sibling_clients = db.query(Client.id).filter(Client.project_id == client.project_id).all()
        client_ids = [c.id for c in sibling_clients]

    # Check if already resting and not expired
    exists = db.query(RestingContact).filter(
        RestingContact.client_id.in_(client_ids),
        RestingContact.phone.like(f"%{suffix}"),
        RestingContact.expires_at > now
    ).first()

    if exists:
        raise HTTPException(status_code=400, detail=f"Este número (ou final {suffix}) já está em repouso até {exists.expires_at}.")

    new_rest = RestingContact(
        client_id=client_id,
        phone=clean_phone,
        name=data.name,
        reason=data.reason or "Manual",
        expires_at=now + timedelta(hours=data.hours or 24)
    )
    db.add(new_rest)
    
    # Remove failed message status reports for this contact and decrement stats
    suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone
    failed_messages = db.query(MessageStatus).filter(
        MessageStatus.status == 'failed',
        MessageStatus.phone_number.like(f"%{suffix}")
    ).all()
    
    for msg in failed_messages:
        trigger = db.query(ScheduledTrigger).filter(ScheduledTrigger.id == msg.trigger_id).first()
        if trigger:
            if trigger.total_failed > 0:
                trigger.total_failed -= 1
            if trigger.total_contacts > 0:
                trigger.total_contacts -= 1
        db.delete(msg)
        
    db.commit()
    db.refresh(new_rest)
    return new_rest

@router.post("/check_bulk", response_model=BulkCheckResponse)
def check_bulk_resting(
    data: BulkCheckRequest,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID")
):
    """
    Receives a list of phone numbers and returns which ones are currently resting (inherited if in a project).
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    now = datetime.utcnow()

    from models import Client
    client = db.query(Client).filter(Client.id == client_id).first()
    client_ids = [client_id]
    if client and client.project_id:
        sibling_clients = db.query(Client.id).filter(Client.project_id == client.project_id).all()
        client_ids = [c.id for c in sibling_clients]

    resting_entries = db.query(RestingContact.phone).filter(
        RestingContact.client_id.in_(client_ids),
        RestingContact.expires_at > now
    ).all()

    resting_suffixes = {r.phone[-8:] for r in resting_entries if len(r.phone) >= 8}
    resting_found = []

    for original_phone in data.phones:
        digits = "".join(filter(str.isdigit, original_phone))
        if len(digits) >= 8:
            suffix = digits[-8:]
            if suffix in resting_suffixes:
                resting_found.append(original_phone)

    return {"resting_phones": resting_found}

@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def unrest_contact(
    contact_id: int,
    current_user: User = Depends(require_premium),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID")
):
    """
    Remove contact manually from resting mode.
    """
    client_id = x_client_id if x_client_id else current_user.client_id

    contact = db.query(RestingContact).filter(
        RestingContact.id == contact_id,
        RestingContact.client_id == client_id
    ).first()

    if not contact:
        raise HTTPException(status_code=404, detail="Contato em repouso não encontrado.")

    db.delete(contact)
    db.commit()
    return None

@router.post("/unrest_bulk")
def unrest_bulk(
    data: BulkUnrestRequest,
    current_user: User = Depends(require_premium),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID")
):
    """
    Remove multiple contacts from resting mode at once.
    """
    client_id = x_client_id if x_client_id else current_user.client_id

    deleted_count = db.query(RestingContact).filter(
        RestingContact.id.in_(data.ids),
        RestingContact.client_id == client_id
    ).delete(synchronize_session=False)

    db.commit()
    return {"deleted_count": deleted_count}

@router.post("/rest_bulk")
def rest_bulk(
    data: BulkRestRequest,
    current_user: User = Depends(require_premium),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID")
):
    """
    Put multiple contacts on resting mode in bulk.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    now = datetime.utcnow()

    # Get current active suffixes to avoid duplicates
    existing = db.query(RestingContact.phone).filter(
        RestingContact.client_id == client_id,
        RestingContact.expires_at > now
    ).all()
    existing_suffixes = {p.phone[-8:] for p in existing if len(p.phone) >= 8}

    success_count = 0
    already_count = 0
    new_entries = []
    seen_in_batch = set()

    for c in data.contacts:
        clean_phone = "".join(filter(str.isdigit, c.phone))
        if not clean_phone or len(clean_phone) < 8:
            continue

        suffix = clean_phone[-8:]
        if suffix in existing_suffixes or suffix in seen_in_batch:
            already_count += 1
            continue

        seen_in_batch.add(suffix)
        new_entries.append(RestingContact(
            client_id=client_id,
            phone=clean_phone,
            name=c.name,
            reason=c.reason or "Falha no Envio",
            expires_at=now + timedelta(hours=c.hours or 24)
        ))
        success_count += 1

    if new_entries:
        db.bulk_save_objects(new_entries)

        # Marca (em vez de apagar) as mensagens com falha desses telefones agora em repouso —
        # o relatório de falhas continua mostrando o contato normalmente, só que travado
        # (failure_resolution='resting'), sem poder repetir a ação nele. Os contadores do
        # trigger (total_failed/total_contacts) não são mais alterados: a falha aconteceu
        # de verdade e continua contando no histórico.
        phones_to_clear = [e.phone for e in new_entries]
        if phones_to_clear:
            for clean_phone in phones_to_clear:
                suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone

                db.query(MessageStatus).filter(
                    MessageStatus.status == 'failed',
                    MessageStatus.phone_number.like(f"%{suffix}")
                ).update({
                    MessageStatus.failure_resolution: 'resting',
                    MessageStatus.failure_resolved_at: now
                }, synchronize_session=False)

        db.commit()

    return {
        "success_count": success_count,
        "already_resting_count": already_count
    }

@router.delete("/by_phone/{phone}", status_code=status.HTTP_204_NO_CONTENT)
def unrest_contact_by_phone(
    phone: str,
    current_user: User = Depends(require_premium),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID")
):
    """
    Remove contact from resting mode by phone number.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    clean_phone = "".join(filter(str.isdigit, phone))
    suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone

    contact = db.query(RestingContact).filter(
        RestingContact.client_id == client_id,
        or_(
            RestingContact.phone == clean_phone,
            RestingContact.phone.like(f"%{suffix}")
        )
    ).first()

    if not contact:
        raise HTTPException(status_code=404, detail="Contato em repouso não encontrado.")

    db.delete(contact)
    db.commit()
    return None


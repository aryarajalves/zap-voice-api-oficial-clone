from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
from core.deps import get_db, get_current_user
from core.permissions import require_premium, require_user
from models import BlockedContact, User
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/blocked", tags=["Blocked Contacts"])

# Schemas
class BlockedContactCreate(BaseModel):
    phone: str
    name: Optional[str] = None
    reason: Optional[str] = None

class BlockedContactResponse(BaseModel):
    id: int
    phone: str
    name: Optional[str]
    reason: Optional[str]
    created_at: datetime
    blocked_by_client_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class BulkCheckRequest(BaseModel):
    phones: List[str]

class BulkCheckResponse(BaseModel):
    blocked_phones: List[str]

class BulkUnblockRequest(BaseModel):
    ids: List[int]

class BulkBlockRequest(BaseModel):
    contacts: List[BlockedContactCreate]

@router.get("/", response_model=List[BlockedContactResponse])
def list_blocked_contacts(
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID")
):
    """
    List all blocked contacts for the active client (inherited if in a project).
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    
    # Check if client belongs to a project
    from models import Client
    client = db.query(Client).filter(Client.id == client_id).first()
    
    if client and client.project_id:
        sibling_clients = db.query(Client.id).filter(Client.project_id == client.project_id).all()
        client_ids = [c.id for c in sibling_clients]
        contacts = db.query(BlockedContact).filter(
            BlockedContact.client_id.in_(client_ids)
        ).order_by(BlockedContact.created_at.desc()).all()
    else:
        contacts = db.query(BlockedContact).filter(
            BlockedContact.client_id == client_id
        ).order_by(BlockedContact.created_at.desc()).all()
    return contacts

@router.post("/", response_model=BlockedContactResponse, status_code=status.HTTP_201_CREATED)
def block_contact(
    data: BlockedContactCreate,
    current_user: User = Depends(require_premium),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID")
):
    """
    Block a phone number.
    """
    client_id = x_client_id if x_client_id else current_user.client_id

    # Normalize phone (remove non-digits)
    clean_phone = "".join(filter(str.isdigit, data.phone))
    
    if not clean_phone:
         raise HTTPException(status_code=400, detail="Número processado é inválido/vazio.")

    # Check if already blocked (using suffix matching - last 8 digits)
    # This prevents duplicates like 558586817644 and 86817644
    suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone
    
    # If in a project, check across all sibling clients too
    from models import Client
    client = db.query(Client).filter(Client.id == client_id).first()
    client_ids = [client_id]
    if client and client.project_id:
        sibling_clients = db.query(Client.id).filter(Client.project_id == client.project_id).all()
        client_ids = [c.id for c in sibling_clients]
        
    exists = db.query(BlockedContact).filter(
        BlockedContact.client_id.in_(client_ids),
        BlockedContact.phone.like(f"%{suffix}")
    ).first()
    
    if exists:
        raise HTTPException(status_code=400, detail=f"Este número (ou final {suffix}) já está bloqueado.")
    
    new_block = BlockedContact(
        client_id=client_id,
        phone=clean_phone,
        name=data.name,
        reason=data.reason or "Manual"
    )
    db.add(new_block)
    db.commit()
    db.refresh(new_block)
    return new_block

@router.post("/check_bulk", response_model=BulkCheckResponse)
def check_bulk_blocked(
    data: BulkCheckRequest,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID")
):
    """
    Receives a list of phone numbers and returns which ones are blocked (inherited if in a project).
    Uses 'last 8 digits' comparison logic.
    """
    client_id = x_client_id if x_client_id else current_user.client_id

    from models import Client
    client = db.query(Client).filter(Client.id == client_id).first()
    client_ids = [client_id]
    if client and client.project_id:
        sibling_clients = db.query(Client.id).filter(Client.project_id == client.project_id).all()
        client_ids = [c.id for c in sibling_clients]

    # 1. Fetch ALL blocked contacts for this client / project siblings
    blocked_entries = db.query(BlockedContact.phone).filter(
        BlockedContact.client_id.in_(client_ids)
    ).all()
    
    # 2. Fetch active resting contacts
    now = datetime.utcnow()
    from models import RestingContact
    resting_entries = db.query(RestingContact.phone).filter(
        RestingContact.client_id.in_(client_ids),
        RestingContact.expires_at > now
    ).all()
    
    # 3. Create a set of suffixes (last 8 digits) from the DB
    blocked_suffixes = {b.phone[-8:] for b in blocked_entries if len(b.phone) >= 8}
    for r in resting_entries:
        if len(r.phone) >= 8:
            blocked_suffixes.add(r.phone[-8:])
    
    blocked_found = []
    
    # 4. Check input phones
    for original_phone in data.phones:
        # Normalize to get digits
        digits = "".join(filter(str.isdigit, original_phone))
        
        if len(digits) >= 8:
            suffix = digits[-8:]
            if suffix in blocked_suffixes:
                blocked_found.append(original_phone)
    
    # Return the ORIGINAL strings sent by frontend so it can identify and remove them
    return {"blocked_phones": blocked_found}

@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def unblock_contact(
    contact_id: int,
    current_user: User = Depends(require_premium),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID")
):
    """
    Unblock a contact.
    """
    client_id = x_client_id if x_client_id else current_user.client_id

    contact = db.query(BlockedContact).filter(
        BlockedContact.id == contact_id,
        BlockedContact.client_id == client_id # Security/Context check
    ).first()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contato não encontrado na lista de bloqueio.")
    
    db.delete(contact)
    db.commit()
    return None

@router.delete("/by_phone/{phone}", status_code=status.HTTP_204_NO_CONTENT)
def unblock_contact_by_phone(
    phone: str,
    current_user: User = Depends(require_premium),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID")
):
    """
    Unblock a contact by phone number.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    clean_phone = "".join(filter(str.isdigit, phone))
    if not clean_phone:
        raise HTTPException(status_code=400, detail="Número de telefone inválido.")
        
    suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone
    
    contact = db.query(BlockedContact).filter(
        BlockedContact.client_id == client_id,
        BlockedContact.phone.like(f"%{suffix}")
    ).first()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contato não encontrado na lista de bloqueio.")
        
    db.delete(contact)
    db.commit()
    return None

@router.post("/unblock_bulk")
def unblock_bulk(
    data: BulkUnblockRequest,
    current_user: User = Depends(require_premium),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID")
):
    """
    Unblock multiple contacts at once.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    
    deleted_count = db.query(BlockedContact).filter(
        BlockedContact.id.in_(data.ids),
        BlockedContact.client_id == client_id
    ).delete(synchronize_session=False)
    
    db.commit()
    return {"deleted_count": deleted_count}

@router.post("/block_bulk")
def block_bulk(
    data: BulkBlockRequest,
    current_user: User = Depends(require_premium),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID")
):
    """
    Block multiple contacts at once. Includes cleaning and suffix deduplication.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    
    # Get current suffixes to prevent duplicates
    existing = db.query(BlockedContact.phone).filter(BlockedContact.client_id == client_id).all()
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
        new_entries.append(BlockedContact(
            client_id=client_id,
            phone=clean_phone,
            name=c.name,
            reason=c.reason or "Importação"
        ))
        success_count += 1
        
    if new_entries:
        db.bulk_save_objects(new_entries)
        
        # Remove os registros do MessageStatus com falha para esses telefones bloqueados
        from models.trigger import MessageStatus, ScheduledTrigger
        
        for entry in new_entries:
            clean_phone = entry.phone
            suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone
            
            # Localizar mensagens deste cliente cujo status seja falha e o telefone corresponda ao bloqueado
            failed_messages = db.query(MessageStatus).filter(
                MessageStatus.status == 'failed',
                MessageStatus.phone_number.like(f"%{suffix}")
            ).all()
            
            for msg in failed_messages:
                # Decrementar total_failed e total_contacts no trigger correspondente
                trigger = db.query(ScheduledTrigger).filter(ScheduledTrigger.id == msg.trigger_id).first()
                if trigger:
                    # Ajusta os contadores do histórico
                    if trigger.total_failed > 0:
                        trigger.total_failed -= 1
                    if trigger.total_contacts > 0:
                        trigger.total_contacts -= 1
                        
                db.delete(msg)
                
        db.commit()
        
    return {
        "success_count": success_count,
        "already_blocked_count": already_count
    }

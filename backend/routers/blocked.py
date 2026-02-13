from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
from core.deps import get_db, get_current_user
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID")
):
    """
    List all blocked contacts for the active client.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    
    contacts = db.query(BlockedContact).filter(
        BlockedContact.client_id == client_id
    ).order_by(BlockedContact.created_at.desc()).all()
    return contacts

@router.post("/", response_model=BlockedContactResponse, status_code=status.HTTP_201_CREATED)
def block_contact(
    data: BlockedContactCreate,
    current_user: User = Depends(get_current_user),
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
    
    exists = db.query(BlockedContact).filter(
        BlockedContact.client_id == client_id,
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID")
):
    """
    Receives a list of phone numbers and returns which ones are blocked.
    Uses 'last 8 digits' comparison logic.
    """
    client_id = x_client_id if x_client_id else current_user.client_id

    # 1. Fetch ALL blocked contacts for this client (assuming list < 10k, this is efficient enough)
    # If list grows huge, we might need a different strategy (e.g. partial index or bloom filter),
    # but for now Python set matching is fast.
    blocked_entries = db.query(BlockedContact.phone).filter(
        BlockedContact.client_id == client_id
    ).all()
    
    # 2. Create a set of suffixes (last 8 digits) from the DB
    # We filter only those with length >= 8
    blocked_suffixes = {b.phone[-8:] for b in blocked_entries if len(b.phone) >= 8}
    
    blocked_found = []
    
    # 3. Check input phones
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
    current_user: User = Depends(get_current_user),
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

@router.post("/unblock_bulk")
def unblock_bulk(
    data: BulkUnblockRequest,
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
        db.commit()
        
    return {
        "success_count": success_count,
        "already_blocked_count": already_count
    }

from fastapi import APIRouter, Depends, Header
from typing import Optional
from chatwoot_client import ChatwootClient
import models
from core.deps import get_current_user
from database import SessionLocal
from datetime import datetime, timedelta
from config_loader import get_setting
from sqlalchemy import text

router = APIRouter()

def get_client_id(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(get_current_user)
) -> int:
    # ... (same as before)
    if x_client_id:
        return x_client_id
    if current_user.client_id:
        return current_user.client_id
    return None

@router.get("/chatwoot/account")
async def get_chatwoot_account(
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user)
):
    chatwoot = ChatwootClient(client_id=client_id)
    data = await chatwoot.get_account_details()
    return data

@router.get("/chatwoot/inboxes")
async def get_chatwoot_inboxes(
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user)
):
    print(f"DEBUG: get_chatwoot_inboxes called with client_id={client_id}")
    chatwoot = ChatwootClient(client_id=client_id)
    data = await chatwoot.get_inboxes()
    return data

@router.get("/chatwoot/conversations")
async def get_chatwoot_conversations(
    inbox_id: int = None, 
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user)
):
    chatwoot = ChatwootClient(client_id=client_id)
    data = await chatwoot.get_conversations(inbox_id=inbox_id)
    return data

@router.get("/chatwoot/labels")
async def get_chatwoot_labels(
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user)
):
    chatwoot = ChatwootClient(client_id=client_id)
    data = await chatwoot.get_all_labels()
    return data

@router.post("/chatwoot/validate-contacts")
async def validate_contacts(
    payload: dict, 
    client_id: int = Depends(get_client_id)
):
    """
    Valida uma lista de números verificando a tabela Custom (SYNC_CONTACTS_TABLE) 
    ou a tabela ContactWindow (cache local).
    Se o contato tiver interação recente (<24h), retorna window_open=True.
    """
    # Fix: Frontend sends "phones", not "contacts"
    contacts = payload.get("phones", []) 
    # Fix: Frontend sends "wa_business_account_id", map it to likely inbox_id usage or ignore if not strict
    inbox_id = payload.get("wa_business_account_id") 
    
    import asyncio
    
    # Limiting concurrency
    semaphore = asyncio.Semaphore(500)
    
    # Session for DB operations
    db = SessionLocal()
    
    try:
        # 1. Tentar pegar da tabela customizada (SYNC_CONTACTS_TABLE)
        # -----------------------------------------------------------
        # NOTE: This is a direct SQL query to a user-defined table.
        # Ensure the table name is safe.
        sync_table_raw = get_setting("SYNC_CONTACTS_TABLE", "", client_id=client_id)
        custom_mapping = {}
        
        # Helper to clean phones for DB query
        clean_phones_input = [''.join(filter(str.isdigit, str(p))) for p in contacts]

        if sync_table_raw and clean_phones_input:
            # Basic sanitation for table name to prevent injection
            safe_table = "".join(c for c in sync_table_raw if c.isalnum() or c == '_')
            try:
                # Construct query carefully
                # We need to quote the placeholders for IN clause or use SQLAlchemy's bind params properly
                # Tuple of phones for the IN clause
                phones_tuple = tuple(clean_phones_input)
                if phones_tuple:
                    # Use text() with bind params
                    sql = text(f"SELECT phone, name, last_interaction_at FROM {safe_table} WHERE phone IN :phones")
                    # execute takes the statement and the params
                    result = db.execute(sql, {"phones": phones_tuple}).fetchall()
                    
                    for row in result:
                        # row[0] = phone, row[1] = name, row[2] = last_interaction_at
                        p_cleaned = str(row[0])
                        custom_mapping[p_cleaned] = {
                            "name": row[1],
                            "last_interaction": row[2]
                        }
                    print(f"✅ [VALIDATE] Loaded {len(custom_mapping)} contacts from custom table {safe_table}")
            except Exception as e:
                print(f"⚠️ [VALIDATE] Error querying custom table {sync_table_raw}: {e}")

        # 2. Pre-fetch do cache interno (ContactWindow) como fallback ou complemento
        # --------------------------------------------------------------------------
        window_map = {}
        if clean_phones_input:
            query = db.query(models.ContactWindow).filter(
                models.ContactWindow.client_id == client_id,
                models.ContactWindow.phone.in_(clean_phones_input)
            )
            cached_windows = query.all()
            window_map = {w.phone: w for w in cached_windows}

        # 3. Pre-fetch blocked contacts suffixes for the client
        # ---------------------------------------------------
        blocked_suffixes = set()
        try:
            blocked_entries = db.query(models.BlockedContact.phone).filter(
                models.BlockedContact.client_id == client_id
            ).all()
            blocked_suffixes = {b.phone[-8:] for b in blocked_entries if len(b.phone) >= 8}
            print(f"✅ [VALIDATE] Loaded {len(blocked_suffixes)} blocked suffixes")
        except Exception as e:
            print(f"⚠️ [VALIDATE] Error loading blocked suffixes: {e}")

        # 4. Process each contact
        # -----------------------
        chatwoot = ChatwootClient(client_id=client_id)
        
        async def check_contact(phone):
            async with semaphore:
                clean_phone = ''.join(filter(str.isdigit, str(phone)))
                
                status_data = {
                    "phone": clean_phone,
                    "original": phone,
                    "exists": False,
                    "window_open": False,
                    "is_blocked": False,
                    "contact_name": None,
                    "contact_id": None,
                    "conversation_id": None,
                    "last_activity": None
                }
                
                # Check Blocked Status first
                if len(clean_phone) >= 8:
                    if clean_phone[-8:] in blocked_suffixes:
                        status_data["is_blocked"] = True
                
                # A. Check Custom Table (Primary Source of Truth for Activity)
                custom_entry = custom_mapping.get(clean_phone)
                if custom_entry:
                    status_data["exists"] = True
                    status_data["contact_name"] = custom_entry["name"]
                    status_data["last_activity"] = custom_entry["last_interaction"]
                
                # B. Check Internal Cache (Secondary Source or Metadata Provider)
                window_entry = window_map.get(clean_phone)
                if window_entry:
                    status_data["exists"] = True # Mark as existing if found in either
                    
                    # Fill name if missing
                    if not status_data["contact_name"]:
                         status_data["contact_name"] = window_entry.chatwoot_contact_name
                    
                    # Conversation ID is usually only in our internal map
                    status_data["conversation_id"] = window_entry.chatwoot_conversation_id
                    
                    # Priority logic for `last_activity`:
                    # If we already have it from custom table, keep it unless custom is None/Empty
                    if not custom_entry:
                         status_data["last_activity"] = window_entry.last_interaction_at

                # C. Live Fallback (If not found in DBs)
                # ----------------------------------------
                if not status_data["exists"]:
                    try:
                        # 1. Search Contact
                        # Try exact match first, then + prefix
                        queries = [clean_phone]
                        if not clean_phone.startswith('+'): queries.append(f"+{clean_phone}")
                        
                        contact_payload = None
                        for q in queries:
                            search_res = await chatwoot.search_contact(q)
                            if search_res and search_res.get("payload"):
                                contact_payload = search_res["payload"][0]
                                break
                        
                        if contact_payload:
                            status_data["exists"] = True
                            status_data["contact_name"] = contact_payload.get("name")
                            status_data["contact_id"] = contact_payload.get("id")
                            
                            # 2. Get Conversations
                            convs_res = await chatwoot.get_contact_conversations(status_data["contact_id"])
                            convs = convs_res.get("payload", [])
                            if convs:
                                # Use most recent conversation
                                active_conv = convs[0]
                                status_data["conversation_id"] = active_conv.get("id")
                                
                                # 3. Check 24h Window LIVE
                                is_open = await chatwoot.is_within_24h_window(active_conv.get("id"))
                                status_data["window_open"] = is_open
                                
                                # Note: We don't get 'last_activity' timestamp easily from is_within_24h_window 
                                # without refactoring, but 'window_open' bool is what matters most.
                    except Exception as e:
                        print(f"⚠️ [VALIDATE] Live check failed for {clean_phone}: {e}")

                # D. Validate 24h Window (If we have last_activity from DB)
                # ----------------------
                if status_data["last_activity"]:
                    last_activity = status_data["last_activity"]
                    # Handle Timezones: make 'now' matches the timezone of 'last_activity'
                    if last_activity.tzinfo is None:
                        # Naive DB datetime -> assume system local or UTC? 
                        # Usually DBs store naive as UTC. And our app uses UTC.
                        now = datetime.now()
                    else:
                        # Aware DB datetime -> compare with aware UTC now
                        from datetime import timezone
                        now = datetime.now(timezone.utc)
                        
                    # Calculate difference
                    diff = now - last_activity
                    
                    # Check window
                    if diff < timedelta(hours=24):
                        status_data["window_open"] = True

                # E. Format output
                # ----------------
                if status_data["last_activity"]:
                    status_data["last_activity"] = status_data["last_activity"].isoformat()
                
                return status_data

        # Execute all checks in parallel
        tasks = [check_contact(phone) for phone in contacts]
        results = await asyncio.gather(*tasks)
            
        # Return dict keyed by phone for O(1) frontend lookup
        return {r["phone"]: r for r in results}

    except Exception as e:
        print(f"Error in validate_contacts: {e}")
        return []
    finally:
        db.close()

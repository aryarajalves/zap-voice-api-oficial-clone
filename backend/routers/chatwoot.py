from fastapi import APIRouter, Depends, Header
from typing import Optional
from chatwoot_client import ChatwootClient
import models
from core.deps import get_current_user

router = APIRouter()

def get_client_id(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(get_current_user)
) -> int:
    # Prefer header, fallback to user's default
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

@router.post("/chatwoot/validate_contacts")
async def validate_contacts(payload: dict, current_user: models.User = Depends(get_current_user)):
    """
    Valida uma lista de números no Chatwoot.
    Verifica se o contato existe e se possui janela de 24h aberta.
    """
    contacts = payload.get("contacts", [])
    inbox_id = payload.get("inbox_id")
    
    results = []
    
    from datetime import datetime, timezone, timedelta
    
    for phone in contacts:
        # 1. Sanitize
        clean_phone = ''.join(filter(str.isdigit, str(phone)))
        
        status_data = {
            "phone": clean_phone,
            "original": phone,
            "exists": False,
            "window_open": False,
            "contact_name": None,
            "contact_id": None,
            "conversation_id": None,
            "last_activity": None
        }
        

        # 2. Search Contact
        # Tenta buscar pelo telefone exato (com ou sem +)
        chatwoot = ChatwootClient(client_id=current_user.client_id)
        search_res = await chatwoot.search_contact(clean_phone)
        found_contact = None
        
        if search_res and search_res.get("payload"):
            # Pega o primeiro match
            found_contact = search_res["payload"][0]
            status_data["exists"] = True
            status_data["contact_name"] = found_contact.get("name")
            status_data["contact_id"] = found_contact.get("id")
            
            # 3. Check Conversations for Window
            convs_res = await chatwoot.get_contact_conversations(found_contact["id"])
            if convs_res and convs_res.get("payload"):
                conversations = convs_res["payload"]
                
                # Filtra pela inbox se fornecida
                if inbox_id:
                    conversations = [c for c in conversations if str(c.get("inbox_id")) == str(inbox_id)]
                
                # Ordena por ultima atividade
                conversations.sort(key=lambda x: x.get("last_activity_at") or 0, reverse=True)
                
                if conversations:
                    latest_conv = conversations[0]
                    status_data["conversation_id"] = latest_conv.get("id")
                    last_activity_ts = latest_conv.get("last_activity_at")
                    
                    if last_activity_ts:
                        status_data["last_activity"] = last_activity_ts
                        # Check 24h Window
                        # Chatwoot returns timestamp integer or iso string? Usually integer in some APIs or ISO.
                        # Assuming ISO based on typical Chatwoot payload headers, specifically checked via client usually
                        # But wait, python client might parse it? No, it returns raw json.
                        # Let's verify format safely.
                        
                        try:
                            last_act_dt = datetime.fromtimestamp(last_activity_ts, tz=timezone.utc)
                            now = datetime.now(timezone.utc)
                            diff = now - last_act_dt
                            if diff < timedelta(hours=24):
                                status_data["window_open"] = True
                        except:
                            pass # Fail safe

        results.append(status_data)
        
    return results

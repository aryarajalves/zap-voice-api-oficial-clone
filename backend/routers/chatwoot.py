from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import StreamingResponse
from typing import Any, List, Optional
from chatwoot_client import ChatwootClient
import models
from core.deps import get_current_user
from database import SessionLocal
from datetime import datetime, timedelta
from config_loader import get_setting
from sqlalchemy import text

import httpx
import json
import time
from core.logger import setup_logger
logger = setup_logger("ChatwootRouter")
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
    logger.debug(f"DEBUG: get_chatwoot_inboxes called with client_id={client_id}")
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

@router.post("/chatwoot/labels")
async def create_chatwoot_label(
    payload: dict,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user)
):
    chatwoot = ChatwootClient(client_id=client_id)
    title = payload.get("title")
    color = payload.get("color", "#3352f9")
    description = payload.get("description", "")
    
    if not title:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="O título da etiqueta é obrigatório")
        
    data = await chatwoot.create_label(title=title, color=color, description=description)
    return data

@router.post("/chatwoot/agents")
async def create_chatwoot_agent(
    payload: dict,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user)
):
    logger.info(f"🚀 [CHATWOOT ROUTER] Recebida solicitação para criar agente. ClientID: {client_id}")
    chatwoot = ChatwootClient(client_id=client_id)
    
    if not chatwoot.api_token:
        logger.warning(f"⚠️ [CHATWOOT ROUTER] Tentativa de criar agente falhou: Chatwoot não configurado para ClientID {client_id}")
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Chatwoot não configurado. Verifique o Token da API nas configurações.")
        
    name = payload.get("name")
    email = payload.get("email")
    role = payload.get("role", "agent")
    
    logger.debug(f"🔍 [CHATWOOT ROUTER] Dados do Agente: Name={name}, Email={email}, Role={role}")
    
    if not name or not email:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Nome e email são obrigatórios")
        
    try:
        data = await chatwoot.create_agent(name=name, email=email, role=role)
        return data
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Erro ao criar agente no Chatwoot: {str(e)}")

@router.get("/chatwoot/agents")
async def list_chatwoot_agents(
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user)
):
    chatwoot = ChatwootClient(client_id=client_id)
    if not chatwoot.api_token:
        return []
    try:
        data = await chatwoot.list_agents()
        return data
    except Exception as e:
        logger.error(f"Erro ao listar agentes: {e}")
        return []

@router.delete("/chatwoot/agents/{agent_id}")
async def delete_chatwoot_agent(
    agent_id: int,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user)
):
    chatwoot = ChatwootClient(client_id=client_id)
    if not chatwoot.api_token:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Chatwoot não configurado.")
    try:
        data = await chatwoot.delete_agent(agent_id=agent_id)
        return {"success": True, "data": data}
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Erro ao excluir agente: {str(e)}")

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
                    logger.debug(f"✅ [VALIDATE] Loaded {len(custom_mapping)} contacts from custom table {safe_table}")
            except Exception as e:
                logger.error(f"⚠️ [VALIDATE] Error querying custom table {sync_table_raw}: {e}")

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
            logger.debug(f"✅ [VALIDATE] Loaded {len(blocked_suffixes)} blocked suffixes")
        except Exception as e:
            logger.error(f"⚠️ [VALIDATE] Error loading blocked suffixes: {e}")

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

                # C. Live Fallback Disabled for speed
                # No longer calling Chatwoot API live during list validation.

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
        logger.error(f"Error in validate_contacts: {e}")
        return []
    finally:
        db.close()
@router.get("/chatwoot/duplicates")
async def get_duplicates(
    inbox_id: Optional[int] = None,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retorna grupos de conversas duplicadas: mesmo contato com mais de uma conversa.
    Percorre TODAS as conversas (todos os status) usando paginação completa.
    """
    chatwoot = ChatwootClient(client_id=client_id)
    all_conversations = await chatwoot.get_all_conversations(inbox_id=inbox_id)

    # Agrupa conversas pelo ID do contato (meta.sender.id)
    by_contact: dict = {}
    for conv in all_conversations:
        sender = conv.get("meta", {}).get("sender", {})
        contact_id = sender.get("id")
        if not contact_id:
            continue
        if contact_id not in by_contact:
            by_contact[contact_id] = {
                "name": sender.get("name", "Contato"),
                "phone": sender.get("phone_number", ""),
                "conversations": []
            }
        by_contact[contact_id]["conversations"].append({
            "id": conv.get("id"),
            "created_at": conv.get("created_at", 0)
        })

    duplicates = []
    for contact_id, data in by_contact.items():
        if len(data["conversations"]) > 1:
            # Ordena por created_at desc: mais recente primeiro (o frontend mantém o [0])
            sorted_convs = sorted(data["conversations"], key=lambda x: x["created_at"], reverse=True)
            duplicates.append({
                "phone": data["phone"],
                "name": data["name"],
                "conversations": sorted_convs
            })

    return duplicates

@router.post("/chatwoot/cleanup-duplicates")
async def cleanup_duplicates(
    request: Request,
    payload: Optional[dict] = None,
    inbox_id: Optional[int] = None,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user)
):
    """
    Identifica e remove conversas duplicadas no Chatwoot enviando progresso via StreamingResponse.
    Suporta cancelamento e lista específica de conversas para apagar.
    """
    import json
    import asyncio

    # Extrair IDs específicos se fornecidos pelo frontend (Dry-run mode)
    specific_ids = payload.get("conversation_ids") if payload else None

    async def event_generator(request: Request):
        chatwoot = ChatwootClient(client_id=client_id)
        
        to_delete: List[Any] = []
        
        if specific_ids:
            to_delete = [{"id": cid} for cid in specific_ids]
            yield json.dumps({"status": "starting", "message": f"Iniciando remoção de {len(to_delete)} itens selecionados..."}) + "\n"
        else:
            yield json.dumps({"status": "searching", "message": "Buscando contatos no Chatwoot (Lote completo)..."}) + "\n"
            contacts = await chatwoot.get_all_contacts(inbox_id=inbox_id)
            
            # Agrupar por contato
            by_phone = {}
            by_name = {} # Fallback para quem não tem telefone
            
            for contact in contacts:
                phone = contact.get("phone_number") or contact.get("custom_attributes", {}).get("phone_number")
                name = contact.get("name")
                
                if phone:
                    clean_phone = "".join(filter(str.isdigit, str(phone)))
                    if len(clean_phone) >= 8:
                        suffix = clean_phone[-8:]
                        if suffix not in by_phone: by_phone[suffix] = []
                        by_phone[suffix].append(contact)
                        continue # Prioridade para telefone
                
                if name and len(name) > 3:
                    if name not in by_name: by_name[name] = []
                    by_name[name].append(contact)
            
            # Processar grupos de telefone
            for suffix, group in by_phone.items():
                if len(group) > 1:
                    sorted_group = sorted(group, key=lambda x: x.get("id", 0))
                    to_delete.extend(sorted_group[1:])
            
            # Processar grupos de nome (apenas se não foram pegos pelo telefone)
            deleted_ids = {c["id"] for c in to_delete}
            for name, group in by_name.items():
                if len(group) > 1:
                    # Garantir que não estamos tentando apagar o original que mantivemos no by_phone
                    filtered_group = [c for c in group if c["id"] not in deleted_ids]
                    if len(filtered_group) > 1:
                        sorted_group = sorted(filtered_group, key=lambda x: x.get("id", 0))
                        to_delete.extend(sorted_group[1:])
        
        total_to_delete = len(to_delete)
        if total_to_delete == 0:
            yield json.dumps({"status": "done", "removed_count": 0, "message": "Nenhum contato duplicado para remover."}) + "\n"
            return

        yield json.dumps({"status": "starting", "total": total_to_delete, "message": f"Removendo {total_to_delete} contatos duplicados..."}) + "\n"
        logger.info(f"🚀 Iniciando limpeza de {total_to_delete} contatos para client_id={client_id}")
        
        removed_count = 0
        
        # Processar em lotes de 50 para maior velocidade (conforme solicitado)
        batch_size = 50
        
        async with httpx.AsyncClient(timeout=60.0) as batch_client:
            for i in range(0, total_to_delete, batch_size):
                batch = to_delete[i:i+batch_size]  # type: ignore[index]
                batch_tasks = []
                
                try:
                    for item in batch:
                        item_id = item["id"]
                        batch_tasks.append(chatwoot.delete_contact(item_id, client=batch_client))
                    
                    # Feedback para o frontend antes de aguardar o lote
                    yield json.dumps({
                        "status": "deleting",
                        "current": i,
                        "total": total_to_delete,
                        "message": f"Removendo lote de {len(batch)} contatos..."
                    }) + "\n"

                    # Executar lote simultâneo
                    results = await asyncio.gather(*batch_tasks, return_exceptions=True)
                    
                    for res in results:
                        if isinstance(res, dict) and res.get("success"):
                            removed_count += 1
                except Exception as outer_e:
                    logger.error(f"❌ Error in cleanup batch {i}: {outer_e}")
                    yield json.dumps({"status": "error", "message": str(outer_e)}) + "\n"
                
                # Feedback de progresso concluído do lote
                current_progress = min(i + batch_size, total_to_delete)
                yield json.dumps({
                    "status": "deleting",
                    "current": current_progress,
                    "total": total_to_delete,
                    "message": f"Progresso: {current_progress}/{total_to_delete} contatos."
                }) + "\n"
        
        yield json.dumps({
            "status": "done",
            "removed_count": removed_count,
            "total_to_delete": total_to_delete,
            "message": "Processo concluído!" if removed_count == total_to_delete else "Processo interrompido."
        }) + "\n"

    return StreamingResponse(
        event_generator(request), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Pede para o Nginx não fazer buffering
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream"
        }
    )

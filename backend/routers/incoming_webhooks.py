from fastapi import APIRouter, Depends, HTTPException, Body, Request, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Any
from pydantic import BaseModel
from database import SessionLocal
from core.deps import get_current_user
from config_loader import get_setting
import models
import secrets
import json
from datetime import datetime
from services.engine import execute_funnel
from chatwoot_client import ChatwootClient
from core.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# --- Schemas ---

class WebhookCreate(BaseModel):
    name: str
    funnel_id: int
    field_mapping: Optional[dict] = {}
    forward_url: Optional[str] = None
    last_payload: Optional[dict] = None

class WebhookResponse(BaseModel):
    id: int
    name: str
    slug: str
    funnel_id: int
    field_mapping: dict
    is_active: bool
    total_received: int
    total_processed: int
    total_errors: int
    last_payload: Optional[dict]
    created_at: datetime
    
    class Config:
        orm_mode = True

# --- Utils ---

def extract_value_by_path(data: dict, path: str):
    """
    Navega no dicionário usando dot notation (ex: 'buyer.address.zip')
    Suporta múltiplos caminhos separados por ',' ou '||' (fallback).
    Retorna (valor, path_que_funcionou)
    """
    if not path: return None, None
    
    # Suporta múltiplos caminhos (fallback)
    paths = [p.strip() for p in path.replace('||', ',').split(',')]
    
    for p in paths:
        original_p = p
        if p.startswith("$json."):
            p = p[6:]
        elif p == "$json":
            return data, "$json"

        keys = p.split('.')
        current = data
        found = True
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                found = False
                break
        
        if found and current is not None:
            return current, original_p
            
    return None, None

COUNTRY_DDI_MAP = {
    "Brasil": "55",
    "Portugal": "351",
    "Estados Unidos": "1",
    "Espanha": "34",
    "México": "52",
    "Colômbia": "57",
    "Argentina": "54",
    "Chile": "56",
    "Peru": "51",
    "Reino Unido": "44",
    "França": "33",
    "Itália": "39",
    "Alemanha": "49"
}

def format_phone(phone: str, country: str = "Brasil") -> str:
    """
    Limpa e formata o telefone. 
    Se o país for informado, verifica se o DDI está presente. Se não estiver, adiciona-o.
    """
    if not phone: return None
    clean = ''.join(filter(str.isdigit, str(phone)))
    
    ddi = COUNTRY_DDI_MAP.get(country, "55")
    
    # Se ja comeca com o DDI do país selecionado, assumimos que esta correto
    if clean.startswith(ddi):
        # Heurística para Brasil: Se for 55 + número com 10 ou 11 dígitos, está ok.
        # Se o usuário mandou apenas 10 ou 11 dígitos SEM o DDI inicial 55, a gente entra no else
        if country == "Brasil" and len(clean) in [12, 13]: # 55 + (2+8 ou 2+9)
             return clean
        elif country != "Brasil":
             return clean

    # Se não começar com o DDI, e tiver tamanho de número local, adicionamos o DDI
    # Brasil: 10 ou 11 dígitos (DDD + Número)
    if country == "Brasil" and len(clean) in [10, 11]:
        return f"{ddi}{clean}"
    
    # Outros países (Heurística genérica: se o número for curto, provavelmente falta o DDI)
    if country != "Brasil" and len(clean) <= 10:
        return f"{ddi}{clean}"
        
    return clean

def find_phone_in_payload(data: dict, mapping_key: str = None):
    """
    Tenta encontrar um telefone no payload.
    Retorna (valor, path)
    """
    # 1. Busca Direta
    if mapping_key:
        val, matched_path = extract_value_by_path(data, mapping_key)
        if val: return str(val), matched_path

    # 2. Heurística (Busca Profunda)
    common_keys = ['phone', 'telefone', 'celular', 'mobile', 'whatsapp', 'contact_phone', 'customer_phone', 'buyer_phone', 'numero', 'num']
    
    candidates = []

    def recursive_search(d, current_path=""):
        if isinstance(d, dict):
            for k, v in d.items():
                p = f"{current_path}.{k}" if current_path else k
                if isinstance(v, (dict, list)):
                    recursive_search(v, p)
                elif k.lower() in common_keys and v:
                     candidates.append((str(v), f"auto:{p}"))
        elif isinstance(d, list):
            for i, item in enumerate(d):
                p = f"{current_path}[{i}]"
                recursive_search(item, p)

    recursive_search(data)
    
    # Retorna o primeiro candidato que parece um telefone válido (apenas dígitos, > 8 chars)
    for c, p in candidates:
        clean = ''.join(filter(str.isdigit, c))
        if len(clean) >= 8:
            return clean, p
            
    return None, None

def find_name_in_payload(data: dict, mapping_key: str = None):
    """Retorna (valor, path)"""
    if mapping_key:
        val, p = extract_value_by_path(data, mapping_key)
        if val: return str(val), p
        
    common_keys = ['name', 'nome', 'full_name', 'nome_completo', 'first_name', 'customer_name', 'buyer_name']
    
    def recursive_search(d, current_path=""):
        if isinstance(d, dict):
            for k, v in d.items():
                p = f"{current_path}.{k}" if current_path else k
                if isinstance(v, (dict, list)):
                   res, path_res = recursive_search(v, p)
                   if res: return res, path_res
                elif k.lower() in common_keys and v:
                     return str(v), f"auto:{p}"
        elif isinstance(d, list):
            for i, item in enumerate(d):
                p = f"{current_path}[{i}]"
                res, path_res = recursive_search(item, p)
                if res: return res, path_res
        return None, None

    res, p = recursive_search(data)
    return res or "Cliente Webhook", p or "default"

# --- Endpoints Públicos (Recebimento) ---

@router.post("/chatwoot_events")
async def receive_chatwoot_event(client_id: Optional[int] = None, payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Webhook dedicado para receber eventos do Chatwoot.
    Filtra eventos 'message_created' do tipo 'incoming'.
    """
    event_type = payload.get("event")
    print(f"DEBUG: Chatwoot Payload Event: {event_type}")

    if event_type == "message_created":
        msg_type = payload.get("message_type") # incoming (0), outgoing (1), etc
        
        # Queremos apenas mensagens do cliente (incoming = 0)
        # Nota: payload do Chatwoot pode mandar 'incoming' string ou 0 int.
        # Geralmente manda strings como 'incoming'.
        
        # Permite incoming (0) e outgoing (1) para atualizar o 'last_interaction_at'
        # Incoming: sender é o contato
        # Outgoing: sender é o agente, então precisamos pegar o contato da conversation
        
        if msg_type in ["incoming", "outgoing", 0, 1]:
            
            # Extrair dados principais
            account = payload.get("account", {})
            account_id = account.get("id")
            
            inbox = payload.get("inbox", {})
            inbox_id = inbox.get("id")
            
            conversation = payload.get("conversation", {})
            conversation_id = conversation.get("id")
            
            # Tenta extrair telefone e nome do contato
            phone_number = None
            name = None
            
            # Estratégia 1: Sender (Funciona para Incoming)
            if msg_type in ["incoming", 0]:
                sender = payload.get("sender", {})
                phone_number = sender.get("phone_number")
                name = sender.get("name")
            
            # Estratégia 2: Conversation Contact Inbox (Funciona param bos se for WhatsApp/SMS)
            if not phone_number:
                contact_inbox = conversation.get("contact_inbox", {})
                # Para canais de telefone, source_id geralmente é o número
                source_id = contact_inbox.get("source_id")
                if source_id and (source_id.isdigit() or source_id.startswith('+')):
                     phone_number = source_id
                
                # Tenta pegar nome do meta ou contact
                meta = conversation.get("meta", {})
                sender_meta = meta.get("sender", {})
                if not name:
                    name = sender_meta.get("name")


            target_client_id = client_id or 1 # Fallback para o ID passado na URL ou 1
            
            if not client_id and account_id:
                # Tenta encontrar qual cliente possui este Account ID configurado
                # Isso permite suportar múltiplos clientes/Chatwoots na mesma instalação
                config = db.query(models.AppConfig).filter(
                    models.AppConfig.key == 'CHATWOOT_ACCOUNT_ID', 
                    models.AppConfig.value == str(account_id)
                ).first()
                if config:
                    target_client_id = config.client_id
                    logger.info(f"DEBUG: Found Client ID {target_client_id} for Chatwoot Account {account_id}")
            
            # --- SYNC CONTACT LOGIC ---
            # Se tivermos um telefone, atualizamos a tabela de sincronização
            if phone_number:
                clean_phone = "".join(filter(str.isdigit, str(phone_number)))
                
                # Define timestamp de interação (apenas se for Incoming)
                interaction_time = datetime.now() if msg_type in ["incoming", 0] else None
                
                sync_table = get_setting("SYNC_CONTACTS_TABLE", "", client_id=target_client_id)
                
                if sync_table:
                    # Sanitiza nome da tabela
                    safe_table = "".join(c for c in sync_table if c.isalnum() or c == '_')
                    
                    if safe_table:
                         try:
                             create_sql = f"""
                                CREATE TABLE IF NOT EXISTS {safe_table} (
                                    phone VARCHAR PRIMARY KEY,
                                    name VARCHAR,
                                    inbox_id INTEGER,
                                    last_interaction_at TIMESTAMP WITH TIME ZONE
                                );
                             """
                             upsert_sql = f"""
                                INSERT INTO {safe_table} (phone, name, inbox_id, last_interaction_at)
                                VALUES (:phone, :name, :inbox_id, :last_interaction_at)
                                ON CONFLICT (phone) DO UPDATE SET
                                    name = COALESCE(EXCLUDED.name, {safe_table}.name),
                                    inbox_id = COALESCE(EXCLUDED.inbox_id, {safe_table}.inbox_id),
                                    last_interaction_at = COALESCE(EXCLUDED.last_interaction_at, {safe_table}.last_interaction_at);
                             """
                             db.execute(text(create_sql))
                             db.execute(text(upsert_sql), {
                                 "phone": clean_phone,
                                 "name": name,
                                 "inbox_id": inbox_id,
                                 "last_interaction_at": interaction_time
                             })
                             db.commit()
                             log_action = "WINDOW UPDATED" if interaction_time else "CONTACT SYNCED"
                             logger.info(f"✅ [SYNC] {log_action} - {clean_phone} -> {safe_table}")
                             
                         except Exception as e:
                             logger.error(f"❌ [SYNC] Error syncing contact: {e}")
                             # Não damos raise para não quebrar o resto do webhook
            
            # --- FIM SYNC LOGIC ---

            logger.info(f"DEBUG: Processing message for Client {target_client_id}. Phone: {phone_number}")

            
            # Tenta achar configuração
            # config = db.query(models.AppConfig).filter(models.AppConfig.key == 'CHATWOOT_ACCOUNT_ID', models.AppConfig.value == str(account_id)).first()
            # if config:
            #     client_id = config.client_id

            if phone_number:
                # Normaliza telefone (remove + e caracteres)
                clean_phone = ''.join(filter(str.isdigit, str(phone_number)))
                
                # Upsert na tabela ContactWindow
                contact_window = db.query(models.ContactWindow).filter(
                    models.ContactWindow.phone == clean_phone,
                    models.ContactWindow.client_id == target_client_id,
                    models.ContactWindow.chatwoot_inbox_id == inbox_id
                ).first()
                
                if not contact_window:
                    contact_window = models.ContactWindow(
                        client_id=target_client_id,
                        phone=clean_phone,
                        chatwoot_inbox_id=inbox_id
                    )
                    db.add(contact_window)
                
                contact_window.chatwoot_contact_name = name
                contact_window.chatwoot_conversation_id = conversation_id
                contact_window.last_interaction_at = datetime.now() # Salva hora atual como última interação
                
                db.commit()
                print(f"✅ [CHATWOOT WEBHOOK] Updated ContactWindow for {clean_phone} (Inbox {inbox_id})")

                # Define o timestamp de interação apenas se for mensagem do cliente (incoming)
                # Se for outgoing (empresa enviando), não atualiza a janela de 24h
                interaction_time = datetime.now() if msg_type in ["incoming", 0] else None

                # --- NEW: SYNC TO CUSTOM TABLE ---
                sync_table = get_setting("SYNC_CONTACTS_TABLE", "", client_id=client_id)
                if sync_table:
                    try:
                        # Limpa o nome da tabela (apenas alfanuméricos e underscore por segurança)
                        safe_table = "".join(c for c in sync_table if c.isalnum() or c == '_')
                        
                        if safe_table:
                            # 1. Garante que a tabela existe
                            # phone como PK para facilitar o ON CONFLICT
                            create_sql = f"""
                            CREATE TABLE IF NOT EXISTS {safe_table} (
                                phone VARCHAR PRIMARY KEY,
                                name VARCHAR,
                                inbox_id INTEGER,
                                last_interaction_at TIMESTAMP WITH TIME ZONE
                            );
                            """
                            
                            # 2. Executa o Upsert
                            # Atualiza nome apenas se vier preenchido
                            # Atualiza last_interaction_at APENAS se interaction_time não for None (ou seja, mensagem incoming)
                            upsert_sql = f"""
                            INSERT INTO {safe_table} (phone, name, inbox_id, last_interaction_at)
                            VALUES (:phone, :name, :inbox_id, :last_interaction_at)
                            ON CONFLICT (phone) DO UPDATE SET
                                name = COALESCE(EXCLUDED.name, {safe_table}.name),
                                inbox_id = COALESCE(EXCLUDED.inbox_id, {safe_table}.inbox_id),
                                last_interaction_at = COALESCE(EXCLUDED.last_interaction_at, {safe_table}.last_interaction_at);
                            """
                            
                            db.execute(text(create_sql))
                            db.execute(text(upsert_sql), {
                                "phone": clean_phone,
                                "name": name,
                                "inbox_id": inbox_id,
                                "last_interaction_at": interaction_time
                            })
                            db.commit()
                            
                            log_action = "UPDATED WINDOW" if interaction_time else "CREATED/UPDATED CONTACT (NO WINDOW CHANGE)"
                            print(f"✅ [SYNC] {log_action} - Contato {clean_phone} na tabela '{safe_table}'")
                    except Exception as e:
                        print(f"❌ [SYNC] Erro ao sincronizar na tabela customizada: {e}")
                # -------------------------------
                
    return {"status": "ok"}


@router.post("/catch/{slug}", summary="Receber Webhook Externo")
async def catch_webhook(slug: str, request: Request, db: Session = Depends(get_db)):
    """
    Endpoint público para receber dados de terceiros (Hotmart, Stripe, etc).
    """
    # 1. Validar Webhook
    webhook = db.query(models.WebhookConfig).filter(
        models.WebhookConfig.slug == slug,
        models.WebhookConfig.is_active == True
    ).first()
    
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found or inactive")

    # 2. Ler Payload
    try:
        payload = await request.json()
    except:
        payload_body = await request.body()
        try:
             payload = json.loads(payload_body.decode())
        except:
             payload = {"raw_body": payload_body.decode()}

    print(f"DEBUG: Webhook Raw Body Received: {payload}")

    # === LOGGING EVENT START ===
    event = models.WebhookEvent(
        webhook_id=webhook.id,
        payload=payload,
        headers=dict(request.headers),
        status="processing"
    )
    try:
        db.add(event)
        db.commit()
        db.refresh(event)

        # MANDATÓRIO: Notificar Frontend via WS para "Modo de Escuta"
        from websocket_manager import manager
        await manager.broadcast({
            "event": "webhook_caught",
            "data": {
                "id": event.id,
                "webhook_id": webhook.id,
                "slug": slug,
                "payload": payload,
                "headers": dict(request.headers)
            }
        })
    except Exception as e:
        print(f"❌ [WEBHOOK] Failed to save initial event: {e}")
        db.rollback()
        # Continue anyway to not break functionality just because of logging? 
        # Ideally we should fix DB issues, but let's try to proceed.
    # ===========================

    try:
        # Atualizar last_payload para debug
        webhook.last_payload = payload
        webhook.total_received += 1
        webhook.last_triggered_at = datetime.now()
        db.commit()
        
        # --- FORWARDING (NOVO) ---
        if webhook.forward_url:
            try:
               import httpx
               print(f"📡 [WEBHOOK] Forwarding to {webhook.forward_url}")
               # Fire and forget (optional: use background task)
               async with httpx.AsyncClient() as client:
                   # Forward same payload and headers (except host)
                   fwd_headers = {k: v for k, v in request.headers.items() if k.lower() not in ['host', 'content-length']}
                   await client.post(webhook.forward_url, json=payload, headers=fwd_headers, timeout=5.0)
            except Exception as e:
                print(f"⚠️ [WEBHOOK] Forwarding failed: {e}")
        # -------------------------

        # 3. Mapeamento
        mapping = webhook.field_mapping or {}
        
        # --- PRE-PROCESSAMENTO DE CUSTOM VARIABLES (MESMO SE NÃO TIVER TELEFONE) ---
        # Usuário pode querer traduzir campos antes do roteamento
        custom_vars = {}
        custom_vars_paths = {}
        translations = mapping.get("translations", {})
        
        if "custom_variables" in mapping:
            for var_key, json_path in mapping["custom_variables"].items():
                val, p_match = extract_value_by_path(payload, json_path)
                if val:
                    val_str = str(val).strip()
                    # Aplicar tradução se houver
                    if var_key in translations:
                        field_trans = translations[var_key]
                        for k_orig, v_trans in field_trans.items():
                            if k_orig.lower() == val_str.lower():
                                val_str = v_trans
                                break
                    
                    custom_vars[var_key] = val_str
                    custom_vars_paths[var_key] = p_match
        # --------------------------------------------------------------------------

        # A) Busca Telefone
        phone_key = mapping.get("phone_field")
        phone, phone_matched = find_phone_in_payload(payload, phone_key)
        
        # Se não achou telefone, marca erro mas salva evento
        if not phone:
             event.status = "failed"
             event.error_message = "Telefone não encontrado no payload"
             event.processed_at = datetime.now()
             webhook.total_errors += 1
             db.commit()
             print("❌ [WEBHOOK] Phone not found. Event marked as failed.")
             # Retorna OK para a origem (Hotmart) não ficar retentando, pois é erro de config nossa
             return {"status": "ignored", "reason": "no_phone"}

        # B) Busca Nome (Opcional)
        name_key = mapping.get("name_field")
        name, name_matched = find_name_in_payload(payload, name_key)
        
        # C) Formatação
        country_or_path = mapping.get("default_country", "Brasil")
        # Se o user setou um path em vez de país fixo (ex: buyer.address.country)
        if "." in country_or_path:
             c_val, c_path = extract_value_by_path(payload, country_or_path)
             country = str(c_val) if c_val else "Brasil"
             country_matched = c_path
        else:
             country = country_or_path
             country_matched = "static"

        phone = format_phone(phone, country)
        
        # D) Enfilera Disparo
        import uuid
        convo_id = int(str(uuid.uuid4().int)[:8]) # Fake ID por enquanto pro scheduler
        
        # 4. Criar Trigger Agendado
        # Verifica se funnel_id é válido
        funnel = db.query(models.Funnel).filter(models.Funnel.id == webhook.funnel_id).first()
        if not funnel:
             event.status = "failed"
             event.error_message = f"Funil ID {webhook.funnel_id} não existe mais"
             db.commit()
             raise HTTPException(status_code=400, detail="Funnel not found")

        # --- LÓGICA DE ROTEAMENTO CONDICIONAL ---
        final_funnel_id = webhook.funnel_id
        conditional = mapping.get("conditional_routing")
        routing_debug = {"triggered": False} # Info para o frontend
        
        if conditional and conditional.get("field_path") and conditional.get("rules"):
            check_path = conditional["field_path"]
            check_value_raw, check_path_matched = extract_value_by_path(payload, check_path)
            raw_val = str(check_value_raw or "").strip()
            
            # Tentar aplicar tradução se o path da routing coincidir com alguma custom_variable
            check_value = raw_val
            for var_name, json_path in mapping.get("custom_variables", {}).items():
                if json_path == check_path:
                    # Encontramos que este campo tem tradução configurada
                    field_trans = translations.get(var_name, {})
                    # Busca case-insensitive na tradução
                    trans_found = False
                    for k_orig, v_trans in field_trans.items():
                        if k_orig.lower() == raw_val.lower():
                            check_value = v_trans
                            trans_found = True
                            print(f"🔄 [CONDITIONAL] Translated '{raw_val}' to '{check_value}' using mapping for '{var_name}'")
                            break
                    if trans_found: break

            print(f"🔄 [CONDITIONAL] Checking path '{check_path}'. Value to compare: '{check_value}' (Raw: '{raw_val}')")
            
            for rule in conditional["rules"]:
                # Compara valor (case insensitive para flexibilidade)
                rule_vals = [v.strip().lower() for v in str(rule.get("value") or "").split(',')]
                if check_value.lower() in rule_vals or raw_val.lower() in rule_vals:
                    target_funnel = rule.get("funnel_id")
                    if target_funnel:
                        final_funnel_id = int(target_funnel)
                        routing_debug = {
                            "triggered": True,
                            "field": check_path,
                            "field_matched": check_path_matched,
                            "value_found": check_value,
                            "raw_value": raw_val,
                            "matched_rule": rule.get("value"),
                            "target_funnel": target_funnel
                        }
                        print(f"✅ [CONDITIONAL] Match! Rule '{rule.get('value')}' matched. Switching to Funnel ID: {final_funnel_id}")
                        break
        # ----------------------------------------
        
        # Calcular Scheduled Time com base no delay da integração
        scheduled_time = datetime.now()
        if hasattr(webhook, 'delay_amount') and webhook.delay_amount and webhook.delay_amount > 0:
            from datetime import timedelta
            if webhook.delay_unit == 'minutes':
                scheduled_time += timedelta(minutes=webhook.delay_amount)
            elif webhook.delay_unit == 'hours':
                scheduled_time += timedelta(hours=webhook.delay_amount)
            else: # seconds
                scheduled_time += timedelta(seconds=webhook.delay_amount)
        
        trigger = models.ScheduledTrigger(
            client_id=webhook.client_id,
            funnel_id=final_funnel_id,
            conversation_id=convo_id, 
            status='queued',
            is_bulk=False,
            contact_phone=phone,
            contact_name=name,
            contacts_list=[{"phone": phone, "name": name}],
            template_components=custom_vars, # Passa variáveis extras aqui
            scheduled_time=scheduled_time
        )
        
        db.add(trigger)
        webhook.total_processed += 1
        
        # UPDATE EVENT SUCCCESS
        if event.id:
            event.status = "processed"
            event.processed_at = datetime.now()
            
            # Build detailed info
            p_data = {
                "extracted_phone": {"value": phone, "path": phone_key, "matched": phone_matched},
                "extracted_name": {"value": name, "path": name_key, "matched": name_matched},
                "country_used": {"value": country, "path": country_or_path, "matched": country_matched}
            }
            
            # Custom Vars Details
            c_vars_details = {}
            if "custom_variables" in mapping:
                 for k, v in custom_vars.items():
                     path_defined = mapping["custom_variables"].get(k)
                     c_vars_details[k] = {"value": v, "path": path_defined, "matched": custom_vars_paths.get(k)}
            
            p_data["custom_vars"] = c_vars_details
            
            # Add routing diagnosis
            if routing_debug and routing_debug.get("triggered"):
                 p_data["routing_info"] = routing_debug
                 
            event.processed_data = p_data

            print(f"DEBUG: Saving processed_data to event {event.id}: {event.processed_data}")
            db.add(event)

        db.commit()
        
        print(f"✅ [WEBHOOK] Trigger created ID: {trigger.id}")
        return {"status": "success", "trigger_id": trigger.id}

    except Exception as e:
        print(f"❌ [WEBHOOK] Error processing: {e}")
        # Log failure
        if event.id:
            event.status = "failed"
            event.error_message = str(e)
            event.processed_at = datetime.now()
            webhook.total_errors += 1
            db.add(event)
            db.commit()
            
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[WebhookResponse])
def list_webhooks(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not x_client_id: x_client_id = current_user.client_id
    return db.query(models.WebhookConfig).filter(models.WebhookConfig.client_id == x_client_id).all()

@router.post("/", response_model=WebhookResponse)
def create_webhook(
    webhook: WebhookCreate, 
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not x_client_id: x_client_id = current_user.client_id
    
    slug = secrets.token_urlsafe(16)
    
    new_wb = models.WebhookConfig(
        client_id=x_client_id,
        name=webhook.name,
        slug=slug,
        funnel_id=webhook.funnel_id,
        field_mapping=webhook.field_mapping,
        forward_url=webhook.forward_url,
        last_payload=webhook.last_payload
    )
    
    db.add(new_wb)
    db.commit()
    db.refresh(new_wb)
    return new_wb

@router.put("/{webhook_id}", response_model=WebhookResponse)
def update_webhook(
    webhook_id: int,
    webhook_data: WebhookCreate,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not x_client_id: x_client_id = current_user.client_id
    
    wb = db.query(models.WebhookConfig).filter(
        models.WebhookConfig.id == webhook_id,
        models.WebhookConfig.client_id == x_client_id
    ).first()
    
    if not wb:
        raise HTTPException(status_code=404, detail="Webhook not found")
        
    wb.name = webhook_data.name
    wb.funnel_id = webhook_data.funnel_id
    wb.field_mapping = webhook_data.field_mapping
    wb.forward_url = webhook_data.forward_url
    wb.last_payload = webhook_data.last_payload
    
    db.commit()
    db.refresh(wb)
    return wb

@router.delete("/{webhook_id}")
def delete_webhook(
    webhook_id: int,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not x_client_id: x_client_id = current_user.client_id
    
    wb = db.query(models.WebhookConfig).filter(
        models.WebhookConfig.id == webhook_id, 
        models.WebhookConfig.client_id == x_client_id
    ).first()
    
    if not wb:
         raise HTTPException(status_code=404, detail="Webhook not found")
         
    db.delete(wb)
    db.commit()
    return {"message": "Webhook deleted"}

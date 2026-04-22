import asyncio
import models
from database import SessionLocal
from chatwoot_client import ChatwootClient
from rabbitmq_client import rabbitmq
from services.engine import execute_funnel
from core.logger import setup_logger


import zoneinfo
from datetime import datetime, timezone, timedelta
logger = setup_logger(__name__)
BRAZIL_TZ = zoneinfo.ZoneInfo("America/Sao_Paulo")


def render_template_body(body: str, components: list, contact_name: str = None, var1: str = None, var2: str = None, var3: str = None, var4: str = None, var5: str = None) -> str:
    """Substitui {{1}}, {{2}}... e {{nome}}, {{telefone}} no corpo da mensagem."""
    if not body:
        return ""
        
    # Proteção: Se o nome for "1", tratamos como vazio
    real_name = contact_name if str(contact_name) != "1" else ""

    # 0. Prioridade absoluta: Variáveis persistidas (var1-var5)
    persist_vars = {
        "1": var1,
        "2": var2,
        "3": var3,
        "4": var4,
        "5": var5
    }
    
    for idx_s, val in persist_vars.items():
        if val: # Só substitui se houver valor preenchido (não vazio e não None)
             body = body.replace(f"{{{{{idx_s}}}}}", str(val))

    # 1. Substituição de variáveis nomeadas (padrão amigável)
    body = body.replace("{{nome}}", real_name or "")
    body = body.replace("{{name}}", real_name or "")
    
    body_comp = next(
        (c for c in components if isinstance(c, dict) and str(c.get("type", "")).lower() == "body"),
        None
    )
    
    # 2. Se houver componentes (Template Meta), processa variáveis numéricas {{1}}, {{2}}...
    # Apenas se as variáveis persistidas não tiverem preenchido tudo ou se preferirmos fallback
    if body_comp:
        for idx, param in enumerate(body_comp.get("parameters", []), 1):
            # Se já preenchemos via persist_vars, pulamos ou usamos o valor persistido
            if persist_vars.get(str(idx)) is not None:
                continue
                
            value = param.get("text", "") if isinstance(param, dict) else str(param)
            
            # Se o valor for "1" e for o primeiro parâmetro, tentamos usar o nome do contato
            if idx == 1 and str(value) == "1" and real_name:
                value = real_name
            elif str(value) == "1":
                value = ""
                
            body = body.replace(f"{{{{{idx}}}}}", str(value))
    
    # 3. Fallback final para {{1}} (comum em CRM) mesmo sem body_comp
    if "{{1}}" in body:
        # Se var1 não foi passado ou está vazio, usamos real_name
        fallback_val = persist_vars.get("1") or real_name or ""
        body = body.replace("{{1}}", fallback_val)
        
    return body



def sanitize_template_components(components: list, contact_name: str = None) -> list:
    """
    Remove ou substitui valores inválidos (como '1') nos componentes do template
    antes de enviar para a Meta API. Isso evita o erro "Ei 1" quando o CRM
    manda dados inconsistentes.
    """
    if not components:
        return []
    
    import copy
    try:
        new_components = copy.deepcopy(components)
        for comp in new_components:
            if isinstance(comp, dict) and comp.get("type", "").lower() == "body":
                params = comp.get("parameters", [])
                for param in params:
                    if isinstance(param, dict) and param.get("type") == "text":
                        val = str(param.get("text", "")).strip()
                        if val == "1":
                            # Substitui pelo nome do contato se disponível, senão vazio
                            param["text"] = contact_name if contact_name else ""
        return new_components
    except Exception as e:
        print(f"⚠️ Erro ao sanitizar componentes: {e}")
        return components


def extract_template_buttons(components: list) -> dict:
    """
    Extrai informações de botões dos componentes do template da Meta.
    Retorna: {
        "quick_replies": [str], 
        "has_special_buttons": bool (URL/Phone)
    }
    """
    quick_replies = []
    has_special_buttons = False
    
    if not components:
        return {"quick_replies": [], "has_special_buttons": False}
        
    for comp in components:
        if isinstance(comp, dict) and comp.get("type", "").upper() == "BUTTONS":
            buttons = comp.get("buttons", [])
            for btn in buttons:
                b_type = str(btn.get("type", "")).upper()
                if b_type == "QUICK_REPLY":
                    text = btn.get("text")
                    if text:
                        quick_replies.append(text)
                elif b_type in ["URL", "PHONE_NUMBER"]:
                    has_special_buttons = True
    
    return {
        "quick_replies": quick_replies,
        "has_special_buttons": has_special_buttons
    }


async def process_bulk_send(trigger_id: int, template_name: str, contacts: list, delay: int, concurrency: int, language: str = 'pt_BR', components: list = None, direct_message: str = None, direct_message_params: dict = None):
    print(f"Starting BULK SEND {trigger_id} | Contacts: {len(contacts or [])} | Delay: {delay}s |  Concurrency: {concurrency} | Lang: {language} | DM: {bool(direct_message)}")
    
    if not contacts:
        db = SessionLocal()
        t = db.query(models.ScheduledTrigger).get(trigger_id)
        if t:
             t.status = "completed"
             t.total_sent = 0
             t.total_failed = 0
             db.commit()
        db.close()
        return

    total = len(contacts)
    sent_count = 0
    failed_count = 0

    concurrency = max(1, int(concurrency or 1))
    delay = max(0, int(delay or 5))

    # Initialize contact tracking and get client context
    db_init = SessionLocal()
    init_trig = db_init.query(models.ScheduledTrigger).get(trigger_id)
    
    p_message = None
    c_id = None
    
    if init_trig:
         chatwoot = ChatwootClient(client_id=init_trig.client_id)
         all_phones = [c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '') for c in contacts]
         init_trig.contacts_list = contacts
         init_trig.pending_contacts = all_phones
         init_trig.processed_contacts = []
         # Reset counters to 0 just in case
         init_trig.total_sent = 0
         init_trig.total_failed = 0
         
         p_message = init_trig.private_message
         p_delay = init_trig.private_message_delay
         p_concurrency = init_trig.private_message_concurrency
         c_id = init_trig.client_id

         # --- [PIPELINE MONITOR] INITIALIZE HISTORY ---
         from services.engine import log_node_execution
         log_node_execution(
             db_init, init_trig, 
             node_id='DISCOVERY', 
             status='completed', 
             details='Iniciando disparo em massa...'
         )
         log_node_execution(
             db_init, init_trig, 
             node_id='DELIVERY', 
             status='processing', 
             details=f'Enviando para {total} contatos...'
         )

         db_init.commit()
    else:
         chatwoot = ChatwootClient()

    db_init.close()

    # Pre-fetch do corpo do template para Turbo Send automático (substituição de variáveis)
    template_body_cache = None
    template_btn_info = {"quick_replies": [], "has_special_buttons": False}
    if template_name and c_id:
        try:
            t_name = template_name.split('|')[0] if '|' in template_name else template_name
            db_tmpl = SessionLocal()
            cached_tmpl = db_tmpl.query(models.WhatsAppTemplateCache).filter(
                models.WhatsAppTemplateCache.client_id == c_id,
                models.WhatsAppTemplateCache.name == t_name
            ).first()
            if cached_tmpl:
                if cached_tmpl.body:
                    template_body_cache = cached_tmpl.body
                    print(f"📋 [Turbo Send] Template body em cache para '{t_name}'")
                
                # Extrair botões para Smart Send preservá-los
                if cached_tmpl.components:
                    template_btn_info = extract_template_buttons(cached_tmpl.components)
                    if template_btn_info["has_special_buttons"]:
                        print(f"🔗 [Smart Send Audit] Template '{t_name}' possui botões de URL/Phone. Fallback para livre será desativado.")
                    elif template_btn_info["quick_replies"]:
                        print(f"🔘 [Smart Send Audit] Template '{t_name}' possui {len(template_btn_info['quick_replies'])} botões Quick Reply. Serão convertidos se necessário.")

            db_tmpl.close()
        except Exception as e:
             print(f"⚠️ Erro ao carregar cache do template: {e}")

    for i in range(0, total, concurrency):
        # Check if cancelled or cancelling
        db_check = SessionLocal()
        current_trig = db_check.query(models.ScheduledTrigger).get(trigger_id)
        if not current_trig or current_trig.status in ['cancelled', 'cancelling']:
             print(f"Bulk send {trigger_id} CANCELLED by user.")
             if current_trig:
                 current_trig.status = 'cancelled'
                 db_check.commit()
             db_check.close()
             return

        # Check for PAUSED state
        while current_trig and current_trig.status == 'paused':
            print(f"Bulk send {trigger_id} PAUSED. Waiting 5s...")
            db_check.close()
            await asyncio.sleep(5)
            db_check = SessionLocal()
            current_trig = db_check.query(models.ScheduledTrigger).get(trigger_id)
            if not current_trig or current_trig.status in ['cancelled', 'cancelling']:
                db_check.close()
                return

        # Line 81 was removed to keep session open for following operations
        
        batch = contacts[i:i + concurrency]
        batch_phones = [c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '') for c in batch]
        
        # Update contact tracking
        if current_trig.processed_contacts is None: current_trig.processed_contacts = []
        current_trig.processed_contacts = list(set((current_trig.processed_contacts or []) + batch_phones))
        all_phones = [c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '') for c in contacts]
        current_trig.pending_contacts = [p for p in all_phones if p not in current_trig.processed_contacts]
        
        # Check for blocked contacts with normalization
        blocked_raw = db_check.query(models.BlockedContact.phone).filter(
            models.BlockedContact.client_id == current_trig.client_id
        ).all()
        # Normalização: apenas dígitos para busca flexível
        blocked_list = set()
        for b in blocked_raw:
            p = "".join(filter(str.isdigit, str(getattr(b, 'phone', b[0]))))
            if p:
                blocked_list.add(p)
        
        db_check.commit()
        
        # [IDEMPOTÊNCIA] Carregar telefones já processados com SUCESSO para este trigger
        # Usamos normalização (apenas dígitos) para evitar duplicados por formatação (+55 vs 55)
        sent_phones_raw = db_check.query(models.MessageStatus.phone_number).filter(
            models.MessageStatus.trigger_id == trigger_id,
            models.MessageStatus.status == 'sent'
        ).all()
        sent_phones_set = {"".join(filter(str.isdigit, str(p[0]))) for p in sent_phones_raw if p[0]}
        
        db_check.close()

        print(f"Processing batch {i} to {i+concurrency}")
        
        # Prepare tasks (clean template name for A/B variations)
        actual_template_name = template_name.split('|')[0] if template_name and '|' in template_name else template_name

        async def mock_blocked(phone, t_id):
            # Criar registro de status como bloqueado para aparecer no painel
            db_block = SessionLocal()
            try:
                existing = db_block.query(models.MessageStatus).filter_by(
                    message_id=f"blocked_{t_id}_{phone}"
                ).first()
                if not existing:
                    new_status = models.MessageStatus(
                        trigger_id=t_id,
                        message_id=f"blocked_{t_id}_{phone}",
                        phone_number=phone,
                        status="failed",
                        failure_reason="Lista de Exclusão (Bloqueado)",
                        message_type="TEMPLATE"
                    )
                    db_block.add(new_status)
                    db_block.commit()
            except Exception as e:
                db_block.rollback()
                print(f"⚠️ Error recording blocked status: {e}")
            finally:
                db_block.close()
            return {"error": True, "detail": "Contato Bloqueado"}
            
        async def send_smart_message(phone, last_interaction=None, contact_components=None, contact_name: str = None):
            try:
                effective_components = contact_components if contact_components is not None else components
                
                # 1. Verificação Local da Janela 24h (Offline & Rápido)
                # MODIFICAÇÃO: Se o template possui botões de URL/Phone, OBRIGATORIAMENTE usamos o Template oficial.
                # Mensagens de sessão (livre) não suportam links externos.
                can_use_smart_send = True
                if template_btn_info["has_special_buttons"]:
                    can_use_smart_send = False
                    print(f"⏭️ [Smart Send] Ignorado para {phone}: Template contém botões de URL/Link.")

                if can_use_smart_send and last_interaction and (direct_message or template_body_cache):

                    if last_interaction.tzinfo is None:
                        last_interaction = last_interaction.replace(tzinfo=timezone.utc)

                    now = datetime.now(timezone.utc)
                    diff = now - last_interaction

                    # Margem de Segurança: 24h - 1 minuto
                    safety_limit = timedelta(hours=23, minutes=59)

                    if diff < safety_limit:
                        print(f"🟢 [Smart Send] Janela ABERTA para {phone} (Última: {diff.total_seconds()/3600:.2f}h atrás).")

                        # Determina o texto livre a enviar
                        free_text = render_template_body(direct_message, effective_components or [], contact_name=contact_name) if direct_message else None
                        
                        # Auto-render em caso de Turbo Send (usa corpo do template sem as tags de botão se não houver direct_message)
                        if not free_text and template_body_cache:
                            try:
                                free_text = render_template_body(template_body_cache, effective_components or [], contact_name=contact_name)
                                print(f"📝 [Smart Send] Renderização Automática para {phone}: {free_text[:80]}...")
                            except Exception as render_err:
                                print(f"⚠️ [Smart Send] Falha na renderização automática: {render_err}. Tentando template oficial.")
                                free_text = None

                        if free_text:
                            # Prepara botões se configurados
                            btn_texts = []
                            
                            # Prioridade 1: Botões configurados no Disparo Direto
                            if direct_message and direct_message_params:
                                buttons = []
                                if isinstance(direct_message_params, list):
                                    buttons = direct_message_params
                                elif isinstance(direct_message_params, dict):
                                    buttons = direct_message_params.get("buttons", [])
                                for b in buttons:
                                    if isinstance(b, str): btn_texts.append(b)
                                    elif isinstance(b, dict): btn_texts.append(b.get("text", "Botão"))
                            
                            # Prioridade 2: Botões extraídos do Template (fallback inteligente)
                            if not btn_texts and template_btn_info["quick_replies"]:
                                # O WhatsApp só permite até 3 botões em mensagens interativas de sessão
                                btn_texts = template_btn_info["quick_replies"][:3]
                                if len(template_btn_info["quick_replies"]) > 3:
                                    print(f"⚠️ [Smart Send] Template possui {len(template_btn_info['quick_replies'])} botões. Session suporta apenas 3. Enviando os 3 primeiros.")

                            print(f"📤 [Smart Send] Tentando Mensagem Livre (Sessão) para {phone}...")
                            res = None
                            if btn_texts:
                                res = await chatwoot.send_interactive_buttons(phone, free_text, btn_texts)
                            else:
                                res = await chatwoot.send_text_direct(phone, free_text)

                            # Verificação rigorosa de sucesso (Meta API e Chatwoot API)
                            is_success = False
                            if isinstance(res, dict):
                                if res.get("messages") or res.get("id") or res.get("success") is True or (not res.get("error") and res.get("messaging_product") == "whatsapp"):
                                    is_success = True

                            if is_success:
                                now_br = datetime.now(BRAZIL_TZ).strftime("%d/%m/%Y %H:%M:%S")
                                print(f"🚀 [DISPARO] [Trigger {trigger_id}] [{now_br}] [{phone}] Tipo: LIVRE (Sessão) | Sucesso")
                                return {"result": res, "type": "FREE_MESSAGE", "success": True}

                            # Se falhou, analisamos o motivo antes de decidir o fallback
                            err_msg = str(res.get("detail", "")).lower() if isinstance(res, dict) else str(res).lower()
                            print(f"⚠️ [Smart Send Erro] Falha no envio livre para {phone}: {err_msg}")
                            
                            # FALLBACK STRICT: Só tentamos o Template se for erro de JANELA ou SESSÃO EXPIRADA
                            if any(msg in err_msg for msg in ["within 24 hours", "window", "expired", "session"]):
                                print(f"🔄 [Smart Send] Erro de janela detectado. Fazendo fallback para Template Oficial.")
                            else:
                                print(f"🛑 [Smart Send] Erro crítico não-recuperável. Abortando fallback para evitar disparos duplicados.")
                                return {"error": True, "detail": f"Falha na Mensagem Livre: {err_msg}", "success": False}
                        else:
                            print(f"⚠️ [Smart Send] Nenhum conteúdo livre gerado para {phone}. Pulando para Template.")
                    else:
                        print(f"🔒 [Smart Send] Janela EXPIRADA ou INSEGURA para {phone}. Usando Template Oficial.")
                else:
                    if not last_interaction:
                        print(f"ℹ️ [Smart Send] Sem histórico de interação para {phone}. Usando Template Oficial por padrão.")
                    else:
                        print(f"ℹ️ [Smart Send] Conteúdo livre não configurado ou forçado para Template. Usando Template Oficial.")

                # 2. Envio Via Template Oficial (Pago)
                if actual_template_name:
                    now_br = datetime.now(BRAZIL_TZ).strftime("%d/%m/%Y %H:%M:%S")
                    print(f"🚀 [DISPARO] [Trigger {trigger_id}] [{now_br}] [{phone}] Tipo: TEMPLATE ({actual_template_name})")
                    
                    # Sanitizar componentes (remove "Ei 1")
                    clean_components = sanitize_template_components(effective_components or [], contact_name=contact_name)
                    
                    res = await chatwoot.send_template(phone, actual_template_name, language, components=clean_components)
                    if res and not res.get("error"):
                        logger.info(f"   ✅ [DISPARO SUCESSO] Trigger {trigger_id} (Template)")
                        return {"result": res, "type": "TEMPLATE"}
                    
                    print(f"❌ [Smart Send Falha] Erro no Template Oficial: {res}")
                    return res
                
                return {"error": True, "detail": "Nenhum conteúdo configurado (Template ou Mensagem Direta)"}
            except Exception as e:
                print(f"❌ [Smart Send CRITICAL] Exceção inesperada: {e}")
                return {"error": True, "detail": str(e), "success": False}

        # Pre-fetch Interaction Data for the current batch (Ultra-fast local query)
        db_fetch = SessionLocal()
        batch_interaction_map = {}
        try:
             windows = db_fetch.query(models.ContactWindow).filter(
                 models.ContactWindow.client_id == c_id,
                 models.ContactWindow.phone.in_(batch_phones)
             ).all()
             batch_interaction_map = {w.phone: w.last_interaction_at for w in windows}
        except Exception as e_fetch:
             print(f"⚠️ Error pre-fetching interaction data: {e_fetch}")
        finally:
             db_fetch.close()

        tasks = []
        batch_phones = []
        batch_names = []
        batch_vars = []
        seen_phones_in_batch = set()

        for c in batch:
            logger.info(f"🔍 [DEBUG BULK] Contact Object keys: {list(c.keys()) if isinstance(c, dict) else 'not dict'} | Full: {c}")
            phone = c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or c.get('whatsapp') or '')
            
            # Limpeza do telefone para verificação de duplicatas
            clean_p = "".join(filter(str.isdigit, str(phone)))
            if not clean_p:
                continue

            # Idempotência 1: Evitar duplicados dentro da mesma lista/batch do asyncio.gather
            if clean_p in seen_phones_in_batch:
                print(f"⚠️ Telefone {phone} duplicado no lote atual. Pulando.")
                continue
            seen_phones_in_batch.add(clean_p)

            # Idempotência 2: Verificar se já foi enviado com sucesso para este trigger (DB check)
            if clean_p in sent_phones_set:
                print(f"✅ [Idempotência] Contato {phone} já recebeu mensagem neste disparo. Pulando.")
                continue

            # Detecção de nome mais robusta para substituir {{1}}
            name = ""
            if not isinstance(c, str):
                name = (
                    c.get('{{1}}') or 
                    c.get('1') or 
                    c.get('name') or 
                    c.get('nome') or 
                    c.get('first_name') or 
                    c.get('full_name') or 
                    c.get('cliente') or ""
                )
                if not name:
                    name = c.get('Name') or c.get('Nome') or ""
                
                # NOVO: Busca profunda em components se o nome ainda estiver vazio
                if not name and isinstance(c, dict) and 'components' in c:
                    for comp in c.get('components', []):
                        if isinstance(comp, dict) and str(comp.get("type", "")).lower() == "body":
                            params = comp.get("parameters", [])
                            if params and isinstance(params[0], dict):
                                name = params[0].get("text") or ""
                                logger.info(f"🎯 [EXTRACTION] Name found in components BODY: {name}")
                            elif params and isinstance(params[0], str):
                                name = params[0]
                                logger.info(f"🎯 [EXTRACTION] Name found in components (str): {name}")
                            break
                
                if name:
                    logger.info(f"✅ [EXTRACTION] Final Resolved Name for contact: {name}")
                else:
                    logger.warning(f"⚠️ [EXTRACTION] Could NOT resolve name for {phone}")
            
            if name == "1" or name == 1:
                name = ""
            
            # Verificação contra Lista de Exclusão
            if clean_p in blocked_list:
                print(f"🚫 Contato {phone} está na Lista de Exclusão. Pulando.")
                tasks.append(mock_blocked(phone, trigger_id))
                batch_phones.append(phone)
                batch_names.append(name)
                continue
            
            last_int = batch_interaction_map.get(phone)
            
            # Extraction of components per contact from 'contacts' if available
            per_contact_components = None
            if isinstance(c, dict) and 'components' in c:
                per_contact_components = c['components']
            
            batch_phones.append(phone)
            batch_names.append(name)
            
            # Capturar variáveis para persistência (1 a 5) de forma robusta
            cvars = {}
            if isinstance(c, dict):
                for v_idx in range(1, 6):
                    v_key = str(v_idx)
                    v_key_alt = f"{{{{{v_idx}}}}}"
                    # Tenta várias chaves no nível superior: literal 1, string "1", string "{{1}}", "var1", etc.
                    val = c.get(v_key) or c.get(v_key_alt) or c.get(v_idx) or c.get(f"var{v_idx}")
                    
                    # NOVO: Se não encontrou no topo, busca dentro de 'components' (Padrão Meta/Bulk API)
                    if not val and per_contact_components:
                        # Busca nos parâmetros do componente de corpo (body)
                        for comp in per_contact_components:
                            if isinstance(comp, dict) and str(comp.get("type", "")).lower() == "body":
                                params = comp.get("parameters", [])
                                if len(params) >= v_idx:
                                    p = params[v_idx-1]
                                    val = p.get("text") if isinstance(p, dict) else p
                                    if val:
                                        logger.info(f"🎯 [EXTRACTION] Variable {v_idx} found in components: {val}")
                                break
                    
                    # Se for a var1 e estiver vazia, tenta usar o nome já resolvido (Nome, Name, etc.)
                    if v_idx == 1 and not val:
                        val = name
                        if val:
                            logger.info(f"🎯 [EXTRACTION] Var1 inheriting from resolved name: {val}")
                        
                    cvars[f"var{v_idx}"] = str(val) if val is not None else ""
            else:
                for v_idx in range(1, 6): cvars[f"var{v_idx}"] = ""
            
            batch_vars.append(cvars)
            tasks.append(send_smart_message(phone, last_int, per_contact_components, contact_name=name))

        results = await asyncio.gather(*tasks)
        
        # Store message IDs and update batch statistics in DB
        db_msg = SessionLocal()
        try:
            # Pre-fetch trigger to update counters
            t_update = db_msg.query(models.ScheduledTrigger).get(trigger_id)
            
            for idx, res_wrapper in enumerate(results):
                is_success = False
                message_id = None
                failure_reason = None
                msg_type = "UNKNOWN"

                # Unpack result wrapper if successful
                res = res_wrapper
                if isinstance(res_wrapper, dict) and "type" in res_wrapper and "result" in res_wrapper:
                    res = res_wrapper["result"]
                    msg_type = res_wrapper["type"]

                if isinstance(res, dict):
                    logger.info(f"🔍 [TRACE] Resposta recibida para {batch_phones[idx]}: {res}")
                    if res.get("error"):
                        failure_reason = str(res.get("detail") or res.get("error"))
                    else:
                        # Logic for both Meta API (messages[0].id) and Chatwoot API (id)
                        messages = res.get('messages', [])
                        if messages:
                            raw_id = messages[0].get('id')
                            message_id = raw_id.replace("wamid.", "") if raw_id else raw_id
                            logger.info(f"✅ [TRACE] ID Meta capturado: {message_id}")
                            is_success = True
                        elif res.get("id"):
                            # This handles records sent via Chatwoot API directly
                            message_id = str(res.get("id")).replace("wamid.", "")
                            logger.info(f"✅ [TRACE] ID Chatwoot/Meta capturado: {message_id}")
                            is_success = True
                        else:
                            failure_reason = f"No message ID returned (Status: {res})"
                else:
                    failure_reason = "Invalid response format"

                # Persist each result individually to avoid batch rollbacks
                try:
                    if is_success:
                        if message_id:
                            cv = batch_vars[idx]
                            # LOG EXPLÍCITO DE PERSISTÊNCIA (Solicitado pelo usuário com nomes de colunas)
                            logger.info(
                                f"💾 [DB PERSISTENCE] Registro salvo - "
                                f"Coluna(phone_number): {batch_phones[idx]} | "
                                f"Coluna(template_name): {actual_template_name} | "
                                f"Coluna(var1): '{cv.get('var1')}' | "
                                f"Coluna(var2): '{cv.get('var2')}' | "
                                f"Coluna(status): 'sent'"
                            )

                            msg_status = models.MessageStatus(
                                trigger_id=trigger_id,
                                message_id=message_id,
                                phone_number=batch_phones[idx],
                                status='sent',
                                message_type=msg_type,
                                content=direct_message or f"[Template: {actual_template_name}]",
                                var1=cv.get('var1'),
                                var2=cv.get('var2'),
                                var3=cv.get('var3'),
                                var4=cv.get('var4'),
                                var5=cv.get('var5'),
                                template_name=actual_template_name
                            )
                            db_msg.add(msg_status)
                            
                            if p_message and p_message != "VARIES":
                                current_name = batch_names[idx]
                                # Usar as variáveis extraídas (cv) e o nome resolvido para a nota privada
                                rendered_p_msg = render_template_body(
                                    p_message, 
                                    components or [], 
                                    contact_name=current_name,
                                    var1=cv.get('var1'),
                                    var2=cv.get('var2'),
                                    var3=cv.get('var3'),
                                    var4=cv.get('var4'),
                                    var5=cv.get('var5')
                                )
                                logger.info(f"💬 [DEBUG NOTE] Nota renderizada para {phone}: {rendered_p_msg[:50]}...")
                                type_label = "MENSAGEM DIRETA (Livre)" if msg_type == "FREE_MESSAGE" else f"TEMPLATE OFICIAL ({actual_template_name})"
                                msg_status.pending_private_note = f"{rendered_p_msg}\n\n📢 Enviado via: {type_label}"
                        
                        if t_update:
                            t_update.total_sent = (t_update.total_sent or 0) + 1
                        sent_count += 1
                    else:
                        import uuid
                        fake_id = f"failed_{uuid.uuid4()}" 
                        cv = batch_vars[idx]
                        msg_status = models.MessageStatus(
                            trigger_id=trigger_id,
                            message_id=fake_id, 
                            phone_number=batch_phones[idx],
                            status='failed',
                            failure_reason=failure_reason or "Unknown Error",
                            var1=cv.get('var1'),
                            var2=cv.get('var2'),
                            var3=cv.get('var3'),
                            var4=cv.get('var4'),
                            var5=cv.get('var5'),
                            template_name=actual_template_name
                        )
                        logger.warning(f"💾 [DB PERSISTENCE] Saving FAILED record for {batch_phones[idx]}: {failure_reason}")
                        db_msg.add(msg_status)
                        
                        if t_update:
                            t_update.total_failed = (t_update.total_failed or 0) + 1
                        failed_count += 1
                    
                    db_msg.commit()
                except Exception as e_item:
                    db_msg.rollback()
                    logger.error(f"❌ [BULK] Error persisting result for {batch_phones[idx]}: {e_item}")

        except Exception as e:
            logger.error(f"❌ [BULK] Error in batch processing loop: {e}")
        finally:
            db_msg.close()
        
        # Delay and Event
        db_ev = SessionLocal()
        t_ev = db_ev.query(models.ScheduledTrigger).get(trigger_id)
        
        progress_data = {
            "trigger_id": trigger_id,
            "client_id": t_ev.client_id if t_ev else None,
            "status": "processing",
            "sent": t_ev.total_sent if t_ev else sent_count,
            "failed": t_ev.total_failed if t_ev else failed_count,
            "blocked": t_ev.total_blocked if t_ev else 0,
            "total": total,
            "delivered": t_ev.total_delivered if t_ev else 0,
            "read": t_ev.total_read if t_ev else 0,
            "interactions": t_ev.total_interactions if t_ev else 0,
            "cost": t_ev.total_cost if t_ev else 0.0,
            "processed_contacts": t_ev.processed_contacts if t_ev else [],
            "pending_contacts": t_ev.pending_contacts if t_ev else []
        }
        
        # Capture and close before await
        db_ev.close()

        try:
            await rabbitmq.publish_event("bulk_progress", progress_data)
        except Exception as e:
            print(f"⚠️ Error publishing bulk progress: {e}")

        if i + concurrency < total:
            await asyncio.sleep(delay)

    # Final Update
    db_final = SessionLocal()
    t_final = db_final.query(models.ScheduledTrigger).get(trigger_id)
    if t_final and t_final.status != 'cancelled':
        # 🔍 [MONITOR] Finaliza Passo 2
        from services.engine import log_node_execution
        log_node_execution(
            db_final, t_final, 
            node_id='DELIVERY', 
            status='completed', 
            details=f'Envio finalizado para {t_final.total_sent} contatos.'
        )
        
        t_final.status = "completed"
        db_final.commit()
        
        # Final Event - Re-fetch everything to avoid overwriting real-time updates from worker (read/interaction)
        progress_data = {
            "trigger_id": trigger_id,
            "status": "completed",
            "sent": t_final.total_sent,
            "failed": t_final.total_failed,
            "blocked": t_final.total_blocked or 0,
            "total": total,
            "delivered": t_final.total_delivered or 0,
            "read": t_final.total_read or 0,
            "interactions": t_final.total_interactions or 0,
            "cost": t_final.total_cost or 0.0,
            "processed_contacts": t_final.processed_contacts or [],
            "pending_contacts": t_final.pending_contacts or []
        }
        await rabbitmq.publish_event("bulk_progress", progress_data)
        
    db_final.close()
    print(f"Bulk send {trigger_id} COMPLETED. Sent: {sent_count}, Failed: {failed_count}")


async def process_bulk_funnel(trigger_id: int, funnel_id: int, contacts: list, delay: int, concurrency: int):
    print(f"Starting BULK FUNNEL {trigger_id} | Funnel: {funnel_id} | Contacts: {len(contacts or [])}")
    
    if not contacts:
        db = SessionLocal()
        t = db.query(models.ScheduledTrigger).get(trigger_id)
        if t:
             t.status = "completed"
             db.commit()
        db.close()
        return

    total = len(contacts)
    sent_count = 0
    failed_count = 0 
    concurrency = max(1, int(concurrency or 1))
    delay = max(0, int(delay or 5))

    # --- [PIPELINE MONITOR] INITIALIZE HISTORY ---
    db_init = SessionLocal()
    init_trig = db_init.query(models.ScheduledTrigger).get(trigger_id)
    if init_trig:
        from services.engine import log_node_execution
        log_node_execution(
            db_init, init_trig, 
            node_id='DISCOVERY', 
            status='completed', 
            details='Iniciando disparo em massa de funis...'
        )
        log_node_execution(
            db_init, init_trig, 
            node_id='DELIVERY', 
            status='processing', 
            details=f'Processando funis para {total} contatos...'
        )
        db_init.commit()
    db_init.close()

    async def safe_exec(c, blocked_list, p_message=None, client_id=None, p_delay=5, p_concurrency=1):
         # Extract phone and conversation_id safely
         if isinstance(c, str):
             phone = c
             conv_id = 0 # Will be resolved by engine if needed
         else:
             phone = (c.get('phone') or c.get('telefone')) if isinstance(c, dict) else str(c)
             # Fallback for Chatwoot objects (Funnel Bulk)
             if not phone and isinstance(c, dict):
                 phone = c.get('meta', {}).get('sender', {}).get('phone_number')
             
             conv_id = (c.get('id') or c.get('conversation_id')) if isinstance(c, dict) else 0
             conv_id = conv_id or 0
             
         if not phone:
              logger.warning(f"⚠️ [BULK] Skipped contact with no phone: {c}")
              return False

         clean_phone = "".join(filter(str.isdigit, str(phone)))
         suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone
         if clean_phone in blocked_list or suffix in blocked_suffixes:
              print(f"🚫 Skipping blocked contact in funnel: {phone}")
              return False
         
         local_db = SessionLocal()
         try:
             print(f"👉 [BULK] Executing funnel for contact: {phone}")
             await execute_funnel(funnel_id, conv_id, trigger_id, phone, local_db)
             print(f"✅ [BULK] Funnel executed for {phone}")
             
             # Note: Private message queueing removed from here. 
             # It will be handled by execute_funnel -> engine.py on a per-step basis,
             # OR if there's a global trigger.private_message, it should be handled in the status webhook.
             
             return True
             
             return True
         except Exception as e:
             print(f"❌ [BULK] Error in bulk funnel item {phone}: {e}")
             return False
         finally:
             local_db.close()
    p_message = None
    p_delay = 5
    p_concurrency = 1
    c_id = None
    db_init = SessionLocal()
    init_trig = db_init.query(models.ScheduledTrigger).get(trigger_id)
    if init_trig:
        p_message = init_trig.private_message
        p_delay = init_trig.private_message_delay
        p_concurrency = init_trig.private_message_concurrency
        c_id = init_trig.client_id
        
        # Se for um disparo em massa (funnel), atualiza lista de pendentes
        all_phones = []
        for c in contacts:
            if isinstance(c, str): all_phones.append(c)
            else: all_phones.append(c.get('phone') or c.get('telefone') or '')
        
        init_trig.pending_contacts = all_phones
        init_trig.processed_contacts = []
        db_init.commit()
    from services.bulk import get_sent_phones_set
    sent_phones_set = await get_sent_phones_set(db_init, trigger_id)
    db_init.close()

    for i in range(0, total, concurrency):
        # Check cancellation
        db_check = SessionLocal()
        current_trig = db_check.query(models.ScheduledTrigger).get(trigger_id)
        if not current_trig or current_trig.status == 'cancelled':
             print(f"Bulk funnel {trigger_id} CANCELLED by user.")
             db_check.close()
             return

        # Check for PAUSED state
        while current_trig and current_trig.status == 'paused':
            print(f"Bulk funnel {trigger_id} PAUSED. Waiting 5s...")
            db_check.close()
            await asyncio.sleep(5)
            db_check = SessionLocal()
            current_trig = db_check.query(models.ScheduledTrigger).get(trigger_id)
            if not current_trig or current_trig.status in ['cancelled', 'cancelling']:
                db_check.close()
                return
        
        # Check for blocked contacts — build both full-number and suffix sets for flexible matching
        blocked_raw_funnel = db_check.query(models.BlockedContact.phone).filter(
            models.BlockedContact.client_id == current_trig.client_id
        ).all()
        blocked_list = set()
        blocked_suffixes = set()
        for b in blocked_raw_funnel:
            p = "".join(filter(str.isdigit, str(getattr(b, 'phone', b[0]))))
            if p:
                blocked_list.add(p)
                if len(p) >= 8:
                    blocked_suffixes.add(p[-8:])
                else:
                    blocked_suffixes.add(p)
        
        # Update Statistics
        if i > 0:
            current_trig.total_sent = sent_count
            current_trig.total_failed = failed_count
            db_check.commit()
        db_check.close()

        batch = contacts[i:i + concurrency]
        tasks = []
        batch_phones = []

        for c in batch:
            # Extract phone safely
            if isinstance(c, str): phone = c
            else: phone = (c.get('phone') or c.get('telefone')) if isinstance(c, dict) else str(c)
            
            if not phone: continue
            
            clean_phone = "".join(filter(str.isdigit, str(phone)))
            
            # IDEMPOTENCY CHECK
            if clean_phone in sent_phones_set:
                logger.info(f"⏭️ [Idempotency] Pulando {clean_phone} para Trigger {trigger_id} (Já disparado).")
                continue
                
            batch_phones.append(phone)
            tasks.append(safe_exec(c, blocked_list, p_message, c_id, p_delay, p_concurrency))
        
        if not tasks:
            print(f"⏩ Batch {i} pulado (Todos os contatos já processados).")
            continue

        print(f"Processing funnel batch {i} (Tasks: {len(tasks)})")
        results = await asyncio.gather(*tasks)
        
        for res in results:
            if res: sent_count += 1
            else: failed_count += 1
            
        if i + concurrency < total:
            # Emit WebSocket Event
            await rabbitmq.publish_event("bulk_progress", {
                "trigger_id": trigger_id,
                "processed": i + len(batch),
                "total": total,
                "sent": sent_count,
                "failed": failed_count,
                "blocked": 0, # total_blocked is only for buttons/mass send currently
                "status": "processing"
            })
            await asyncio.sleep(delay)

    # Final Update
    db_final = SessionLocal()
    t_final = db_final.query(models.ScheduledTrigger).get(trigger_id)
    if t_final and t_final.status != 'cancelled':
        # 🔍 [MONITOR] Finaliza Passo 2
        from services.engine import log_node_execution
        log_node_execution(
            db_final, t_final, 
            node_id='DELIVERY', 
            status='completed', 
            details=f'Processamento de funis finalizado para {t_final.total_sent} contatos.'
        )
        
        t_final.status = "completed"
        db_final.commit()
    db_final.close()
    
    # Final Event
    db_final = SessionLocal()
    t_final = db_final.query(models.ScheduledTrigger).get(trigger_id)
    if t_final:
        await rabbitmq.publish_event("bulk_progress", {
            "trigger_id": trigger_id,
            "processed": total,
            "total": total,
            "sent": t_final.total_sent,
            "failed": t_final.total_failed,
            "delivered": t_final.total_delivered or 0,
            "read": t_final.total_read or 0,
            "interactions": t_final.total_interactions or 0,
            "blocked": t_final.total_blocked or 0,
            "cost": t_final.total_cost or 0.0,
            "status": "completed"
        })
    db_final.close()
    print(f"Bulk funnel {trigger_id} COMPLETED.")

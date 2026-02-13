
import asyncio
import os
import subprocess
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
import models
from chatwoot_client import ChatwootClient
import logging
import unicodedata
import re
import zoneinfo
from core.logger import setup_logger
from config_loader import get_setting

logger = setup_logger("FunnelEngine")

def normalize_text(text: str) -> str:
    """
    Normaliza texto para comparação (Tags): 
    - Remove #
    - Transforma em minúsculo
    - Remove acentos e caracteres especiais (mantém apenas letras, números e espaços)
    """
    if not text: return ""
    text = str(text).replace("#", "").lower()
    # Decompor caracteres com acento e remover diacríticos
    text = "".join(c for c in unicodedata.normalize('NFKD', text) if not unicodedata.combining(c))
    # Manter apenas a-z, 0-9 e espaço
    text = re.sub(r'[^a-z0-9 ]', '', text)
    # Remover espaços extras e trim
    text = ' '.join(text.split())
    return text

# Instância local para uso no engine
UPLOAD_DIR = "static/uploads"

async def execute_funnel(funnel_id: int, conversation_id: int, trigger_id: int, contact_phone: str, db: Session):
    # Fetch funnel
    funnel = db.query(models.Funnel).filter(models.Funnel.id == funnel_id).first()
    if not funnel:
        logger.error(f"❌ Funnel {funnel_id} not found during execution")
        # Mark trigger as failed if it exists
        trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id).first()
        if trigger:
            trigger.status = 'failed'
            db.commit()
        return

    # Fetch trigger to get client_id
    trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id).first()
    if not trigger:
        logger.error(f"❌ Trigger {trigger_id} not found")
        return

    # Instantiate Client with Context
    chatwoot = ChatwootClient(client_id=trigger.client_id)

    logger.info(f"⚙️ Starting funnel {funnel.name} for conversation {conversation_id} (Trigger {trigger_id})")
    print(f"⚙️ [ENGINE] Starting funnel {funnel_id} (Name: {funnel.name}) | Trigger: {trigger_id} | Phone: {contact_phone}")
    
    # ✅ Resolve Conversation ID if missing
    if not conversation_id or int(conversation_id) == 0:
        # Get Inbox ID from settings
        inbox_id_str = get_setting("CHATWOOT_SELECTED_INBOX_ID", client_id=trigger.client_id)
        try:
            inbox_id = int(inbox_id_str) if inbox_id_str else None
        except ValueError:
            inbox_id = None

        logger.info(f"🔎 Conversation ID missing. Attempting to resolve for {contact_phone} using Inbox {inbox_id}...")
        resolved_id = await chatwoot.ensure_conversation(contact_phone, "Novo Contato ZapVoice", inbox_id)
        if resolved_id:
            conversation_id = resolved_id
            try:
                 db_trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id).first()
                 if db_trigger:
                     db_trigger.conversation_id = conversation_id
                     db.commit()
            except Exception as e:
                logger.error(f"Failed to update trigger with conversation_id: {e}")
        else:
            logger.error(f"❌ Failed to resolve/create conversation for {contact_phone}. Aborting Funnel.")
            return

    # Status check
    if trigger.status == 'completed':
        logger.warning(f"⚠️ Trigger {trigger_id} already completed. Skipping.")
        return
    
    # FIX: Se for Bulk, ele já está as 'processing' controlado pelo loop do worker.
    # Se for Single, o Scheduler pode já ter setado como 'processing' ao enviar para a fila para evitar duplicação.
    # Portanto, se veio do Worker (que chama execute_funnel), devemos confiar.
    # A verificação real de "stale" deve ser se timestamp update for MUITO velho.
    if trigger.status == 'processing':
        # Se for Bulk, ignoramos (já tratado)
        if trigger.is_bulk:
            pass 
        else:
            # Se for Single, só abortamos se parecer que é UMA OUTRA instância rodando (race condition)
            # Mas como saber se sou EU que estou rodando ou outro?
            # Assumimos que se chegou aqui, o Worker pegou a mensagem.
            # O problema é se o Scheduler setou 'processing' e o Engine acha que isso é erro.
            # Vamos RELAXAR a verificação: Se foi atualizado há menos de 10s, assumimos que é o Scheduler que acabou de mandar.
            time_diff = (datetime.now(timezone.utc) - (trigger.updated_at or trigger.created_at)).total_seconds()
            if time_diff < 30: # Janela de 30s de tolerância para o Scheduler -> Worker
                 logger.info(f"ℹ️ Trigger {trigger_id} is processing (Scheduler handoff? Diff: {time_diff}s). Proceeding...")
            elif time_diff > 600:
                 # Stale job (10m) - Proceed (recovery)
                 logger.warning(f"⚠️ Trigger {trigger_id} stale processing (>600s). Resetting/Proceeding.")
            else:
                 # Active processing between 30s and 600s - Likely Concurrent
                 logger.warning(f"⚠️ Trigger {trigger_id} processing concurrently (Diff: {time_diff}s). Skipping.")
                 return

    if not trigger.is_bulk:
        trigger.status = 'processing'
        db.commit()

    # DETECT FORMAT: Legacy List vs New Graph
    steps_data = funnel.steps
    is_legacy = isinstance(steps_data, list)
    
    try:
        if is_legacy:
            # ---------------------------------------------------------
            # LEGACY LINEAR EXECUTION (Keep for safety/transition)
            # ---------------------------------------------------------
            logger.info("📺 Executing LEGACY (Linear) Funnel")
            print(f"📺 [ENGINE] Legacy Funnel Execution Started for Trigger {trigger_id}")
            await execute_legacy_funnel(trigger, steps_data, chatwoot, conversation_id, contact_phone, db)
        else:
            # ---------------------------------------------------------
            # NEW GRAPH EXECUTION
            # ---------------------------------------------------------
            logger.info("🕸️ Executing GRAPH Funnel")
            print(f"🕸️ [ENGINE] Graph Funnel Execution Started for Trigger {trigger_id}")
            await execute_graph_funnel(trigger, steps_data, chatwoot, conversation_id, contact_phone, db)
    except Exception as e:
        logger.error(f"❌ CRITICAL ERROR in funnel execution for trigger {trigger_id}: {str(e)}")
        # Record error and mark as failed
        trigger.status = 'failed'
        trigger.failure_reason = str(e)
        db.commit()
        raise e # Re-raise so worker knows it failed too if needed


async def execute_graph_funnel(trigger, graph_data, chatwoot, conversation_id, contact_phone, db):
    """
    Executes the funnel based on Nodes and Edges.
    graph_data: { "nodes": [...], "edges": [...] }
    """
    nodes = {n["id"]: n for n in graph_data.get("nodes", [])}
    edges = graph_data.get("edges", [])
    
    # Identify Start Node (if not already running)
    current_node_id = trigger.current_node_id
    
    if not current_node_id:
        # New execution: find "start" node
        start_node = next((n for n in nodes.values() if n.get("type") == "start"), None)
        if not start_node:
             # Fallback 1: Try to find node with data.isStart = True
             start_node = next((n for n in nodes.values() if n.get("data", {}).get("isStart") is True), None)
        if not start_node:
             # Fallback 2: Try to find node with ID "start"
             start_node = nodes.get("start")
        
        if not start_node:
            logger.error("❌ No START node found in graph!")
            trigger.status = 'failed'
            db.commit()
            return
        
        current_node_id = start_node["id"]
        # Skip executing the 'start' node logic itself, just move to next
        # Actually start node usually has no logic, just an output edge.
    
    # Execution Loop
    while current_node_id:
        node = nodes.get(current_node_id)
        if not node:
            logger.error(f"❌ Node {current_node_id} not found in graph.")
            break
            
        node_type = node.get("type")
        data = node.get("data", {})
        
        logger.info(f"📍 PROCESSING NODE: Type={node_type} ID={current_node_id}")
        print(f"📍 [ENGINE] Processing Node: {node_type} ({current_node_id}) for {contact_phone}")
        
        # Default next handle (single output)
        source_handle = None 
        
        # --- NODE LOGIC HANDLERS ---
        
        if node_type == "start":
            pass # Just move on
            
        elif node_type in ["message", "messageNode"]:
            content = data.get("content", "")
            variations = data.get("variations", [])
            logger.info(f"📩 Sending Message Node {current_node_id}. Content: '{content}'")
            
            # Pool de opções (principal + variações não vazias)
            options = [content] if content else []
            options.extend([v for v in variations if v.strip()])
            
            if options:
                final_content = random.choice(options)
                res = await chatwoot.send_message(conversation_id, final_content)
                
                # NEW: Record and handle private note post-delivery
                if res and isinstance(res, dict) and res.get("id"):
                    msg_id = str(res.get("id"))
                    new_ms = models.MessageStatus(
                        trigger_id=trigger.id,
                        message_id=msg_id,
                        phone_number=contact_phone,
                        status='sent'
                    )
                    # Check for note
                    if data.get("sendPrivateNote") and data.get("privateNoteContent"):
                         new_ms.pending_private_note = data.get("privateNoteContent")
                         logger.info(f"   ⏳ Private note stored for message {msg_id}, waiting for delivery.")
                    
                    db.add(new_ms)
                    db.commit()
            else:
                logger.warning(f"⚠️ Message Node {current_node_id} has empty content.")
            
        elif node_type in ["audioNode"]:
             # Handle Audio explicitly via Official API
             file_url = data.get("mediaUrl")
             logger.info(f"🎤 Processing AudioNode {current_node_id}. URL: {file_url} | Data: {data}")
             if file_url:
                 # Call new method
                 res = await chatwoot.send_audio_official(contact_phone, file_url)
                 
                 # NEW: Record and handle private note post-delivery
                 if res and isinstance(res, dict):
                     # Official API returns messages[0].id
                     wamid = None
                     if res.get("messages"): wamid = res["messages"][0].get("id")
                     elif res.get("id"): wamid = str(res["id"])
                     
                     if wamid:
                         new_ms = models.MessageStatus(
                             trigger_id=trigger.id,
                             message_id=wamid,
                             phone_number=contact_phone,
                             status='sent'
                         )
                         if data.get("sendPrivateNote") and data.get("privateNoteContent"):
                             new_ms.pending_private_note = data.get("privateNoteContent")
                             logger.info(f"   ⏳ Private note stored for audio {wamid}, waiting for delivery.")
                         db.add(new_ms)
                         db.commit()
             else:
                 logger.warning(f"⚠️ AudioNode {current_node_id} has no mediaUrl. Skipping.")
                 
        elif node_type in ["media", "mediaNode"]:
             # Handle Image/Video/PDF/Audio
             file_url = data.get("mediaUrl") or data.get("url")
             media_type = data.get("mediaType", "image") # image, video, document, audio
             caption = data.get("caption", "")
             
             if file_url:
                 # Resolve local URLs to standard http if needed or pass as is
                 res = await chatwoot.send_attachment(conversation_id, file_url, media_type, caption=caption)
                 
                 # NEW: Record and handle private note post-delivery
                 if res and isinstance(res, dict) and res.get("id"):
                    msg_id = str(res.get("id"))
                    new_ms = models.MessageStatus(
                        trigger_id=trigger.id,
                        message_id=msg_id,
                        phone_number=contact_phone,
                        status='sent'
                    )
                    if data.get("sendPrivateNote") and data.get("privateNoteContent"):
                         new_ms.pending_private_note = data.get("privateNoteContent")
                    db.add(new_ms)
                    db.commit()

        elif node_type in ["chatwoot_label", "labelNode"]:
             label = data.get("label")
             
             if label:
                 logger.info(f"🏷️ Adding Chatwoot Label: {label}")
                 
                 # 1. Add Label to Conversation (Visible in the Chatwoot interface / sidebar)
                 if conversation_id and int(conversation_id) > 0:
                     logger.info(f"   🔗 Adding Label to Conversation {conversation_id}...")
                     await chatwoot.add_label_to_conversation(conversation_id, label)

                 # 2. Add Label to Contact (For CRM / CRM Filtering)
                 # Re-utilizamos a lógica robusta de busca do ensure_conversation
                 clean_phone = ''.join(filter(str.isdigit, contact_phone))
                 search_queries = [clean_phone, f"+{clean_phone}"]
                 if len(clean_phone) >= 8:
                     search_queries.append(clean_phone[-8:])
                 
                 contact_id = None
                 for q in search_queries:
                     contact_res = await chatwoot.search_contact(q)
                     if contact_res and contact_res.get("payload"):
                         contact_id = contact_res["payload"][0]["id"]
                         break
                 
                 if contact_id:
                     logger.info(f"   👤 Adding Label to Contact ID {contact_id}...")
                     await chatwoot.add_label_to_contact(contact_id, label)
                 else:
                     logger.warning(f"⚠️ Could not find contact {contact_phone} in Chatwoot to add label '{label}' on profile.")
             else:
                 logger.warning(f"⚠️ Label Node {current_node_id} has no label defined.")
                      
        elif node_type in ["delay", "delayNode"]:
            use_random = data.get("useRandom", False)
            # Default to 10 if time/minTime is missing or 0
            raw_time = data.get("time") or data.get("minTime") or 10
            min_time = int(raw_time)
            max_time = int(data.get("maxTime") or min_time)
            
            # Escolher tempo aleatório apenas se solicitado e houver range
            if use_random and max_time > min_time:
                delay_sec = random.randint(min_time, max_time)
                logger.info(f"🎲 Smart Delay: Sorteado {delay_sec} unidades (Range: {min_time}-{max_time})")
            else:
                delay_sec = int(data.get("time") or min_time or 10)
            
            if data.get("unit") == "minutes": delay_sec *= 60
            elif data.get("unit") == "hours": delay_sec *= 3600
            elif data.get("unit") == "days": delay_sec *= 86400
            
            if delay_sec > 60:
                # Long delay: Schedule future execution
                resume_time = datetime.now(timezone.utc) + timedelta(seconds=delay_sec)
                
                # Determine Next Node ID BEFORE suspending
                # Delays usually have one output
                next_node_id = get_next_node(current_node_id, edges, None)
                
                if next_node_id:
                    trigger.status = 'queued'
                    trigger.scheduled_time = resume_time
                    trigger.current_node_id = next_node_id
                    db.commit()
                    logger.info(f"⏳ Long delay ({delay_sec}s). Suspending until {resume_time}")
                    return # STOP WORKER
                else:
                    logger.warning("Delay node has no output. Finishing.")
                    break
            else:
                # Short delay
                logger.info(f"⏱️ Short delay ({delay_sec}s)...")
                await asyncio.sleep(delay_sec)

        elif node_type in ["condition", "conditionNode"]:
            condition_type = data.get("conditionType", "text")
            source_handle = 'no' # Default
            
            if condition_type == "tag":
                required_tag = normalize_text(data.get("tag", ""))
                logger.info(f"🤔 Evaluating Tags Condition. Required: '{required_tag}'")
                
                # Search contact to get ID
                clean_phone = ''.join(filter(str.isdigit, contact_phone))
                contact_res = await chatwoot.search_contact(clean_phone)
                contact_id = None
                if contact_res and contact_res.get("payload"):
                    contact_id = contact_res["payload"][0]["id"]
                
                if contact_id:
                    contact_labels = await chatwoot.get_contact_labels(contact_id)
                    normalized_contact_tags = [normalize_text(t) for t in contact_labels]
                    logger.info(f"   Contact Tags: {contact_labels} -> Normalized: {normalized_contact_tags}")
                    
                    if required_tag in normalized_contact_tags:
                        source_handle = 'yes'
                else:
                    logger.warning(f"⚠️ Contact {clean_phone} not found in Chatwoot.")

            elif condition_type == "datetime_range":
                tz = zoneinfo.ZoneInfo('America/Sao_Paulo')
                now_dt = datetime.now(tz)
                
                start_str = data.get("startDateTime")
                end_str = data.get("endDateTime")
                
                result = 'between'
                try:
                    if start_str and end_str:
                        start_dt = datetime.fromisoformat(start_str).replace(tzinfo=tz)
                        end_dt = datetime.fromisoformat(end_str).replace(tzinfo=tz)
                        
                        logger.info(f"🤔 Evaluating DateTime Range (BR). Now: {now_dt.strftime('%d/%m %H:%M')}, Range: {start_str} to {end_str}")
                        
                        if now_dt < start_dt: result = 'before'
                        elif now_dt > end_dt: result = 'after'
                        else: result = 'between'
                        
                        # --- ACTION LOGIC ---
                        action = data.get(f"{result}Action", "follow")
                        logger.info(f"   Result: {result.upper()}, Action: {action.upper()}")
                        
                        if action == "stop":
                            logger.info("   🛑 Action STOP: Finishing funnel for this user.")
                            break
                        
                        elif action == "wait":
                            # Wait until next boundary
                            wait_until = None
                            if result == "before": 
                                wait_until = start_dt
                                next_handle = "between"
                            elif result == "between": 
                                wait_until = end_dt
                                next_handle = "after"
                            
                            if wait_until:
                                next_node_id = get_next_node(current_node_id, graph_data.get("edges", []), next_handle)
                                if next_node_id:
                                    trigger.status = 'queued'
                                    trigger.scheduled_time = wait_until.astimezone(timezone.utc)
                                    trigger.current_node_id = next_node_id
                                    db.commit()
                                    logger.info(f"   ⏳ Action WAIT: Suspending funnel until {wait_until} -> Next: {next_node_id}")
                                    return # PAUSE WORKER
                                else:
                                    logger.warning(f"   ⚠️ Action WAIT selected but no node connected to path '{next_handle}'. Finishing.")
                                    break
                            else:
                                logger.info("   ⚠️ Action WAIT is not possible for 'After' state. Finishing.")
                                break
                        
                        else: # follow
                            source_handle = result
                    else:
                        logger.warning("⚠️ Missing start or end datetime for range condition.")
                except Exception as e:
                    logger.error(f"Error parsing datetime range: {e}")

            elif condition_type == "weekday":
                # Dia da semana em Brasília
                tz = zoneinfo.ZoneInfo('America/Sao_Paulo')
                now_dt = datetime.now(tz)
                # 0=Segunda, 6=Domingo
                current_day = str(now_dt.weekday()) 
                allowed_days = data.get("allowedDays", []) 
                
                day_names = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
                logger.info(f"🤔 Evaluating Weekday. Current (BR): {day_names[int(current_day)]}, Allowed: {allowed_days}")
                
                if current_day in allowed_days:
                    source_handle = 'yes'
            
            else:
                # Legado: Busca por texto (simples)
                condition_text = data.get("condition", "").lower()
                if not any(neg in condition_text for neg in ['não', 'nao', 'false', 'no', '0']):
                    source_handle = 'yes'
            
            logger.info(f"   -> Result: {source_handle.upper()}")
                
        elif node_type in ["randomizer", "randomizerNode"]:
            # A/B Testing logic
            # data: { "percentA": 50 } (implies B is remainder)
            percent_a = int(data.get("percentA", 50))
            roll = random.randint(1, 100)
            
            if roll <= percent_a:
                source_handle = "a" # Must match React Flow handle ID
                logger.info(f"🎲 Randomizer: Path A ({roll} <= {percent_a})")
            else:
                source_handle = "b"
                logger.info(f"🎲 Randomizer: Path B ({roll} > {percent_a})")
                
        elif node_type in ["link_funnel", "linkFunnelNode"]:
            # Trigger another funnel
            target_funnel_id = data.get("funnelId")
            if target_funnel_id:
                logger.info(f"🔗 Linking to Funnel ID {target_funnel_id}")
                
                new_trigger = models.ScheduledTrigger(
                    client_id=trigger.client_id,
                    funnel_id=target_funnel_id,
                    conversation_id=conversation_id,
                    contact_phone=contact_phone,
                    status='queued',
                    scheduled_time=datetime.now(timezone.utc),
                    is_bulk=False,
                    current_node_id=None # Start from beginning
                )
                db.add(new_trigger)
                db.commit()
                # Stop current funnel? User didn't specify, but usually "Link" implies handoff.
                # If we continue, we might have parallel funnels. For now, let's allow continue if there is an output edge.
            else:
                logger.warning("🔗 Link Funnel node missing funnelId")

        elif node_type in ["template", "templateNode"]:
            template_name = data.get("templateName")
            language = data.get("language", "pt_BR")
            # components can be expanded later if needed
            components = data.get("components", []) 
            
            # -----------------------------------------------------------------
            # 24h Window Check Feature
            # -----------------------------------------------------------------
            window_open = False
            check_window = data.get("check24hWindow", False)
            fallback_msg = data.get("fallbackMessage")
            fallback_sent = False

            if check_window:
                logger.info(f"🕒 Checking 24h Window for Node {current_node_id}...")
                window_open = await chatwoot.is_within_24h_window(conversation_id)
                
                if window_open and fallback_msg and fallback_msg.strip():
                    logger.info(f"✅ Window OPEN. Sending Fallback Message instead of Template.")
                    try:
                        # NEW: Support for Interactive Buttons in Fallback
                        fallback_buttons = data.get("fallbackButtons") or []
                        if fallback_buttons:
                             logger.info(f"🔘 Sending Fallback Message WITH BUTTONS: {fallback_buttons}")
                             await chatwoot.send_interactive_buttons(contact_phone, fallback_msg, fallback_buttons)
                        else:
                             # Send simple text message (Message Normal)
                             await chatwoot.send_message(conversation_id, fallback_msg)
                        
                        # Mark as sent for funnel statistics
                        trigger.total_sent += 1
                        db.commit()
                        
                        fallback_sent = True
                        template_name = None # Prevent template sending logic
                    except Exception as fb_err:
                        logger.error(f"❌ Failed to send fallback message: {fb_err}")
                        trigger.status = 'failed'
                        db.commit()
                        return
                else:
                    if window_open:
                        logger.info("ℹ️ Window OPEN but no fallback message configured. Sending Template normally.")
                    else:
                        logger.info("🔒 Window CLOSED. Sending Template normally.")

            if fallback_sent:
                logger.info(f"ℹ️ Node {current_node_id}: Fallback message sent. Skipping Template.")
            
            elif template_name:
                logger.info(f"📄 Sending Template Node {current_node_id}. Template: '{template_name}' (Lang: {language})")
                result = await chatwoot.send_template(contact_phone, template_name, language, components)
                
                # Check for errors
                if isinstance(result, dict) and result.get("error"):
                    logger.error(f"❌ Failed to send template in Node {current_node_id}: {result.get('detail')}")
                    trigger.status = 'failed'
                    db.commit()
                    return # Stop funnel if main template fails
                
                # Record Message ID for status tracking and interactions
                if isinstance(result, dict) and result.get("messages"):
                    wamid = result["messages"][0].get("id")
                    if wamid:
                        new_ms = models.MessageStatus(
                            trigger_id=trigger.id,
                            message_id=wamid,
                            phone_number=contact_phone,
                            status='sent'
                        )
                        
                        # NEW: Handle Private Message post-delivery
                        if data.get("sendPrivateMessage") and data.get("privateMessage"):
                            p_msg = data.get("privateMessage")
                            final_p_msg = p_msg
                            if fallback_sent:
                                final_p_msg += "\n\n📢 [Sessão 24h] Enviado via Mensagem Direta (Grátis)."
                            else:
                                final_p_msg += f"\n\n📢 Enviado via Template: {template_name}"
                            
                            new_ms.pending_private_note = final_p_msg
                            logger.info(f"   ⏳ Private note stored for template {wamid}, waiting for delivery.")
                        
                        db.add(new_ms)
                        db.commit()
                        logger.info(f"✅ Template sent. Recorded wamid: {wamid}")

            elif not template_name and not fallback_sent:
                logger.warning(f"⚠️ Template Node {current_node_id} has no templateName and no fallback sent.")
            # Template nodes are terminal by design in the frontend.
            # No next handle will be found, so it will break the loop.

        elif node_type == "LEGACY_date_trigger":
             # Wait until specific date
             target_date_str = data.get("targetDate")
             if target_date_str:
                 target_date = datetime.fromisoformat(target_date_str.replace("Z", "+00:00"))
                 now = datetime.now(timezone.utc)
                 
                 if target_date > now:
                     wait_seconds = (target_date - now).total_seconds()
                     
                     next_node_id = get_next_node(current_node_id, edges, None)
                     if next_node_id:
                        trigger.status = 'queued'
                        trigger.scheduled_time = target_date
                        trigger.current_node_id = next_node_id
                        db.commit()
                        return # STOP WORKER
                 else:
                     logger.info("📅 Date already passed, proceeding.")

        # --- TRAVERSAL ---
        next_node_id = get_next_node(current_node_id, edges, source_handle)
        
        if next_node_id:
            current_node_id = next_node_id
            # Update state for crash recovery
            trigger.current_node_id = current_node_id
            db.commit()
        else:
            logger.info("🏁 End of path reached.")
            break

    # Finish
    trigger.status = 'completed'
    db.commit()


def get_next_node(current_id, edges, source_handle=None):
    for edge in edges:
        if edge["source"] == current_id:
            # If source_handle is required (e.g. Randomizer A/B), check it
            if source_handle:
                if edge.get("sourceHandle") == source_handle:
                    return edge["target"]
            else:
                # If no specific handle required, take the first outgoing edge
                # (Standard nodes usually have one output)
                return edge["target"]
    return None


async def execute_legacy_funnel(trigger, steps, chatwoot, conversation_id, contact_phone, db):
    """
    Maintains compatibility with linear steps list based funnels.
    """
    total_steps = len(steps)
    if trigger.current_step_index is None:
        trigger.current_step_index = 0
        db.commit()

    while trigger.current_step_index < total_steps:
        step_index = trigger.current_step_index
        step = steps[step_index]
        
        # Check cancellation
        db.refresh(trigger)
        if trigger.status == 'cancelled': return

        step_type = step.get("type")
        content = step.get("content")
        
        # Logging
        logger.info(f"Processing Legacy Step {step_index}: {step_type}")

        if step_type == "message":
            buttons = step.get("buttons")
            if buttons:
                await chatwoot.send_interactive_buttons(contact_phone, content, buttons)
            else:
                await chatwoot.send_message(conversation_id, content)

        elif step_type in ["image", "video", "audio", "document"]:
             # Simple media handler
             await chatwoot.send_attachment(conversation_id, content, step_type)

        # Delay Logic
        raw_delay = int(step.get("delay", 0))
        if raw_delay > 0:
            if raw_delay > 60:
                 trigger.status = 'queued'
                 trigger.scheduled_time = datetime.now(timezone.utc) + timedelta(seconds=raw_delay)
                 trigger.current_step_index = step_index + 1
                 db.commit()
                 return
            else:
                await asyncio.sleep(raw_delay)

        trigger.current_step_index = step_index + 1
        db.commit()

    trigger.status = 'completed'
    db.commit()

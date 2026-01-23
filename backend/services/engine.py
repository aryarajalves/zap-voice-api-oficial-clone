
import asyncio
import os
import subprocess
from datetime import datetime
from sqlalchemy.orm import Session
import models
from chatwoot_client import ChatwootClient
import logging
from core.logger import setup_logger
from config_loader import get_setting

logger = setup_logger("FunnelEngine")

# Instância local para uso no engine
# chatwoot = ChatwootClient() # Removed global instance
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

    with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now()}] ⚙️ Starting funnel {funnel.name} for conversation {conversation_id} (Trigger {trigger_id})\n")
    logger.info(f"⚙️ Starting funnel {funnel.name} for conversation {conversation_id} (Trigger {trigger_id})")
    
    # ✅ Resolve Conversation ID if missing (common in phone-only triggers)
    if not conversation_id or int(conversation_id) == 0:
        logger.info(f"🔎 Conversation ID missing. Attempting to resolve for {contact_phone}...")
        # Get default inbox from env or first available
        inbox_id = get_setting("CHATWOOT_SELECTED_INBOX_ID", "", client_id=trigger.client_id)
        if not inbox_id:
            # Fallback to fetching inboxes and picking first
             pass # simplistic fallback handled in ensure_conversation logic or we fail
             
        # Normalize inbox_id
        if inbox_id and ',' in inbox_id: inbox_id = inbox_id.split(',')[0]
        
        resolved_id = await chatwoot.ensure_conversation(contact_phone, "Novo Contato ZapVoice", int(inbox_id) if inbox_id else None)
        
        if resolved_id:
            conversation_id = resolved_id
            logger.info(f"✅ Resolved Conversation ID: {conversation_id}")
            # Update trigger record with new conversation_id
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

    # ✅ IDEMPOTENCY CHECK: Prevent duplicate execution
    # trigger already fetched above
    
    if trigger:
        # Already completed - skip execution
        if trigger.status == 'completed':
            logger.warning(f"⚠️ Trigger {trigger_id} already completed. Skipping duplicate execution.")
            return
        
        # Still processing - Check if we should allow (e.g. just marked by scheduler)
        if trigger.status == 'processing':
            from datetime import timezone
            if trigger.updated_at:
                elapsed = (datetime.now(timezone.utc) - trigger.updated_at).total_seconds()
                
                # If it's very recent (e.g. < 30s), it's likely the scheduler just marked it
                # and sent to us. We SHOULD proceed.
                if elapsed < 30:
                    logger.info(f"🔰 Trigger {trigger_id} was just dispatched (elapsed: {elapsed:.1f}s). Proceeding with execution.")
                elif elapsed < 600:  # Less than 10 minutes - likely real concurrent execution
                    logger.warning(f"⚠️ Trigger {trigger_id} is already being processed elsewhere ({elapsed:.0f}s ago). Skipping to avoid duplicates.")
                    return
                else:
                    # Stale processing job (>10min) - probably died, allow retry
                    logger.info(f"⚠️ Trigger {trigger_id} stale ({elapsed:.0f}s). Allowing retry.")

        # Mark as processing
        trigger.status = 'processing'
        db.commit()
        logger.info(f"🔄 Trigger {trigger_id} marked as processing.")
    
    # 🚫 CONCURRENT FUNNEL CHECK: Only one funnel at a time per conversation
    if conversation_id:
        from datetime import timezone
        active_funnel = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.conversation_id == conversation_id,
            models.ScheduledTrigger.status == 'processing',
            models.ScheduledTrigger.id != trigger_id  # Exclude current trigger
        ).first()
        
        if active_funnel:
            # Check if it's really active or stale
            if active_funnel.updated_at:
                elapsed = (datetime.now(timezone.utc) - active_funnel.updated_at).total_seconds()
                
                if elapsed < 600:  # Less than 10 minutes = really active
                    with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                        f.write(
                            f"[{datetime.now()}] 🚫 BLOCKED: Funnel {active_funnel.funnel_id} (Trigger {active_funnel.id}) "
                            f"is running for conversation {conversation_id}. New funnel blocked.\n"
                        )
                    logger.error(
                        f"🚫 BLOCKED: Cannot start funnel {funnel_id}. "
                        f"Funnel {active_funnel.funnel_id} still running for conversation {conversation_id}."
                    )
                    
                    # Mark this trigger as cancelled
                    if trigger:
                        trigger.status = 'cancelled'
                        db.commit()
                    
                    return
                else:
                    # Stale job (>10min) - mark as failed and allow new one
                    print(f"⚠️ Previous funnel {active_funnel.id} is stale ({elapsed:.0f}s). Marking as failed.")
                    active_funnel.status = 'failed'
                    db.commit()

    steps = funnel.steps or []
    total_steps = len(steps)
    
    # 📋 Determine current progress
    if trigger.current_step_index is None:
        trigger.current_step_index = 0
        db.commit()

    logger.info(f"📋 Funnel {funnel.name} is at step {trigger.current_step_index}/{total_steps}.")

    while trigger.current_step_index < total_steps:
        step_index = trigger.current_step_index
        step = steps[step_index]
        
        # Check cancellation status
        crt_trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id).first()
        if not crt_trigger or crt_trigger.status == 'cancelled':
            logger.warning(f"🛑 Trigger {trigger_id} cancelled or missing. Stopping execution.")
            return

        # Step structure assumption: {"type": "message", "content": "hello", "delay": 5}
        step_type = step.get("type")
        content = step.get("content")

        with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
             f.write(f"[{datetime.now()}] Processing step {step_index}: {step_type} -> Content: {content}\n")
        print(f"Processing step: {step_type}") 
        
        # Simulate Typing/Recording if configured
        if step.get("simulate_typing"):
            try:
                typing_time = int(step.get("typing_time", 3))
                if typing_time > 0:
                    action = 'recording' if step_type == 'audio' else 'typing'
                    print(f"Simulating {action} for {typing_time}s...")
                    await chatwoot.toggle_typing(conversation_id, 'on') # Chatwoot JS API uses same toggle
                    await asyncio.sleep(typing_time)
                    await chatwoot.toggle_typing(conversation_id, 'off')
            except Exception as e:
                print(f"Error simulating typing: {e}")
        
        if step_type == "message":
            if step.get("interactive") and step.get("buttons"):
                # Handle Interactive Buttons
                buttons_clean = [b for b in step.get("buttons") if b and b.strip()]
                if buttons_clean:
                    logger.info(f"🔘 Sending Interactive Buttons to {contact_phone}: {buttons_clean}")
                    res = await chatwoot.send_interactive_buttons(contact_phone, content, buttons_clean)
                    
                    if res:
                        with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                             f.write(f"[{datetime.now()}] ✅ Botões enviados com sucesso via Meta!\n")

                        # Handle Private Note for Buttons
                        if step.get('privateMessageEnabled') and step.get('privateMessageContent'):
                            try:
                                note_content = step.get('privateMessageContent')
                                # Append visual indicator
                                note_content = f"🔘 [Botões Enviados via ZapVoice]\nMsg: {content}\nBtns: {buttons_clean}\n\n{note_content}"
                                await chatwoot.send_message(conversation_id, note_content, private=True)
                                with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                                    f.write(f"[{datetime.now()}] 📝 Nota interna de botões criada no Chatwoot.\n")
                            except Exception as e:
                                with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                                    f.write(f"[{datetime.now()}] ❌ Failed to create private note for buttons: {e}\n")
                    else:
                        with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                            f.write(f"[{datetime.now()}] ⚠️ Falha ao enviar botões interativos. Tentando fallback texto simples.\n")
                        # Fallback to simple text if interactive fails
                        await chatwoot.send_message(conversation_id, content) 
                else:
                     # Interactive checked but no buttons text provided
                     await chatwoot.send_message(conversation_id, content)   
            else:
                # Standard Text Message
                await chatwoot.send_message(conversation_id, content)
            
            print(f"Sent message: {content}")

        elif step_type == "audio":
             # Try to send Official Audio (PTT) via Meta ID
             
             # Robust Absolute Path Resolution
             BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # services/.. -> backend
             ABS_UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads")
             
             local_path = None
             if content:
                 try:
                     filename = content.split("/")[-1]
                     if "?" in filename: filename = filename.split("?")[0] # Remove query params if any
                     potential_path = os.path.join(ABS_UPLOAD_DIR, filename)
                     if os.path.exists(potential_path):
                         local_path = potential_path
                 except Exception as e:
                     with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                         f.write(f"[{datetime.now()}] ❌ Erro ao resolver caminho de áudio: {e}\n")

             sent_via_meta = False
             
             with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                 f.write(f"[{datetime.now()}] 🎙️ Processando Áudio PTT. Phone: {contact_phone}, LocalPath: {local_path}\n")

             if contact_phone and local_path:
                 # Force conversion to standardized PTT format (OPUS Mono 16k)
                 temp_ptt = f"temp_ptt_{int(datetime.now().timestamp())}_{funnel_id}.opus"
                 temp_ptt_path = os.path.join(ABS_UPLOAD_DIR, temp_ptt)
                 
                 try:
                     with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                         f.write(f"[{datetime.now()}] 🔄 Iniciando conversão FFmpeg para PTT: {temp_ptt_path}\n")
                         
                     cmd = [
                         'ffmpeg', '-i', local_path, 
                         '-c:a', 'libopus', '-b:a', '16k', '-ac', '1', '-ar', '16000',
                         '-vbr', 'on', '-y', temp_ptt_path
                     ]
                     
                     # 1. Run conversion
                     process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                     if process.returncode != 0:
                         err_msg = f"FFmpeg failed: {process.stderr.decode()}"
                         with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                             f.write(f"[{datetime.now()}] ❌ {err_msg}\n")
                         raise Exception(err_msg)
                     
                     # 2. Upload to Meta
                     with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                         f.write(f"[{datetime.now()}] ☁️ Uploading PTT to Meta...\n")
                         
                     media_id = await chatwoot.upload_media_to_meta(temp_ptt_path, mime_type='audio/ogg')
                     
                     # Clean up temp file
                     try:
                         if os.path.exists(temp_ptt_path):
                            os.remove(temp_ptt_path)
                     except:
                         pass

                     if media_id:
                         with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                             f.write(f"[{datetime.now()}] ✅ Upload Meta Sucesso ID: {media_id}. Enviando Mensagem de Voz...\n")
                         
                         res = await chatwoot.send_official_audio(contact_phone, media_id)
                         if res:
                             try:
                                 with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                                     f.write(f"[{datetime.now()}] 🚀 Áudio PTT Enviado com Sucesso via Meta!\n")

                                 sent_via_meta = True
                                 
                                 # DEBUG: Check step dict
                                 is_private_enabled = step.get('privateMessageEnabled')
                                 
                                 with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                                     f.write(f"[{datetime.now()}] 🔍 Checking Private Note. Enabled: {is_private_enabled}\n")

                                 # Check for Private Message (Note) Requirement
                                 if is_private_enabled and step.get('privateMessageContent'):
                                     note_content = step.get('privateMessageContent')
                                     # Append visual indicator
                                     note_content = f"🎤 [Áudio Enviado via ZapVoice]\n{note_content}"
                                     
                                     with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                                         f.write(f"[{datetime.now()}] 📝 Attempting to send private note...\n")

                                     await chatwoot.send_message(conversation_id, note_content, private=True)
                                     
                                     with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                                         f.write(f"[{datetime.now()}] 📝 Nota interna criada no Chatwoot.\n")
                                 else:
                                     with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                                         f.write(f"[{datetime.now()}] ℹ️ Nota interna NÃO ativada ou sem conteúdo.\n")
                             except Exception as inner_e:
                                 import traceback
                                 tb = traceback.format_exc()
                                 with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                                     f.write(f"[{datetime.now()}] 💣 CRITIAL ERROR inside Audio Success Block: {inner_e}\n{tb}\n")

                         else:
                             with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                                 f.write(f"[{datetime.now()}] ⚠️ Falha no envio da mensagem de voz (send_official_audio)\n")
                     else:
                         with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                             f.write(f"[{datetime.now()}] ⚠️ Falha no Upload para Meta (media_id nulo)\n")

                 except Exception as e:
                     with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                         f.write(f"[{datetime.now()}] ❌ Exceção no processo PTT: {e}. Tentando fallback...\n")

             if not sent_via_meta:
                # Fallback to Chatwoot Attachment
                with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                    f.write(f"[{datetime.now()}] ⚠️ Usando Fallback (Chatwoot Attachment) para áudio.\n")
                
                await chatwoot.send_attachment(conversation_id, content, 'audio', custom_filename=step.get('fileName'))

        elif step_type in ["image", "video", "document"]:
             # Lógica simplificada de anexo
             final_content = content
             
             # Automatic Video Compression for WhatsApp (Limit ~16MB)
             if step_type == "video" and content and ("localhost" in content or "127.0.0.1" in content):
                 try:
                     # 1. Resolve local path
                     filename = content.split("/")[-1]
                     local_path = os.path.join(UPLOAD_DIR, filename)
                     
                     if os.path.exists(local_path):
                         file_size_mb = os.path.getsize(local_path) / (1024 * 1024)
                         
                         log_msg_orig = f"🎥 Vídeo Original: {filename} | Tamanho: {file_size_mb:.2f} MB"
                         print(f"DEBUG: {log_msg_orig}")
                         with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                             f.write(f"[{datetime.now()}] {log_msg_orig}\n")
                         
                         if file_size_mb > 15: # Safety margin for 16MB limit
                             print(f"DEBUG: Video > 15MB. Compressing...")
                             with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                                 f.write(f"[{datetime.now()}] ⚠️ Vídeo excede 15MB. Iniciando compressão (ffmpeg)...\n")
                                 
                             compressed_filename = f"compressed_{filename}"
                             compressed_path = os.path.join(UPLOAD_DIR, compressed_filename)
                             
                             # FFmpeg command: Compress video (CRF 28 usually yields good WhatsApp quality < 15MB for short clips)
                             # We preserve original audio
                             cmd = [
                                 'ffmpeg', '-i', local_path,
                                 '-vcodec', 'libx264', '-crf', '30', '-preset', 'faster',
                                 '-acodec', 'aac', '-b:a', '64k', # Ensure audio is also compressed
                                 '-y', compressed_path
                             ]
                             
                             process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                             
                             if process.returncode == 0 and os.path.exists(compressed_path):
                                 new_size = os.path.getsize(compressed_path) / (1024 * 1024)
                                 
                                 log_msg_comp = f"✅ Compressão concluída! Novo tamanho: {new_size:.2f} MB (Redução de {(1 - new_size/file_size_mb)*100:.1f}%)"
                                 print(f"DEBUG: {log_msg_comp}")
                                 with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                                     f.write(f"[{datetime.now()}] {log_msg_comp}\n")
                                 
                                 # Update content URL to point to compressed file (Mock URL, Client resolves by filename)
                                 # We keep the same protocol/host to assume it's local
                                 base_url = content.rsplit('/', 1)[0]
                                 final_content = f"{base_url}/{compressed_filename}"
                             else:
                                 err_msg = f"❌ Falha na compressão: {process.stderr.decode()[:200]}"
                                 print(f"WARNING: {err_msg}")
                                 with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                                     f.write(f"[{datetime.now()}] {err_msg}\n")
                         else:
                             with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                                 f.write(f"[{datetime.now()}] ✅ Vídeo dentro do limite do WhatsApp (<15MB). Enviando original.\n")
                                 
                 except Exception as e:
                     print(f"Error checking/compressing video: {e}")
                     with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                         f.write(f"[{datetime.now()}] ❌ Erro inesperado ao processar vídeo: {e}\n")

             # Transform localhost URLs to publicly accessible URLs
             if final_content and ("localhost" in final_content or "127.0.0.1" in final_content or "minio" in final_content or "zapvoice-minio" in final_content):
                 s3_public_url = get_setting("S3_PUBLIC_URL", "", client_id=trigger.client_id)
                 if s3_public_url:
                     # Use S3_PUBLIC_URL if configured (production)
                     final_content = final_content.replace("http://localhost:9000", s3_public_url.rstrip('/'))
                     final_content = final_content.replace("http://127.0.0.1:9000", s3_public_url.rstrip('/'))
                     final_content = final_content.replace("http://minio:9000", s3_public_url.rstrip('/'))
                     final_content = final_content.replace("http://zapvoice-minio:9000", s3_public_url.rstrip('/'))
                 else:
                     # Fallback for local development (replace internal Docker hostnames)
                     final_content = final_content.replace("//minio:", "//localhost:")
                     final_content = final_content.replace("//zapvoice-minio:", "//localhost:")
             
             print(f"DEBUG: Sending {step_type} with content: '{final_content}'")
             await chatwoot.send_attachment(conversation_id, final_content, step_type, custom_filename=step.get('fileName'))

        # Calculate delay logic
        raw_delay = int(step.get("delay", 0))
        time_unit = step.get("timeUnit", "seconds")
        
        multiplier = 1
        if time_unit == "minutes": multiplier = 60
        elif time_unit == "hours": multiplier = 3600
        elif time_unit == "days": multiplier = 86400
        
        total_delay_seconds = raw_delay * multiplier
        
        # Progress tracking
        next_step_index = step_index + 1
        
        if next_step_index < total_steps:
            # There are more steps - handle delay
            if total_delay_seconds > 60:
                # LONG DELAY: Release worker and re-queue for later
                from datetime import timedelta
                trigger.status = 'queued'
                trigger.scheduled_time = datetime.now() + timedelta(seconds=total_delay_seconds)
                trigger.current_step_index = next_step_index
                db.commit()
                
                logger.info(f"⏳ Released worker. Next step {next_step_index} scheduled for {trigger.scheduled_time}")
                with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
                    f.write(f"[{datetime.now()}] ⏳ Long delay ({total_delay_seconds}s). Re-queueing next step.\n")
                return # RELEASE WORKER SLOT
            else:
                # SHORT DELAY: Keep worker and wait
                if total_delay_seconds > 0:
                    logger.info(f"⏱️ Short delay of {total_delay_seconds}s before next step.")
                    await asyncio.sleep(total_delay_seconds)
                
                # Update progress in DB but continue loop
                trigger.current_step_index = next_step_index
                db.commit()
                # DO NOT RETURN - let the loop continue to next_step_index
        else:
            # LAST STEP: Mark as completed
            trigger.status = 'completed'
            trigger.current_step_index = next_step_index # total_steps
            db.commit()
            logger.info(f"✅ Funnel execution completed for Trigger {trigger_id}")
            return

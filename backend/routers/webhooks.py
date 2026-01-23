from fastapi import APIRouter, Request, Body, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from core.security import limiter
from services.engine import execute_funnel
import models
from datetime import datetime
import json
import os
from core.logger import setup_logger
from rabbitmq_client import rabbitmq

logger = setup_logger(__name__)

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/webhooks/n8n/trigger")
@limiter.limit("2000/minute")
async def n8n_trigger_webhook(
    request: Request,
    payload: dict = Body(...), 
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """
    Recebe um JSON do N8N e dispara funis para os contatos.
    Formato esperado:
    {
        "contacts": [
            {"phone": "558596123586", "button_context": "Texto do gatilho"},
            {"phone": "558512345678", "button_context": "Outro gatilho"}
        ],
        "funnel_id": 123 (opcional - força um funil específico)
    }
    """
    contacts = payload.get("contacts", [])
    if not contacts:
        return {"error": "No contacts provided"}
    
    forced_funnel_id = payload.get("funnel_id")
    
    # Estatísticas de processamento
    triggered_count = 0
    skipped_count = 0
    results = []
    
    for contact in contacts:
        phone = contact.get("phone")
        button_context = contact.get("button_context", "").strip()
        
        if not phone:
            skipped_count += 1
            results.append({"phone": "unknown", "status": "skipped", "reason": "no_phone"})
            continue
        
        # Limpar o telefone (remover caracteres não numéricos)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # Se foi especificado um funil, usa ele
        if forced_funnel_id:
            funnel = db.query(models.Funnel).filter(models.Funnel.id == forced_funnel_id).first()
            if not funnel:
                skipped_count += 1
                results.append({"phone": clean_phone, "status": "skipped", "reason": "funnel_not_found"})
                continue
            
            # Criar trigger
            trigger = models.ScheduledTrigger(
                funnel_id=funnel.id,
                contact_phone=clean_phone,
                status='queued',
                scheduled_time=datetime.now()
            )
            db.add(trigger)
            triggered_count += 1
            results.append({
                "phone": clean_phone,
                "status": "triggered",
                "funnel_id": funnel.id,
                "funnel_name": funnel.name
            })
            logger.info(f"🎯 Funil '{funnel.name}' agendado para {clean_phone} (forçado)")
        
        # Caso contrário, busca funil pelo button_context (trigger_phrase)
        elif button_context:
            matched_funnel = db.query(models.Funnel).filter(
                models.Funnel.trigger_phrase == button_context
            ).first()
            
            if matched_funnel:
                # Criar trigger
                trigger = models.ScheduledTrigger(
                    funnel_id=matched_funnel.id,
                    contact_phone=clean_phone,
                    status='queued',
                    scheduled_time=datetime.now()
                )
                db.add(trigger)
                triggered_count += 1
                results.append({
                    "phone": clean_phone,
                    "status": "triggered",
                    "funnel_id": matched_funnel.id,
                    "funnel_name": matched_funnel.name,
                    "matched_by": button_context
                })
                logger.info(f"🎯 Funil '{matched_funnel.name}' agendado para {clean_phone} (gatilho: '{button_context}')")
            else:
                skipped_count += 1
                results.append({
                    "phone": clean_phone,
                    "status": "skipped",
                    "reason": "no_matching_funnel",
                    "button_context": button_context
                })
                logger.warning(f"⚠️ Nenhum funil encontrado para o gatilho '{button_context}' (contato: {clean_phone})")
        else:
            skipped_count += 1
            results.append({
                "phone": clean_phone,
                "status": "skipped",
                "reason": "no_button_context_or_funnel_id"
            })
    
    # Commit das alterações
    db.commit()
    
    return {
        "status": "processed",
        "total_contacts": len(contacts),
        "triggered": triggered_count,
        "skipped": skipped_count,
        "results": results
    }


@router.post("/webhooks/n8n/button-click")
@limiter.limit("2000/minute")
async def button_click_webhook(
    request: Request,
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    Recebe cliques de botão do WhatsApp via n8n.
    Formato esperado:
    {
        "phone": "558596123586",
        "button_context": "Texto do botão clicado",
        "button_id": "btn_0" (opcional),
        "message_id": "wamid.xxx" (opcional)
    }
    """
    phone = payload.get("phone")
    button_context = payload.get("button_context")
    button_id = payload.get("button_id", "unknown")
    message_id = payload.get("message_id")
    
    if not phone:
        return {"error": "Phone number is required"}
    
    if not button_context:
        return {"error": "Button context is required"}
    
    # Log do clique
    logger.info(f"📱 Button Click Received: {phone} clicked '{button_context}' (ID: {button_id})")
    
    # Aqui você pode adicionar lógica para:
    # 1. Disparar um funil específico baseado no botão clicado
    # 2. Atualizar o Baserow com a interação
    # 3. Enviar para fila do RabbitMQ para processamento assíncrono
    
    # Exemplo: Buscar funil relacionado ao botão
    # matched_funnel = db.query(models.Funnel).filter(
    #     models.Funnel.trigger_phrase == button_context
    # ).first()
    
    # if matched_funnel:
    #     # Criar trigger para executar o funil
    #     trigger = models.ScheduledTrigger(
    #         funnel_id=matched_funnel.id,
    #         contact_phone=phone,
    #         status='queued',
    #         scheduled_time=datetime.now()
    #     )
    #     db.add(trigger)
    #     db.commit()
    #     return {"status": "funnel_triggered", "funnel_name": matched_funnel.name}
    
    return {
        "status": "button_click_logged",
        "phone": phone,
        "button_context": button_context,
        "message": "Clique registrado com sucesso! Configure um funil para processar essa ação."
    }


@router.post("/webhooks/chatwoot")
@limiter.limit("5000/minute")
async def chatwoot_webhook(request: Request, payload: dict = Body(...), db: Session = Depends(get_db)):
    event_type = payload.get("event")
    
    # 1. Mensagem Criada (Gatilho de Funil)
    if event_type == "message_created":
        msg_type = payload.get("message_type") # incoming / outgoing
        if msg_type == "incoming":
             # Lógica de Trigger Phrase
             content = payload.get("content", "").strip()
             sender_phone = payload.get("sender", {}).get("phone_number", "")
             conversation_id = payload.get("conversation", {}).get("id")
             
             if not sender_phone:
                 return {"status": "ignored", "reason": "no_phone"}

             # Check Funnels
             matched_funnels = db.query(models.Funnel).filter(
                 models.Funnel.trigger_phrase == content
             ).all()
             
             for funnel in matched_funnels:
                 print(f"🎯 Funnel matched: {funnel.name} for {sender_phone}")
                 # Cria Trigger
                 trigger = models.ScheduledTrigger(
                     funnel_id=funnel.id,
                     conversation_id=conversation_id,
                     contact_phone=sender_phone,
                     status='queued',
                     scheduled_time=datetime.now() 
                 )
                 db.add(trigger)
                 db.commit() # O Scheduler vai pegar
             
             return {"status": "processed", "matches": len(matched_funnels)}

    # 2. Mensagem Atualizada (Status de Entrega - Sent/Delivered/Read/Failed)
    elif event_type == "message_updated":
        msg_id = payload.get("id")
        status = payload.get("status") # sent, delivered, read, failed
        
        if msg_id and status:
            msg_id_str = str(msg_id)
            
            # Buscar mensagem rastreada
            message_record = db.query(models.MessageStatus).filter(
                models.MessageStatus.message_id == msg_id_str
            ).first()
            
            if message_record:
                old_status = message_record.status
                
                # Se status mudou, atualiza
                if old_status != status:
                    message_record.status = status
                    message_record.updated_at = datetime.now()
                    
                    # Atualiza Status e Custos no Trigger Pai
                    trigger = message_record.trigger
                    if trigger:
                        is_delivered_now = status in ['delivered', 'read']
                        was_delivered_before = old_status in ['delivered', 'read']
                        
                        # Incrementa Entregues
                        if is_delivered_now and not was_delivered_before:
                            trigger.total_delivered = (trigger.total_delivered or 0) + 1
                            # Atualiza Custo Total (se houver custo unitário definido)
                            if trigger.cost_per_unit:
                                trigger.total_cost = (trigger.total_delivered) * trigger.cost_per_unit
                        
                        # Incrementa Falhas
                        if status == 'failed' and old_status != 'failed':
                            trigger.total_failed = (trigger.total_failed or 0) + 1
                            # Se falhou, talvez decrementar delivered? Depende se passou por delivered antes.
                            # Geralmente failed é terminal. Se era delivered e virou failed (estranho), decrementamos.
                            if was_delivered_before:
                                trigger.total_delivered = max(0, (trigger.total_delivered or 0) - 1)
                    
                    db.commit()
                    logger.info(f"Status atualizado: msg_id={msg_id}, {old_status} -> {status}")
                    return {"status": "updated", "msg_id": msg_id, "new_status": status}
            
            return {"status": "ignored", "reason": "message_not_tracked"}

    return {"status": "ignored"}


@router.post("/webhooks/whatsapp/status")
@limiter.limit("5000/minute")
async def whatsapp_status_webhook(request: Request, payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Recebe atualizações de status diretamente da Meta WhatsApp Cloud API.
    Formato: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#statuses-object
    """
    try:
        # Validação de estrutura do webhook Meta
        entry = payload.get("entry", [])
        if not entry:
            logger.warning("Webhook Meta recebido sem 'entry'")
            return {"status": "ignored", "reason": "no_entry"}
        
        for item in entry:
            changes = item.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                statuses = value.get("statuses", [])
                
                for status_obj in statuses:
                    msg_id = status_obj.get("id")
                    status = status_obj.get("status")  # sent, delivered, read, failed
                    recipient = status_obj.get("recipient_id")
                    timestamp = status_obj.get("timestamp")
                    
                    if not msg_id or not status:
                        continue
                    
                    logger.info(f"Meta webhook: msg_id={msg_id}, status={status}, recipient={recipient}")
                    
                    # Buscar mensagem rastreada
                    message_record = db.query(models.MessageStatus).filter(
                        models.MessageStatus.message_id == msg_id
                    ).first()
                    
                    if message_record:
                        old_status = message_record.status
                        
                        if old_status != status:
                            message_record.status = status
                            message_record.updated_at = datetime.now()
                            
                            # Atualizar trigger pai
                            trigger = message_record.trigger
                            if trigger:
                                is_delivered_now = status in ['delivered', 'read']
                                was_delivered_before = old_status in ['delivered', 'read']
                                
                                if is_delivered_now and not was_delivered_before:
                                    trigger.total_delivered = (trigger.total_delivered or 0) + 1
                                    if trigger.cost_per_unit:
                                        trigger.total_cost = trigger.total_delivered * trigger.cost_per_unit
                                
                                if status == 'failed' and old_status != 'failed':
                                    trigger.total_failed = (trigger.total_failed or 0) + 1
                                    if was_delivered_before:
                                        trigger.total_delivered = max(0, (trigger.total_delivered or 0) - 1)
                            
                            db.commit()
                            logger.info(f"Status Meta atualizado: {msg_id} ({old_status} -> {status})")
                    else:
                        logger.debug(f"Mensagem {msg_id} não rastreada no sistema")
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Erro processando webhook Meta: {e}")
        return {"status": "error", "message": str(e)}

@router.get("/webhooks/meta", summary="Meta Verification Challenge")
async def meta_verification(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Endpoint para validação do webhook pela Meta.
    Verifica se o hub.verify_token bate com o configurado no banco.
    """
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode and token:
        if mode == "subscribe":
            # 1. Tenta pegar do banco (global ou do primeiro cliente encontrado - simplificação)
            # Idealmente, o webhook é global da aplicação, definido uma única vez.
            # Vamos buscar uma config 'META_VERIFY_TOKEN' de qualquer cliente (assumindo single-tenant ou config compartilhada por enquanto)
            # Ou melhor, permitir que o usuário configure isso sem client_id específico se for app-wide.
            
            # Buscar token configurado
            # Tenta pegar do ENV como fallback, depois do Banco
            env_token = os.getenv("WHATSAPP_VERIFY_TOKEN", "")
            
            # Busca no banco (Prioridade)
            db_config = db.query(models.AppConfig).filter(models.AppConfig.key == "META_VERIFY_TOKEN").first()
            configured_token = db_config.value if db_config else env_token
            
            if token == configured_token:
                logger.info("✅ Meta Webhook Challenge Verified!")
                from fastapi import Response
                return Response(content=challenge, media_type="text/plain")
            else:
                logger.warning(f"❌ Meta Verification Failed. Received: {token}, Expected: {configured_token}")
                raise HTTPException(status_code=403, detail="Verification token mismatch")
    
    raise HTTPException(status_code=403, detail="Invalid verification request")

@router.post("/webhooks/meta", summary="Meta Event Ingestion")
async def meta_event_ingestion(
    request: Request,
    payload: dict = Body(...)
):
    """
    Recebe eventos da Meta e publica IMEDIATAMENTE no RabbitMQ.
    Latência mínima.
    """
    try:
        # Validação básica de estrutura
        obj = payload.get("object")
        entry = payload.get("entry")
        
        if obj == "whatsapp_business_account" and entry:
            # DEBUG LOG
            logger.info(f"📥 Incoming Meta Webhook: {json.dumps(payload)[:500]}...")
            # Publica na fila 'whatsapp_events'
            # Envia o payload inteiro para ser processado pelo worker
            await rabbitmq.publish("whatsapp_events", payload)
            return {"status": "queued"}
            
        return {"status": "ignored", "reason": "not_whatsapp_event"}
        
    except Exception as e:
        logger.error(f"❌ Error queuing Meta event: {e}")
        # Retorna 200 para a Meta não ficar retentando em caso de erro interno nosso
        return {"status": "error", "message": "Internal processing error"}

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
import models, schemas
from database import SessionLocal
import csv
import io
import json
import json
from datetime import datetime, timezone, timedelta
from services.engine import execute_funnel
from core.deps import get_current_user, get_db, get_validated_client_id
from websocket_manager import manager
from rabbitmq_client import rabbitmq
from chatwoot_client import ChatwootClient

import logging
logger = logging.getLogger("TriggersRouter")

router = APIRouter()

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

@router.get("/triggers/{trigger_id}", response_model=schemas.ScheduledTrigger, summary="Obter detalhes de um disparo específico")
def get_trigger(
    trigger_id: int,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retorna os detalhes de um disparo específico, incluindo seu histórico de execução em tempo real.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    trigger = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.id == trigger_id,
        models.ScheduledTrigger.client_id == client_id
    ).first()
    
    if not trigger:
        raise HTTPException(status_code=404, detail="Disparo não encontrado ou sem permissão.")
        
    return trigger

@router.get("/triggers", response_model=schemas.TriggerListResponse, summary="Listar Disparos e Agendamentos")

def list_triggers(
    skip: int = 0, 
    limit: int = 100, 
    funnel_name: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    trigger_type: Optional[str] = None,
    exclude_webhooks: bool = True,
    show_technical: bool = False,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retorna lista de disparos (triggers) paginada.
    """
    query = db.query(models.ScheduledTrigger)
    
    # Filter by client_id if provided
    client_id = x_client_id if x_client_id else current_user.client_id
    query = query.filter(models.ScheduledTrigger.client_id == client_id)
    
    # Excluir webhooks do histórico global se solicitado (padrão sim)
    if exclude_webhooks:
        query = query.filter(models.ScheduledTrigger.integration_id == None)
    
    # Filtrar registros internos para evitar problemas com NULL e lixo no histórico
    if not show_technical:
        query = query.filter(or_(
            models.ScheduledTrigger.template_name != "HIDDEN_CHILD",
            models.ScheduledTrigger.template_name == None
        ))
        query = query.filter(or_(
            models.ScheduledTrigger.product_name != "HIDDEN_CHILD",
            models.ScheduledTrigger.product_name == None
        ))
    
    # Nested Funnels support: Hide children triggers from main list
    # but allow them if show_technical is true
    if not show_technical:
        query = query.filter(models.ScheduledTrigger.parent_id == None)
    
    if funnel_name:
        query = query.join(models.Funnel).filter(models.Funnel.name.ilike(f"%{funnel_name}%"))
    if status:
        if status == 'pending':
            query = query.filter(models.ScheduledTrigger.status.in_(['pending', 'queued', 'Queued']))
        else:
            query = query.filter(models.ScheduledTrigger.status == status)
    if start_date:
        query = query.filter(models.ScheduledTrigger.created_at >= start_date)
    if end_date:
        query = query.filter(models.ScheduledTrigger.created_at <= end_date)
    
    if trigger_type:
        if trigger_type == 'bulk':
            query = query.filter(models.ScheduledTrigger.is_bulk == True)
        elif trigger_type == 'single':
            query = query.filter(models.ScheduledTrigger.is_bulk == False)

    total = query.count()
    triggers = query.order_by(models.ScheduledTrigger.created_at.desc()).offset(skip).limit(limit).all()

    # Backfill info for display
    for trigger in triggers:
        # sent_as for billing info
        if trigger.sent_as is None and trigger.messages:
            first_msg = min(trigger.messages, key=lambda m: m.id)
            if first_msg.message_type:
                trigger.sent_as = first_msg.message_type
        
        # child_count for nested funnels
        trigger.child_count = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.parent_id == trigger.id).count()

    return {
        "items": triggers,
        "total": total
    }

@router.post("/triggers/backfill-sent-as", summary="Preencher sent_as histórico a partir do MessageStatus")
def backfill_sent_as(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Percorre todos os ScheduledTriggers sem sent_as e preenche com o message_type
    do primeiro MessageStatus associado. Roda uma vez para dados históricos.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    triggers = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client_id,
        models.ScheduledTrigger.sent_as == None
    ).all()

    updated = 0
    for trigger in triggers:
        if trigger.messages:
            first_msg = min(trigger.messages, key=lambda m: m.id)
            if first_msg.message_type:
                trigger.sent_as = first_msg.message_type
                updated += 1

    db.commit()
    return {
        "status": "success",
        "updated": updated,
        "message": f"{updated} disparo(s) histórico(s) preenchidos com informação de cobrança."
    }


@router.get("/triggers/{trigger_id}/failures-csv", summary="Exportar Falhas CSV")
def export_failures_csv(
    trigger_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Gera um CSV com os contatos que falharam e os motivos.
    """
    # 1. Buscar falhas
    failures = db.query(models.MessageStatus).filter(
        models.MessageStatus.trigger_id == trigger_id,
        models.MessageStatus.status == 'failed'
    ).all()
    
    if not failures:
        raise HTTPException(status_code=404, detail="Nenhuma falha encontrada para este disparo.")

    # 2. Gerar CSV em memória
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(['Telefone', 'Motivo da Falha', 'Data'])
    
    for fail in failures:
        writer.writerow([
            fail.phone_number, 
            fail.failure_reason or "Erro desconhecido",
            fail.updated_at.strftime("%d/%m/%Y %H:%M:%S") if fail.updated_at else "-"
        ])
    
    output.seek(0)
    
    # 3. Retornar como arquivo
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=falhas_disparo_{trigger_id}.csv"}
    )

@router.get("/triggers/{trigger_id}/failures", summary="Listar Falhas JSON")
def list_failures_json(
    trigger_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Retorna a lista de contatos que falharam e os motivos em formato JSON.
    """
    failures = db.query(models.MessageStatus).filter(
        models.MessageStatus.trigger_id == trigger_id,
        models.MessageStatus.status == 'failed'
    ).all()
    
    return [
        {
            "phone": f.phone_number,
            "reason": f.failure_reason or "Erro desconhecido",
            "time": f.updated_at
        } 
        for f in failures
    ]

@router.delete("/triggers/{trigger_id}", summary="Excluir Registro de Disparo")
async def delete_trigger(trigger_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Remove permanentemente o histórico de um disparo.
    """
    if current_user.role not in ['super_admin', 'admin']:
        raise HTTPException(status_code=403, detail="Apenas administradores podem excluir históricos")

    trigger = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.id == trigger_id
    ).first()
    
    if not trigger:
        raise HTTPException(status_code=404, detail="Trigger not found")

    # Segurança: admin só deleta do seu próprio client
    if current_user.role == 'admin' and trigger.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Acesso negado: Este registro pertence a outro cliente")
    
    # Se estiver rodando, tentar cancelar primeiro?
    db.delete(trigger)
    db.commit()
    
    # Notificar via RabbitMQ para sincronização global
    await rabbitmq.publish_event("trigger_deleted", {
        "trigger_id": trigger_id,
        "client_id": current_user.client_id
    })
    
    return {"message": "Historic record deleted"}






@router.post("/triggers/{trigger_id}/cancel-with-report", summary="Cancelar com Relatório Detalhado")
def cancel_trigger_with_report(
    trigger_id: int, 
    payload: dict = Body(None),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Interrompe um disparo em andamento e retorna um relatório final do que foi feito.
    Usado principalmente pelo Frontend para paradas imediatas.
    """
    trigger = db.query(models.ScheduledTrigger).get(trigger_id)
    if not trigger:
         raise HTTPException(status_code=404, detail="Trigger not found")
    
    if trigger.status in ['completed', 'failed', 'cancelled']:
         raise HTTPException(status_code=400, detail="Trigger already finished")
    
    # Mark as cancelling (worker will detect and stop)
    trigger.status = "cancelling"
    db.commit()
    
    # If frontend provided progress data (immediate send case)
    if payload:
        trigger.processed_contacts = payload.get("processed", [])
        trigger.pending_contacts = payload.get("pending", [])
        if "sent" in payload: trigger.total_sent = payload["sent"]
        if "failed" in payload: trigger.total_failed = payload["failed"]
    else:
        # Wait a moment for worker to update contact lists (scheduled cases)
        import time
        time.sleep(1)
    
    # Refresh to get latest contact lists
    db.refresh(trigger)
    trigger.status = "cancelled"
    db.commit()
    
    # Extract contact lists with null safety
    processed = trigger.processed_contacts if trigger.processed_contacts is not None else []
    pending = trigger.pending_contacts if trigger.pending_contacts is not None else []
    
    # Get failed contacts from MessageStatus
    failed_messages = db.query(models.MessageStatus).filter(
        models.MessageStatus.trigger_id == trigger_id,
        models.MessageStatus.status == 'failed'
    ).all()
    failed = [msg.phone_number for msg in failed_messages]
    
    # Build response
    response = {
        "status": "cancelled",
        "trigger_id": trigger_id,
        "progress": {
            "total": len(trigger.contacts_list) if trigger.contacts_list else 0,
            "sent": trigger.total_sent or 0,
            "failed": trigger.total_failed or 0,
            "pending": len(pending)
        },
        "contacts": {
            "sent": processed,
            "failed": failed,
            "pending": pending
        },
        "message": f"Disparo cancelado. {len(processed)} enviados, {len(pending)} pendentes."
    }
    
    # Mark as fully cancelled
    trigger.status = "cancelled"
    db.commit()
    
    return response

# Keep simple cancel for backward compatibility
@router.post("/triggers/{trigger_id}/cancel", summary="Cancelar Disparo Simples")
async def cancel_trigger(trigger_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Cancela um disparo agendado ou em progresso sem retornar relatório.
    """
    trigger = db.query(models.ScheduledTrigger).get(trigger_id)
    if not trigger:
         raise HTTPException(status_code=404, detail="Trigger not found")
    
    if trigger.status in ['completed', 'failed', 'cancelled']:
         return {"message": "Trigger already finished"}
         
    trigger.status = "cancelled"
    db.commit()
    
    # Notificar via RabbitMQ para sincronização global
    await rabbitmq.publish_event("trigger_updated", {
        "trigger_id": trigger_id,
        "status": "cancelled",
        "client_id": current_user.client_id
    })
    
    return {"message": "Trigger cancelled successfully"}

@router.post("/triggers/{trigger_id}/pause", summary="Pausar Disparo")
async def pause_trigger(trigger_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Pausa um disparo em andamento."""
    trigger = db.query(models.ScheduledTrigger).get(trigger_id)
    if not trigger: raise HTTPException(status_code=404, detail="Trigger not found")
    if trigger.status != 'processing': raise HTTPException(status_code=400, detail="Somente disparos em processamento podem ser pausados")
    
    trigger.status = "paused"
    db.commit()
    await rabbitmq.publish_event("trigger_updated", {"trigger_id": trigger_id, "status": "paused", "client_id": trigger.client_id})
    return {"message": "Trigger paused"}

@router.post("/triggers/{trigger_id}/resume", summary="Retomar Disparo")
async def resume_trigger(trigger_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Retoma um disparo pausado."""
    trigger = db.query(models.ScheduledTrigger).get(trigger_id)
    if not trigger: raise HTTPException(status_code=404, detail="Trigger not found")
    if trigger.status != 'paused': raise HTTPException(status_code=400, detail="Trigger não está pausado")
    
    trigger.status = "processing"
    db.commit()
    await rabbitmq.publish_event("trigger_updated", {"trigger_id": trigger_id, "status": "processing", "client_id": trigger.client_id})
    return {"message": "Trigger resumed"}

@router.post("/triggers/{trigger_id}/retry", summary="Repetir Disparo (Individual ou Falhas de Bulk)")
async def retry_trigger(trigger_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Reinicia o disparo. 
    - Se for Bulk: Reinicia apenas para os contatos que falharam.
    - Se for Single: Reinicia a execução do funil do zero para o contato.
    """
    trigger = db.query(models.ScheduledTrigger).get(trigger_id)
    if not trigger: raise HTTPException(status_code=404, detail="Trigger not found")

    # CASE 1: INDIVIDUAL TRIGGER
    if not trigger.is_bulk:
        logger.info(f"🔄 Retrying SINGLE trigger {trigger_id} for {trigger.contact_phone}")
        trigger.status = "queued"
        trigger.failure_reason = None
        trigger.current_node_id = None # Reset to start
        trigger.current_step_index = 0
        trigger.scheduled_time = datetime.now(timezone.utc)
        db.commit()

        # Publish to queue
        await rabbitmq.publish("zapvoice_funnel_executions", {
            "trigger_id": trigger.id,
            "funnel_id": trigger.funnel_id,
            "conversation_id": trigger.conversation_id,
            "contact_phone": trigger.contact_phone,
            "contact_name": trigger.contact_name
        })
        return {"message": "Reenvio individual iniciado"}
    
    # CASE 2: BULK TRIGGER (Existing logic)
    # ... rest of logic stays same or similar
    
    # 1. Buscar falhas
    failed_contacts = db.query(models.MessageStatus).filter(
        models.MessageStatus.trigger_id == trigger_id,
        models.MessageStatus.status == 'failed'
    ).all()
    
    if not failed_contacts:
        raise HTTPException(status_code=404, detail="Nenhuma falha encontrada para repetir")

    # 2. Reconstituir lista de pendentes
    failed_phones = [m.phone_number for m in failed_contacts]
    
    # 3. Limpar falhas do banco para não duplicar no relatório
    db.query(models.MessageStatus).filter(
        models.MessageStatus.trigger_id == trigger_id,
        models.MessageStatus.status == 'failed'
    ).delete()
    
    # 4. Resetar trigger
    trigger.status = "queued"
    trigger.pending_contacts = failed_phones
    trigger.total_failed = 0
    # Mantém o processed_contacts original para histórico se quiser, ou reseta. 
    # Melhor resetar os que vamos tentar de novo do processed_contacts se estiverem lá
    if trigger.processed_contacts:
        trigger.processed_contacts = [p for p in trigger.processed_contacts if p not in failed_phones]
    
    db.commit()
    
    # 5. Notificar RabbitMQ
    if trigger.funnel_id:
        # Funnel Bulk
        await rabbitmq.publish("zapvoice_funnel_executions", {
            "trigger_id": trigger.id,
            "funnel_id": trigger.funnel_id,
            "contacts": [{"phone": p} for p in failed_phones],
            "delay": trigger.delay_seconds,
            "concurrency": trigger.concurrency_limit,
            "type": "funnel_bulk"
        })
    else:
        # Template Bulk
        await rabbitmq.publish("zapvoice_bulk_sends", {
            "trigger_id": trigger.id,
            "template_name": trigger.template_name,
            "contacts": failed_phones,
            "delay": trigger.delay_seconds,
            "concurrency": trigger.concurrency_limit,
            "language": trigger.template_language,
            "components": trigger.template_components,
            "private_message_delay": trigger.private_message_delay,
            "private_message_concurrency": trigger.private_message_concurrency
        })

    return {"message": f"Retry iniciado para {len(failed_phones)} contatos"}



@router.post("/trigger-bulk", summary="Novo Disparo em Massa (CSV)")
async def trigger_bulk_send(
    funnel_id: Optional[int] = Form(None),
    template_name: Optional[str] = Form(None),
    csv_file: UploadFile = File(...),
    delay: int = Form(5),
    concurrency: int = Form(1),
    template_language: str = Form("pt_BR"),
    private_message: Optional[str] = Form(None),
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Cria um agendamento de disparo em massa a partir de um arquivo CSV.

    - O CSV deve conter uma coluna `phone` ou `telefone`.
    - O disparo é enfileirado imediatamente.
    """

    # 1. Parse CSV
    contacts = []
    try:
        content = await csv_file.read()
        decoded = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(decoded))
        
        # Normalize headers
        if csv_reader.fieldnames:
             csv_reader.fieldnames = [h.lower().replace(' ', '_') for h in csv_reader.fieldnames]

        for row in csv_reader:
            # Tenta encontrar coluna de telefone
            phone = row.get('phone') or row.get('telefone') or row.get('celular') or row.get('whatsapp')
            if phone:
                # Basic sanitation
                clean_phone = ''.join(filter(str.isdigit, phone))
                if len(clean_phone) >= 10: # Min length valid
                    row['phone'] = clean_phone
                    contacts.append(row)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao ler CSV: {str(e)}")

    if not contacts:
        raise HTTPException(status_code=400, detail="Nenhum contato válido encontrado no CSV")

    # 2. Create ScheduledTrigger (Bulk Parent)
    trigger = models.ScheduledTrigger(
        client_id=x_client_id,
        funnel_id=funnel_id,
        template_name=template_name,
        template_language=template_language,
        status='queued', # Instantly queued
        delay_seconds=delay,
        concurrency_limit=concurrency,
        is_bulk=True,

        contacts_list=contacts, # JSONB
        cost_per_unit=payload.get("cost_per_unit", 0.0) if 'payload' in locals() else 0.0,
        private_message=private_message,
        scheduled_time=datetime.now(timezone.utc) # Run NOW
    )
    
    db.add(trigger)
    db.commit()
    db.refresh(trigger)
    
    return trigger

@router.post("/funnels/{funnel_id}/trigger", summary="Disparar Funil (Individual)")
async def trigger_funnel_single(
    funnel_id: int,
    conversation_id: str = None, # Changed to str to avoid validation errors
    contact_name: str = "",
    contact_phone: str = "",
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Inicia a execução imediata de um funil para um único contato.
    """

    with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now(timezone.utc)}] 🚀 Trigger Single: Funnel {funnel_id}, Conv {conversation_id}, Name {contact_name}\n")
    print(f"🚀 Trigger Single: Funnel {funnel_id}, Conv {conversation_id}, Name {contact_name}")
    # Verify funnel exists
    funnel = db.query(models.Funnel).get(funnel_id)
    if not funnel:
        print(f"❌ Funnel {funnel_id} not found in DB")
        raise HTTPException(status_code=404, detail="Funnel not found")

    # Create ScheduledTrigger for single execution
    trigger = models.ScheduledTrigger(
        client_id=x_client_id,
        funnel_id=funnel_id,
        conversation_id=int(conversation_id) if conversation_id and str(conversation_id).isdigit() else None,
        status='queued',
        is_bulk=False,
        contact_phone=contact_phone,
        contact_name=contact_name,
        # Create a single item list for consistency with engine
        contacts_list=[{
            "id": conversation_id,
            "meta": {"sender": {"name": contact_name, "phone_number": contact_phone}}
        }], 
        # total_recipients removed
        scheduled_time=datetime.now(timezone.utc)
    )
    
    db.add(trigger)
    db.commit()
    db.refresh(trigger)
    
    print(f"✅ Trigger created ID: {trigger.id} | Status: {trigger.status} | Phone: {contact_phone}")
    with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now(timezone.utc)}] ✅ Trigger created ID: {trigger.id} | Status: {trigger.status}\n")

    return trigger

@router.post("/funnels/{funnel_id}/trigger-bulk", summary="Disparar Funil em Massa (JSON)")
async def trigger_funnel_bulk_json(
    funnel_id: int,
    payload: dict = Body(...),
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Inicia um funil para múltiplos contatos recebidos via JSON (usado pelo seletor do Frontend).
    """

    funnel = db.query(models.Funnel).get(funnel_id)
    if not funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")

    conversations = payload.get("conversations", [])
    if not conversations:
        raise HTTPException(status_code=400, detail="Nenhum contato fornecido")

    schedule_at_str = payload.get("schedule_at")
    delay_seconds = payload.get("delay_seconds", 5)
    concurrency_limit = payload.get("concurrency_limit", 1)

    scheduled_time = datetime.now(timezone.utc)
    if schedule_at_str:
        try:
             scheduled_time = datetime.fromisoformat(schedule_at_str.replace('Z', '+00:00'))
        except ValueError:
             pass # Fallback to now

    # Prepare contacts list properly
    contacts_data = []
    for c in conversations:
        # Ensure we keep the structure needed by the engine
        contacts_data.append({
            "id": c.get("id"),
            "meta": c.get("meta", {}),
            "inbox_id": c.get("inbox_id")
        })

    trigger = models.ScheduledTrigger(
        client_id=x_client_id,
        funnel_id=funnel_id,
        status='queued',
        is_bulk=True,
        contacts_list=contacts_data,
        # total_recipients removed
        scheduled_time=scheduled_time,
        delay_seconds=delay_seconds,
        concurrency_limit=concurrency_limit
    )
    db.add(trigger)
    db.commit()
    db.refresh(trigger)
    
    print(f"🚀 Trigger Bulk Created ID: {trigger.id} | Conversations: {len(contacts_data)}")
    with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now(timezone.utc)}] 🚀 Trigger Bulk Created ID: {trigger.id} | Count: {len(contacts_data)}\n")

    return trigger

@router.post("/bulk-send/register", summary="Registrar Envio (Histórico)")
async def register_bulk_send(
    payload: dict = Body(...),
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Registra um envio em massa JÁ REALIZADO (imediato) no histórico para fins de relatório.
    """

    template_name = payload.get("template_name")
    total_sent = payload.get("total_sent", 0)
    total_failed = payload.get("total_failed", 0)
    contacts_list = payload.get("contacts_list", []) # List of numbers
    language = payload.get("language", "pt_BR")
    message_ids = payload.get("message_ids", []) # List of {phone, message_id}

    # Create a simplified contacts structure for history
    formatted_contacts = []
    for c in contacts_list:
        if isinstance(c, str):
            formatted_contacts.append({"phone": c})
        else:
            formatted_contacts.append(c)

    print(f"📝 Registering Bulk Send: {template_name}, Sent: {total_sent}, Failed: {total_failed}")

    try:
        trigger_id = payload.get("trigger_id")
        trigger = None

        if trigger_id:
            trigger = db.query(models.ScheduledTrigger).get(trigger_id)
            if trigger:
                print(f"🔄 Updating existing trigger {trigger_id}")
                trigger.status = 'completed'
                trigger.total_sent = total_sent
                trigger.total_failed = total_failed
                trigger.cost_per_unit = payload.get("cost_per_unit", 0.0)
                trigger.total_cost = payload.get("cost_per_unit", 0.0) * total_sent
                # Update lists if needed, though cancel/progress updates might have done so partially
                # trigger.contacts_list = formatted_contacts 
            else:
                print(f"⚠️ Trigger {trigger_id} not found, creating new one.")

        if not trigger:
            trigger = models.ScheduledTrigger(
            client_id=x_client_id,
            template_name=template_name,
            template_language=language,
            status='completed',
            is_bulk=True,
            contacts_list=formatted_contacts,
            # total_recipients removed
            total_sent=total_sent,     # Fixed field name
            total_failed=total_failed, # Fixed field name
            cost_per_unit=payload.get("cost_per_unit", 0.0),
            total_cost=payload.get("cost_per_unit", 0.0) * total_sent,
            scheduled_time=datetime.now(timezone.utc),
            funnel_id=None # Explicitly set None
        )
        db.add(trigger)
    
        db.commit()
        db.refresh(trigger)
        print(f"✅ Trigger registered with ID: {trigger.id}")

        # Create MessageStatus records for SUCCESS
        if message_ids:
            print(f"💾 Saving {len(message_ids)} sent statuses...")
            for msg in message_ids:
                ms = models.MessageStatus(
                    trigger_id=trigger.id,
                    message_id=msg.get("message_id"),
                    phone_number=msg.get("phone"),
                    status="sent"
                )
                db.add(ms)
            
        # Create MessageStatus records for FAILURES
        failed_numbers = payload.get("failed_numbers", [])
        if failed_numbers:
            print(f"💾 Saving {len(failed_numbers)} failed statuses...")
            for fail_item in failed_numbers:
                # fail_item pode ser string (só numero) ou dict {phone, reason}
                phone = fail_item.get("phone") if isinstance(fail_item, dict) else fail_item
                reason = fail_item.get("reason", "Erro no envio em massa") if isinstance(fail_item, dict) else "Erro no envio em massa"
                
                ms = models.MessageStatus(
                    trigger_id=trigger.id,
                    phone_number=phone,
                    status="failed",
                    failure_reason=reason
                )
                db.add(ms)

        db.commit()
        print("✅ Message Statues saved (Sent + Failed).")

        return trigger
    except Exception as e:
        print(f"❌ Error registering bulk send: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to register history: {str(e)}")

@router.post("/bulk-send/reserve", summary="Reservar ID para Envio")
async def reserve_bulk_send(
    payload: dict = Body(...),
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Cria um registro com status 'processing' ANTES de iniciar o envio.
    Garante que exista um ID para permitir cancelamento durante o processo.
    """

    template_name = payload.get("template_name")
    contacts_list = payload.get("contacts_list", []) # List of numbers
    language = payload.get("language", "pt_BR")

    formatted_contacts = []
    pending_numbers = []
    for c in contacts_list:
        num = c if isinstance(c, str) else c.get("phone")
        formatted_contacts.append({"phone": num})
        pending_numbers.append(num)

    try:
        trigger = models.ScheduledTrigger(
            client_id=x_client_id,
            template_name=template_name,
            template_language=language,
            status='processing',
            is_bulk=True,
            contacts_list=formatted_contacts,
            pending_contacts=pending_numbers,
            processed_contacts=[],
            cost_per_unit=payload.get("cost_per_unit", 0.0),
            private_message=payload.get("private_message"),
            private_message_delay=payload.get("private_message_delay", 5),
            private_message_concurrency=payload.get("private_message_concurrency", 1),
            scheduled_time=datetime.now(timezone.utc),
            funnel_id=None
        )
        
        db.add(trigger)
        db.commit()
        db.refresh(trigger)
        
        print(f"🚀 Bulk Trigger RESERVED ID: {trigger.id} | Total: {len(formatted_contacts)}")
        return trigger
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reserve trigger: {str(e)}")

@router.post("/bulk-send/schedule", summary="Agendar Envio Futuro")
async def schedule_bulk_send(
    payload: dict = Body(...),
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Agenda um envio em massa para uma data/hora futura.
    """

    template_name = payload.get("template_name")
    language = payload.get("language", "pt_BR")
    contacts_list = payload.get("contacts_list", [])
    schedule_at_str = payload.get("schedule_at")
    delay_seconds = payload.get("delay_seconds", 5)
    concurrency_limit = payload.get("concurrency_limit", 1)
    private_message = payload.get("private_message")
    private_message_delay = payload.get("private_message_delay", 5)
    private_message_concurrency = payload.get("private_message_concurrency", 1)

    if not schedule_at_str:
        raise HTTPException(status_code=400, detail="Schedule time is required")

    try:
         scheduled_time = datetime.fromisoformat(schedule_at_str.replace('Z', '+00:00'))
    except ValueError:
         raise HTTPException(status_code=400, detail="Invalid date format")

    # Support for A/B Testing (Variations)
    variations = payload.get("variations") # List of {template_name, weight, components, language}
    
    if variations and len(variations) > 0:
        import random
        # 1. Prepare Contacts
        formatted_contacts = []
        for c in contacts_list:
            if isinstance(c, str):
                formatted_contacts.append({"phone": c})
            else:
                formatted_contacts.append(c)
        
        # Shuffle for random distribution
        random.shuffle(formatted_contacts)
        total_contacts = len(formatted_contacts)
        current_index = 0
        created_triggers = []
        
        # 2. Iterate and Create Triggers
        for i, var in enumerate(variations):
            weight = float(var.get("weight", 0))
            if weight <= 0: continue
            
            # Calculate slice
            if i == len(variations) - 1:
                # Last batch gets the rest
                batch_contacts = formatted_contacts[current_index:]
            else:
                count = int(total_contacts * (weight / 100))
                batch_contacts = formatted_contacts[current_index : current_index + count]
                current_index += count
            
            if not batch_contacts:
                continue

            t_name = var.get("template_name")
            display_name = f"{t_name}|{t_name} [Teste {weight}%]"
            
            trigger = models.ScheduledTrigger(
                client_id=x_client_id,
                template_name=display_name,
                template_language=var.get("language", "pt_BR"),
                status='queued',
                is_bulk=True,
                contacts_list=batch_contacts,
                scheduled_time=scheduled_time,
                delay_seconds=delay_seconds,
                concurrency_limit=concurrency_limit,
                cost_per_unit=var.get("cost_per_unit"),
                template_components=var.get("components"),
                
                # Direct Message
                direct_message=var.get("direct_message"),
                direct_message_params=var.get("direct_message_params"),
                
                private_message=var.get("private_message"),
                private_message_delay=private_message_delay,
                private_message_concurrency=private_message_concurrency
            )
            db.add(trigger)
            created_triggers.append(trigger)
        
        if not created_triggers:
             raise HTTPException(status_code=400, detail="No contacts distributed. Check weights.")

        db.commit()
        for t in created_triggers:
            db.refresh(t)
            print(f"🚀 [A/B Test] Created Trigger ID: {t.id} ({t.template_name}) - {len(t.contacts_list or [])} contacts")

        # Return the first one for frontend tracking compatibility
        return created_triggers[0]

    # Standard Single Template Logic
    formatted_contacts = []
    for c in contacts_list:
        if isinstance(c, str):
            formatted_contacts.append({"phone": c})
        else:
            formatted_contacts.append(c)

    trigger = models.ScheduledTrigger(
        client_id=x_client_id,
        template_name=template_name,
        template_language=language,
        status='queued',
        is_bulk=True,
        contacts_list=formatted_contacts,
        # total_recipients removed
        scheduled_time=scheduled_time,
        delay_seconds=delay_seconds,
        concurrency_limit=concurrency_limit,
        template_components=payload.get("components"),
        
        # Direct Message
        direct_message=payload.get("direct_message"),
        direct_message_params=payload.get("direct_message_params"),
        cost_per_unit=payload.get("cost_per_unit", 0.0),
        
        private_message=private_message,
        private_message_delay=private_message_delay,
        private_message_concurrency=private_message_concurrency
    )
    db.add(trigger)
    db.commit()
    db.refresh(trigger)
    return trigger

@router.get("/triggers/{trigger_id}/messages", summary="Listar Mensagens de um Disparo")
def get_trigger_messages(
    trigger_id: int,
    status_filter: Optional[str] = None,
    message_type: Optional[str] = None,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retorna lista detalhada de mensagens para um disparo.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    
    # Verify trigger ownership
    trigger = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.id == trigger_id,
        models.ScheduledTrigger.client_id == client_id
    ).first()
    
    if not trigger:
        raise HTTPException(status_code=404, detail="Disparo não encontrado")
        
    # Base query for all messages related to this trigger
    base_query = db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id == trigger_id)
    
    # Apply status filter if provided
    if status_filter:
        if status_filter == 'delivered':
            base_query = base_query.filter(models.MessageStatus.status.in_(['delivered', 'read', 'interaction']))
        elif status_filter == 'read':
            base_query = base_query.filter(models.MessageStatus.status.in_(['read', 'interaction']))
        elif status_filter == 'failed':
            base_query = base_query.filter(models.MessageStatus.status == 'failed')
        elif status_filter == 'sent':
            # 'Sent' means successfully dispatched from our system, which includes delivered and read
            base_query = base_query.filter(models.MessageStatus.status.in_(['sent', 'delivered', 'read', 'interaction']))
        elif status_filter == 'blocked':
            base_query = base_query.filter(models.MessageStatus.failure_reason == 'BLOCKED_VIA_BUTTON')
        elif status_filter in ('interaction', 'interactions'):
            from sqlalchemy import or_
            base_query = base_query.filter(
                models.MessageStatus.is_interaction == True,
                or_(
                    models.MessageStatus.failure_reason == None,
                    models.MessageStatus.failure_reason != 'BLOCKED_VIA_BUTTON'
                )
            )
        elif status_filter == 'private_note':
            base_query = base_query.filter(models.MessageStatus.private_note_posted == True)

    # Apply message type filter if provided
    if message_type:
        if message_type == 'template':
            base_query = base_query.filter(models.MessageStatus.message_type == 'TEMPLATE')
        elif message_type == 'free':
            base_query = base_query.filter(models.MessageStatus.message_type == 'FREE_MESSAGE')

    items = base_query.order_by(models.MessageStatus.updated_at.desc()).all()
    
    # Dynamic Redirection Logic
    from config_loader import get_setting
    base_url = get_setting("CHATWOOT_URL", "https://app.chatwoot.com", client_id=trigger.client_id)
    if base_url.endswith("/"): base_url = base_url[:-1]

    # Cache contacts list for faster lookup if it's bulk
    contacts_map = {}
    if trigger.is_bulk and trigger.contacts_list:
        for c in trigger.contacts_list:
            if isinstance(c, dict):
                p = c.get('phone') or c.get('telefone') or c.get('whatsapp') or ''
                if p:
                    clean_p = "".join(filter(str.isdigit, str(p)))
                    name = (
                        c.get('{{1}}') or c.get('1') or c.get('nome') or 
                        c.get('name') or c.get('full_name') or c.get('contact_name') or ""
                    )
                    if clean_p:
                        contacts_map[clean_p] = name

    for item in items:
        # Resolve Name
        clean_item_p = "".join(filter(str.isdigit, str(item.phone_number)))
        # setattr is safer for SQLAlchemy objects when adding dynamic fields
        item.contact_name = contacts_map.get(clean_item_p) or trigger.contact_name
        
        # Prioritize values directly in MessageStatus, fallback to Trigger if it's a single trigger
        convo_id = item.chatwoot_conversation_id or (trigger.conversation_id if not trigger.is_bulk else None)
        account_id = item.chatwoot_account_id or trigger.chatwoot_account_id
        
        if convo_id and account_id:
            item.chatwoot_url = f"{base_url}/app/accounts/{account_id}/conversations/{convo_id}"
        else:
            item.chatwoot_url = None

    # Recalculate counts for consistency (Full counts for the modal tabs)
    full_query = db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id == trigger_id)
    
    counts = {
        "all": full_query.count(),
        "sent": full_query.filter(models.MessageStatus.status.in_(['sent', 'delivered', 'read', 'interaction'])).count(),
        "delivered": full_query.filter(models.MessageStatus.status.in_(['delivered', 'read', 'interaction'])).count(),
        "read": full_query.filter(models.MessageStatus.status.in_(['read', 'interaction'])).count(),
        "failed": full_query.filter(models.MessageStatus.status == 'failed').count(),
        "free": full_query.filter(models.MessageStatus.message_type == 'FREE_MESSAGE').count(),
        "template": full_query.filter(models.MessageStatus.message_type == 'TEMPLATE').count(),
        "blocked": full_query.filter(models.MessageStatus.failure_reason == 'BLOCKED_VIA_BUTTON').count(),
        "interaction": full_query.filter(models.MessageStatus.is_interaction == True).count(),
        "private_note": full_query.filter(models.MessageStatus.private_note_posted == True).count()
    }

    return {
        "items": items,
        "counts": counts
    }

@router.get("/triggers/{aggregator_id}/details", summary="Detalhes do Agregador (Fila)")
def get_aggregator_details(
    aggregator_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retorna os gatilhos 'filhos' (Hidden Childs) associados a um Agregador.
    Isso permite ver o status individual de cada contato na fila.
    """
    # 1. Verificar se é agregador ou trigger simples
    aggregator = db.query(models.ScheduledTrigger).get(aggregator_id)
    if not aggregator:
        raise HTTPException(status_code=404, detail="Agregador não encontrado")
    
    # Se NÃO for bulk (ou seja, é um trigger individual visível), retorna a si mesmo
    if not aggregator.is_bulk:
        return [aggregator]

    # 2. Buscar filhos (Lógica legacy para Agregadores Antigos)
    # A lógica de associação é pelo template_name que usamos como chave de agrupamento
    # OU se tivermos um parent_id implementado futuramente.
    children = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == aggregator.client_id,
        models.ScheduledTrigger.template_name == "HIDDEN_CHILD",
        models.ScheduledTrigger.funnel_id == aggregator.funnel_id
    ).order_by(models.ScheduledTrigger.updated_at.desc()).limit(200).all()
    
    return children

@router.get("/triggers/{trigger_id}/children", response_model=List[schemas.ScheduledTrigger], summary="Listar Funis Filhos")
def list_trigger_children(
    trigger_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retorna os funis que foram iniciados a partir deste disparo (Interações).
    """
    # Visibility fix: Super Admins can see any trigger. Others follow client_id/X-Client-ID.
    query = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id)
    
    if current_user.role != 'super_admin':
        client_id_to_check = current_user.client_id
        # Optional: respect X-Client-ID if provided as header (matching list_triggers logic)
        # For now, current_user.client_id is safe for non-admins.
        query = query.filter(models.ScheduledTrigger.client_id == client_id_to_check)
    
    trigger = query.first()
    
    if not trigger:
        raise HTTPException(status_code=404, detail="Disparo não encontrado.")
    
    # We look for children specifically using parent_id
    children = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.parent_id == trigger_id
    ).order_by(models.ScheduledTrigger.created_at.desc()).all()
    
    # Backfill info for children
    for child in children:
        if child.sent_as is None and child.messages:
            first_msg = min(child.messages, key=lambda m: m.id)
            if first_msg.message_type:
                child.sent_as = first_msg.message_type
        # Let's count grandchildren just in case, though unlikely
        child.child_count = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.parent_id == child.id).count()

    return children

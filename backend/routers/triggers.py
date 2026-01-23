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
from datetime import datetime, timezone
from services.engine import execute_funnel
from core.deps import get_current_user, get_db

router = APIRouter()

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

@router.get("/triggers", response_model=List[schemas.ScheduledTrigger], summary="Listar Disparos e Agendamentos")
def list_triggers(
    skip: int = 0, 
    limit: int = 100, 
    funnel_name: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    trigger_type: Optional[str] = None,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retorna lista de disparos (triggers).
    
    - **Filtros:** Nome do funil, status, data de criação.
    - **Tipos:** Bulk (em massa) ou Single (individual).
    """
    query = db.query(models.ScheduledTrigger)
    
    # Filter by client_id if provided
    client_id = x_client_id if x_client_id else current_user.client_id
    query = query.filter(models.ScheduledTrigger.client_id == client_id)
    
    if funnel_name:
        query = query.join(models.Funnel).filter(models.Funnel.name.ilike(f"%{funnel_name}%"))
    if status:
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

    triggers = query.order_by(models.ScheduledTrigger.created_at.desc()).offset(skip).limit(limit).all()
    return triggers

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

@router.delete("/triggers/{trigger_id}", summary="Excluir Registro de Disparo")
def delete_trigger(trigger_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Remove permanentemente o histórico de um disparo.
    """
    trigger = db.query(models.ScheduledTrigger).get(trigger_id)
    if not trigger:
        raise HTTPException(status_code=404, detail="Trigger not found")
    
    # Se estiver rodando, tentar cancelar primeiro?
    db.delete(trigger)
    db.commit()
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
def cancel_trigger(trigger_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
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
    return {"message": "Trigger cancelled successfully"}

@router.post("/trigger-bulk", summary="Novo Disparo em Massa (CSV)")
async def trigger_bulk_send(
    funnel_id: Optional[int] = Form(None),
    template_name: Optional[str] = Form(None),
    csv_file: UploadFile = File(...),
    delay: int = Form(5),
    concurrency: int = Form(1),
    template_language: str = Form("pt_BR"),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Cria um agendamento de disparo em massa a partir de um arquivo CSV.
    
    - O CSV deve conter uma coluna `phone` ou `telefone`.
    - O disparo é enfileirado imediatamente.
    """
    if not x_client_id:
        raise HTTPException(status_code=400, detail="X-Client-ID header is required")

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
        # total_recipients removed as it is not in the model
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
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Inicia a execução imediata de um funil para um único contato.
    """
    if not x_client_id:
        raise HTTPException(status_code=400, detail="X-Client-ID header is required")

    with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now()}] 🚀 Trigger Single: Funnel {funnel_id}, Conv {conversation_id}, Name {contact_name}\n")
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
    return trigger

@router.post("/funnels/{funnel_id}/trigger-bulk", summary="Disparar Funil em Massa (JSON)")
async def trigger_funnel_bulk_json(
    funnel_id: int,
    payload: dict = Body(...),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Inicia um funil para múltiplos contatos recebidos via JSON (usado pelo seletor do Frontend).
    """
    if not x_client_id:
        raise HTTPException(status_code=400, detail="X-Client-ID header is required")

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
    return trigger

@router.post("/bulk-send/register", summary="Registrar Envio (Histórico)")
async def register_bulk_send(
    payload: dict = Body(...),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Registra um envio em massa JÁ REALIZADO (imediato) no histórico para fins de relatório.
    """
    if not x_client_id:
        raise HTTPException(status_code=400, detail="X-Client-ID header is required")

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
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Cria um registro com status 'processing' ANTES de iniciar o envio.
    Garante que exista um ID para permitir cancelamento durante o processo.
    """
    if not x_client_id:
        raise HTTPException(status_code=400, detail="X-Client-ID header is required")

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
            scheduled_time=datetime.now(timezone.utc),
            funnel_id=None
        )
        
        db.add(trigger)
        db.commit()
        db.refresh(trigger)
        return trigger
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reserve trigger: {str(e)}")

@router.post("/bulk-send/schedule", summary="Agendar Envio Futuro")
async def schedule_bulk_send(
    payload: dict = Body(...),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Agenda um envio em massa para uma data/hora futura.
    """
    if not x_client_id:
        raise HTTPException(status_code=400, detail="X-Client-ID header is required")

    template_name = payload.get("template_name")
    language = payload.get("language", "pt_BR")
    contacts_list = payload.get("contacts_list", [])
    schedule_at_str = payload.get("schedule_at")
    delay_seconds = payload.get("delay_seconds", 5)
    concurrency_limit = payload.get("concurrency_limit", 1)

    if not schedule_at_str:
        raise HTTPException(status_code=400, detail="Schedule time is required")

    try:
         scheduled_time = datetime.fromisoformat(schedule_at_str.replace('Z', '+00:00'))
    except ValueError:
         raise HTTPException(status_code=400, detail="Invalid date format")

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
        template_components=payload.get("components")
    )
    db.add(trigger)
    db.commit()
    db.refresh(trigger)
    return trigger

@router.get("/triggers/{trigger_id}/messages", summary="Listar Mensagens de um Disparo")
def get_trigger_messages(
    trigger_id: int,
    status_filter: Optional[str] = None,
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
        
    query = db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id == trigger_id)
    
    if status_filter:
        if status_filter == 'delivered':
            query = query.filter(models.MessageStatus.status.in_(['delivered', 'read']))
        elif status_filter == 'read':
            query = query.filter(models.MessageStatus.status == 'read')
        elif status_filter == 'failed':
            query = query.filter(models.MessageStatus.status == 'failed')
        elif status_filter == 'interaction':
            query = query.filter(
                models.MessageStatus.is_interaction == True,
                or_(
                    models.MessageStatus.failure_reason == None,
                    models.MessageStatus.failure_reason != 'BLOCKED_VIA_BUTTON'
                )
            )
        elif status_filter == 'blocked':
            query = query.filter(models.MessageStatus.failure_reason == 'BLOCKED_VIA_BUTTON')
            
    return query.order_by(models.MessageStatus.updated_at.desc()).all()

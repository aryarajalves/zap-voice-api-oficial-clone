from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
from typing import Optional
import models, schemas
from datetime import datetime, timezone
from core.deps import get_current_user, get_db, get_validated_client_id
from services.triggers_service import process_bulk_csv_logic

router = APIRouter()

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
    """
    content = await csv_file.read()
    contacts = process_bulk_csv_logic(content.decode('utf-8'))
    
    if not contacts:
        raise HTTPException(status_code=400, detail="Nenhum contato válido encontrado no CSV")

    trigger = models.ScheduledTrigger(
        client_id=x_client_id,
        funnel_id=funnel_id,
        template_name=template_name,
        template_language=template_language,
        status='queued',
        delay_seconds=delay,
        concurrency_limit=concurrency,
        is_bulk=True,
        contacts_list=contacts,
        total_contacts=len(contacts),
        private_message=private_message,
        scheduled_time=datetime.now(timezone.utc)
    )
    
    db.add(trigger)
    db.commit()
    db.refresh(trigger)
    return trigger

@router.post("/funnels/{funnel_id}/trigger", summary="Disparar Funil (Individual)")
async def trigger_funnel_single(
    funnel_id: int,
    conversation_id: str = None,
    contact_name: str = "",
    contact_phone: str = "",
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Inicia a execução imediata de um funil para um único contato.
    """
    funnel = db.query(models.Funnel).get(funnel_id)
    if not funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")

    trigger = models.ScheduledTrigger(
        client_id=x_client_id,
        funnel_id=funnel_id,
        conversation_id=int(conversation_id) if conversation_id and str(conversation_id).isdigit() else None,
        status='queued',
        is_bulk=False,
        contact_phone=contact_phone,
        contact_name=contact_name,
        contacts_list=[{
            "id": conversation_id,
            "meta": {"sender": {"name": contact_name, "phone_number": contact_phone}}
        }], 
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
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Inicia um funil para múltiplos contatos recebidos via JSON.
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
        except ValueError: pass

    contacts_data = []
    for c in conversations:
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
        total_contacts=len(contacts_data),
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
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    template_name = payload.get("template_name")
    total_sent = payload.get("total_sent", 0)
    total_failed = payload.get("total_failed", 0)
    contacts_list = payload.get("contacts_list", [])
    language = payload.get("language", "pt_BR")
    message_ids = payload.get("message_ids", [])

    formatted_contacts = []
    for c in contacts_list:
        if isinstance(c, str): formatted_contacts.append({"phone": c})
        else: formatted_contacts.append(c)

    trigger_id = payload.get("trigger_id")
    trigger = None

    if trigger_id:
        trigger = db.query(models.ScheduledTrigger).get(trigger_id)
        if trigger:
            trigger.status = 'completed'
            trigger.total_sent = total_sent
            trigger.total_failed = total_failed
            trigger.cost_per_unit = payload.get("cost_per_unit", 0.0)
            trigger.total_cost = 0.0 # Custo será preenchido pelos webhooks de entrega

    if not trigger:
        trigger = models.ScheduledTrigger(
            client_id=x_client_id,
            template_name=template_name,
            template_language=language,
            status='completed',
            is_bulk=True,
            contacts_list=formatted_contacts,
            total_contacts=len(formatted_contacts),
            total_sent=total_sent,
            total_failed=total_failed,
            cost_per_unit=payload.get("cost_per_unit", 0.0),
            total_cost=0.0,
            scheduled_time=datetime.now(timezone.utc)
        )
        db.add(trigger)
    
    db.commit()
    db.refresh(trigger)

    if message_ids:
        for msg in message_ids:
            ms = models.MessageStatus(trigger_id=trigger.id, message_id=msg.get("message_id"), phone_number=msg.get("phone"), status="sent")
            db.add(ms)
            
    failed_numbers = payload.get("failed_numbers", [])
    if failed_numbers:
        for fail_item in failed_numbers:
            phone = fail_item.get("phone") if isinstance(fail_item, dict) else fail_item
            reason = fail_item.get("reason", "Erro no envio em massa") if isinstance(fail_item, dict) else "Erro no envio em massa"
            ms = models.MessageStatus(trigger_id=trigger.id, phone_number=phone, status="failed", failure_reason=reason)
            db.add(ms)

    db.commit()
    return trigger

@router.post("/bulk-send/reserve", summary="Reservar ID para Envio")
async def reserve_bulk_send(
    payload: dict = Body(...),
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    template_name = payload.get("template_name")
    contacts_list = payload.get("contacts_list", [])
    language = payload.get("language", "pt_BR")

    formatted_contacts = []
    pending_numbers = []
    for c in contacts_list:
        num = c if isinstance(c, str) else c.get("phone")
        formatted_contacts.append({"phone": num})
        pending_numbers.append(num)

    trigger = models.ScheduledTrigger(
        client_id=x_client_id,
        template_name=template_name,
        template_language=language,
        status='processing',
        is_bulk=True,
        contacts_list=formatted_contacts,
        total_contacts=len(formatted_contacts),
        pending_contacts=pending_numbers,
        processed_contacts=[],
        cost_per_unit=payload.get("cost_per_unit", 0.0),
        private_message=payload.get("private_message"),
        private_message_delay=payload.get("private_message_delay", 5),
        private_message_concurrency=payload.get("private_message_concurrency", 1),
        scheduled_time=datetime.now(timezone.utc)
    )
    db.add(trigger)
    db.commit()
    db.refresh(trigger)
    return trigger

@router.post("/bulk-send/schedule", summary="Agendar Envio Futuro")
async def schedule_bulk_send(
    payload: dict = Body(...),
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    schedule_at_str = payload.get("schedule_at")
    if not schedule_at_str: raise HTTPException(status_code=400, detail="Schedule time is required")

    try: scheduled_time = datetime.fromisoformat(schedule_at_str.replace('Z', '+00:00'))
    except ValueError: raise HTTPException(status_code=400, detail="Invalid date format")


    template_name = payload.get("template_name")
    language = payload.get("language", "pt_BR")
    contacts_list = payload.get("contacts_list", [])
    
    formatted_contacts = []
    for c in contacts_list:
        if isinstance(c, str): formatted_contacts.append({"phone": c})
        else: formatted_contacts.append(c)

    trigger = models.ScheduledTrigger(
        client_id=x_client_id,
        template_name=template_name,
        template_language=language,
        status='queued',
        is_bulk=True,
        contacts_list=formatted_contacts,
        total_contacts=len(formatted_contacts),
        scheduled_time=scheduled_time,
        delay_seconds=payload.get("delay_seconds", 5),
        concurrency_limit=payload.get("concurrency_limit", 1),
        template_components=payload.get("components"),
        direct_message=payload.get("direct_message"),
        direct_message_params=payload.get("direct_message_params"),
        cost_per_unit=payload.get("cost_per_unit", 0.0),
        private_message=payload.get("private_message"),
        private_message_delay=payload.get("private_message_delay", 5),
        private_message_concurrency=payload.get("private_message_concurrency", 1),
        chatwoot_label=payload.get("chatwoot_label")
    )
    db.add(trigger)
    db.commit()
    db.refresh(trigger)
    return trigger

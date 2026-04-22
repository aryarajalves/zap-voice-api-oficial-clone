from fastapi import APIRouter, Depends, HTTPException, Header
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal
from core.deps import get_current_user
from models import User, RecurringTrigger, WebhookLead
from core.recurrent_logic import calculate_next_run
import schemas

router = APIRouter(prefix="/schedules", tags=["schedules"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ScheduleEventSchema(BaseModel):
    id: int
    title: str
    start: datetime
    type: str
    status: str
    contact_count: int
    funnel_name: Optional[str] = None
    template_name: Optional[str] = None
    private_message: Optional[str] = None

class ScheduleUpdateSchema(BaseModel):
    new_start_time: datetime
@router.get("/", response_model=List[ScheduleEventSchema])
def get_schedules(
    start: datetime,
    end: datetime,
    x_client_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Local imports to avoid circular deps
    from models import ScheduledTrigger, Funnel
    import traceback
    
    # Simple debug print
    def log(msg):
        print(f"[SCHEDULES] {msg}")

    log(f"REQ: start={start}, end={end}, client={x_client_id}")

    """
    Retorna os agendamentos do cliente ativo dentro de um intervalo de datas.
    """
    if not x_client_id:
        log("ERROR: Missing Client ID")
        raise HTTPException(status_code=400, detail="X-Client-ID header missing")

    try:
        triggers = db.query(ScheduledTrigger).filter(
            ScheduledTrigger.client_id == int(x_client_id),
            ScheduledTrigger.scheduled_time >= start,
            ScheduledTrigger.scheduled_time <= end,
            ScheduledTrigger.status != 'completed'
        ).all()
        
        log(f"QUERY: Found {len(triggers)} triggers")

        events = []
        for t in triggers:
            # Define Título e Tipo
            if t.is_bulk:
                title = f"📢 Massa: {t.contact_name or 'Sem nome'}"
                event_type = "bulk"
            else:
                funnel = t.funnel
                funnel_name = funnel.name if funnel else "Funil Desconhecido"
                title = f"⚡ Funil: {funnel_name}"
                event_type = "funnel"

            # Contagem de contatos
            count = 0
            if t.is_bulk:
                 # Se for bulk, usa contacts_list se existir, senão 1
                 count = len(t.contacts_list) if t.contacts_list else 1
            else:
                 count = 1

            events.append({
                "id": t.id,
                "title": title,
                "start": t.scheduled_time,
                "type": event_type,
                "status": t.status,
                "contact_count": count,
                "funnel_name": t.funnel.name if t.funnel else None,
                "template_name": t.template_name,
                "private_message": t.private_message
            })
        
        log(f"RESP: Returning {len(events)} events")
        return events
    except Exception as e:
        log(f"EXCEPTION: {str(e)}")
        log(traceback.format_exc())
        raise e

@router.patch("/{trigger_id}")
def update_schedule_time(
    trigger_id: int,
    update_data: ScheduleUpdateSchema,
    x_client_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from models import ScheduledTrigger

    if not x_client_id:
        raise HTTPException(status_code=400, detail="X-Client-ID header missing")

    trigger = db.query(ScheduledTrigger).filter(
        ScheduledTrigger.id == trigger_id,
        ScheduledTrigger.client_id == int(x_client_id)
    ).first()

    if not trigger:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")

    if trigger.status not in ["pending", "queued", "Queued"]:
         raise HTTPException(status_code=400, detail="Apenas agendamentos pendentes ou na fila podem ser movidos.")

    trigger.scheduled_time = update_data.new_start_time
    db.commit()
    db.refresh(trigger)
    
    return {"message": "Agendamento atualizado com sucesso", "new_time": trigger.scheduled_time}

@router.delete("/{trigger_id}")
def delete_schedule(
    trigger_id: int,
    x_client_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from models import ScheduledTrigger

    if not x_client_id:
         raise HTTPException(status_code=400, detail="X-Client-ID header missing")

    trigger = db.query(ScheduledTrigger).filter(
        ScheduledTrigger.id == trigger_id,
        ScheduledTrigger.client_id == int(x_client_id)
    ).first()

    if not trigger:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    
    if trigger.status == "processing":
        raise HTTPException(status_code=400, detail="Não é possível cancelar um disparo em andamento.")

    db.delete(trigger)
    db.commit()

    return {"message": "Agendamento cancelado com sucesso"}

@router.post("/{trigger_id}/dispatch")
def dispatch_now(
    trigger_id: int,
    x_client_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Disparar agendamento imediatamente, setando scheduled_time para agora."""
    from models import ScheduledTrigger

    if not x_client_id:
        raise HTTPException(status_code=400, detail="X-Client-ID header missing")

    trigger = db.query(ScheduledTrigger).filter(
        ScheduledTrigger.id == trigger_id,
        ScheduledTrigger.client_id == int(x_client_id)
    ).first()

    if not trigger:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    
    if trigger.status not in ["pending", "queued", "Queued"]:
        raise HTTPException(status_code=400, detail="Apenas agendamentos pendentes podem ser disparados.")

    trigger.scheduled_time = datetime.utcnow()
    db.commit()

    return {"message": "Disparo iniciado! O worker processará em instantes."}

# --- RECURRING DISPATCH ENDPOINTS ---

@router.post("/recurring", response_model=schemas.RecurringTrigger)
def create_recurring_schedule(
    rt_data: schemas.RecurringTriggerCreate,
    x_client_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not x_client_id:
        raise HTTPException(status_code=400, detail="X-Client-ID header missing")
    
    client_id = int(x_client_id)
    
    # Check if time is valid HH:mm
    if rt_data.scheduled_time:
        try:
            h, m = map(int, rt_data.scheduled_time.split(':'))
            if h < 0 or h > 23 or m < 0 or m > 59:
                 raise Exception()
        except:
            raise HTTPException(status_code=400, detail="Horário inválido. Use formato HH:mm.")

    # Create new RT
    db_rt = RecurringTrigger(
        client_id=client_id,
        **rt_data.model_dump()
    )
    
    # Calculate initial next_run_at
    db_rt.next_run_at = calculate_next_run(
        base_date=datetime.now(timezone.utc),
        frequency=db_rt.frequency,
        days_of_week=db_rt.days_of_week,
        day_of_month=db_rt.day_of_month,
        scheduled_time_str=db_rt.scheduled_time or "09:00"
    )
    
    db.add(db_rt)
    db.commit()
    db.refresh(db_rt)
    return db_rt

@router.get("/recurring", response_model=schemas.RecurringEventListResponse)
def get_recurring_schedules(
    x_client_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not x_client_id:
        raise HTTPException(status_code=400, detail="X-Client-ID header missing")
    
    client_id = int(x_client_id)
    records = db.query(RecurringTrigger).filter(RecurringTrigger.client_id == client_id).all()
    return {"items": records, "total": len(records)}

@router.delete("/recurring/{rt_id}")
def delete_recurring_schedule(
    rt_id: int,
    x_client_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not x_client_id:
        raise HTTPException(status_code=400, detail="X-Client-ID header missing")
    
    record = db.query(RecurringTrigger).filter(
        RecurringTrigger.id == rt_id,
        RecurringTrigger.client_id == int(x_client_id)
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Recorrência não encontrada")
    
    db.delete(record)
    db.commit()
    return {"message": "Desparo recorrente removido com sucesso"}

@router.patch("/recurring/{rt_id}", response_model=schemas.RecurringTrigger)
def update_recurring_schedule(
    rt_id: int,
    rt_data: schemas.RecurringTriggerUpdate,
    x_client_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not x_client_id:
        raise HTTPException(status_code=400, detail="X-Client-ID header missing")
    
    client_id = int(x_client_id)
    record = db.query(RecurringTrigger).filter(
        RecurringTrigger.id == rt_id,
        RecurringTrigger.client_id == client_id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Recorrência não encontrada")
    
    # Update fields
    update_data = rt_data.model_dump(exclude_unset=True)
    
    schedule_changed = False
    for key, value in update_data.items():
        if key in ['frequency', 'days_of_week', 'day_of_month', 'scheduled_time']:
            if getattr(record, key) != value:
                schedule_changed = True
        setattr(record, key, value)
    
    # Recalculate next_run_at if schedule relevant fields changed
    if schedule_changed:
        record.next_run_at = calculate_next_run(
            base_date=datetime.now(timezone.utc),
            frequency=record.frequency,
            days_of_week=record.days_of_week,
            day_of_month=record.day_of_month,
            scheduled_time_str=record.scheduled_time or "09:00"
        )
    
    db.commit()
    db.refresh(record)
    return record

@router.post("/recurring/{rt_id}/trigger", summary="Disparar uma recorrência manualmente agora")
def trigger_recurring_manual(
    rt_id: int,
    x_client_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from models import ScheduledTrigger, WebhookLead
    
    if not x_client_id:
        raise HTTPException(status_code=400, detail="X-Client-ID header missing")
    
    client_id = int(x_client_id)
    rt = db.query(RecurringTrigger).filter(
        RecurringTrigger.id == rt_id,
        RecurringTrigger.client_id == client_id
    ).first()
    
    if not rt:
        raise HTTPException(status_code=404, detail="Recorrência não encontrada")
    
    # Resolve Contacts
    final_contacts = rt.contacts_list or []
    if rt.tag:
        leads = db.query(WebhookLead).filter(
            WebhookLead.client_id == client_id,
            WebhookLead.tags.ilike(f"%{rt.tag}%")
        ).all()
        
        tag_contacts = [{"phone": l.phone, "name": l.name} for l in leads]
        if rt.contacts_list:
            phones_in_list = {c.get('phone') for c in final_contacts}
            for tc in tag_contacts:
                if tc['phone'] not in phones_in_list:
                    final_contacts.append(tc)
        else:
            final_contacts = tag_contacts

    if not final_contacts:
        raise HTTPException(status_code=400, detail="Nenhum contato encontrado para esta recorrência (filtro de etiqueta retornou vazio).")

    # Create ScheduledTrigger
    new_st = ScheduledTrigger(
        client_id=client_id,
        funnel_id=rt.funnel_id,
        template_name=rt.template_name,
        template_language=rt.template_language,
        template_components=rt.template_components,
        contacts_list=final_contacts,
        delay_seconds=rt.delay_seconds,
        concurrency_limit=rt.concurrency_limit,
        private_message=rt.private_message,
        private_message_delay=rt.private_message_delay,
        private_message_concurrency=rt.private_message_concurrency,
        status='queued',
        is_bulk=True,
        scheduled_time=datetime.now(timezone.utc)
    )
    db.add(new_st)
    db.commit()
    db.refresh(new_st)

    return {"message": "Disparo manual agendado com sucesso!", "trigger_id": new_st.id}

@router.get("/recurring/{rt_id}/contacts")
def get_recurring_contacts(
    rt_id: int,
    x_client_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not x_client_id:
        raise HTTPException(status_code=400, detail="X-Client-ID header missing")
    
    client_id = int(x_client_id)
    record = db.query(RecurringTrigger).filter(
        RecurringTrigger.id == rt_id,
        RecurringTrigger.client_id == client_id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Recorrência não encontrada")
    
    # If using static contacts_list
    if record.contacts_list:
        return {"contacts": record.contacts_list, "mode": "static", "count": len(record.contacts_list)}
    
    # If using tag
    if record.tag:
        leads = db.query(WebhookLead).filter(
            WebhookLead.client_id == client_id,
            WebhookLead.tags.ilike(f"%{record.tag}%")
        ).all()
        
        contacts = []
        for lead in leads:
            contacts.append({
                "phone": lead.phone,
                "name": lead.name or "Sem Nome",
                "email": lead.email
            })
            
        return {"contacts": contacts, "mode": "tag", "tag": record.tag, "count": len(contacts)}
    
    return {"contacts": [], "mode": "none", "count": 0}

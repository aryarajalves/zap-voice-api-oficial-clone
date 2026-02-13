from fastapi import APIRouter, Depends, HTTPException, Header
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal
from core.deps import get_current_user
from models import User

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

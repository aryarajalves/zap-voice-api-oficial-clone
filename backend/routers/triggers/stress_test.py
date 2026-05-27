from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional
import models
from core.deps import get_current_user, get_db, get_validated_client_id
from rabbitmq_client import rabbitmq

router = APIRouter()

@router.post("/stress-test", summary="Iniciar um Teste de Estresse e Escala")
async def start_stress_test(
    payload: dict = Body(...),
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Cria e inicia imediatamente um disparo simulado em massa para testar a escalabilidade do sistema.
    """
    funnel_id = payload.get("funnel_id")
    template_name = payload.get("template_name")
    number_of_contacts = payload.get("number_of_contacts", 100)
    delay_seconds = payload.get("delay_seconds", 0) # Sem delay por padrão para testar estresse máximo
    concurrency_limit = payload.get("concurrency_limit", 5)
    pricing_category = payload.get("pricing_category", "marketing")

    cost_per_unit = 0.35 if pricing_category == "marketing" else 0.07

    if not funnel_id and not template_name:
        raise HTTPException(status_code=400, detail="Forneça um funnel_id ou template_name para testar")

    if number_of_contacts <= 0 or number_of_contacts > 20000:
        raise HTTPException(status_code=400, detail="O número de contatos deve ser entre 1 e 20.000")

    # Gerar contatos fictícios
    contacts_data = []
    for i in range(1, number_of_contacts + 1):
        phone = f"+551199999{i:04d}"
        contacts_data.append({
            "id": 100000 + i,
            "phone": phone,
            "name": f"Simulado Contato {i}",
            "inbox_id": 1,
            "meta": {
                "sender": {
                    "name": f"Simulado Contato {i}",
                    "phone_number": phone
                }
            }
        })

    # Criar trigger no banco
    trigger = models.ScheduledTrigger(
        client_id=x_client_id,
        funnel_id=funnel_id,
        template_name=template_name,
        template_language="pt_BR",
        status='processing', # Começa imediatamente em processing
        is_bulk=True,
        contacts_list=contacts_data,
        total_contacts=number_of_contacts,
        scheduled_time=datetime.now(timezone.utc),
        delay_seconds=delay_seconds,
        concurrency_limit=concurrency_limit,
        product_name="SCALE_TEST",
        cost_per_unit=cost_per_unit
    )

    db.add(trigger)
    db.commit()
    db.refresh(trigger)

    # Publicar diretamente na fila para início imediato
    rabbit_payload = {
        "trigger_id": trigger.id,
        "funnel_id": trigger.funnel_id,
        "template_name": trigger.template_name,
        "contacts": contacts_data,
        "delay": delay_seconds,
        "concurrency": concurrency_limit,
        "language": "pt_BR",
        "type": "funnel_bulk" if trigger.funnel_id else "template_bulk"
    }

    # Notificar Frontend via WS (RabbitMQ Events)
    await rabbitmq.publish_event("trigger_updated", {
        "trigger_id": trigger.id,
        "client_id": trigger.client_id,
        "status": "processing"
    })

    # Publicar na fila de bulk
    await rabbitmq.publish("zapvoice_bulk_sends", rabbit_payload)

    return {
        "status": "success",
        "message": f"Teste de estresse com {number_of_contacts} contatos enfileirado com sucesso",
        "trigger_id": trigger.id
    }


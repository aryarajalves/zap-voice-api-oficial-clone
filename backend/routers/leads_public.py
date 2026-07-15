import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from core.deps import get_db
from core.logger import setup_logger
from core.security import limiter
import models
import schemas
from routers.contacts_public import get_client_by_api_key

logger = setup_logger("leads_public")

router = APIRouter(prefix="/leads/public", tags=["Leads Public API"])

@router.post(
    "/{phone}/update",
    response_model=schemas.WebhookLead,
    summary="Criar ou atualizar lead via API pública",
    description=(
        "Cria ou atualiza as informações de um lead (contato) utilizando a API Key do painel. "
        "Permite atualizar todos os campos do contato, incluindo link do Google Agenda e data/hora do evento.\n\n"
        "**Campos suportados:** `name`, `email`, `google_calendar_link`, `event_datetime`, "
        "`tags`, `product_name`, `payment_method`, `price`, `platform`, `variables`."
    )
)
@limiter.limit("100/minute")
def upsert_lead_public(
    phone: str,
    payload: schemas.WebhookLeadPublicUpsert,
    request: Request,  # obrigatório pelo slowapi
    client_id: int = Depends(get_client_by_api_key),
    db: Session = Depends(get_db)
):
    """
    Endpoint público para UPSERT de leads.
    """
    # 1. Sanitizar o telefone
    clean_phone = "".join(filter(str.isdigit, str(phone)))
    if not clean_phone or len(clean_phone) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Número de telefone inválido. Informe apenas dígitos (mínimo 8)."
        )

    # 2. Identificar se o cliente possui projeto (escopo compartilhado)
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado."
        )
    proj_id = client.project_id

    # 3. Buscar lead existente pelo telefone (últimos 8 dígitos para evitar problemas de DDI/DDD)
    last_8 = clean_phone[-8:]
    if proj_id:
        lead = db.query(models.WebhookLead).filter(
            models.WebhookLead.project_id == proj_id,
            models.WebhookLead.phone.like(f"%{last_8}")
        ).first()
    else:
        lead = db.query(models.WebhookLead).filter(
            models.WebhookLead.client_id == client_id,
            models.WebhookLead.phone.like(f"%{last_8}")
        ).first()

    now = datetime.utcnow()
    payload_dict = payload.model_dump(exclude_none=True)

    if lead:
        # 4. Atualizar lead existente
        logger.info(f"💾 Atualizando lead ID={lead.id} via API Pública para cliente={client_id}")
        
        # Atualização dos campos básicos se fornecidos
        if "name" in payload_dict:
            lead.name = payload_dict["name"]
        if "email" in payload_dict:
            lead.email = payload_dict["email"]
        if "google_calendar_link" in payload_dict:
            lead.google_calendar_link = payload_dict["google_calendar_link"]
        if "event_datetime" in payload_dict:
            new_dt = payload_dict["event_datetime"]
            if new_dt != lead.event_datetime:
                lead.google_calendar_reminder_sent = False
            lead.event_datetime = new_dt
        if "google_calendar_reminder_sent" in payload_dict:
            lead.google_calendar_reminder_sent = payload_dict["google_calendar_reminder_sent"]
        if "tags" in payload_dict:
            lead.tags = payload_dict["tags"]
        if "product_name" in payload_dict:
            lead.product_name = payload_dict["product_name"]
        if "payment_method" in payload_dict:
            lead.payment_method = payload_dict["payment_method"]
        if "price" in payload_dict:
            lead.price = str(payload_dict["price"])
        if "platform" in payload_dict:
            lead.platform = payload_dict["platform"]
        
        # Mesclar variáveis customizadas
        if "variables" in payload_dict:
            existing_vars = lead.variables or {}
            lead.variables = {**existing_vars, **payload_dict["variables"]}

        lead.last_event_type = "public_api_update"
        lead.last_event_at = now
        lead.updated_at = now
        lead.total_events = (lead.total_events or 1) + 1
    else:
        # 5. Criar novo lead
        logger.info(f"➕ Criando novo lead para o telefone={clean_phone} via API Pública para cliente={client_id}")
        
        lead = models.WebhookLead(
            client_id=client_id,
            project_id=proj_id,
            phone=clean_phone,
            name=payload_dict.get("name"),
            email=payload_dict.get("email"),
            google_calendar_link=payload_dict.get("google_calendar_link"),
            event_datetime=payload_dict.get("event_datetime"),
            tags=payload_dict.get("tags"),
            product_name=payload_dict.get("product_name"),
            payment_method=payload_dict.get("payment_method"),
            price=str(payload_dict.get("price")) if "price" in payload_dict else None,
            platform=payload_dict.get("platform", "public_api"),
            variables=payload_dict.get("variables", {}),
            last_event_type="public_api_creation",
            last_event_at=now,
            created_at=now,
            updated_at=now,
            total_events=1
        )
        db.add(lead)

    db.commit()
    db.refresh(lead)

    # Enriquecimento simples para compatibilidade com o schema de resposta
    lead.is_really_blocked = False
    lead.resting_expires_at = None
    lead.imported_by_name = client.name

    return lead

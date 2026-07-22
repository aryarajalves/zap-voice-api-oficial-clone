from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone
import models
from database import SessionLocal
from core.deps import get_current_user, get_validated_client_id as get_client_id
from core.logger import logger

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter(tags=["Capture Page"])

# Schemas
class CapturePageConfigPayload(BaseModel):
    slug: str
    headline: Optional[str] = "INTENSIVO"
    badge_text: Optional[str] = "Aulas do Miguel"
    badge_status: Optional[str] = "AO VIVO"
    event_date: Optional[str] = "Hoje, 21 de Dezembro, às 20h"
    main_title: Optional[str] = "VOCÊ ESTÁ QUASE LÁ!"
    main_description: Optional[str] = "Cadastre seu melhor email para receber o link de acesso e garantir sua vaga no intensivo."
    email_placeholder: Optional[str] = "Seu melhor email"
    button_text: Optional[str] = "QUERO PARTICIPAR DO INTENSIVO!"
    footer_note: Optional[str] = "Seus dados estão seguros. Não enviamos spam."
    thank_you_title: Optional[str] = "Inscrição Confirmada!"
    thank_you_description: Optional[str] = "Entre no grupo VIP do WhatsApp para receber o link de acesso e os materiais exclusivos."
    whatsapp_group_url: Optional[str] = "https://chat.whatsapp.com/"
    whatsapp_button_text: Optional[str] = "ENTRAR NO GRUPO DO WHATSAPP"
    tag_name: Optional[str] = "Página de Captura"


class PublicSubmitPayload(BaseModel):
    email: str


class BulkDeleteLeadsPayload(BaseModel):
    ids: List[int]


# Helper para buscar ou criar configuração padrão
def get_or_create_config(client_id: int, db: Session) -> models.CapturePageConfig:
    config = db.query(models.CapturePageConfig).filter(models.CapturePageConfig.client_id == client_id).first()
    if not config:
        config = models.CapturePageConfig(
            client_id=client_id,
            slug=f"masterclass-{client_id}",
            headline="INTENSIVO",
            badge_text="Aulas do Miguel",
            badge_status="AO VIVO",
            event_date="Hoje, 21 de Dezembro, às 20h",
            main_title="VOCÊ ESTÁ QUASE LÁ!",
            main_description="Cadastre seu melhor email para receber o link de acesso e garantir sua vaga no intensivo.",
            email_placeholder="Seu melhor email",
            button_text="QUERO PARTICIPAR DO INTENSIVO!",
            footer_note="Seus dados estão seguros. Não enviamos spam.",
            thank_you_title="Inscrição Confirmada!",
            thank_you_description="Entre no grupo VIP do WhatsApp para receber o link de acesso e os materiais exclusivos.",
            whatsapp_group_url="https://chat.whatsapp.com/",
            whatsapp_button_text="ENTRAR NO GRUPO DO WHATSAPP",
            tag_name="Página de Captura"
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


# ----------------------------------------------------
# ENDPOINTS ADMINISTRATIVOS (PAINEL DASHBOARD)
# ----------------------------------------------------

@router.get("/chat/capture-page/config")
async def get_capture_page_config(
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID é obrigatório.")
    config = get_or_create_config(client_id, db)
    return config


@router.post("/chat/capture-page/config")
async def save_capture_page_config(
    payload: CapturePageConfigPayload,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID é obrigatório.")

    clean_slug = payload.slug.strip().lower().replace(" ", "-")
    if not clean_slug:
        raise HTTPException(status_code=400, detail="O slug da página não pode ser vazio.")

    # Validar se o slug já é usado por outro cliente
    existing_slug = db.query(models.CapturePageConfig).filter(
        models.CapturePageConfig.slug == clean_slug,
        models.CapturePageConfig.client_id != client_id
    ).first()
    if existing_slug:
        raise HTTPException(status_code=400, detail=f"O slug '{clean_slug}' já está em uso por outro projeto. Escolha um slug único.")

    config = get_or_create_config(client_id, db)
    config.slug = clean_slug
    config.headline = payload.headline or "INTENSIVO"
    config.badge_text = payload.badge_text or "Aulas do Miguel"
    config.badge_status = payload.badge_status or "AO VIVO"
    config.event_date = payload.event_date or "Hoje, 21 de Dezembro, às 20h"
    config.main_title = payload.main_title or "VOCÊ ESTÁ QUASE LÁ!"
    config.main_description = payload.main_description or ""
    config.email_placeholder = payload.email_placeholder or "Seu melhor email"
    config.button_text = payload.button_text or "QUERO PARTICIPAR DO INTENSIVO!"
    config.footer_note = payload.footer_note or "Seus dados estão seguros."
    config.thank_you_title = payload.thank_you_title or "Inscrição Confirmada!"
    config.thank_you_description = payload.thank_you_description or ""
    config.whatsapp_group_url = payload.whatsapp_group_url or "https://chat.whatsapp.com/"
    config.whatsapp_button_text = payload.whatsapp_button_text or "ENTRAR NO GRUPO DO WHATSAPP"
    config.tag_name = payload.tag_name or "Página de Captura"
    config.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(config)
    logger.info(f"Configuração da Página de Captura atualizada para Client ID {client_id} (slug: {clean_slug})")
    return config


@router.get("/chat/capture-page/leads")
async def list_captured_leads(
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1),
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID é obrigatório.")

    page_num = page if isinstance(page, int) else 1
    limit_num = limit if isinstance(limit, int) else 20

    query = db.query(models.CapturePageLead).filter(models.CapturePageLead.client_id == client_id)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(models.CapturePageLead.email.ilike(search_term))

    total_count = query.count()
    leads = query.order_by(models.CapturePageLead.created_at.desc()).offset((page_num - 1) * limit_num).limit(limit_num).all()

    return {
        "leads": [
            {
                "id": l.id,
                "email": l.email,
                "created_at": l.created_at.isoformat() if l.created_at else None
            }
            for l in leads
        ],
        "total_count": total_count,
        "page": page_num,
        "limit": limit_num
    }


@router.delete("/chat/capture-page/leads/{lead_id}")
async def delete_captured_lead(
    lead_id: int,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lead = db.query(models.CapturePageLead).filter(
        models.CapturePageLead.id == lead_id,
        models.CapturePageLead.client_id == client_id
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")

    db.delete(lead)
    db.commit()
    return {"message": "Lead removido com sucesso."}


@router.delete("/chat/capture-page/leads")
async def bulk_delete_captured_leads(
    payload: BulkDeleteLeadsPayload,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not payload.ids:
        raise HTTPException(status_code=400, detail="Nenhum ID fornecido.")

    db.query(models.CapturePageLead).filter(
        models.CapturePageLead.id.in_(payload.ids),
        models.CapturePageLead.client_id == client_id
    ).delete(synchronize_session=False)

    db.commit()
    return {"message": f"{len(payload.ids)} leads removidos com sucesso."}


# ----------------------------------------------------
# ENDPOINTS PÚBLICOS (ACESSO VISITANTES)
# ----------------------------------------------------

@router.get("/p/{slug}")
async def get_public_capture_page(
    slug: str,
    db: Session = Depends(get_db)
):
    clean_slug = slug.strip().lower()
    config = db.query(models.CapturePageConfig).filter(models.CapturePageConfig.slug == clean_slug).first()
    if not config:
        config = db.query(models.CapturePageConfig).first()
    if not config:
        raise HTTPException(status_code=404, detail="Página de captura não encontrada.")

    return {
        "slug": config.slug,
        "headline": config.headline,
        "badge_text": config.badge_text,
        "badge_status": config.badge_status,
        "event_date": config.event_date,
        "main_title": config.main_title,
        "main_description": config.main_description,
        "email_placeholder": config.email_placeholder,
        "button_text": config.button_text,
        "footer_note": config.footer_note,
        "thank_you_title": config.thank_you_title,
        "thank_you_description": config.thank_you_description,
        "whatsapp_group_url": config.whatsapp_group_url,
        "whatsapp_button_text": config.whatsapp_button_text
    }


@router.post("/p/{slug}/submit")
async def submit_public_lead(
    slug: str,
    payload: PublicSubmitPayload,
    db: Session = Depends(get_db)
):
    clean_slug = slug.strip().lower()
    config = db.query(models.CapturePageConfig).filter(models.CapturePageConfig.slug == clean_slug).first()
    if not config:
        config = db.query(models.CapturePageConfig).first()
    if not config:
        raise HTTPException(status_code=404, detail="Página de captura não encontrada.")

    email_clean = payload.email.strip().lower()

    # Salvar lead de captura se ainda não existir para esta configuração
    existing_lead = db.query(models.CapturePageLead).filter(
        models.CapturePageLead.config_id == config.id,
        models.CapturePageLead.email == email_clean
    ).first()

    if not existing_lead:
        new_lead = models.CapturePageLead(
            client_id=config.client_id,
            config_id=config.id,
            email=email_clean,
            created_at=datetime.now(timezone.utc)
        )
        db.add(new_lead)
        db.commit()

    logger.info(f"⚡ Lead capturado na página pública '{clean_slug}': {email_clean}")

    return {
        "success": True,
        "redirect_url": config.whatsapp_group_url,
        "thank_you_title": config.thank_you_title,
        "thank_you_description": config.thank_you_description,
        "whatsapp_button_text": config.whatsapp_button_text
    }

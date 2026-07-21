from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import urllib.parse
from database import SessionLocal
import models, schemas
from core.deps import get_current_user, get_validated_client_id
from core.logger import logger

router = APIRouter(prefix="/api/checkout-presell", tags=["Checkout Presell"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- ADMIN ENDPOINTS ---

@router.get("/config", response_model=schemas.CheckoutConfigResponse)
def get_checkout_config(
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    config = db.query(models.CheckoutConfig).filter(
        models.CheckoutConfig.client_id == x_client_id
    ).first()

    if not config:
        # Criar configuração padrão se ainda não existir
        default_slug = f"mentoria-{x_client_id}"
        # Garantir unicidade do slug padrão
        existing_slug = db.query(models.CheckoutConfig).filter(models.CheckoutConfig.slug == default_slug).first()
        if existing_slug:
            default_slug = f"mentoria-{x_client_id}-{int(models.func.extract('epoch', models.func.now()))}"

        config = models.CheckoutConfig(
            client_id=x_client_id,
            slug=default_slug,
            title="Aplicação Mentoria",
            description="Preencha seus dados para continuar com sua aplicação",
            badge_text="⚡ Vagas Limitadas",
            destination_url="https://whatsapp.com",
            tag_name="Checkout Presell",
            page_tab_title="Aplicação Mentoria",
            button_text="Continuar com Aplicação →"
        )
        db.add(config)
        db.commit()
        db.refresh(config)

    return config


@router.post("/config", response_model=schemas.CheckoutConfigResponse)
def update_checkout_config(
    payload: schemas.CheckoutConfigCreate,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Formatar slug (apenas letras, números e hífens)
    clean_slug = payload.slug.strip().lower().replace(" ", "-")

    # Verificar se o slug já está em uso por outro cliente
    existing = db.query(models.CheckoutConfig).filter(
        models.CheckoutConfig.slug == clean_slug,
        models.CheckoutConfig.client_id != x_client_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Este slug já está sendo utilizado por outro checkout.")

    config = db.query(models.CheckoutConfig).filter(
        models.CheckoutConfig.client_id == x_client_id
    ).first()

    if config:
        config.slug = clean_slug
        config.title = payload.title
        config.description = payload.description
        config.badge_text = payload.badge_text
        config.destination_url = payload.destination_url
        config.tag_name = payload.tag_name
        config.page_tab_title = payload.page_tab_title
        config.button_text = payload.button_text
    else:
        config = models.CheckoutConfig(
            client_id=x_client_id,
            slug=clean_slug,
            title=payload.title,
            description=payload.description,
            badge_text=payload.badge_text,
            destination_url=payload.destination_url,
            tag_name=payload.tag_name,
            page_tab_title=payload.page_tab_title,
            button_text=payload.button_text
        )
        db.add(config)

    db.commit()
    db.refresh(config)
    logger.info(f"Configuração do Checkout Presell atualizada para o cliente {x_client_id} (slug: {clean_slug})")
    return config


@router.get("/leads", response_model=schemas.CheckoutLeadListResponse)
def list_checkout_leads(
    search: Optional[str] = Query(None, description="Busca por nome, email ou telefone"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.CheckoutLead).filter(models.CheckoutLead.client_id == x_client_id)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (models.CheckoutLead.name.ilike(search_filter)) |
            (models.CheckoutLead.email.ilike(search_filter)) |
            (models.CheckoutLead.phone.ilike(search_filter))
        )

    total = query.count()
    items = query.order_by(models.CheckoutLead.created_at.desc()).offset(skip).limit(limit).all()

    # Buscar todas as conversas ativas do cliente para comparar pelos últimos 8 dígitos
    all_chats = db.query(models.ChatConversation.id, models.ChatConversation.phone).filter(
        models.ChatConversation.client_id == x_client_id
    ).all()

    chat_by_last8 = {}
    for chat_id, chat_phone in all_chats:
        clean_c_phone = "".join(filter(str.isdigit, str(chat_phone or "")))
        if len(clean_c_phone) >= 8:
            chat_by_last8[clean_c_phone[-8:]] = chat_id

    result_items = []
    for item in items:
        clean_item_phone = "".join(filter(str.isdigit, str(item.phone or "")))
        item_last8 = clean_item_phone[-8:] if len(clean_item_phone) >= 8 else clean_item_phone
        has_chat = bool(item_last8) and (item_last8 in chat_by_last8)

        result_items.append({
            "id": item.id,
            "client_id": item.client_id,
            "config_id": item.config_id,
            "name": item.name,
            "email": item.email,
            "phone": item.phone,
            "tag_name": item.tag_name,
            "has_chat": has_chat,
            "conversation_id": chat_by_last8.get(item_last8),
            "created_at": item.created_at
        })

    return {"items": result_items, "total": total}


@router.delete("/leads/{lead_id}")
def delete_checkout_lead(
    lead_id: int,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    lead = db.query(models.CheckoutLead).filter(
        models.CheckoutLead.id == lead_id,
        models.CheckoutLead.client_id == x_client_id
    ).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")

    db.delete(lead)
    db.commit()
    return {"message": "Lead removido com sucesso."}


# --- PUBLIC ENDPOINTS (SEM AUTENTICAÇÃO) ---

@router.get("/public/{slug}", response_model=schemas.CheckoutConfigResponse)
def get_public_checkout_config(
    slug: str,
    db: Session = Depends(get_db)
):
    clean_slug = slug.strip().lower()
    config = db.query(models.CheckoutConfig).filter(
        models.CheckoutConfig.slug == clean_slug
    ).first()

    if not config:
        raise HTTPException(status_code=404, detail="Página de checkout não encontrada.")

    return config


@router.post("/public/{slug}/submit")
def submit_public_checkout_lead(
    slug: str,
    payload: schemas.CheckoutLeadCreate,
    db: Session = Depends(get_db)
):
    clean_slug = slug.strip().lower()
    config = db.query(models.CheckoutConfig).filter(
        models.CheckoutConfig.slug == clean_slug
    ).first()

    if not config:
        raise HTTPException(status_code=404, detail="Página de checkout não encontrada.")

    clean_phone = payload.phone.strip().replace("+", "").replace("-", "").replace(" ", "").replace("(", "").replace(")", "")
    clean_email = payload.email.strip().lower()
    clean_name = payload.name.strip()

    # Salvar Lead do Checkout
    checkout_lead = models.CheckoutLead(
        client_id=config.client_id,
        config_id=config.id,
        name=clean_name,
        email=clean_email,
        phone=clean_phone,
        tag_name=config.tag_name
    )
    db.add(checkout_lead)

    # Também salvar/atualizar em WebhookLead para integração com o ecossistema do ZapVoice
    existing_webhook_lead = db.query(models.WebhookLead).filter(
        models.WebhookLead.client_id == config.client_id,
        models.WebhookLead.phone == clean_phone
    ).first()

    if existing_webhook_lead:
        existing_webhook_lead.name = clean_name
        existing_webhook_lead.email = clean_email
        if config.tag_name and config.tag_name not in (existing_webhook_lead.tags or ""):
            existing_webhook_lead.tags = f"{existing_webhook_lead.tags}, {config.tag_name}" if existing_webhook_lead.tags else config.tag_name
    else:
        new_webhook_lead = models.WebhookLead(
            client_id=config.client_id,
            name=clean_name,
            email=clean_email,
            phone=clean_phone,
            tags=config.tag_name,
            platform="checkout_presell"
        )
        db.add(new_webhook_lead)

    db.commit()
    logger.info(f"✨ Novo lead capturado no checkout '{clean_slug}': {clean_name} ({clean_phone})")

    # Montar URL de Destino com Parâmetros pré-populados
    dest_url = config.destination_url.strip()
    parsed_url = urllib.parse.urlparse(dest_url)
    query_params = urllib.parse.parse_qs(parsed_url.query)

    # Injetar os dados do lead caso a URL de destino ainda não possua
    query_params['name'] = [clean_name]
    query_params['email'] = [clean_email]
    query_params['phone'] = [clean_phone]

    new_query_string = urllib.parse.urlencode(query_params, doseq=True)
    redirect_url = urllib.parse.urlunparse((
        parsed_url.scheme,
        parsed_url.netloc,
        parsed_url.path,
        parsed_url.params,
        new_query_string,
        parsed_url.fragment
    ))

    return {
        "success": True,
        "redirect_url": redirect_url,
        "lead": {
            "name": clean_name,
            "email": clean_email,
            "phone": clean_phone
        }
    }

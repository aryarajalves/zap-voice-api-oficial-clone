from fastapi import APIRouter, Depends, HTTPException, Body, Query, Request
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import models, schemas
from core.deps import get_current_user, get_db, get_validated_client_id
from core.encryption import encrypt_token, decrypt_token
from services.email_service import send_single_email
from core.logger import setup_logger
from rabbitmq_client import rabbitmq

logger = setup_logger("email_marketing_router")

router = APIRouter()

# Schemas
class EmailConfigSchema(BaseModel):
    provider: str = Field(default="ses", description="ses, resend, smtp")
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_region: Optional[str] = "us-east-1"
    resend_api_key: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_encryption: Optional[str] = "tls"
    from_email: str
    from_name: Optional[str] = "ZapVoice"

class TestEmailPayload(BaseModel):
    to_email: str

class EmailTemplateSchema(BaseModel):
    name: str
    subject: str
    body_html: str

class EmailBulkSendPayload(BaseModel):
    template_id: int
    title: str
    tag_name: Optional[str] = None
    scheduled_at: Optional[str] = None  # ISO 8601 datetime string; se fornecido, agenda o disparo


@router.get("/config", summary="Obter Configuração de E-mail do Cliente")
def get_email_config(
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    config = db.query(models.EmailConfig).filter_by(client_id=client_id).first()
    if not config:
        return {"configured": False, "config": None}
    
    return {
        "configured": True,
        "config": {
            "id": config.id,
            "provider": config.provider,
            "aws_access_key_id": config.aws_access_key_id,
            "aws_secret_access_key": decrypt_token(config.aws_secret_access_key) or "",
            "aws_region": config.aws_region,
            "resend_api_key": decrypt_token(config.resend_api_key) or "",
            "smtp_host": config.smtp_host,
            "smtp_port": config.smtp_port,
            "smtp_user": config.smtp_user,
            "smtp_password": decrypt_token(config.smtp_password) or "",
            "smtp_encryption": config.smtp_encryption,
            "from_email": config.from_email,
            "from_name": config.from_name,
            "has_aws_secret": bool(config.aws_secret_access_key),
            "has_smtp_password": bool(config.smtp_password),
        }
    }


@router.post("/config", summary="Salvar Configuração de E-mail")
def save_email_config(
    payload: EmailConfigSchema,
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    config = db.query(models.EmailConfig).filter_by(client_id=client_id).first()
    
    if not config:
        config = models.EmailConfig(client_id=client_id, from_email=payload.from_email)
        db.add(config)

    config.provider = payload.provider.lower()
    config.from_email = payload.from_email
    config.from_name = payload.from_name
    
    if payload.aws_access_key_id is not None: config.aws_access_key_id = payload.aws_access_key_id
    if payload.aws_secret_access_key is not None and payload.aws_secret_access_key != "":
        config.aws_secret_access_key = encrypt_token(payload.aws_secret_access_key)
    if payload.aws_region is not None: config.aws_region = payload.aws_region
    
    if payload.resend_api_key is not None and payload.resend_api_key != "":
        config.resend_api_key = encrypt_token(payload.resend_api_key)
    
    if payload.smtp_host is not None: config.smtp_host = payload.smtp_host
    if payload.smtp_port is not None: config.smtp_port = payload.smtp_port
    if payload.smtp_user is not None: config.smtp_user = payload.smtp_user
    if payload.smtp_password is not None and payload.smtp_password != "":
        config.smtp_password = encrypt_token(payload.smtp_password)
    if payload.smtp_encryption is not None: config.smtp_encryption = payload.smtp_encryption

    db.commit()
    db.refresh(config)
    return {"status": "success", "message": "Configuração de e-mail salva com sucesso!"}



@router.post("/test", summary="Enviar E-mail de Teste")
async def send_test_email(
    payload: TestEmailPayload,
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    config = db.query(models.EmailConfig).filter_by(client_id=client_id).first()
    if not config:
        raise HTTPException(status_code=400, detail="Configure o provedor de e-mail antes de enviar um teste.")

    subject = "⚡ Teste de Envio do ZapVoice E-mail Marketing"
    body_html = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #4F46E5;">ZapVoice E-mail Marketing ⚡</h2>
        <p>Olá! Este é um e-mail de teste enviado com sucesso através do ZapVoice.</p>
        <p><b>Provedor Ativo:</b> {config.provider.upper()}</p>
        <p><b>Remetente:</b> {config.from_name} ({config.from_email})</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #777;">Sua configuração de e-mail está 100% pronta para realizar disparos em massa!</p>
    </div>
    """

    res = await send_single_email(config, payload.to_email, subject, body_html, recipient_name="Usuário de Teste")
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=f"Falha ao enviar e-mail de teste: {res.get('error')}")

    return {"status": "success", "message": f"E-mail de teste enviado com sucesso para {payload.to_email}!"}


# --- TEMPLATES DE E-MAIL ---

@router.get("/templates", summary="Listar Templates de E-mail")
def list_email_templates(
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    templates = db.query(models.EmailTemplate).filter_by(client_id=client_id, is_active=True).order_by(models.EmailTemplate.updated_at.desc()).all()
    return templates


@router.post("/templates", summary="Criar Template de E-mail")
def create_email_template(
    payload: EmailTemplateSchema,
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tmpl = models.EmailTemplate(
        client_id=client_id,
        name=payload.name,
        subject=payload.subject,
        body_html=payload.body_html,
        is_active=True
    )
    db.add(tmpl)
    db.commit()
    db.refresh(tmpl)
    return tmpl


@router.put("/templates/{template_id}", summary="Atualizar Template de E-mail")
def update_email_template(
    template_id: int,
    payload: EmailTemplateSchema,
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tmpl = db.query(models.EmailTemplate).filter_by(id=template_id, client_id=client_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template de e-mail não encontrado.")

    tmpl.name = payload.name
    tmpl.subject = payload.subject
    tmpl.body_html = payload.body_html
    db.commit()
    db.refresh(tmpl)
    return tmpl


@router.delete("/templates/{template_id}", summary="Excluir Template de E-mail")
def delete_email_template(
    template_id: int,
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tmpl = db.query(models.EmailTemplate).filter_by(id=template_id, client_id=client_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template de e-mail não encontrado.")

    tmpl.is_active = False
    db.commit()
    return {"status": "success", "message": "Template excluído com sucesso."}


# --- DISPARO EM MASSA DE E-MAIL ---

@router.post("/send-bulk", summary="Criar Disparo em Massa de E-mail")
async def create_bulk_email_dispatch(
    payload: EmailBulkSendPayload,
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    config = db.query(models.EmailConfig).filter_by(client_id=client_id).first()
    if not config:
        raise HTTPException(status_code=400, detail="Configure o provedor de e-mail antes de realizar disparos.")

    template = db.query(models.EmailTemplate).filter_by(id=payload.template_id, client_id=client_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template de e-mail não encontrado.")


    # 1. Obter contatos filtrados da Aba de Contatos (WebhookLead) pela etiqueta
    from sqlalchemy import func
    query = db.query(models.WebhookLead).filter(models.WebhookLead.client_id == client_id)
    if payload.tag_name and payload.tag_name.strip():
        tag_clean = payload.tag_name.strip()
        query = query.filter(
            func.concat(',', func.replace(func.coalesce(models.WebhookLead.tags, ''), ', ', ','), ',').ilike(f"%,{tag_clean},%")
        )

    leads = query.all()
    target_contacts = []
    seen_emails = set()

    for l in leads:
        if l.email and "@" in l.email and l.email.lower() not in seen_emails:
            seen_emails.add(l.email.lower())
            target_contacts.append({
                "email": l.email,
                "name": l.name or "",
                "phone": l.phone or "",
                "product_name": l.product_name or "",
                "platform": l.platform or "",
                "price": l.price or "",
                "payment_method": l.payment_method or "",
                "tags": l.tags or ""
            })

    if not target_contacts:
        raise HTTPException(status_code=400, detail="Nenhum contato com e-mail válido encontrado para os filtros selecionados.")

    # 2. Criar registro de disparo
    is_scheduled = bool(payload.scheduled_at and str(payload.scheduled_at).strip())
    scheduled_dt = None

    if is_scheduled:
        try:
            # O input datetime-local do frontend envia "YYYY-MM-DDTHH:mm" no horário local (Brasília UTC-3).
            # Para armazenar no banco em UTC correto, interpretamos como UTC-3 e convertemos para UTC.
            raw = str(payload.scheduled_at).strip()
            if len(raw) == 16:  # yyyy-MM-ddTHH:mm  (sem segundos)
                raw += ":00"
            if not raw.endswith("Z") and "+" not in raw and "-" not in raw[10:]:
                raw += "-03:00"  # timezone de Brasília
            scheduled_dt = datetime.fromisoformat(raw).astimezone(timezone.utc)
        except Exception as parse_err:
            raise HTTPException(status_code=400, detail=f"Formato de data/hora inválido: {parse_err}")

    dispatch = models.EmailDispatch(
        client_id=client_id,
        template_id=template.id,
        title=payload.title or f"E-mail: {template.name}",
        subject=template.subject,
        tag_name=payload.tag_name,
        status="scheduled" if is_scheduled else "processing",
        scheduled_time=scheduled_dt,
        total_contacts=len(target_contacts),
        total_sent=0,
        total_failed=0,
        contacts_list=target_contacts
    )
    db.add(dispatch)
    db.commit()
    db.refresh(dispatch)

    # --- Se agendado, retornar sem enviar agora ---
    if is_scheduled:
        logger.info(f"📅 [EMAIL] Disparo {dispatch.id} agendado para {scheduled_dt} ({len(target_contacts)} contatos).")
        return {
            "status": "scheduled",
            "message": f"Disparo agendado com sucesso para {scheduled_dt.strftime('%d/%m/%Y às %H:%M')} UTC! ({len(target_contacts)} destinatários)",
            "dispatch_id": dispatch.id,
            "scheduled_time": scheduled_dt.isoformat()
        }

    # 3. Processar o envio imediato dos e-mails
    sent_count = 0
    fail_count = 0

    for c in target_contacts:
        res = await send_single_email(
            config=config,
            to_email=c["email"],
            subject=template.subject,
            body_html=template.body_html,
            recipient_name=c
        )
        if res.get("success"):
            sent_count += 1
        else:
            fail_count += 1

    dispatch.total_sent = sent_count
    dispatch.total_failed = fail_count
    dispatch.status = "completed" if fail_count == 0 else ("completed_with_errors" if sent_count > 0 else "failed")
    db.commit()

    return {
        "status": "success",
        "message": f"Disparo concluído: {sent_count} e-mails enviados com sucesso, {fail_count} falhas.",
        "dispatch_id": dispatch.id,
        "total_sent": sent_count,
        "total_failed": fail_count
    }


@router.get("/history", summary="Histórico de Disparos de E-mail")
def list_email_history(
    limit: int = Query(500, ge=1, le=1000),
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    history = db.query(models.EmailDispatch).filter_by(client_id=client_id).order_by(models.EmailDispatch.created_at.desc()).limit(limit).all()
    return history


@router.delete("/history/{dispatch_id}", summary="Excluir item do Histórico de Disparos")
def delete_email_dispatch(
    dispatch_id: int,
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    dispatch = db.query(models.EmailDispatch).filter_by(id=dispatch_id, client_id=client_id).first()
    if not dispatch:
        raise HTTPException(status_code=404, detail="Registro de disparo não encontrado.")
    
    db.delete(dispatch)
    db.commit()
    return {"status": "success", "message": "Registro de disparo excluído com sucesso."}


@router.get("/preview-recipients", summary="Pré-visualizar Destinatários de E-mail por Etiqueta")
def preview_email_recipients(
    tag_name: Optional[str] = Query(None),
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from sqlalchemy import func
    query = db.query(models.WebhookLead).filter(models.WebhookLead.client_id == client_id)
    if tag_name and tag_name.strip():
        tag_clean = tag_name.strip()
        query = query.filter(
            func.concat(',', func.replace(func.coalesce(models.WebhookLead.tags, ''), ', ', ','), ',').ilike(f"%,{tag_clean},%")
        )
    leads = query.all()
    recipients = []
    for l in leads:
        if l.email and "@" in str(l.email).strip():
            recipients.append({
                "id": l.id,
                "name": l.name or "Sem nome",
                "email": l.email.strip(),
                "phone": l.phone or "",
                "tags": l.tags or ""
            })
    return {
        "total_valid": len(recipients),
        "recipients": recipients
    }


class ReplyEmailPayload(BaseModel):
    subject: str
    body_html: str


@router.post("/status-webhook", summary="Webhook público para eventos de entrega da Brevo / SES / Resend")
async def receive_email_status_event(
    request: Request,
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    # Eventos da Brevo vêm como objeto único ou lista
    events = data if isinstance(data, list) else [data]

    for ev in events:
        event_name = (ev.get("event") or ev.get("type") or "").lower()
        recipient = (ev.get("email") or ev.get("recipient") or "").strip().lower()
        
        # Identificar status
        is_delivered = event_name in ("delivered", "request_delivered", "sent", "success")
        is_failed = event_name in ("hard_bounce", "soft_bounce", "blocked", "invalid_email", "spam", "error")

        if not recipient:
            continue

        logger.info(f"📩 [EMAIL WEBHOOK] Evento de e-mail recebido: {event_name} para {recipient}")

        # Localizar o disparo recente que contém este destinatário
        dispatches = db.query(models.EmailDispatch).order_by(models.EmailDispatch.created_at.desc()).limit(20).all()
        target_dispatch = None

        for d in dispatches:
            contacts = d.contacts_list or []
            for c in contacts:
                if (c.get("email") or "").strip().lower() == recipient:
                    target_dispatch = d
                    if is_delivered:
                        c["status"] = "delivered"
                        c["delivered_at"] = datetime.now(timezone.utc).isoformat()
                    elif is_failed:
                        c["status"] = "failed"
                        c["failure_reason"] = ev.get("reason") or ev.get("error") or event_name
                    break
            if target_dispatch:
                d.contacts_list = contacts
                db.commit()

                # Notificar via WebSocket
                try:
                    from rabbitmq_client import rabbitmq
                    await rabbitmq.publish_event("email_dispatch_updated", {
                        "dispatch_id": d.id,
                        "client_id": d.client_id,
                        "status": d.status,
                        "total_sent": d.total_sent,
                        "total_failed": d.total_failed
                    })
                except Exception:
                    pass
                break

    return {"status": "success", "processed": len(events)}


@router.post("/inbound-webhook", summary="Webhook público para receber respostas de e-mail dos leads")
async def receive_inbound_email(
    request: Request,
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    from_email = data.get("from_email") or data.get("from") or data.get("sender") or ""
    if isinstance(from_email, dict):
        from_email = from_email.get("email") or ""

    if not from_email or "@" not in str(from_email):
        raise HTTPException(status_code=400, detail="Remetente from_email não fornecido ou inválido")

    from_email = str(from_email).strip().lower()
    from_name = data.get("from_name") or data.get("name") or ""
    to_email = data.get("to_email") or data.get("to") or ""
    subject = data.get("subject") or data.get("title") or "Sem assunto"
    body_text = data.get("body_text") or data.get("text") or ""
    body_html = data.get("body_html") or data.get("html") or body_text
    provider = data.get("provider") or "webhook"

    lead = db.query(models.WebhookLead).filter(models.WebhookLead.email.ilike(from_email)).first()
    client_id = lead.client_id if lead else 1
    lead_id = lead.id if lead else None

    last_dispatch = db.query(models.EmailDispatch).filter_by(client_id=client_id).order_by(models.EmailDispatch.created_at.desc()).first()
    dispatch_id = last_dispatch.id if last_dispatch else None

    inbound = models.EmailInbound(
        client_id=client_id,
        dispatch_id=dispatch_id,
        lead_id=lead_id,
        from_email=from_email,
        from_name=from_name or (lead.name if lead else ""),
        to_email=to_email,
        subject=subject,
        body_text=body_text,
        body_html=body_html,
        provider=provider,
        is_read=False
    )
    db.add(inbound)
    db.commit()
    db.refresh(inbound)

    logger.info(f"📥 [EMAIL_INBOUND] Resposta recebida de {from_email} (Lead: {lead_id}, Client: {client_id})")
    return {"status": "success", "id": inbound.id, "message": "Resposta de e-mail registrada com sucesso"}


@router.get("/inbounds", summary="Listar respostas de e-mail recebidas dos leads")
def list_email_inbounds(
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None),
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.EmailInbound).filter_by(client_id=client_id)

    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.filter(
            (models.EmailInbound.from_email.ilike(s)) |
            (models.EmailInbound.from_name.ilike(s)) |
            (models.EmailInbound.subject.ilike(s))
        )

    inbounds = query.order_by(models.EmailInbound.created_at.desc()).limit(limit).all()
    unread_count = db.query(models.EmailInbound).filter_by(client_id=client_id, is_read=False).count()

    return {
        "items": inbounds,
        "total_unread": unread_count
    }


@router.put("/inbounds/{inbound_id}/read", summary="Marcar resposta de e-mail como lida")
def mark_inbound_read(
    inbound_id: int,
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    inbound = db.query(models.EmailInbound).filter_by(id=inbound_id, client_id=client_id).first()
    if not inbound:
        raise HTTPException(status_code=404, detail="Resposta de e-mail não encontrada")

    inbound.is_read = True
    db.commit()
    return {"status": "success", "message": "Resposta marcada como lida"}


@router.post("/inbounds/{inbound_id}/reply", summary="Responder diretamente a uma resposta de e-mail")
async def reply_inbound_email(
    inbound_id: int,
    payload: ReplyEmailPayload,
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    inbound = db.query(models.EmailInbound).filter_by(id=inbound_id, client_id=client_id).first()
    if not inbound:
        raise HTTPException(status_code=404, detail="Resposta de e-mail não encontrada")

    config = db.query(models.EmailConfig).filter_by(client_id=client_id).first()
    if not config:
        raise HTTPException(status_code=400, detail="Configuração de e-mail não encontrada.")

    res = await send_single_email(
        config=config,
        to_email=inbound.from_email,
        subject=payload.subject,
        body_html=payload.body_html,
        recipient_name=inbound.from_name or ""
    )

    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Erro ao enviar resposta"))

    inbound.is_read = True
    db.commit()

    return {"status": "success", "message": f"Réplica enviada com sucesso para {inbound.from_email}!"}



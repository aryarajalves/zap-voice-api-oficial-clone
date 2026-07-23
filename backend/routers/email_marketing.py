from fastapi import APIRouter, Depends, HTTPException, Header, Body
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import models, schemas
from core.deps import get_current_user, get_db
from services.email_service import send_single_email
from core.logger import setup_logger

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
    scheduled_time: Optional[str] = None


@router.get("/config", summary="Obter Configuração de E-mail do Cliente")
def get_email_config(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    config = db.query(models.EmailConfig).filter_by(client_id=client_id).first()
    if not config:
        return {"configured": False, "config": None}
    
    return {
        "configured": True,
        "config": {
            "id": config.id,
            "provider": config.provider,
            "aws_access_key_id": config.aws_access_key_id,
            "aws_region": config.aws_region,
            "resend_api_key": config.resend_api_key,
            "smtp_host": config.smtp_host,
            "smtp_port": config.smtp_port,
            "smtp_user": config.smtp_user,
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
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    config = db.query(models.EmailConfig).filter_by(client_id=client_id).first()
    
    if not config:
        config = models.EmailConfig(client_id=client_id, from_email=payload.from_email)
        db.add(config)

    config.provider = payload.provider.lower()
    config.from_email = payload.from_email
    config.from_name = payload.from_name
    
    if payload.aws_access_key_id: config.aws_access_key_id = payload.aws_access_key_id
    if payload.aws_secret_access_key: config.aws_secret_access_key = payload.aws_secret_access_key
    if payload.aws_region: config.aws_region = payload.aws_region
    
    if payload.resend_api_key: config.resend_api_key = payload.resend_api_key
    
    if payload.smtp_host: config.smtp_host = payload.smtp_host
    if payload.smtp_port: config.smtp_port = payload.smtp_port
    if payload.smtp_user: config.smtp_user = payload.smtp_user
    if payload.smtp_password: config.smtp_password = payload.smtp_password
    if payload.smtp_encryption: config.smtp_encryption = payload.smtp_encryption

    db.commit()
    db.refresh(config)
    return {"status": "success", "message": "Configuração de e-mail salva com sucesso!"}


@router.post("/test", summary="Enviar E-mail de Teste")
async def send_test_email(
    payload: TestEmailPayload,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
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
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    templates = db.query(models.EmailTemplate).filter_by(client_id=client_id, is_active=True).order_by(models.EmailTemplate.updated_at.desc()).all()
    return templates


@router.post("/templates", summary="Criar Template de E-mail")
def create_email_template(
    payload: EmailTemplateSchema,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
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
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
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
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
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
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    
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
                "phone": l.phone or ""
            })

    if not target_contacts:
        raise HTTPException(status_code=400, detail="Nenhum contato com e-mail válido encontrado para os filtros selecionados.")

    # 2. Criar registro de disparo
    dispatch = models.EmailDispatch(
        client_id=client_id,
        template_id=template.id,
        title=payload.title or f"E-mail: {template.name}",
        subject=template.subject,
        tag_name=payload.tag_name,
        status="completed", # Processamento imediato síncrono/assíncrono
        total_contacts=len(target_contacts),
        total_sent=0,
        total_failed=0,
        contacts_list=target_contacts
    )
    db.add(dispatch)
    db.commit()
    db.refresh(dispatch)

    # 3. Processar o envio dos e-mails
    sent_count = 0
    fail_count = 0

    for c in target_contacts:
        res = await send_single_email(
            config=config,
            to_email=c["email"],
            subject=template.subject,
            body_html=template.body_html,
            recipient_name=c["name"]
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
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    history = db.query(models.EmailDispatch).filter_by(client_id=client_id).order_by(models.EmailDispatch.created_at.desc()).limit(100).all()
    return history

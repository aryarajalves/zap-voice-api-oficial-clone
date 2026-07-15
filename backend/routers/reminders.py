from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.deps import get_db, get_validated_client_id
import models
from core.permissions import require_feature
from core.logger import logger
from services.scheduler import resolve_lead_variables
from chatwoot_client import ChatwootClient
from datetime import datetime
import json

router = APIRouter(prefix="/reminders", tags=["Reminders"])

@router.post("/leads/{lead_id}/retry", status_code=status.HTTP_200_OK)
async def retry_reminder(
    lead_id: int,
    x_client_id: int = Depends(get_validated_client_id),
    current_user: models.User = Depends(require_feature("leads")),
    db: Session = Depends(get_db)
):
    """
    Força o re-disparo imediato do lembrete de agendamento para um lead específico,
    ignorando validações de data futura.
    """
    logger.info(f"🔄 [RETRY REMINDER] Solicitado re-disparo para lead ID: {lead_id} pelo cliente ID: {x_client_id}")

    # 1. Buscar o lead e validar que pertence ao cliente
    lead = db.query(models.WebhookLead).filter(
        models.WebhookLead.id == lead_id,
        models.WebhookLead.client_id == x_client_id
    ).first()
    
    if not lead:
        logger.error(f"❌ [RETRY REMINDER] Lead {lead_id} não encontrado ou pertence a outro cliente.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead não encontrado ou não pertence a este cliente."
        )

    # 2. Obter configurações ativas de agendamento do cliente
    configs = db.query(models.AppConfig).filter(models.AppConfig.client_id == x_client_id).all()
    config_dict = {c.key: c.value for c in configs}
    
    enabled = config_dict.get("APPOINTMENTS_ENABLED") == "true"
    template_name = config_dict.get("APPOINTMENTS_REMINDER_TEMPLATE")
    
    if not enabled or not template_name:
        logger.error(f"❌ [RETRY REMINDER] Configurações de agendamento desativadas ou sem template ativo para cliente {x_client_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Os lembretes de agendamento não estão configurados ou ativos para sua conta."
        )

    # 3. Buscar informações do template
    from models.trigger import WhatsAppTemplateCache
    template_obj = db.query(WhatsAppTemplateCache).filter(
        WhatsAppTemplateCache.name == template_name,
        WhatsAppTemplateCache.client_id == x_client_id
    ).first()

    header_format = None
    if template_obj and template_obj.components:
        header_comp = None
        if isinstance(template_obj.components, list):
            for c in template_obj.components:
                if c.get("type") == "HEADER":
                    header_comp = c
                    break
        if header_comp:
            header_format = header_comp.get("format")

    # 4. Carregar parâmetros mapeados
    reminder_params_raw = config_dict.get("APPOINTMENTS_REMINDER_PARAMS", "{}")
    try:
        reminder_params = json.loads(reminder_params_raw)
    except Exception:
        reminder_params = {}

    # 5. Compilar os componentes do template
    components = []
    
    # Mídia do Cabeçalho
    if header_format in ["IMAGE", "VIDEO", "DOCUMENT"]:
        media_url = reminder_params.get("HEADER_0")
        if media_url:
            media_type = header_format.lower()
            components.append({
                "type": "header",
                "parameters": [
                    {
                        "type": media_type,
                        media_type: {
                            "link": media_url
                        }
                    }
                ]
            })

    # Detectar variáveis exigidas no cabeçalho e corpo via Regex
    import re
    header_vars_needed = 0
    body_vars_needed = 0
    if template_obj and template_obj.components:
        for c in template_obj.components:
            comp_type = c.get("type", "").upper()
            comp_text = c.get("text", "")
            if comp_type == "HEADER" and c.get("format") == "TEXT" and comp_text:
                matches = re.findall(r"\{\{(\d+)\}\}", comp_text)
                if matches:
                    header_vars_needed = max(int(m) for m in matches)
            elif comp_type == "BODY" and comp_text:
                matches = re.findall(r"\{\{(\d+)\}\}", comp_text)
                if matches:
                    body_vars_needed = max(int(m) for m in matches)

    # Variáveis de Texto do Cabeçalho
    header_params = []
    h_idx = 1
    while h_idx <= header_vars_needed or f"HEADER_{h_idx}" in reminder_params:
        val_raw = reminder_params.get(f"HEADER_{h_idx}")
        if not val_raw:
            val_raw = "{name}" if h_idx == 1 else ""
        val_resolved = resolve_lead_variables(val_raw, lead)
        header_params.append({
            "type": "text",
            "text": val_resolved
        })
        h_idx += 1
    
    if header_params and header_format not in ["IMAGE", "VIDEO", "DOCUMENT"]:
        components.append({
            "type": "header",
            "parameters": header_params
        })

    # Variáveis do Corpo (Body)
    body_params = []
    b_idx = 1
    while b_idx <= body_vars_needed or f"BODY_{b_idx}" in reminder_params:
        val_raw = reminder_params.get(f"BODY_{b_idx}")
        if not val_raw:
            val_raw = "{name}" if b_idx == 1 else ""
        val_resolved = resolve_lead_variables(val_raw, lead)
        body_params.append({
            "type": "text",
            "text": val_resolved
        })
        b_idx += 1

    if body_params:
        components.append({
            "type": "body",
            "parameters": body_params
        })

    # 6. Disparar o template
    try:
        client = ChatwootClient(client_id=x_client_id)
        result = await client.send_template(
            contact_phone=lead.phone,
            template_name=template_name,
            template_language="pt_BR",
            template_components=components
        )
        
        # 7. Registrar sucesso/falha no banco de dados e atualizar o lead
        if result and not (isinstance(result, dict) and result.get("error")):
            raw_id = result["messages"][0].get("id") if isinstance(result, dict) and result.get("messages") else None
            wamid = raw_id.replace("wamid.", "") if raw_id else None
            
            if wamid:
                new_ms = models.MessageStatus(
                    message_id=wamid,
                    phone_number=lead.phone,
                    status='sent',
                    message_type='TEMPLATE',
                    content=f"[Re-disparo Lembrete: {template_name}]",
                    var1=str(lead.client_id)
                )
                db.add(new_ms)
                
            lead.google_calendar_reminder_sent = True
            db.commit()
            logger.info(f"✅ [RETRY REMINDER] Re-disparo concluído com sucesso para {lead.phone}")
            return {"success": True, "detail": "Lembrete re-disparado com sucesso!"}
        else:
            err_msg = result.get("detail") if isinstance(result, dict) else (result.get("error") if isinstance(result, dict) else "Erro desconhecido")
            logger.error(f"❌ [RETRY REMINDER] Falha no disparo de template para {lead.phone}: {err_msg}")
            
            new_ms = models.MessageStatus(
                message_id=f"err_retry_{lead.id}_{int(datetime.utcnow().timestamp())}",
                phone_number=lead.phone,
                status='failed',
                message_type='TEMPLATE',
                content=f"[Re-disparo Lembrete: {template_name}]",
                failure_reason=str(err_msg)
            )
            db.add(new_ms)
            lead.google_calendar_reminder_sent = True
            db.commit()
            
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Falha na Meta API: {err_msg}"
            )
    except HTTPException:
        raise
    except Exception as ex:
        logger.error(f"❌ [RETRY REMINDER] Erro inesperado no re-disparo: {ex}")
        new_ms = models.MessageStatus(
            message_id=f"err_retry_exc_{lead.id}_{int(datetime.utcnow().timestamp())}",
            phone_number=lead.phone,
            status='failed',
            message_type='TEMPLATE',
            content=f"[Re-disparo Lembrete: {template_name}]",
            failure_reason=str(ex)
        )
        db.add(new_ms)
        lead.google_calendar_reminder_sent = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao re-disparar: {str(ex)}"
        )

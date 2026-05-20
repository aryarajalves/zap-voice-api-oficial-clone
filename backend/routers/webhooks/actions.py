from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
import json
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
import uuid
import re
import models
from database import SessionLocal
from core.deps import get_current_user, get_validated_client_id
from services.webhooks import parse_webhook_payload

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/{integration_id}/discover-products", summary="Descobrir produtos no histórico")
def discover_integration_products(
    integration_id: str,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        uuid_obj = uuid.UUID(integration_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    integration = db.query(models.WebhookIntegration).filter(
        models.WebhookIntegration.id == uuid_obj,
        models.WebhookIntegration.client_id == x_client_id
    ).first()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    history = db.query(models.WebhookHistory).filter(models.WebhookHistory.integration_id == uuid_obj).all()
    discovered = set()

    for entry in history:
        payload = entry.payload
        if not payload: continue
        parsed = parse_webhook_payload(integration.platform, payload)
        product_name = parsed.get("product_name")
        is_bump = parsed.get("order_bump") or parsed.get("e_order_bump")

        if product_name and not is_bump:
            parts = [p.strip() for p in str(product_name).split('|')]
            for p in parts:
                p_clean = re.sub(r'\s*\([^)]*?(R\$|\$|€|£|BRL|USD|EUR|US\$|R\$ )[\d\.,\s]+[^)]*?\)', '', p)
                p_clean = re.sub(r'\s*-?\s*(R\$|\$|€|£|BRL|USD|EUR|US\$)\s*[\d\.,]+', '', p_clean).strip()
                if p_clean: discovered.add(p_clean)

    discovered_list = sorted(list(discovered))
    integration.discovered_products = discovered_list
    db.commit()
    return {"message": f"Descoberta concluída. {len(discovered_list)} produto(s) encontrado(s).", "discovered_products": discovered_list}

@router.post("/{integration_id}/test", summary="Testar Webhook", include_in_schema=False)
async def test_webhook_integration(
    integration_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        uuid_obj = uuid.UUID(integration_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid integration_id UUID")
        
    integration = db.query(models.WebhookIntegration).filter(
        models.WebhookIntegration.id == uuid_obj,
        models.WebhookIntegration.client_id == x_client_id
    ).first()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
        
    # Tenta ler o corpo da requisição se houver
    try:
        body = await request.body()
        if body:
            test_payload = json.loads(body)
        else:
            raise ValueError("Empty body")
    except Exception:
        # Fallback para payload padrão
        test_payload = {
            "event": "PURCHASE_APPROVED",
            "data": {
                "buyer": {"name": "Cliente Teste ZapVoice", "email": "teste@zapvoice.com.br", "checkout_phone": "5511999999999"},
                "product": {"name": "Produto de Teste - Integração"},
                "purchase": {"status": "APPROVED", "payment": {"type": "CREDIT_CARD"}}
            },
            "test_mode": True
        }
    
    # Detecta o event_type baseado no payload e plataforma
    from services.webhooks import parse_webhook_payload, replace_variables_in_string, compute_dynamic_manychat_tag, process_webhook_automation
    parsed = parse_webhook_payload(integration.platform, test_payload)
    detected_event = parsed.get("event_type") or "compra_aprovada"
    
    # Busca mapeamento para popular as flags de exibição no frontend
    mapping = db.query(models.WebhookEventMapping).filter(
        models.WebhookEventMapping.integration_id == integration.id,
        models.WebhookEventMapping.event_type == detected_event
    ).first()
    
    if not mapping and detected_event != "outros":
        mapping = db.query(models.WebhookEventMapping).filter(
            models.WebhookEventMapping.integration_id == integration.id,
            models.WebhookEventMapping.event_type == "outros"
        ).first()

    # Prepara o processed_data
    processed_data = dict(parsed)
    if mapping:
        processed_data["manychat_enabled"] = getattr(mapping, "manychat_active", False)
        processed_data["private_note_enabled"] = bool(getattr(mapping, "private_note", None))
        processed_data["chatwoot_label"] = getattr(mapping, "chatwoot_label", [])
        processed_data["free_message_enabled"] = getattr(mapping, "send_as_free_message", False)
    
    # Determina o status inicial e mensagem de erro baseados na presença do mapeamento
    status = "pending"
    error_message = None
    if not mapping:
        status = "skipped"
        error_message = f"Nenhum mapeamento encontrado para o evento: {detected_event}"
    
    history = models.WebhookHistory(
        integration_id=integration.id,
        payload=test_payload,
        status=status,
        event_type=detected_event,
        processed_data=processed_data,
        error_message=error_message
    )
    db.add(history)
    db.commit()
    db.refresh(history)

    # Dispara tarefas em segundo plano (Full Flow)
    if mapping:
        # 1. Sincronização ManyChat
        if getattr(mapping, "manychat_active", False):
            from services.manychat import sync_to_manychat_and_update_history
            mc_name = replace_variables_in_string(getattr(mapping, "manychat_name", None) or "{{name}}", test_payload, processed_data)
            mc_phone = replace_variables_in_string(getattr(mapping, "manychat_phone", None) or "{{phone}}", test_payload, processed_data)
            mc_tag = compute_dynamic_manychat_tag(mapping) if getattr(mapping, "manychat_tag_automation", False) else getattr(mapping, "manychat_tag", None)
            
            if mc_tag:
                background_tasks.add_task(sync_to_manychat_and_update_history, integration.client_id, mc_name, mc_phone, mc_tag, processed_data.get("email"), history.id)

        # 2. Automação Principal
        background_tasks.add_task(
            process_webhook_automation,
            client_id=integration.client_id,
            mapping=mapping,
            variables=processed_data,
            history_id=history.id
        )
    
    return {"message": "Webhook de teste gerado e processamento iniciado!", "history_id": history.id}

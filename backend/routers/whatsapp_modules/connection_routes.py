import os
import httpx
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

import models
from core.deps import get_current_user, get_db, get_validated_client_id
from core.permissions import require_user, require_super_admin
from core.logger import setup_logger
from config_loader import get_setting
from .client_helper import resolve_client_id

logger = setup_logger(__name__)

router = APIRouter()


class TestTokenRequest(BaseModel):
    phone_number_id: str
    access_token: str
    business_account_id: Optional[str] = None


@router.get("/debug/env")
async def debug_env(current_user: models.User = Depends(require_super_admin)):
    return {
        "whatsapp": {
            "WA_BUSINESS_ACCOUNT_ID": os.getenv("WA_BUSINESS_ACCOUNT_ID"),
            "WA_PHONE_NUMBER_ID": os.getenv("WA_PHONE_NUMBER_ID"),
            "WA_ACCESS_TOKEN_PREFIX": (os.getenv("WA_ACCESS_TOKEN") or "")[:15] + "..."
        },
        "chatwoot": {
            "CHATWOOT_API_URL": os.getenv("CHATWOOT_API_URL"),
            "CHATWOOT_API_TOKEN_PREFIX": (os.getenv("CHATWOOT_API_TOKEN") or "")[:10] + "...",
            "CHATWOOT_ACCOUNT_ID": os.getenv("CHATWOOT_ACCOUNT_ID"),
            "CHATWOOT_SELECTED_INBOX_ID": os.getenv("CHATWOOT_SELECTED_INBOX_ID")
        },
        "database": {
            "DATABASE_URL_HOST": os.getenv("DATABASE_URL", "").split("@")[1].split("/")[0] if "@" in os.getenv("DATABASE_URL", "") else "not_set"
        },
        "frontend": {
            "VITE_API_URL": os.getenv("VITE_API_URL"),
            "VITE_WS_URL": os.getenv("VITE_WS_URL")
        },
    }


@router.post("/test-token")
async def test_whatsapp_token(
    request: TestTokenRequest,
    current_user: models.User = Depends(get_current_user),
    client_id: Optional[int] = Depends(get_validated_client_id),
    x_client_id: Optional[int] = None
):
    """
    Testa a validade do Token de Acesso permanente da Meta contra a Graph API.
    """
    target_client_id = resolve_client_id(client_id, x_client_id)
    token = request.access_token.strip()
    phone_id = request.phone_number_id.strip()
    
    # Se o token vier mascarado (contendo asteriscos), recupera o token real salvo no banco
    if "*" in token:
        token = get_setting("WA_ACCESS_TOKEN", client_id=target_client_id)
        if not token:
            raise HTTPException(
                status_code=400,
                detail="Nenhum token de acesso salvo foi encontrado para este cliente."
            )
            
    if not token or not phone_id:
        raise HTTPException(
            status_code=400,
            detail="Token de acesso e ID do número de telefone são obrigatórios."
        )
        
    url = f"https://graph.facebook.com/v20.0/{phone_id}"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                return {
                    "valid": True,
                    "phone_number": data.get("display_phone_number"),
                    "verified_name": data.get("verified_name"),
                    "quality_rating": data.get("quality_rating"),
                    "id": data.get("id")
                }
            else:
                error_data = response.json().get("error", {})
                error_msg = error_data.get("message", "Erro desconhecido ao validar token na Meta")
                logger.error(f"Erro na validação do token com a Meta: {response.status_code} - {error_msg}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Meta API: {error_msg}"
                )
        except httpx.RequestError as e:
            logger.error(f"Erro de conexão ao testar token: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Erro de conexão ao testar token com a Meta: {str(e)}"
            )


@router.get("/labels")
async def list_labels(
    client_id: Optional[int] = Depends(get_validated_client_id),
    current_user: models.User = Depends(require_user),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = None
):
    try:
        target_client_id = resolve_client_id(client_id, x_client_id)
        labels = (
            db.query(models.ChatLabel)
            .filter(models.ChatLabel.client_id == target_client_id)
            .order_by(models.ChatLabel.name)
            .all()
        )
        return [{"id": l.id, "title": l.name, "color": l.color} for l in labels]
    except Exception as e:
        logger.error(f"Error listing labels: {e}")
        return []

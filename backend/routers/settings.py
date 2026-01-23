from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from core.deps import get_db
from models import AppConfig, User
from config_loader import get_settings
from pydantic import BaseModel
from typing import Dict, Optional
from core.deps import get_current_user  # Assuming you have auth

router = APIRouter(prefix="/settings", tags=["Settings"])

class SettingsUpdate(BaseModel):
    settings: Dict[str, str]

class RevealRequest(BaseModel):
    key: str

@router.get("/", response_model=Dict[str, str])
def read_settings(
    x_client_id: Optional[int] = Header(None),  
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Retorna as configurações atuais.
    Oculta partes sensíveis dos tokens para exibição no frontend.
    """
    try:
        print(f"[SETTINGS] GET /settings called by user: {current_user.email}, client_id: {x_client_id}")
        
        if not x_client_id:
            raise HTTPException(status_code=400, detail="Client ID não fornecido (header X-Client-ID)")
        
        # Buscar configurações específicas do cliente
        configs = db.query(AppConfig).filter(AppConfig.client_id == x_client_id).all()
        current_settings = {c.key: c.value for c in configs}
        print(f"[SETTINGS] Retrieved {len(current_settings)} settings from DB for client {x_client_id}")
        
        # Mascarar dados sensíveis para exibição
        masked_settings = {}
        for key, value in current_settings.items():
            if not value:
                masked_settings[key] = ""
                continue
                
            if "TOKEN" in key or "KEY" in key or "SECRET" in key:
                if len(value) > 8:
                    # Preserva o tamanho original usando asteriscos
                    mask_len = len(value) - 8
                    masked_settings[key] = value[:4] + ("*" * mask_len) + value[-4:]
                else:
                    masked_settings[key] = "****"
            else:
                masked_settings[key] = value
        
        print(f"[SETTINGS] Returning masked settings: {list(masked_settings.keys())}")
        return masked_settings
    except Exception as e:
        print(f"[SETTINGS ERROR] Failed to get settings: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao buscar configurações: {str(e)}")

@router.post("/reveal")
def reveal_setting(reveal_req: RevealRequest, current_user: User = Depends(get_current_user)):
    """
    Retorna o valor real de uma configuração específica para o admin.
    """
    try:
        current_settings = get_settings()
        value = current_settings.get(reveal_req.key, "")
        return {"key": reveal_req.key, "value": value}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao revelar configuração: {str(e)}")

@router.post("/", status_code=status.HTTP_200_OK)
def update_settings(
    update_data: SettingsUpdate, 
    x_client_id: Optional[int] = Header(None),
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Atualiza as configurações no banco de dados via Upsert.
    """
    
    if not x_client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido (header X-Client-ID)")
    
    # Lista de chaves permitidas para segurança
    ALLOWED_KEYS = {
        "WA_BUSINESS_ACCOUNT_ID",
        "WA_PHONE_NUMBER_ID",
        "WA_ACCESS_TOKEN",
        "CHATWOOT_API_URL",
        "CHATWOOT_API_TOKEN",
        "CHATWOOT_ACCOUNT_ID",
        "CHATWOOT_SELECTED_INBOX_ID",
        "CLIENT_NAME",
        # RabbitMQ
        "RABBITMQ_HOST", "RABBITMQ_PORT", "RABBITMQ_USER", "RABBITMQ_PASSWORD", "RABBITMQ_VHOST",
        # MinIO/S3
        "S3_ENDPOINT_URL", "S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_BUCKET_NAME", "S3_PUBLIC_URL", "S3_REGION",
        # Meta Webhook
        "META_VERIFY_TOKEN", "META_RETURN_CONFIG"
    }
    
    saved_count = 0
    
    print(f"[SETTINGS] Received keys to update: {list(update_data.settings.keys())}")
    for key, value in update_data.settings.items():
        if key not in ALLOWED_KEYS:
            print(f"[SETTINGS] Key '{key}' NOT in allowed list")
            continue
        
        print(f"[SETTINGS] Updating key: {key}")
            
        # Buscar configuração específica do cliente
        config_item = db.query(AppConfig).filter(
            AppConfig.key == key,
            AppConfig.client_id == x_client_id
        ).first()
        
        if config_item:
            config_item.value = value
        else:
            new_config = AppConfig(key=key, value=value, client_id=x_client_id)
            db.add(new_config)
            
        saved_count += 1
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao salvar configurações: {str(e)}")
        
    return {"message": f"{saved_count} configurações atualizadas com sucesso."}

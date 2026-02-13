from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from core.deps import get_db
from models import AppConfig, User
from config_loader import get_settings
from pydantic import BaseModel
from typing import Dict, Optional
from core.deps import get_current_user  # Assuming you have auth
from websocket_manager import manager

router = APIRouter(prefix="/settings", tags=["Settings"])

class SettingsUpdate(BaseModel):
    settings: Dict[str, str]

class RevealRequest(BaseModel):
    key: str

@router.get("/branding")
def get_branding(db: Session = Depends(get_db)):
    """
    Retorna o nome e a logo do app para a tela de login (público).
    Pega do primeiro cliente configurado ou usa padrão.
    """
    branding = {"APP_NAME": "ZapVoice", "APP_LOGO": None}
    try:
        # Pega a primeira configuração de branding que encontrar no banco
        db_branding = db.query(AppConfig).filter(AppConfig.key.in_(["APP_NAME", "APP_LOGO"])).all()
        for cfg in db_branding:
            branding[cfg.key] = cfg.value
    except Exception as e:
        print(f"Erro ao buscar branding: {e}")
    
    return branding

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
            # Filtrar chaves de infraestrutura para não exibir no frontend
            if key.startswith("RABBITMQ_") or key.startswith("S3_"):
                continue

            if not value:
                masked_settings[key] = ""
                continue
                
            if ("TOKEN" in key or "KEY" in key or "SECRET" in key) and key != "AUTO_BLOCK_KEYWORDS":
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
async def update_settings(
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
        "APP_NAME",
        "APP_LOGO",
        "APP_LOGO_SIZE",
        "META_RETURN_CONFIG",
        "AUTO_BLOCK_KEYWORDS",
        "SYNC_CONTACTS_TABLE"
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
        
    # Notificar via WebSocket
    await manager.broadcast({
        "event": "settings_updated",
        "client_id": x_client_id,
        "data": {"keys": list(update_data.settings.keys())}
    })
    
    return {"message": f"{saved_count} configurações atualizadas com sucesso."}

@router.get("/contacts")
def fetch_synced_contacts(
    x_client_id: Optional[int] = Header(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Busca os contatos salvos na tabela customizada do cliente.
    """
    if not x_client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido")

    # 1. Busca o nome da tabela nas configurações
    sync_table_cfg = db.query(AppConfig).filter(
        AppConfig.key == "SYNC_CONTACTS_TABLE",
        AppConfig.client_id == x_client_id
    ).first()

    if not sync_table_cfg or not sync_table_cfg.value:
        return []

    sync_table = sync_table_cfg.value
    # Sanitização básica por segurança
    safe_table = "".join(c for c in sync_table if c.isalnum() or c == '_')

    try:
        from sqlalchemy import text
        # 2. Busca os dados da tabela
        # Limitamos a 100 para não sobrecarregar
        
        # Envolvemos o nome da tabela em aspas duplas para garantir que o Postgres aceite Case Sensitive se necessário
        # MAS, como na criação usamos sem aspas (o que converte para minúsculo no Postgres), 
        # vamos tentar buscar sem aspas primeiro (comportamento padrão).
        
        # Correção: O erro "relation does not exist" geralmente ocorre quando a tabela não foi criada ainda.
        # Vamos apenas retornar vazio se der erro de tabela inexistente.
        
        sql = text(f"SELECT phone, name, inbox_id, last_interaction_at FROM {safe_table} ORDER BY last_interaction_at DESC LIMIT 100")
        result = db.execute(sql).fetchall()
        
        contacts = []
        for row in result:
            contacts.append({
                "phone": row[0],
                "name": row[1],
                "inbox_id": row[2],
                "last_interaction_at": row[3].isoformat() if row[3] else None
            })
        
        return contacts
    except Exception as e:
        # Se o erro for de tabela inexistente (UndefinedTable), é normal (ainda não sincronizou nada)
        # O erro geralmente contém a string "does not exist"
        err_str = str(e).lower()
        if "does not exist" in err_str or "undefinedtable" in err_str:
            return []
            
        print(f"❌ [SETTINGS] Erro ao buscar contatos da tabela {safe_table}: {e}")
        return []

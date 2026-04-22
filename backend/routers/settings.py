from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.deps import get_db
from models import AppConfig, User, Client
from config_loader import get_settings
from pydantic import BaseModel
from typing import Dict, Optional, Any
from core.deps import get_current_user, get_validated_client_id
from websocket_manager import manager
import httpx
import datetime


router = APIRouter(prefix="/settings", tags=["Settings"])

class SettingsUpdate(BaseModel):
    settings: Dict[str, Any]

class RevealRequest(BaseModel):
    key: str

class TestWebhookRequest(BaseModel):
    url: str

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
    x_client_id: int = Depends(get_validated_client_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna as configurações atuais.
    Oculta partes sensíveis dos tokens para exibição no frontend.
    """
    try:
        print(f"[SETTINGS] GET /settings called by user: {current_user.email}, client_id: {x_client_id}")

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
def reveal_setting(
    reveal_req: RevealRequest,
    x_client_id: int = Depends(get_validated_client_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna o valor real de uma configuração específica para o admin.
    """
    try:
        # Buscar diretamente no banco para o cliente específico
        config_item = db.query(AppConfig).filter(
            AppConfig.key == reveal_req.key,
            AppConfig.client_id == x_client_id
        ).first()
        
        value = config_item.value if config_item else ""
        return {"key": reveal_req.key, "value": value}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao revelar configuração: {str(e)}")

@router.post("/", status_code=status.HTTP_200_OK)
async def update_settings(
    update_data: SettingsUpdate,
    x_client_id: int = Depends(get_validated_client_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Atualiza as configurações no banco de dados via Upsert.
    """
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
        "AI_MEMORY_ENABLED",
        "AGENT_MEMORY_WEBHOOK_URL"
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
        
        # Se o valor for booleano, converte para string "true"/"false"
        val_str = str(value).lower() if isinstance(value, bool) else (str(value) if value is not None else "")

        if config_item:
            config_item.value = val_str
        else:
            new_config = AppConfig(key=key, value=val_str, client_id=x_client_id)
            db.add(new_config)
        
        # Sincronizar nome do cliente na tabela Clients se a chave for CLIENT_NAME
        if key == "CLIENT_NAME" and value:
            try:
                client_obj = db.query(Client).filter(Client.id == x_client_id).first()
                if client_obj:
                    client_obj.name = value
                    print(f"[SETTINGS] Sincronizado nome do cliente ID {x_client_id} para '{value}'")
            except Exception as e:
                print(f"[SETTINGS] Erro ao sincronizar nome do cliente: {e}")
                # Não impedimos o save das configs, mas logamos o erro
            
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
    skip: int = 0,
    limit: int = 20,
    x_client_id: int = Depends(get_validated_client_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Busca os contatos salvos na tabela customizada do cliente com paginação.
    """
    # O nome da tabela pode ser customizado via SYNC_CONTACTS_TABLE
    from config_loader import get_setting
    sync_table_raw = get_setting("SYNC_CONTACTS_TABLE", "contatos_monitorados", client_id=x_client_id)
    safe_table = "".join(c for c in sync_table_raw if c.isalnum() or c == '_')

    try:
        from sqlalchemy import text
        
        # 1. Conta o total de registros para paginação no frontend
        count_sql = text(f"SELECT COUNT(*) FROM {safe_table}")
        total_result = db.execute(count_sql).scalar()
        total = total_result if total_result is not None else 0
        
        # 2. Busca os dados paginados
        sql = text(f"SELECT phone, name, inbox_id, last_interaction_at FROM {safe_table} ORDER BY last_interaction_at DESC LIMIT :limit OFFSET :skip")
        result = db.execute(sql, {"limit": limit, "skip": skip}).fetchall()
        
        contacts = []
        for row in result:
            contacts.append({
                "phone": row[0],
                "name": row[1],
                "inbox_id": row[2],
                "last_interaction_at": row[3].isoformat() if row[3] else None
            })
        
        return {"items": contacts, "total": total}
    except Exception as e:
        # Se o erro for de tabela inexistente (UndefinedTable), é normal (ainda não sincronizou nada)
        err_str = str(e).lower()
        if "does not exist" in err_str or "undefinedtable" in err_str:
            return {"items": [], "total": 0}
            
        print(f"❌ [SETTINGS] Erro ao buscar contatos da tabela {safe_table}: {e}")
        return {"items": [], "total": 0}

@router.get("/memory-logs")
def fetch_memory_logs(
    skip: int = 0,
    limit: int = 20,
    x_client_id: int = Depends(get_validated_client_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Busca os logs de memória (MessageStatus) com paginação.
    Exibe mensagens que foram enviadas (ou tentadas) para o webhook de memória.
    """
    from models import MessageStatus, ScheduledTrigger
    
    try:
        # Query base: MessageStatus que tenha algum status de memória e pertença ao cliente
        query = db.query(MessageStatus).join(ScheduledTrigger).filter(
            ScheduledTrigger.client_id == x_client_id,
            MessageStatus.memory_webhook_status.isnot(None)
        )
        
        total = query.count()
        items = query.order_by(MessageStatus.timestamp.desc()).offset(skip).limit(limit).all()
        
        formatted_items = []
        for item in items:
            formatted_items.append({
                "id": item.id,
                "phone": item.phone_number,
                "content": item.content,
                "status": item.memory_webhook_status, # sent, failed, pending, not_configured
                "error": item.memory_webhook_error,
                "timestamp": item.timestamp.isoformat() if item.timestamp else None,
                "template_name": item.template_name
            })
            
        return {"items": formatted_items, "total": total}
    except Exception as e:
        print(f"❌ [SETTINGS] Erro ao buscar logs de memória: {e}")
        return {"items": [], "total": 0}

@router.post("/test-memory-webhook")
async def test_memory_webhook(
    req: TestWebhookRequest,
    x_client_id: int = Depends(get_validated_client_id),
    current_user: User = Depends(get_current_user)
):
    """
    Dispara um evento de teste para a URL de webhook de memória fornecida.
    """
    if not req.url:
        raise HTTPException(status_code=400, detail="URL do webhook é obrigatória.")

    test_payload = {
        "contact_name": "João Silva",
        "contact_phone": "5511999999999",
        "template_name": "template_teste",
        "template_content": "Esta é uma mensagem de teste do ZapVoice para validar sua memória IA.",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }


    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            print(f"[SETTINGS] Testing memory webhook for client {x_client_id} -> {req.url}")
            response = await client.post(req.url, json=test_payload)
            
            # Tentar pegar o corpo da resposta para feedback, mas limitar tamanho
            resp_body = response.text[:500]
            
            return {
                "status": response.status_code,
                "success": 200 <= response.status_code < 300,
                "response_body": resp_body
            }
    except Exception as e:
        print(f"[SETTINGS ERROR] Webhook test failed: {e}")
        return {
            "status": 500,
            "success": False,
            "error": str(e)
        }


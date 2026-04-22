import os
import logging
from sqlalchemy.orm import Session
from database import SessionLocal
from models import AppConfig

logger = logging.getLogger("config_loader")

def get_settings(client_id: int = None):
    """
    Recupera as configurações do sistema, priorizando o banco de dados.
    Se não houver valor no banco, usa a variável de ambiente.
    Permite filtrar por client_id para isolamento multi-tenant.
    """
    settings = {}
    
    # Lista de chaves suportadas
    keys = [
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
        # Infra keys para que o health check consiga lê-las via ENV fallback
        "RABBITMQ_HOST", "RABBITMQ_PORT", "RABBITMQ_USER", "RABBITMQ_PASSWORD",
        "S3_ENDPOINT_URL", "S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_BUCKET_NAME", "S3_REGION",
        "AUTO_BLOCK_KEYWORDS", "SYNC_CONTACTS_TABLE", "MANYCHAT_API_KEY",
        "AI_MEMORY_ENABLED", "AGENT_MEMORY_WEBHOOK_URL", "AGENT_MEMORY_ENVIAR_TEXTO"
    ]
    
    db: Session = SessionLocal()
    try:
        # Carregar do banco
        query = db.query(AppConfig)
        if client_id:
            query = query.filter(AppConfig.client_id == client_id)

        db_configs = query.all()
        db_map = {cfg.key: cfg.value for cfg in db_configs}
        
        for key in keys:
            # Prioridade: Banco > Variável de Ambiente > String Vazia
            value = db_map.get(key)
            if not value:
                 value = os.getenv(key, "")
            
            if isinstance(value, str):
                value = value.strip().strip('"').strip("'")
            
            settings[key] = value
            
    except Exception as e:
        logger.error(f"Erro ao carregar configurações do banco: {e}")
        # Fallback para env vars em caso de erro no DB
        for key in keys:
            settings[key] = os.getenv(key, "")
            
    finally:
        db.close()
        
    return settings

def get_setting(key: str, default: str = "", client_id: int = None):
    """Busca uma única configuração, opcionalmente por client_id"""
    settings = get_settings(client_id)
    val = settings.get(key)
    if not val:
        # Fallback para variável de ambiente se não encontrado no dicionário (ex: chaves de infra)
        val = os.getenv(key)
    
    if not val:
        return default
    return val

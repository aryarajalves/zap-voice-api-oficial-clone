import os
from sqlalchemy.orm import Session
from core.logger import setup_logger
from database import SessionLocal
from models import AppConfig

logger = setup_logger("config_loader")

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
        "WA_USE_UNIQUE_WEBHOOK", "WA_WEBHOOK_SLUG",
        "AUTO_BLOCK_KEYWORDS", "SYNC_CONTACTS_TABLE", "MANYCHAT_API_KEY", "MANYCHAT_API_KEYS",

        "AI_MEMORY_ENABLED", "AGENT_MEMORY_WEBHOOK_URL", "AGENT_MEMORY_ENVIAR_TEXTO",
        "OPENAI_API_KEY", "OPENAI_API_MODEL", "CHAT_MESSAGES_WEBHOOK_URL",
        "WA_HAS_AI_AGENT", "WA_HUMAN_LABEL", "WA_ROBO_LABEL",
        "WA_AUTO_REPLY_ENABLED", "WA_AUTO_REPLY_MESSAGE", "WA_AUTO_REPLY_DELAY",
        "APPOINTMENTS_ENABLED", "APPOINTMENTS_REMINDER_MINUTES", "APPOINTMENTS_REMINDER_TEMPLATE",
        "APPOINTMENTS_REMINDER_PARAMS", "APPOINTMENTS_REMINDER_BUTTONS"
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

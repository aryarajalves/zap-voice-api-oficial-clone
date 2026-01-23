import os
from sqlalchemy.orm import Session
from database import SessionLocal
from models import AppConfig

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
        # S3 / MinIO
        "S3_ENDPOINT_URL",
        "S3_ACCESS_KEY",
        "S3_SECRET_KEY",
        "S3_BUCKET_NAME",
        "S3_PUBLIC_URL",
        "S3_REGION",
        # RabbitMQ
        "RABBITMQ_HOST",
        "RABBITMQ_PORT",
        "RABBITMQ_USER",
        "RABBITMQ_PASSWORD",
        "RABBITMQ_VHOST",
        "RABBITMQ_PREFETCH_COUNT"
    ]
    
    db: Session = SessionLocal()
    try:
        # Carregar do banco
        query = db.query(AppConfig)
        if client_id:
            print(f"DEBUG: get_settings loading for client_id={client_id}")
            query = query.filter(AppConfig.client_id == client_id)
        else:
            print("DEBUG: get_settings loading for ALL/Default (no client_id)")
            
        db_configs = query.all()
        # Se client_id for fornecido, assumimos que as configs são específicas daquele cliente
        # Se não, pode pegar de todos, mas o ideal é sempre passar client_id no contexto atual
        db_map = {cfg.key: cfg.value for cfg in db_configs}
        
        print(f"DEBUG: Found {len(db_map)} config keys in DB for client_id={client_id}: {list(db_map.keys())}")
        
        for key in keys:
            # Prioridade: Banco > Variável de Ambiente > String Vazia
            value = db_map.get(key)
            if not value:
                 value = os.getenv(key, "")
            
            settings[key] = value
            
    except Exception as e:
        print(f"Erro ao carregar configurações do banco: {e}")
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
        return default
    return val

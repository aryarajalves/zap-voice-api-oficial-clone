from fastapi import APIRouter, Header, Depends
from sqlalchemy.orm import Session
from core.deps import get_db, get_current_user
from models import User, AppConfig
import httpx
import boto3
import asyncio
from typing import Dict, Optional
from rabbitmq_client import rabbitmq

# Definindo o roteador com prefixo claro
router = APIRouter(prefix="/health", tags=["Health"])

async def check_whatsapp(wa_phone_id, wa_token):
    if not wa_phone_id or not wa_token or wa_token == "123": # "123" é o valor padrão que vi no seu banco
        return "offline"
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"https://graph.facebook.com/v21.0/{wa_phone_id}",
                params={"access_token": wa_token},
                timeout=3.0
            )
            return "online" if res.status_code == 200 else f"error ({res.status_code})"
    except:
        return "timeout"

async def check_chatwoot(cw_url, cw_token):
    if not cw_url or not cw_token or cw_token == "123":
        return "offline"
    try:
        # Normaliza a URL
        clean_url = cw_url.rstrip('/')
        if '/api/v1' not in clean_url:
            clean_url += '/api/v1'
        
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{clean_url}/profile",
                headers={"api_access_token": cw_token},
                timeout=3.0
            )
            return "online" if res.status_code == 200 else f"error ({res.status_code})"
    except:
        return "timeout"

async def check_storage(s):
    s3_url = s.get("S3_ENDPOINT_URL")
    s3_key = s.get("S3_ACCESS_KEY")
    s3_secret = s.get("S3_SECRET_KEY")
    s3_bucket = s.get("S3_BUCKET_NAME")

    if not (s3_url and s3_key and s3_secret and s3_bucket):
        return "offline"
    
    try:
        def _check():
            s3 = boto3.client(
                's3',
                endpoint_url=s3_url,
                aws_access_key_id=s3_key,
                aws_secret_access_key=s3_secret,
                config=boto3.session.Config(signature_version='s3v4', connect_timeout=2, retries={'max_attempts': 0}),
                region_name=s.get("S3_REGION", "us-east-1")
            )
            s3.list_objects_v2(Bucket=s3_bucket, MaxKeys=1)
            return "online"
        
        return await asyncio.to_thread(_check)
    except:
        return "error"

@router.get("/")
async def get_health_status(
    x_client_id: Optional[int] = Header(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna o status de conexão baseado no ID do cliente selecionado no Header X-Client-ID.
    """
    if not x_client_id:
        return {"error": "Client ID required"}

    # Busca configurações EXCLUSIVAS do cliente selecionado
    configs = db.query(AppConfig).filter(AppConfig.client_id == x_client_id).all()
    s = {c.key: c.value for c in configs}

    # Dispara as verificações em paralelo para performance
    wa_task = check_whatsapp(s.get("WA_PHONE_NUMBER_ID"), s.get("WA_ACCESS_TOKEN"))
    cw_task = check_chatwoot(s.get("CHATWOOT_API_URL"), s.get("CHATWOOT_API_TOKEN"))
    storage_task = check_storage(s)
    
    # Status do RabbitMQ (Global do sistema, mas essencial)
    rabbit_status = "offline"
    try:
        if rabbitmq.channel and not rabbitmq.channel.is_closed:
            rabbit_status = "online"
    except:
        pass

    results = await asyncio.gather(wa_task, cw_task, storage_task, return_exceptions=True)
    
    wa_res = results[0] if not isinstance(results[0], Exception) else f"Exception: {str(results[0])}"
    cw_res = results[1] if not isinstance(results[1], Exception) else f"Exception: {str(results[1])}"
    st_res = results[2] if not isinstance(results[2], Exception) else f"Exception: {str(results[2])}"

    print(f"DEBUG Health: WA={wa_res}, CW={cw_res}, S3={st_res}, Rabbit={rabbit_status} (Client={x_client_id})")
    
    return {
        "database": "online",
        "rabbitmq": rabbit_status,
        "whatsapp": wa_res,
        "chatwoot": cw_res,
        "storage": st_res
    }

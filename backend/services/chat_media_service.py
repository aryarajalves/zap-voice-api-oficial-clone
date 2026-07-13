import os
import httpx
import tempfile
import mimetypes
from typing import Optional
from core.clients.whatsapp.client import WhatsAppClient
from core.logger import setup_logger

logger = setup_logger("ChatMediaService")

async def upload_media_to_meta_from_url(wa_client: WhatsAppClient, media_url: str, media_type: str) -> Optional[str]:
    """
    Baixa a mídia de uma URL (resolvendo URLs internas do MinIO quando necessário)
    e faz upload para a Meta, retornando o media_id.
    Retorna None se falhar (neste caso, deve-se tentar enviar por link).
    """
    # Resolver URL interna do MinIO: substituir URL pública pelo hostname interno
    internal_url = media_url
    s3_public_url = os.getenv("S3_PUBLIC_URL", "")
    s3_endpoint_url = os.getenv("S3_ENDPOINT_URL", "")
    
    if s3_public_url and s3_endpoint_url and s3_public_url in media_url:
        # Substituir URL pública (localhost:9005) pela URL interna do container (zapvoice-minio:9000)
        internal_url = media_url.replace(s3_public_url, s3_endpoint_url)
        logger.info(f"🔄 [CHAT_MEDIA] Resolvendo URL interna do MinIO: {s3_public_url} -> {s3_endpoint_url}")
    
    # Determinar o tipo MIME correto
    ext_map = {
        "image": "image/jpeg",
        "video": "video/mp4",
        "audio": "audio/ogg",
        "document": "application/pdf"
    }
    
    try:
        # Baixar o arquivo
        async with httpx.AsyncClient(timeout=60.0) as client:
            logger.info(f"📥 [CHAT_MEDIA] Baixando arquivo de: {internal_url}")
            r = await client.get(internal_url)
            if r.status_code != 200:
                logger.error(f"❌ [CHAT_MEDIA] Falha ao baixar arquivo ({r.status_code}): {internal_url}")
                return None
            
            content = r.content
            content_type = r.headers.get("content-type", "").split(";")[0].strip()
            if not content_type or content_type == "application/octet-stream":
                content_type = ext_map.get(media_type, "application/octet-stream")

            # Validação de tamanho por tipo — limites da API Oficial do WhatsApp
            META_LIMITS = {
                "image":    5  * 1024 * 1024,  # 5 MB
                "video":    16 * 1024 * 1024,  # 16 MB
                "audio":    16 * 1024 * 1024,  # 16 MB
                "document": 100 * 1024 * 1024, # 100 MB
            }
            META_LABELS = {
                "image": "5 MB", "video": "16 MB", "audio": "16 MB", "document": "100 MB",
            }
            size_limit = META_LIMITS.get(media_type, 16 * 1024 * 1024)
            if len(content) > size_limit:
                label = META_LABELS.get(media_type, "16 MB")
                file_mb = f"{len(content) / 1024 / 1024:.1f}"
                logger.error(f"❌ [CHAT_MEDIA] Arquivo muito grande para upload na Meta: {file_mb} MB (limite para {media_type}: {label})")
                return None

            
            # Salvar em arquivo temporário
            ext = mimetypes.guess_extension(content_type) or f".{media_type}"
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(content)
                tmp_path = tmp.name
        
        # Upload para a Meta
        logger.info(f"📤 [CHAT_MEDIA] Fazendo upload para a Meta | tipo: {content_type}")
        media_id = await wa_client.upload_media_to_meta(tmp_path, content_type)
        
        if media_id:
            logger.info(f"✅ [CHAT_MEDIA] Upload para Meta bem-sucedido! media_id: {media_id}")
        else:
            logger.error(f"❌ [CHAT_MEDIA] Meta não retornou media_id")
        
        return media_id
    except Exception as e:
        logger.error(f"❌ [CHAT_MEDIA] Erro ao fazer upload para a Meta: {e}")
        return None
    finally:
        try:
            if 'tmp_path' in locals() and os.path.exists(tmp_path):
                os.remove(tmp_path)
        except: pass

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Header
from typing import Optional
import shutil
import os
import uuid
from datetime import datetime
from database import SessionLocal
import models
from core.deps import get_db, get_current_user
from core.logger import logger
from sqlalchemy.orm import Session

router = APIRouter()

UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

logger.info("📁 [UPLOADS] Roteador de Uploads carregado com sucesso.")

@router.get("/upload-probe")
def probe():
    return {"status": "ok", "module": "uploads"}

@router.post("/upload", summary="Upload de arquivo (Imagem, Vídeo, PDF, Áudio)")
async def upload_file(
    file: UploadFile = File(...),
    x_client_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Realiza o upload de um arquivo para o servidor e retorna a URL pública.
    Suporta imagens, vídeos, PDFs e áudios.
    """
    logger.info(f"📥 [UPLOAD_START] Recebido arquivo: {file.filename} | Client ID: {x_client_id} | Type: {file.content_type}")
    
    if not x_client_id or x_client_id == "undefined" or x_client_id == "null":
        logger.error("❌ [UPLOAD_ERROR] Client ID não fornecido ou inválido no header X-Client-ID")
        raise HTTPException(status_code=400, detail="Client ID não fornecido ou inválido")
    
    try:
        x_client_id_int = int(x_client_id)
    except ValueError:
        logger.error(f"❌ [UPLOAD_ERROR] Client ID inválido: {x_client_id}")
        raise HTTPException(status_code=400, detail=f"Client ID inválido: {x_client_id}")

    # Validar extensão
    allowed_extensions = {
        # Imagens
        '.jpg', '.jpeg', '.png', '.gif', '.webp',
        # Vídeos
        '.mp4', '.3gp',
        # Documentos
        '.pdf', '.docx', '.xlsx', '.pptx', '.txt', '.zip', '.rar',
        # Áudios
        '.mp3', '.ogg', '.wav', '.aac', '.m4a', '.webm'
    }
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        logger.warning(f"⚠️ [UPLOAD_REJECTED] Extensão '{ext}' não permitida para o arquivo {file.filename}")
        raise HTTPException(
            status_code=400, 
            detail=f"Extensão '{ext}' não permitida. Aceitamos formatos de imagem, vídeo, áudio e documentos."
        )

    # Validar Tamanho por Tipo de Arquivo — limites expandidos para E-mail Marketing e Sistema
    LIMITS_BY_TYPE = {
        "image":    50  * 1024 * 1024, # 50 MB
        "video":   250  * 1024 * 1024, # 250 MB
        "audio":    50  * 1024 * 1024, # 50 MB
        "document": 250 * 1024 * 1024, # 250 MB
    }
    LIMIT_LABELS = {
        "image": "50 MB", "video": "250 MB", "audio": "50 MB", "document": "250 MB",
    }

    # Detectar tipo pelo content-type
    ct = file.content_type or ""
    if ct.startswith("image/"):
        detected_type = "image"
    elif ct.startswith("video/"):
        detected_type = "video"
    elif ct.startswith("audio/"):
        detected_type = "audio"
    else:
        detected_type = "document"

    max_size = LIMITS_BY_TYPE[detected_type]
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)

    logger.info(f"⚖️ [UPLOAD_SIZE] Arquivo: {file.filename} | Tamanho: {file_size / 1024 / 1024:.2f} MB | Tipo: {detected_type}")

    if file_size > max_size:
        limit_label = LIMIT_LABELS[detected_type]
        file_mb = f"{file_size / 1024 / 1024:.1f}"
        logger.warning(f"⚠️ [UPLOAD_REJECTED] Arquivo muito grande: {file_mb} MB (limite para {detected_type}: {limit_label})")
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo muito grande ({file_mb} MB). O limite de tamanho permitido é de até {limit_label}."
        )


    # Gerar nome único
    unique_name = f"{uuid.uuid4()}{ext}"

    try:
        from storage import storage
        
        # Realizar Upload (Local ou MinIO conforme ENV)
        logger.info(f"📤 [STORAGE_UPLOADING] Enviando para storage: {unique_name}")
        file_url = storage.upload_file(file.file, unique_name, file.content_type)
        
        logger.info(f"✅ [UPLOAD_SUCCESS] Arquivo disponível em: {file_url}")
        
        # Determinar tipo de mídia
        media_type = "DOCUMENT"
        if file.content_type.startswith("image/"):
            media_type = "IMAGE"
        elif file.content_type.startswith("video/"):
            media_type = "VIDEO"

        # Registrar no banco de dados
        db_media = models.UploadedMedia(
            client_id=x_client_id_int,
            filename=file.filename,
            unique_name=unique_name,
            url=file_url,
            media_type=media_type,
            size=file_size
        )
        db.add(db_media)
        db.commit()
        logger.info(f"💾 [UPLOAD_DB_SAVED] Metadados salvos na tabela uploaded_medias para o cliente {x_client_id_int}")
        
        return {
            "filename": unique_name,
            "url": file_url,
            "type": file.content_type,
            "size": file_size
        }
        
    except Exception as e:
        logger.error(f"❌ [UPLOAD_CRITICAL] Falha ao processar upload: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Falha ao salvar arquivo: {str(e)}")


@router.get("/uploads/list", summary="Listar mídias enviadas pelo cliente")
def list_uploaded_media(
    media_type: Optional[str] = None,
    page: int = 1,
    limit: Optional[int] = None,
    x_client_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Retorna todas as mídias salvas pertencentes ao cliente, com suporte a paginação."""
    if not x_client_id or x_client_id == "undefined" or x_client_id == "null":
        raise HTTPException(status_code=400, detail="Client ID não fornecido")
    
    try:
        client_id_int = int(x_client_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Client ID inválido")
    
    query = db.query(models.UploadedMedia).filter(models.UploadedMedia.client_id == client_id_int)
    
    if media_type:
        query = query.filter(models.UploadedMedia.media_type == media_type.upper())
        
    query = query.order_by(models.UploadedMedia.created_at.desc())
    
    total = query.count()
    
    if limit is not None:
        page = max(1, page)
        limit = max(1, limit)
        offset = (page - 1) * limit
        medias = query.offset(offset).limit(limit).all()
        pages = (total + limit - 1) // limit
    else:
        medias = query.all()
        pages = 1
        limit = total
        
    items = [
        {
            "id": m.id,
            "filename": m.filename,
            "unique_name": m.unique_name,
            "url": m.url,
            "media_type": m.media_type,
            "size": m.size,
            "created_at": m.created_at
        } for m in medias
    ]
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages
    }


@router.patch("/uploads/{media_id}/rename", summary="Renomear nome do arquivo de uma mídia salva")
def rename_uploaded_media(
    media_id: int,
    payload: dict,
    x_client_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Permite renomear o filename de uma mídia pertencente ao cliente."""
    if not x_client_id or x_client_id == "undefined" or x_client_id == "null":
        raise HTTPException(status_code=400, detail="Client ID não fornecido")
    
    try:
        client_id_int = int(x_client_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Client ID inválido")
        
    new_filename = payload.get("filename")
    if not new_filename or not isinstance(new_filename, str) or not new_filename.strip():
        raise HTTPException(status_code=400, detail="Novo nome de arquivo é inválido ou vazio")
        
    media = db.query(models.UploadedMedia).filter(
        models.UploadedMedia.id == media_id,
        models.UploadedMedia.client_id == client_id_int
    ).first()
    
    if not media:
        raise HTTPException(status_code=404, detail="Mídia não encontrada ou acesso negado")
        
    media.filename = new_filename.strip()
    db.commit()
    logger.info(f"✏️ [UPLOAD_RENAME] Mídia {media_id} renomeada para '{media.filename}' pelo cliente {client_id_int}")
    
    return {
        "id": media.id,
        "filename": media.filename,
        "url": media.url
    }


@router.delete("/uploads/{media_id}", summary="Excluir uma mídia física e logicamente")
def delete_uploaded_media(
    media_id: int,
    x_client_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Exclui fisicamente o arquivo do MinIO/S3 e remove os metadados do banco de dados."""
    if not x_client_id or x_client_id == "undefined" or x_client_id == "null":
        raise HTTPException(status_code=400, detail="Client ID não fornecido")
    
    try:
        client_id_int = int(x_client_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Client ID inválido")
        
    media = db.query(models.UploadedMedia).filter(
        models.UploadedMedia.id == media_id,
        models.UploadedMedia.client_id == client_id_int
    ).first()
    
    if not media:
        raise HTTPException(status_code=404, detail="Mídia não encontrada ou acesso negado")
        
    # Exclusão física
    try:
        from storage import storage
        storage.delete_file(media.unique_name)
    except Exception as e:
        logger.error(f"⚠️ [UPLOAD_DELETE_WARNING] Falha na exclusão física do arquivo {media.unique_name}: {e}")
        
    # Exclusão lógica no banco de dados
    db.delete(media)
    db.commit()
    logger.info(f"🗑️ [UPLOAD_DELETE] Mídia {media_id} removida do banco de dados pelo cliente {client_id_int}")
    
    return {"status": "success", "message": "Mídia removida com sucesso"}


@router.get("/media/proxy/{filename}", summary="Proxy de arquivo do storage/MinIO")
async def get_media_proxy(filename: str):
    """
    Retorna o arquivo do storage (MinIO) diretamente pelo backend de forma pública,
    garantindo acessibilidade mesmo em túneis sem porta do MinIO aberta.
    """
    try:
        from storage import storage
        file_obj = storage.get_file(filename)
        if not file_obj:
            raise HTTPException(status_code=404, detail="Arquivo não encontrado")
        
        from fastapi.responses import StreamingResponse
        ext = os.path.splitext(filename)[1].lower()
        content_type = "application/octet-stream"
        if ext in ['.jpg', '.jpeg']:
            content_type = "image/jpeg"
        elif ext == '.png':
            content_type = "image/png"
        elif ext == '.gif':
            content_type = "image/gif"
        elif ext == '.webp':
            content_type = "image/webp"
        elif ext == '.mp4':
            content_type = "video/mp4"
        elif ext == '.mp3':
            content_type = "audio/mpeg"
        elif ext in ['.ogg', '.oga']:
            content_type = "audio/ogg"
        elif ext == '.wav':
            content_type = "audio/wav"
        elif ext == '.pdf':
            content_type = "application/pdf"
            
        return StreamingResponse(file_obj, media_type=content_type)
    except Exception as e:
        logger.error(f"❌ [MEDIA_PROXY_ERROR] Falha ao ler arquivo {filename}: {str(e)}")
        raise HTTPException(status_code=404, detail="Erro ao ler arquivo do storage")


from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Header
from typing import Optional
import shutil
import os
import uuid
from datetime import datetime
from database import SessionLocal
import models
from core.deps import get_current_user
from core.logger import logger

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
        '.jpg', '.jpeg', '.png',
        # Vídeos
        '.mp4',
        # Documentos
        '.pdf',
        # Áudios
        '.mp3', '.ogg', '.wav', '.aac'
    }
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        logger.warning(f"⚠️ [UPLOAD_REJECTED] Extensão '{ext}' não permitida para o arquivo {file.filename}")
        raise HTTPException(
            status_code=400, 
            detail=f"Extensão '{ext}' não permitida. Aceitamos apenas: PNG, JPG, JPEG, PDF, MP4 e Áudios."
        )

    # Validar Tamanho (Máximo 16MB para WhatsApp)
    MAX_SIZE = 16 * 1024 * 1024 # 16MB
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    
    logger.info(f"⚖️ [UPLOAD_SIZE] Arquivo: {file.filename} | Tamanho: {file_size / 1024 / 1024:.2f} MB")

    if file_size > MAX_SIZE:
        logger.warning(f"⚠️ [UPLOAD_REJECTED] Arquivo muito grande: {file_size / 1024 / 1024:.2f} MB")
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo muito grande ({file_size / 1024 / 1024:.2f}MB). O limite do WhatsApp é de 16MB."
        )

    # Gerar nome único
    unique_name = f"{uuid.uuid4()}{ext}"

    try:
        from storage import storage
        
        # Realizar Upload (Local ou MinIO conforme ENV)
        logger.info(f"📤 [STORAGE_UPLOADING] Enviando para storage: {unique_name}")
        file_url = storage.upload_file(file.file, unique_name, file.content_type)
        
        logger.info(f"✅ [UPLOAD_SUCCESS] Arquivo disponível em: {file_url}")
        
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

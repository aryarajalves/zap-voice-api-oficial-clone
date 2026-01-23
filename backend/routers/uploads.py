
from fastapi import APIRouter, File, UploadFile, HTTPException
import magic
import os
import uuid
import shutil
from storage import storage
import models
from fastapi import Depends
from core.deps import get_current_user
from core.logger import setup_logger

logger = setup_logger(__name__) 

router = APIRouter()

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user)):
    # 1. Validação de Extensão (Fail Fast)
    filename = file.filename.lower()
    forbidden_extensions = ['.exe', '.sh', '.bat', '.py', '.php', '.js', '.dll']
    if any(filename.endswith(ext) for ext in forbidden_extensions):
        raise HTTPException(status_code=400, detail="Esse tipo de arquivo não é permitido por segurança.")
    
    logger.info(f"Fazendo upload de arquivo: {filename}")
    
    # 2. Validação de Conteúdo (Magic Numbers)
    try:
        header = await file.read(2048)
        mime_type = magic.from_buffer(header, mime=True)
        await file.seek(0)
    except Exception as e:
        logger.error(f"Erro magic: {e}")
        raise HTTPException(status_code=400, detail=f"Erro ao validar arquivo: {str(e)}")
        
    logger.info(f"Uploaded File MIME: {mime_type}")

    allowed_mimes = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/x-m4a',
        'video/mp4', 'video/mpeg', 'video/quicktime',
        'application/pdf',
        'text/csv', 'text/plain', 'application/vnd.ms-excel'
    ]
    
    if 'csv' in mime_type or 'spreadsheet' in mime_type or 'excel' in mime_type:
         pass # Ok
    elif mime_type == 'application/octet-stream':
         logger.warning(f"Aviso: Arquivo detectado como octet-stream. Continuando...")
         pass # Permitir octet-stream como fallback
    elif mime_type not in allowed_mimes:
         logger.error(f"Tipo bloqueado: {mime_type}")
         raise HTTPException(status_code=400, detail=f"Tipo de arquivo não suportado ({mime_type}).")

    # 3. Upload para S3 (MinIO)
    file_extension = os.path.splitext(file.filename)[1]
    # Sanitizar extensão
    if len(file_extension) > 10: file_extension = ".bin"
    
    new_filename = f"{uuid.uuid4()}{file_extension}"
    
    try:
        # Envia para o S3
        file_url = storage.upload_file(file.file, new_filename, mime_type)
        logger.info(f"Arquivo enviado para S3: {file_url}")
        
        return {"url": file_url, "mime": mime_type}
        
    except Exception as e:
        logger.error(f"Erro upload S3: {e}")
        # Falha
        raise HTTPException(status_code=500, detail=f"Erro ao salvar arquivo (Storage): {str(e)}")

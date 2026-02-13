from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Header
from typing import Optional
import shutil
import os
import uuid
from datetime import datetime
from database import SessionLocal
import models
from core.deps import get_current_user

router = APIRouter()

UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

print("LOADING UPLOADS ROUTER...")

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
    print(f"DEBUG: upload_file received x_client_id: {x_client_id}")
    
    if not x_client_id or x_client_id == "undefined" or x_client_id == "null":
        raise HTTPException(status_code=400, detail="Client ID não fornecido ou inválido")
    
    try:
        x_client_id = int(x_client_id)
    except ValueError:
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
        raise HTTPException(
            status_code=400, 
            detail=f"Extensão '{ext}' não permitida. Aceitamos apenas: PNG, JPG, JPEG, PDF e MP4."
        )

    # Validar Tamanho (Máximo 16MB para WhatsApp)
    MAX_SIZE = 16 * 1024 * 1024 # 16MB
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo muito grande ({file_size / 1024 / 1024:.2f}MB). O limite do WhatsApp é de 16MB."
        )

    # Gerar nome único
    unique_name = f"{uuid.uuid4()}{ext}"

    try:
        # Importar Storage (lazy import para evitar ciclos se houver, mas aqui é seguro)
        # Assumindo que backend está no path
        from storage import storage
        
        # Realizar Upload (Local ou MinIO conforme ENV)
        file_url = storage.upload_file(file.file, unique_name, file.content_type)
        
        return {
            "filename": unique_name,
            "url": file_url,
            "type": file.content_type,
            "size": 0 # Storage nao retorna size facilmente, mas ok
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Falha ao salvar arquivo: {str(e)}")

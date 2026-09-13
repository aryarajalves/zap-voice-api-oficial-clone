import os
import tempfile
import subprocess
from typing import Optional
import httpx
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File

import models
from core.deps import get_validated_client_id
from core.permissions import require_premium
from core.logger import setup_logger
from config_loader import get_setting
from .client_helper import resolve_client_id

logger = setup_logger(__name__)

router = APIRouter()


@router.post("/upload-template-media", summary="Upload de mídia para cabeçalho de template")
async def upload_template_media(
    file: UploadFile = File(...),
    client_id: Optional[int] = Depends(get_validated_client_id),
    current_user: models.User = Depends(require_premium),
    x_client_id: Optional[int] = None
):
    """
    Faz upload de imagem/vídeo/documento para a Meta Resumable Upload API
    e retorna o header_handle a ser usado na criação de templates.
    
    Para vídeos, realiza transcodificação automática para H.264 + AAC + FastStart
    antes do upload, garantindo compatibilidade no WhatsApp mobile (Android/iPhone).
    """
    target_client_id = resolve_client_id(client_id, x_client_id)
    wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=target_client_id)
    if not wa_token:
        raise HTTPException(status_code=400, detail="WA_ACCESS_TOKEN não configurado.")

    file_bytes = await file.read()

    mime_type = file.content_type or "application/octet-stream"
    is_video = mime_type.startswith("video/") or (file.filename or "").lower().endswith((".mp4", ".mov", ".avi", ".mkv", ".webm"))

    # Transcodificação automática para vídeos: H.264 + AAC + FastStart
    if is_video:
        input_tmp = None
        output_tmp = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as f_in:
                f_in.write(file_bytes)
                input_tmp = f_in.name

            output_tmp = input_tmp.replace(".mp4", "_wpp.mp4")

            logger.info(f"🎬 [Template Upload] Transcodificando vídeo para H.264+AAC+FastStart: {file.filename}")

            ffmpeg_result = subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-i", input_tmp,
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    "-preset", "fast",
                    "-crf", "23",
                    "-c:a", "aac",
                    "-b:a", "128k",
                    "-movflags", "+faststart",
                    output_tmp
                ],
                capture_output=True,
                text=True,
                timeout=300
            )

            if ffmpeg_result.returncode != 0:
                logger.error(f"❌ [Template Upload] FFmpeg falhou: {ffmpeg_result.stderr}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Erro ao processar o vídeo para compatibilidade com WhatsApp: {ffmpeg_result.stderr[-300:]}"
                )

            with open(output_tmp, "rb") as f_out:
                file_bytes = f_out.read()

            mime_type = "video/mp4"
            logger.info(f"✅ [Template Upload] Vídeo transcodificado com sucesso. Tamanho final: {len(file_bytes) / (1024*1024):.1f} MB")

        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=400, detail="Timeout ao processar o vídeo. Tente um arquivo menor.")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ [Template Upload] Erro inesperado na transcodificação: {e}")
            raise HTTPException(status_code=500, detail=f"Erro ao processar vídeo: {str(e)}")
        finally:
            if input_tmp and os.path.exists(input_tmp):
                try: os.remove(input_tmp)
                except: pass
            if output_tmp and os.path.exists(output_tmp):
                try: os.remove(output_tmp)
                except: pass

    file_length = len(file_bytes)

    async with httpx.AsyncClient(timeout=120.0) as http:
        session_res = await http.post(
            "https://graph.facebook.com/v25.0/app/uploads",
            params={
                "file_length": file_length,
                "file_type": mime_type,
                "access_token": wa_token,
            }
        )
        if session_res.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Erro ao criar sessão de upload na Meta: {session_res.text}")

        upload_session_id = session_res.json().get("id")
        if not upload_session_id:
            raise HTTPException(status_code=400, detail="Sessão de upload inválida retornada pela Meta.")

        upload_res = await http.post(
            f"https://graph.facebook.com/v25.0/{upload_session_id}",
            headers={
                "Authorization": f"OAuth {wa_token}",
                "file_offset": "0",
                "Content-Type": mime_type,
            },
            content=file_bytes,
        )
        if upload_res.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Erro ao fazer upload na Meta: {upload_res.text}")

        handle = upload_res.json().get("h")
        if not handle:
            raise HTTPException(status_code=400, detail="Handle não retornado pela Meta após upload.")

        return {"handle": handle, "filename": file.filename, "mime_type": mime_type}

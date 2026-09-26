import io
import os
import re
from typing import Optional, Dict, Any
import httpx
from core.logger import setup_logger

logger = setup_logger("DocumentMemoryService")

def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extrai todo o conteúdo textual de bytes de um arquivo PDF utilizando pypdf."""
    if not pdf_bytes:
        return ""
    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        pages_text = []
        for page in reader.pages:
            t = page.extract_text() or ""
            if t.strip():
                pages_text.append(t.strip())
        return "\n\n".join(pages_text).strip()
    except Exception as e:
        logger.warning(f"⚠️ [PDF_EXTRACT] Falha ao extrair texto do PDF via pypdf: {e}")
        return ""

async def download_or_fetch_pdf_bytes(media_url: str) -> Optional[bytes]:
    """Obtém os bytes do PDF a partir de storage local/MinIO ou download HTTP."""
    if not media_url:
        return None

    # 1. Tentar obter direto do Storage MinIO / Backblaze se for URL de proxy ou storage
    try:
        from storage import storage
        clean_url = media_url.split("?")[0]
        # Extrai nome do arquivo se a URL for proxy interna (/api/media/proxy/...)
        if "/api/media/proxy/" in clean_url:
            file_key = clean_url.split("/api/media/proxy/")[-1]
            try:
                res = storage.get_file(file_key)
                if res and hasattr(res, "read"):
                    return res.read()
            except Exception:
                pass

        # Se for caminho local de uploads
        if "/static/uploads/" in clean_url:
            local_rel = clean_url.split("/static/uploads/")[-1]
            for candidate in [f"static/uploads/{local_rel}", f"/app/static/uploads/{local_rel}"]:
                if os.path.exists(candidate):
                    with open(candidate, "rb") as f:
                        return f.read()
    except Exception as st_err:
        logger.debug(f"Tentativa de storage direto falhou: {st_err}")

    # 2. Download via HTTP assíncrono com timeout
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(media_url)
            if resp.status_code == 200:
                return resp.content
    except Exception as net_err:
        logger.warning(f"⚠️ [PDF_DOWNLOAD] Erro ao baixar PDF da URL '{media_url}': {net_err}")

    return None

async def extract_text_from_media_url(media_url: str) -> Optional[str]:
    """Baixa o documento da URL e extrai seu conteúdo textual."""
    if not media_url:
        return None
    pdf_bytes = await download_or_fetch_pdf_bytes(media_url)
    if pdf_bytes:
        extracted = extract_text_from_pdf_bytes(pdf_bytes)
        if extracted:
            return extracted
    return None

async def resolve_document_details(
    trigger: Any = None,
    message_record: Any = None,
    extra_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Optional[str]]:
    """
    Resolve com precisão os dados de documento anexo para o Webhook de Memória (Opção 1):
    - media_url: URL pública do documento/PDF
    - filename: Nome legível do arquivo anexo
    - document_content: Texto integral contido no documento
    """
    extra = extra_data or {}
    media_url: Optional[str] = extra.get("media_url")
    filename: Optional[str] = extra.get("filename")
    document_content: Optional[str] = extra.get("document_content")

    # 1. Fallback através do message_record (var5 guarda a URL de mídia)
    if not media_url and message_record and getattr(message_record, "var5", None):
        media_url = message_record.var5

    # 2. Resolução através do trigger
    pdata = (getattr(trigger, "processed_data", None) or {}) if trigger else {}
    if isinstance(pdata, dict):
        if not document_content:
            document_content = (
                pdata.get("document_content")
                or pdata.get("mensagem")
                or pdata.get("message_text")
                or pdata.get("texto_leitura")
                or pdata.get("raw_text")
            )
        if not media_url:
            media_url = pdata.get("bussola_pdf_url") or pdata.get("media_url") or pdata.get("pdf_url")
        if not filename:
            filename = pdata.get("bussola_pdf_filename") or pdata.get("filename") or pdata.get("pdf_filename")

    # 3. Resolução via template_components do trigger
    t_components = getattr(trigger, "template_components", None) if trigger else None
    if t_components and isinstance(t_components, list):
        for comp in t_components:
            if str(comp.get("type", "")).lower() == "header":
                params = comp.get("parameters", [])
                for param in params:
                    ptype = str(param.get("type", "")).lower()
                    if ptype in ["document", "image", "video", "audio"]:
                        mdata = param.get(ptype, {})
                        if isinstance(mdata, dict):
                            if not media_url:
                                media_url = mdata.get("link") or mdata.get("url")
                            if ptype == "document" and not filename:
                                filename = mdata.get("filename")

    # 4. Se temos media_url mas ainda falta document_content (ex: PDF externo/manual)
    if media_url and not document_content:
        clean_check = media_url.split("?")[0].lower()
        if clean_check.endswith(".pdf") or "pdf" in clean_check:
            try:
                document_content = await extract_text_from_media_url(media_url)
            except Exception as ex_err:
                logger.warning(f"Não foi possível extrair texto dinâmico do documento {media_url}: {ex_err}")

    # 5. Fallback para nome do arquivo caso haja media_url
    if media_url and not filename:
        clean_name = media_url.split("?")[0].split("/")[-1]
        if clean_name and "." in clean_name:
            filename = clean_name
        elif "pdf" in media_url.lower():
            filename = "Documento.pdf"

    return {
        "media_url": media_url,
        "filename": filename,
        "document_content": document_content
    }

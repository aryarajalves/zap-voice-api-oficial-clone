import os
import time
from fastapi import HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from core.logger import logger

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

_STATIC_MEDIA_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".txt": "text/plain",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".eot": "font/eot",
}

def get_index_with_cache_busting():
    """
    Lê o index.html e injeta timestamp no script de configuração
    para garantir que os navegadores não usem cache antigo.
    """
    index_path = os.path.join(_BASE_DIR, "static", "dist", "index.html")
    if not os.path.exists(index_path):
        logger.error(f"❌ [STATIC] Arquivo index.html não encontrado em: {index_path}")
        return None
    
    try:
        with open(index_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Injeta timestamp no env-config.js para forçar recarregamento
        # Ex: src="/env-config.js" → src="/env-config.js?v=17382910..."
        timestamp = int(time.time())
        content = content.replace(
            'src="/env-config.js"', 
            f'src="/env-config.js?v={timestamp}"'
        )
        return content
    except Exception as e:
        logger.error(f"Erro ao ler index.html para cache busting: {e}")
        return None

def serve_spa_index_response():
    """Retorna resposta HTML do SPA com cabeçalhos anti-cache"""
    content = get_index_with_cache_busting()
    if content:
        response = HTMLResponse(content)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    
    return {
        "message": "ZapVoice API",
        "docs": "/docs",
        "status": "online",
        "version": "1.8.2",
        "mode": "production"
    }

def serve_spa_env_config_response():
    """Serve env-config.js sem cache"""
    config_path = os.path.join(_BASE_DIR, "static", "dist", "env-config.js")
    if os.path.exists(config_path):
        response = FileResponse(config_path, media_type="application/javascript")
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        return response
    raise HTTPException(status_code=404, detail="Config file not found")

def serve_spa_catchall_response(full_path: str):
    """Roteamento coringa do SPA com validação de arquivos estáticos"""
    path_lower = full_path.lower()
    if (
        path_lower.startswith("api") 
        or path_lower.startswith("static") 
        or path_lower.startswith("docs") 
        or path_lower.startswith("openapi") 
        or path_lower.startswith("triggers")
    ):
        raise HTTPException(status_code=404, detail="API route not found via Frontend Catch-all")

    _, ext = os.path.splitext(full_path)
    if ext.lower() in _STATIC_MEDIA_TYPES:
        static_file = os.path.join(_BASE_DIR, "static", "dist", full_path)
        if os.path.isfile(static_file):
            media_type = _STATIC_MEDIA_TYPES[ext.lower()]
            return FileResponse(static_file, media_type=media_type)
        raise HTTPException(status_code=404, detail=f"Static file not found: {full_path}")

    content = get_index_with_cache_busting()
    if content:
        response = HTMLResponse(content)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
        
    return {"message": "Path not found (Frontend not built)"}

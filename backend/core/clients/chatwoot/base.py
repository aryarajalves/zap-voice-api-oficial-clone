import asyncio
import httpx
from datetime import datetime, timezone
from core.logger import setup_logger
from config_loader import get_settings

logger = setup_logger("ChatwootClient")

class ChatwootBase:
    def __init__(self, account_id: str = None, client_id: int = None):
        self.client_id = client_id
        self.settings = get_settings(client_id=self.client_id)
        
        self.account_id = account_id or self.settings.get("CHATWOOT_ACCOUNT_ID", "1")
        self.api_url = self.settings.get("CHATWOOT_API_URL", "https://app.chatwoot.com/api/v1")
        
        if self.api_url and "/api/v1" not in self.api_url:
            self.api_url = f"{self.api_url.rstrip('/')}/api/v1"
            
        self.api_token = self.settings.get("CHATWOOT_API_TOKEN", "")
        self.base_url = f"{self.api_url}/accounts/{self.account_id}"
        self.headers = {
            "api_access_token": self.api_token,
            "Content-Type": "application/json"
        }
        self._inbox_id_cache = None

    def log_debug(self, message):
        """Legacy debug logging kept for compatibility."""
        with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
            timestamp = datetime.now(timezone.utc).isoformat()
            f.write(f"[{timestamp}] [ChatwootClient] {message}\n")

    async def _request(self, method: str, path: str, **kwargs):
        """
        Método centralizado para requisições ao Chatwoot com lógica de Retry (Backoff).
        """
        url = f"{self.base_url}/{path.lstrip('/')}"
        max_retries = 3
        
        for attempt in range(max_retries):
            # Se for POST, PUT ou DELETE, não tentamos novamente para evitar duplicidade (não é idempotente)
            if attempt > 0 and method.upper() in ["POST", "PUT", "DELETE"]:
                break

            async with httpx.AsyncClient(timeout=kwargs.pop("timeout", 15.0)) as client:
                try:
                    response = await client.request(method, url, headers=self.headers, **kwargs)
                    
                    if response.status_code == 429: # Too Many Requests
                        if attempt < max_retries - 1:
                            wait = (2 ** attempt) + 1
                            logger.warning(f"⚠️ [CHATWOOT] Rate Limit (429). Tentativa {attempt+1}/{max_retries}. Aguardando {wait}s...")
                            await asyncio.sleep(wait)
                            continue
                        
                    if response.status_code >= 500: # Server Error
                        if attempt < max_retries - 1:
                            wait = 1
                            logger.warning(f"⚠️ [CHATWOOT] Erro de Servidor ({response.status_code}). Tentativa {attempt+1}/{max_retries}...")
                            await asyncio.sleep(wait)
                            continue
                    
                    if response.status_code >= 400:
                        logger.warning(f"⚠️ [CHATWOOT] Client Error {response.status_code} | Body: {response.text}")

                    response.raise_for_status()
                    
                    if response.status_code == 204 or not response.text.strip():
                        return {"success": True}
                        
                    return response.json()
                except httpx.HTTPError as e:
                    if hasattr(e, 'response') and e.response is not None:
                         status = e.response.status_code
                         logger.error(f"❌ [CHATWOOT ERROR] {status} - {e.response.text}")
                         if 400 <= status < 500 and status != 429:
                             raise e
                    
                    if attempt == max_retries - 1:
                        logger.error(f"❌ [CHATWOOT] Falha definitiva após {max_retries} tentativas: {e}")
                        raise e
                    wait = 1
                    logger.warning(f"⚠️ [CHATWOOT] Erro de conexão ou timeout. Tentativa {attempt+1}/{max_retries}. Erro: {e}")
                    await asyncio.sleep(wait)
        
        return None

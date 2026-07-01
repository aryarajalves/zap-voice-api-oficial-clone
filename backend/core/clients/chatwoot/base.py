import asyncio
import httpx
from datetime import datetime, timezone, timedelta
from core.logger import setup_logger
from config_loader import get_settings

logger = setup_logger("AtendimentoClient")

class ChatwootBase:
    def __init__(self, account_id: str = None, client_id: int = None):
        self.client_id = client_id
        self.settings = get_settings(client_id=self.client_id)
        
        self.account_id = account_id or self.settings.get("CHATWOOT_ACCOUNT_ID", "1")
        api_url_raw = self.settings.get("CHATWOOT_API_URL", "").strip()
        self.api_url = api_url_raw if api_url_raw else "https://app.chatwoot.com/api/v1"
        
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
        import os
        os.makedirs("logs", exist_ok=True)
        with open("logs/zapvoice_debug.log", "a", encoding="utf-8") as f:
            # Usa o mesmo horário de Brasília (GMT-3) e o mesmo formato HH:MM:SS
            # das demais linhas do log (via setup_logger), para que o filtro de
            # horário no Visualizador de Logs funcione corretamente para essas linhas.
            br_now = datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=-3)))
            timestamp = br_now.strftime("%d/%m/%y %H:%M:%S")
            f.write(f"[{timestamp}] [AtendimentoClient] {message}\n")

    async def _request(self, method: str, path: str, **kwargs):
        """
        Método centralizado para requisições ao Chatwoot com lógica de Retry (Backoff).
        """
        url = f"{self.base_url}/{path.lstrip('/')}"
        max_retries = 5
        last_status_code = None
        
        for attempt in range(max_retries):
            # Se for POST, PUT ou DELETE, não tentamos novamente para evitar duplicidade (não é idempotente),
            # EXCETO se o último erro foi de fato um Rate Limit (429), pois a requisição não chegou a ser processada.
            if attempt > 0 and method.upper() in ["POST", "PUT", "DELETE"] and last_status_code != 429:
                break

            async with httpx.AsyncClient(timeout=kwargs.pop("timeout", 15.0)) as client:
                try:
                    response = await client.request(method, url, headers=self.headers, **kwargs)
                    last_status_code = response.status_code
                    
                    if response.status_code == 429: # Too Many Requests
                        if attempt < max_retries - 1:
                            wait = 60.0
                            logger.warning(f"⚠️ [ATENDIMENTO] Rate Limit (429). Tentativa {attempt+1}/{max_retries}. Aguardando {wait:.2f}s...")
                            await asyncio.sleep(wait)
                            continue
                        
                    if response.status_code >= 500: # Server Error
                        if attempt < max_retries - 1:
                            wait = 1
                            logger.warning(f"⚠️ [ATENDIMENTO] Erro de Servidor ({response.status_code}). Tentativa {attempt+1}/{max_retries}...")
                            await asyncio.sleep(wait)
                            continue
                    
                    if response.status_code >= 400:
                        # Limita o corpo logado para evitar poluir o arquivo de log com
                        # páginas de erro HTML inteiras (ex: 404/502 de um servidor remoto).
                        body_preview = response.text[:300].replace("\n", " ") if response.text else ""
                        logger.warning(f"⚠️ [ATENDIMENTO] Client Error {response.status_code} | Body: {body_preview}")

                    response.raise_for_status()
                    
                    if response.status_code == 204 or not response.text.strip():
                        return {"success": True}
                        
                    return response.json()
                except httpx.HTTPError as e:
                    if hasattr(e, 'response') and e.response is not None:
                         status = e.response.status_code
                         last_status_code = status
                         error_preview = e.response.text[:300].replace("\n", " ") if e.response.text else ""
                         logger.error(f"❌ [ATENDIMENTO ERROR] {status} - {error_preview}")
                         if 400 <= status < 500 and status != 429:
                              raise e
                    
                    if attempt == max_retries - 1:
                        logger.error(f"❌ [ATENDIMENTO] Falha definitiva após {max_retries} tentativas: {e}")
                        raise e
                    wait = 1
                    logger.warning(f"⚠️ [ATENDIMENTO] Erro de conexão ou timeout. Tentativa {attempt+1}/{max_retries}. Erro: {e}")
                    await asyncio.sleep(wait)
        
        return None

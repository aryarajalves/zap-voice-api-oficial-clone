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
        Chatwoot foi desativado neste projeto — não fazemos mais nenhuma requisição
        HTTP para o Chatwoot. Este método é o ponto único por onde TODAS as chamadas
        ao Chatwoot passavam (contatos, conversas, labels, agentes, notas privadas etc.),
        então interrompê-lo aqui garante que nenhuma requisição de rede seja feita,
        independente de qual método/mixin tenha chamado.
        Os mixins que consomem o retorno (contacts.py, messages.py, labels.py, agents.py)
        já tratam `None`/ausência de "payload" de forma defensiva (fallback para
        listas vazias / None), então isso não deveria quebrar nenhum call site.
        """
        return None

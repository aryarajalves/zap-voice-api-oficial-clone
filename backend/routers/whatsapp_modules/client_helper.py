import sys
from chatwoot_client import ChatwootClient as BaseChatwootClient


def resolve_client_id(client_id, x_client_id=None):
    """
    Resolve o client_id garantindo que se client_id for uma instancia de Depends (FastAPI injection),
    o fallback utilize x_client_id.
    """
    if isinstance(client_id, int):
        return client_id
    if x_client_id is not None:
        try:
            return int(x_client_id)
        except (ValueError, TypeError):
            return x_client_id
    if isinstance(client_id, str) and client_id.isdigit():
        return int(client_id)
    return None


def get_chatwoot_client(client_id: int):
    """
    Retorna uma instancia de ChatwootClient para o client_id especificado.
    Inspeciona dinamicamente sys.modules['routers.whatsapp'] para permitir
    que mocks de testes unitarios como @patch('routers.whatsapp.ChatwootClient')
    sejam respeitados transparentemente.
    """
    wa_mod = sys.modules.get("routers.whatsapp")
    cls = getattr(wa_mod, "ChatwootClient", BaseChatwootClient) if wa_mod else BaseChatwootClient
    return cls(client_id=client_id)

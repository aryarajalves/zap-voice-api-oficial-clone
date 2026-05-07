from .base import ChatwootBase
from .messages import ChatwootMessagesMixin
from .contacts import ChatwootContactsMixin
from .labels import ChatwootLabelsMixin
from .agents import ChatwootAgentsMixin

class ChatwootClient(
    ChatwootBase,
    ChatwootMessagesMixin,
    ChatwootContactsMixin,
    ChatwootLabelsMixin,
    ChatwootAgentsMixin
):
    """
    Cliente unificado para a API do Chatwoot.
    Composto por múltiplos mixins para manter a separação de responsabilidades.
    """
    def __init__(self, account_id: str = None, client_id: int = None):
        super().__init__(account_id=account_id, client_id=client_id)

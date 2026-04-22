from core.logger import setup_logger
from chatwoot_client import ChatwootClient

logger = setup_logger("DiscoveryService")

async def discover_or_create_chatwoot_conversation(client_id: int, phone: str, name: str = None):
    """
    Tenta localizar um contato e uma conversa ativa no Chatwoot para vincular ao disparo.
    Retorna um dicionário com IDs se localizar, ou None se falhar.
    """
    try:
        cw = ChatwootClient(client_id=client_id)
        
        # 1. Buscar contato pelo telefone
        search_data = await cw._request(
            "GET", 
            "contacts/search", 
            params={"q": phone, "include_contacts": True}
        )
        
        contact_id = None
        if search_data and isinstance(search_data, dict):
            contacts = search_data.get("payload", [])
            clean_phone = "".join(filter(str.isdigit, str(phone)))
            
            for c in contacts:
                raw_phone = c.get("phone_number", "") or ""
                c_digits = "".join(filter(str.isdigit, raw_phone))
                if c_digits.endswith(clean_phone[-8:]):
                    contact_id = c.get("id")
                    break
        
        if not contact_id:
            logger.warning(f"⚠️ [DISCOVERY] Contato não localizado para {phone}")
            return None

        # 2. Buscar conversas para este contato
        conversations = await cw.get_contact_conversations(contact_id=contact_id)
        
        conversation_id = None
        if conversations:
            # Pega a conversa mais recente
            best_conv = conversations[0]
            conversation_id = best_conv.get("id")
            
        logger.info(f"✅ [DISCOVERY] Sincronia concluída para {phone}: Contact {contact_id}, Conv {conversation_id}")
        
        return {
            "conversation_id": conversation_id,
            "contact_id": contact_id,
            "account_id": cw.account_id
        }

    except Exception as e:
        logger.error(f"❌ [DISCOVERY] Falha na descoberta para {phone}: {e}")
        return None

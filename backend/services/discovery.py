from core.logger import setup_logger
from chatwoot_client import ChatwootClient

logger = setup_logger("DiscoveryService")

async def discover_or_create_chatwoot_conversation(client_id: int, phone: str, name: str = None):
    """
    Tenta localizar um contato e uma conversa ativa no Chatwoot para vincular ao disparo.
    Retorna um dicionário com IDs e o Nome se localizar, ou None se falhar.
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
        contact_name = name
        if search_data and isinstance(search_data, dict):
            contacts = search_data.get("payload", [])
            clean_phone = "".join(filter(str.isdigit, str(phone)))
            
            for c in contacts:
                raw_phone = c.get("phone_number", "") or ""
                c_digits = "".join(filter(str.isdigit, raw_phone))
                if c_digits.endswith(clean_phone[-8:]):
                    contact_id = c.get("id")
                    contact_name = c.get("name") or contact_name
                    break
        
        if not contact_id:
            logger.info(f"🔄 [DISCOVERY] Contato não localizado para {phone}. Criando...")
            inbox_id = await cw.get_default_whatsapp_inbox()
            res = await cw.ensure_conversation(phone, name or phone, inbox_id)
            if res:
                logger.info(f"✅ [DISCOVERY] Contato e Conversa criados com sucesso para {phone}")
                return {
                    "conversation_id": res.get("conversation_id"),
                    "contact_id": res.get("contact_id"),
                    "account_id": res.get("account_id"),
                    "contact_name": name or phone
                }
            return None

        # 2. Buscar conversas para este contato
        conversations = await cw.get_contact_conversations(contact_id=contact_id)
        
        conversation_id = None
        if conversations:
            # Pega a conversa mais recente
            best_conv = conversations[0]
            conversation_id = best_conv.get("id")
        
        # 3. [NOVO] Se não houver conversa ativa, garantir a criação
        if not conversation_id:
            logger.info(f"🔄 [DISCOVERY] Nenhuma conversa ativa para {phone}. Criando...")
            inbox_id = await cw.get_default_whatsapp_inbox()
            conv_res = await cw.ensure_conversation(phone, contact_name or phone, inbox_id)
            if conv_res:
                conversation_id = conv_res.get("conversation_id")
            
        logger.info(f"✅ [DISCOVERY] Sincronia concluída para {phone}: Contact {contact_id}, Conv {conversation_id}")
        
        return {
            "conversation_id": conversation_id,
            "contact_id": contact_id,
            "account_id": cw.account_id,
            "contact_name": contact_name
        }

    except Exception as e:
        logger.error(f"❌ [DISCOVERY] Falha na descoberta para {phone}: {e}")
        return None

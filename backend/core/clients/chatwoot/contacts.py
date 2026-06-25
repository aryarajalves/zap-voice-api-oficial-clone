import httpx
from datetime import datetime, timezone, timedelta
from core.logger import setup_logger

logger = setup_logger("ChatwootClient")

class ChatwootContactsMixin:
    async def get_contact_conversations(self, phone: str = None, contact_id: int = None) -> list:
        if not self.api_token:
            return []
        
        if not contact_id and phone:
            clean_phone = "".join(filter(str.isdigit, str(phone)))
            try:
                search_data = await self._request("GET", "contacts/search", params={"q": clean_phone, "include_contacts": True})
                if not search_data or not isinstance(search_data, dict):
                    return []
                contacts = search_data.get("payload", [])
                for c in contacts:
                    raw_phone = c.get("phone_number", "") or ""
                    c_digits = "".join(filter(str.isdigit, raw_phone))
                    if c_digits.endswith(clean_phone[-8:]):
                        contact_id = c.get("id")
                        break
            except Exception as e:
                logger.error(f"Error in get_contact_conversations search: {e}")
                return []
                
        if not contact_id:
            return []
            
        try:
            conv_data = await self._request("GET", f"contacts/{contact_id}/conversations")
            conversations_raw = conv_data.get("payload", []) if isinstance(conv_data, dict) else conv_data
            result = []
            if isinstance(conversations_raw, list):
                for conv in conversations_raw:
                    if not isinstance(conv, dict): continue
                    conv_id = conv.get("id")
                    last_incoming = conv.get("last_non_operator_appearance_at")
                    if not last_incoming:
                        lm_obj = conv.get("last_message")
                        if isinstance(lm_obj, dict) and lm_obj.get("message_type") == 0:
                            last_incoming = lm_obj.get("created_at")
                    last_activity = conv.get("last_activity_at")
                    sort_timestamp = last_incoming or last_activity or 0
                    result.append({
                        "id": conv_id,
                        "last_incoming_at": last_incoming,
                        "last_activity_at": last_activity,
                        "sort_timestamp": sort_timestamp,
                        "inbox_id": conv.get("inbox_id"),
                        "status": conv.get("status")
                    })
            result.sort(key=lambda x: x["sort_timestamp"], reverse=True)
            return result
        except Exception as e:
            logger.error(f"Error fetching conversations: {e}")
            return []

    async def get_conversations(self, inbox_id: int = None):
        if not self.api_token:
            return {"data": {"payload": [{"id": 1, "meta": {"sender": {"name": "Mock User"}}, "inbox_id": 1}]}}
        params = {"inbox_id": inbox_id} if inbox_id else {}
        return await self._request("GET", "conversations", params=params)

    async def get_all_conversations(self, inbox_id: int = None):
        if not self.api_token:
            return [{"id": 1, "meta": {"sender": {"phone_number": "5585999999999"}}}]
        all_conversations = []
        page = 1
        while True:
            params = {"page": page, "status": "all"}
            if inbox_id: params["inbox_id"] = inbox_id
            try:
                data = await self._request("GET", "conversations", params=params)
                payload = []
                if isinstance(data, list): payload = data
                elif isinstance(data, dict):
                    if "payload" in data: payload = data["payload"]
                    elif "data" in data and isinstance(data["data"], dict) and "payload" in data["data"]:
                        payload = data["data"]["payload"]
                    elif "data" in data and isinstance(data["data"], list):
                        payload = data["data"]
                if not payload or not isinstance(payload, list): break
                all_conversations.extend(payload)
                if len(payload) < 25: break
                page += 1
            except Exception as e:
                logger.error(f"Error fetching conversations page {page}: {e}")
                break
        return all_conversations

    async def delete_conversation(self, conversation_id: int):
        return await self._request("DELETE", f"conversations/{conversation_id}")

    async def get_all_contacts(self, inbox_id: int = None):
        all_contacts = []
        page = 1
        while True:
            try:
                params = {"page": page}
                data = await self._request("GET", "contacts", params=params)
                payload = data.get("payload", []) if isinstance(data, dict) else []
                if not payload: break
                all_contacts.extend(payload)
                if len(payload) < 15: break
                page += 1
                if page > 1000: break 
            except Exception as e:
                logger.error(f"Error fetching contacts page {page}: {e}")
                break
        return all_contacts

    async def get_contacts_by_label(self, label: str):
        """
        Busca contatos através das CONVERSAS que possuem a etiqueta informada.
        No Chatwoot, etiquetas podem ser aplicadas a conversas (não ao contato diretamente).
        Esta função percorre todas as conversas com aquela etiqueta, extrai o contato
        de cada uma e retorna uma lista de contatos únicos (deduplicados por phone).
        """
        if not self.api_token:
            return []

        contacts_by_phone = {}  # phone_digits -> contact dict
        page = 1

        while True:
            try:
                params = {
                    "page": page,
                    "status": "all",
                    "labels[]": label,
                }
                data = await self._request("GET", "conversations", params=params)

                # Normaliza a resposta (Chatwoot pode retornar de formas diferentes)
                payload = []
                if isinstance(data, list):
                    payload = data
                elif isinstance(data, dict):
                    if "data" in data and isinstance(data["data"], dict):
                        payload = data["data"].get("payload", [])
                    elif "data" in data and isinstance(data["data"], list):
                        payload = data["data"]
                    elif "payload" in data:
                        payload = data["payload"]

                if not payload or not isinstance(payload, list):
                    break

                for conv in payload:
                    sender = conv.get("meta", {}).get("sender", {})
                    phone_raw = sender.get("phone_number") or ""
                    phone_digits = "".join(filter(str.isdigit, phone_raw))
                    if len(phone_digits) < 8:
                        continue
                    # Deduplicar por telefone
                    if phone_digits not in contacts_by_phone:
                        contacts_by_phone[phone_digits] = {
                            "id": sender.get("id"),
                            "name": sender.get("name"),
                            "phone_number": phone_raw,
                            "email": sender.get("email"),
                        }

                if len(payload) < 25:
                    break
                page += 1
                if page > 1000:
                    break

            except Exception as e:
                logger.error(f"Error fetching conversations by label '{label}' page {page}: {e}")
                break

        return list(contacts_by_phone.values())

    async def delete_contact(self, contact_id: int):
        return await self._request("DELETE", f"contacts/{contact_id}")

    async def create_contact(self, name: str, phone_number: str, inbox_id: int):
        if not self.api_token:
            return {"payload": {"contact": {"id": 999, "name": name, "phone_number": phone_number}}}
        if not phone_number.startswith('+'): phone_number = f"+{phone_number}"
        payload = {"inbox_id": inbox_id, "name": name, "phone_number": phone_number}
        return await self._request("POST", "contacts", json=payload)

    async def update_contact(self, contact_id: int, payload: dict):
        return await self._request("PUT", f"contacts/{contact_id}", json=payload)

    async def search_contact(self, query: str):
        return await self._request("GET", "contacts/search", params={"q": query})

    async def create_conversation(self, contact_id: int, inbox_id: int, source_id: str = None):
        payload = {
            "source_id": source_id or f"api_conv_{int(datetime.now().timestamp())}",
            "inbox_id": inbox_id,
            "contact_id": contact_id,
            "status": "open"
        }
        return await self._request("POST", "conversations", json=payload)

    async def is_within_24h_window(self, conversation_id: int):
        if not self.api_token: return False 
        try:
            data = await self._request("GET", f"conversations/{conversation_id}/messages")
            messages = data.get("payload", []) if isinstance(data, dict) else []
            if not messages: return False
            sorted_msgs = sorted(messages, key=lambda x: x.get('created_at', 0), reverse=True)
            for msg in sorted_msgs:
                if msg.get("message_type") == 0:
                    m_ts = msg.get("created_at")
                    m_dt = datetime.fromtimestamp(m_ts, tz=timezone.utc)
                    if datetime.now(timezone.utc) - m_dt < timedelta(hours=24):
                        return True
                    return False
            return False
        except Exception as e:
            logger.error(f"Error in is_within_24h_window: {e}")
            return False

    async def find_existing_conversation(self, phone_number: str, inbox_id: int = None) -> dict | None:
        """
        Busca uma conversa existente para o contato SEM criar uma nova.
        Prioriza conversas abertas com interação recente.
        Retorna dict com conversation_id e contact_id, ou None se não encontrar.
        """
        if not self.api_token:
            return None

        clean_phone = ''.join(filter(str.isdigit, phone_number))
        contact_id = None

        # Variações de número para buscar
        search_queries = [clean_phone, f"+{clean_phone}"]
        if clean_phone.startswith("55"):
            if len(clean_phone) == 13:
                search_queries.append(clean_phone[:4] + clean_phone[5:])
            elif len(clean_phone) == 12:
                search_queries.append(clean_phone[:4] + "9" + clean_phone[4:])
        if len(clean_phone) >= 8:
            search_queries.append(clean_phone[-8:])

        # Buscar contato existente
        for q in search_queries:
            try:
                search_res = await self.search_contact(q)
                if search_res and search_res.get("payload"):
                    contact_id = search_res["payload"][0].get("id")
                    break
            except Exception:
                continue

        if not contact_id:
            logger.info(f"🔍 [FIND_CONV] Contato não encontrado para {clean_phone} — sem conversa existente.")
            return None

        # Buscar conversas do contato
        try:
            conversations = await self.get_contact_conversations(contact_id=contact_id)
        except Exception as e:
            logger.error(f"❌ [FIND_CONV] Erro ao buscar conversas do contato {contact_id}: {e}")
            return None

        if not conversations:
            logger.info(f"🔍 [FIND_CONV] Nenhuma conversa encontrada para contato {contact_id}.")
            return None

        # Filtrar por inbox_id se fornecido
        eligible = [c for c in conversations if not inbox_id or c.get("inbox_id") == inbox_id]
        if not eligible:
            eligible = conversations  # Relaxar filtro se não houver match de inbox

        # Ordenar por atividade mais recente para pegar sempre a conversa mais nova
        def _conv_sort_key(c):
            ts = c.get("last_activity_at") or c.get("created_at") or 0
            return ts if isinstance(ts, (int, float)) else 0

        eligible = sorted(eligible, key=_conv_sort_key, reverse=True)

        # Verificar janela de 24h da Meta: conversas com atividade recente têm prioridade máxima
        from datetime import datetime, timezone, timedelta
        now_ts = datetime.now(timezone.utc).timestamp()
        window_24h = now_ts - (24 * 3600)

        def _has_meta_window(c):
            ts = c.get("last_activity_at") or 0
            return isinstance(ts, (int, float)) and ts > window_24h

        # 1ª tentativa: open + janela de 24h aberta (conversa mais recente)
        for conv in eligible:
            if conv.get("status") == "open" and _has_meta_window(conv):
                conversation_id = conv["id"]
                logger.info(f"✅ [FIND_CONV] Conversa {conversation_id} selecionada com janela Meta 24h aberta para {clean_phone}.")
                break

        # 2ª tentativa: open sem janela (qualquer open, mais recente)
        if not conversation_id:
            for conv in eligible:
                if conv.get("status") == "open":
                    conversation_id = conv["id"]
                    logger.info(f"⚠️ [FIND_CONV] Conversa {conversation_id} selecionada (open, sem janela Meta 24h) para {clean_phone}.")
                    break

        # 3ª tentativa: pending ou resolved mais recente
        if not conversation_id:
            for status_pref in ['pending', 'resolved']:
                for conv in eligible:
                    if conv.get("status") == status_pref:
                        conversation_id = conv["id"]
                        break
                if conversation_id:
                    break

        if not conversation_id and eligible:
            conversation_id = eligible[0]["id"]

        if conversation_id:
            logger.info(f"✅ [FIND_CONV] Conversa existente {conversation_id} encontrada para {clean_phone}.")
            return {"conversation_id": conversation_id, "contact_id": contact_id}

        return None

    async def ensure_conversation(self, phone_number: str, name: str, inbox_id: int = None):
        if not inbox_id:
            cfg_inbox_id = self.settings.get("CHATWOOT_SELECTED_INBOX_ID")
            if cfg_inbox_id and str(cfg_inbox_id).isdigit():
                inbox_id = int(cfg_inbox_id)

        clean_phone = ''.join(filter(str.isdigit, phone_number))
        search_queries = [clean_phone, f"+{clean_phone}"]
        if clean_phone.startswith("55"):
            if len(clean_phone) == 13: search_queries.append(clean_phone[:4] + clean_phone[5:])
            elif len(clean_phone) == 12: search_queries.append(clean_phone[:4] + "9" + clean_phone[4:])
        if len(clean_phone) >= 8: search_queries.append(clean_phone[-8:])

        # Busca todas as variações de contato possíveis para cobrir duplicados de 9º dígito
        found_contacts = []
        for q in search_queries:
            try:
                search_res = await self.search_contact(q)
                if search_res and search_res.get("payload"):
                    for c in search_res["payload"]:
                        c_id = c.get("id")
                        if c_id and c_id not in found_contacts:
                            found_contacts.append(c_id)
            except Exception as e_search:
                logger.warning(f"⚠️ [CHATWOOT] Erro ao buscar contato com query '{q}': {e_search}")

        contact_id = None
        conversation_id = None

        # 1. Tentar encontrar uma conversa com janela de 24h ativa entre TODOS os contatos encontrados
        for c_id in found_contacts:
            conversations = await self.get_contact_conversations(contact_id=c_id)
            if conversations:
                eligible_convs = [c for c in conversations if not inbox_id or c.get("inbox_id") == inbox_id]
                for conv in eligible_convs[:5]:
                    if await self.is_within_24h_window(conv["id"]):
                        conversation_id = conv["id"]
                        contact_id = c_id
                        break
            if conversation_id:
                break

        # 2. Se nenhuma janela estiver ativa, tentar reaproveitar a conversa mais recente de qualquer contato (open > pending > resolved)
        if not conversation_id and found_contacts:
            for status_pref in ['open', 'pending', 'resolved']:
                for c_id in found_contacts:
                    conversations = await self.get_contact_conversations(contact_id=c_id)
                    if conversations:
                        eligible_convs = [c for c in conversations if not inbox_id or c.get("inbox_id") == inbox_id]
                        for conv in eligible_convs:
                            if conv.get("status") == status_pref:
                                conversation_id = conv["id"]
                                contact_id = c_id
                                break
                    if conversation_id:
                        break
                if conversation_id:
                    break

        # 3. Se achamos contatos mas nenhuma conversa existente, usamos o primeiro contato encontrado
        if not contact_id and found_contacts:
            contact_id = found_contacts[0]

        # 4. Se não achamos nenhum contato pré-existente nas buscas, criamos um novo
        if not contact_id and inbox_id:
            res = await self.create_contact(name or phone_number, phone_number, inbox_id)
            if res and res.get("payload"):
                contact_id = res["payload"]["contact"]["id"]
        
        if not conversation_id and inbox_id:
            res_inboxes = []
            try:
                res_inboxes_data = await self._request("GET", f"contacts/{contact_id}/contact_inboxes")
                if isinstance(res_inboxes_data, list):
                    res_inboxes = res_inboxes_data
                elif isinstance(res_inboxes_data, dict) and "payload" in res_inboxes_data:
                    res_inboxes = res_inboxes_data["payload"]
            except Exception as e_inb:
                logger.warning(f"⚠️ [CHATWOOT] Could not fetch contact_inboxes for {contact_id}: {e_inb}")
            
            source_id = clean_phone
            if res_inboxes and isinstance(res_inboxes, list):
                for ci in res_inboxes:
                    if ci.get("inbox_id") == inbox_id:
                        source_id = ci.get("source_id")
                        break
            new_conv = await self.create_conversation(contact_id, inbox_id, source_id=source_id)
            if new_conv: conversation_id = new_conv["id"]

        if conversation_id:
             return {"conversation_id": conversation_id, "contact_id": contact_id, "account_id": self.account_id}
        return None

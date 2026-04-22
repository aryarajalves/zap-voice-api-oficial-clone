import os
from typing import Union, List
import json
import tempfile
import mimetypes
from datetime import datetime, timezone, timedelta
import httpx
from core.logger import setup_logger
from config_loader import get_setting

logger = setup_logger("ChatwootClient")

# Defina estes valores ou use variáveis de ambiente (via config_loader)
# CHATWOOT_API_URL = get_setting("CHATWOOT_API_URL", "https://app.chatwoot.com/api/v1")
# CHATWOOT_API_TOKEN = get_setting("CHATWOOT_API_TOKEN", "")
# CHATWOOT_ACCOUNT_ID = get_setting("CHATWOOT_ACCOUNT_ID", "1")
# WA_BUSINESS_ACCOUNT_ID = get_setting("WA_BUSINESS_ACCOUNT_ID", "")
# WA_ACCESS_TOKEN = get_setting("WA_ACCESS_TOKEN", "")

class ChatwootClient:
    def __init__(self, account_id: str = None, client_id: int = None):
        self.client_id = client_id
        
        # Otimização: Carrega todas as configurações de uma vez
        from config_loader import get_settings
        self.settings = get_settings(client_id=self.client_id)
        
        # Prefer env var/db setting if not passed
        self.account_id = account_id or self.settings.get("CHATWOOT_ACCOUNT_ID", "1")
        self.api_url = self.settings.get("CHATWOOT_API_URL", "https://app.chatwoot.com/api/v1")
        # Auto-fix URL if /api/v1 is missing
        if self.api_url and "/api/v1" not in self.api_url:
            self.api_url = f"{self.api_url.rstrip('/')}/api/v1"
        self.api_token = self.settings.get("CHATWOOT_API_TOKEN", "")
        
        self.base_url = f"{self.api_url}/accounts/{self.account_id}"
        self.headers = {
            "api_access_token": self.api_token,
            "Content-Type": "application/json"
        }
        self._inbox_id_cache = None
    
    async def _request(self, method: str, path: str, **kwargs):
        """
        Método centralizado para requisições ao Chatwoot com lógica de Retry (Backoff).
        """
        import asyncio
        url = f"{self.base_url}/{path.lstrip('/')}"
        max_retries = 3
        
        for attempt in range(max_retries):
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
                        # Erros 4xx (exceto 429) não devem ser repetidos automaticamente
                        logger.warning(f"⚠️ [CHATWOOT] Client Error {response.status_code} | Body: {response.text}")

                    response.raise_for_status()
                    
                    if response.status_code == 204 or not response.text.strip():
                        return {"success": True}
                        
                    return response.json()
                except httpx.HTTPError as e:
                    # Verifica se é um erro que NÃO deve ser repetido (4xx)
                    if hasattr(e, 'response') and e.response is not None:
                         status = e.response.status_code
                         logger.error(f"❌ [CHATWOOT ERROR] {status} - {e.response.text}")
                         if 400 <= status < 500 and status != 429:
                             raise e # Aborta imediatamente para que o chamador decida o fallback
                    
                    if attempt == max_retries - 1:
                        logger.error(f"❌ [CHATWOOT] Falha definitiva após {max_retries} tentativas: {e}")
                        raise e
                    wait = 1
                    logger.warning(f"⚠️ [CHATWOOT] Erro de conexão ou timeout. Tentativa {attempt+1}/{max_retries}. Erro: {e}")
                    await asyncio.sleep(wait)
        
        return None

    def log_debug(self, message):
         with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
             timestamp = datetime.now(timezone.utc).isoformat()
             f.write(f"[{timestamp}] [ChatwootClient] {message}\n")

    async def send_message(self, conversation_id: int, content: str, private: bool = False, message_type: str = "outgoing"):
        if not self.api_token:
            logger.debug(f"Chatwoot Token not set. Mocking send_message ({message_type}).")
            return {"id": 123, "content": content, "message_type": message_type}

        payload = {
            "content": content,
            "private": private,
            "message_type": message_type
        }
            
        return await self._request("POST", f"conversations/{conversation_id}/messages", json=payload)

    async def get_contact_conversations(self, phone: str = None, contact_id: int = None) -> list:
        """
        Busca todas as conversas de um contato pelo número de telefone ou contact_id via Chatwoot API.
        Retorna lista de dicts com 'id' e 'last_activity_at' para verificar janela 24h.
        """
        if not self.api_token:
            return []
        
        if not contact_id and phone:
            clean_phone = "".join(filter(str.isdigit, str(phone)))
            try:
                # Busca contato pelo telefone
                search_data = await self._request(
                    "GET", 
                    "contacts/search", 
                    params={"q": clean_phone, "include_contacts": True}
                )
                
                if not search_data or not isinstance(search_data, dict):
                    return []
                    
                contacts = search_data.get("payload", [])
                if not contacts:
                    return []
                
                # Filtra o contato que bate melhor com o telefone
                for c in contacts:
                    raw_phone = c.get("phone_number", "") or ""
                    c_digits = "".join(filter(str.isdigit, raw_phone))
                    if c_digits.endswith(clean_phone[-8:]):
                        contact_id = c.get("id")
                        break
                
                if not contact_id:
                    logger.warning(f"🔍 [CHATWOOT DISCOVERY] Nenhum contato encontrado para o telefone {phone}")
                    return []
                
                logger.info(f"🔍 [CHATWOOT DISCOVERY] Contato localizado: ID {contact_id} para {phone}")
            except Exception as e:
                logger.error(f"Error in search_contact get_contact_conversations: {e}")
                return []
                
        if not contact_id:
            return []
            
        try:
            # Busca conversas do contato
            conv_data = await self._request("GET", f"contacts/{contact_id}/conversations")
            
            if not conv_data:
                return []
                
            # Chatwoot pode retornar a lista direta ou dentro de payload
            conversations_raw = conv_data.get("payload", []) if isinstance(conv_data, dict) else conv_data
            
            result = []
            if isinstance(conversations_raw, list):
                for conv in conversations_raw:
                    if not isinstance(conv, dict):
                        continue
                        
                    conv_id = conv.get("id")
                    
                    # 🎯 Prioridade 1: Última mensagem do CLIENTE (Incoming)
                    last_incoming = conv.get("last_non_operator_appearance_at")
                    
                    # 🎯 Prioridade 2: Objeto last_message do tipo contact (0)
                    if not last_incoming:
                        lm_obj = conv.get("last_message")
                        if isinstance(lm_obj, dict) and lm_obj.get("message_type") == 0: # 0 = incoming/contact
                            last_incoming = lm_obj.get("created_at")
                    
                    # 🎯 Prioridade 3: Atividade geral
                    last_activity = conv.get("last_activity_at")
                    
                    # Timestamp para ordenação (usa incoming se disponível, senão activity)
                    sort_timestamp = last_incoming or last_activity or 0
                    
                    result.append({
                        "id": conv_id,
                        "last_incoming_at": last_incoming,
                        "last_activity_at": last_activity,
                        "sort_timestamp": sort_timestamp,
                        "inbox_id": conv.get("inbox_id"),
                        "status": conv.get("status")
                    })
            
            # Ordena por timestamp de interação (Mais recente primeiro)
            result.sort(key=lambda x: x["sort_timestamp"], reverse=True)
            return result
        except Exception as e:
            logger.error(f"Error fetching conversations get_contact_conversations: {e}")
            return []

    async def send_private_note(self, conversation_id: int, content: str):
        """
        Sends a private internal note to the conversation.
        """
        return await self.send_message(conversation_id, content, private=True)

    async def create_private_note(self, conversation_id: int, content: str):
        """
        Alias for send_private_note to accommodate different naming conventions in the worker.
        """
        return await self.send_private_note(conversation_id, content)

    async def send_attachment(self, conversation_id: int, url: str, attachment_type: str, custom_filename: str = None, caption: str = None):
        if not self.api_token:
            self.log_debug(f"Chatwoot Token not set. Mocking send_attachment ({attachment_type}): {url}")
            return {"id": 124, "content": url, "attachment": True}

        self.log_debug(f"DEBUG: send_attachment called with URL: {url}, type: {attachment_type}")

        import mimetypes
        from urllib.parse import unquote

        # Extrair caminho do arquivo da URL local
        file_path = None
        if "static/uploads" in url:
            try:
                # Pega tudo depois de /static/ (ex: uploads/arquivo.mp3)
                file_name_part = url.split("/static/")[1] 
                file_name_part = unquote(file_name_part)
                
                # Resolução robusta de caminho absoluto
                base_path = os.path.dirname(os.path.abspath(__file__)) 
                # Constrói caminho completo: backend/static/uploads/arquivo.mp3
                # Use split('/') to ensure cross-platform join if url has /
                parts = file_name_part.split('/')
                file_path = os.path.join(base_path, "static", *parts)
                file_path = os.path.normpath(file_path)
                
                logger.debug(f"DEBUG: Resolving path for URL {url} -> {file_path}")
                self.log_debug(f"DEBUG: Resolving path for URL {url} -> {file_path}")
                logger.debug(f"DEBUG: File exists: {os.path.exists(file_path)}")
            except Exception as e:
                logger.error(f"Error parsing local URL: {e}")
        
        # Try finding by filename directly if URL path logic fails
        if not file_path or not os.path.exists(file_path):
             try:
                 filename = url.split("/")[-1]
                 base_path = os.path.dirname(os.path.abspath(__file__))
                 potential_path = os.path.join(base_path, "static", "uploads", filename)
                 if os.path.exists(potential_path):
                     self.log_debug(f"DEBUG: Found file using fallback filename match: {potential_path}")
                     file_path = potential_path
             except:
                 pass
        
        # NEW: Download from URL if not found locally (Handles MinIO/S3/External URLs)
        temp_download_path = None
        if not file_path or not os.path.exists(file_path):
            try:
                self.log_debug(f"DEBUG: File not found locally. Attempting to download from URL: {url}")
                async with httpx.AsyncClient(timeout=30.0) as dl_client:
                    dl_response = await dl_client.get(url)
                    if dl_response.status_code == 200:
                         # Create generic temp file
                         import tempfile
                         filename = url.split("/")[-1]
                         if not filename: filename = f"temp_file_{int(datetime.now(timezone.utc).timestamp())}"
                         
                         # Use system temp dir to avoid permission issues
                         temp_dir = tempfile.gettempdir()
                         temp_download_path = os.path.join(temp_dir, filename)
                         
                         with open(temp_download_path, "wb") as f:
                             f.write(dl_response.content)
                         
                         file_path = temp_download_path
                         self.log_debug(f"DEBUG: Successfully downloaded to temp path: {file_path}")
                    else:
                        self.log_debug(f"DEBUG: Failed to download file from URL. Status: {dl_response.status_code}")
            except Exception as e:
                self.log_debug(f"DEBUG: Error downloading remote file: {e}")

        if not file_path or not os.path.exists(file_path):
             self.log_debug(f"File not found locally: {file_path}. Sending as text link.")
             content = f"[{attachment_type.upper()}] {url}\n⚠️ Arquivo local não encontrado: {file_path}"
             return await self.send_message(conversation_id, content)

        # Preparar headers sem Content-Type
        upload_headers = self.headers.copy()
        upload_headers.pop("Content-Type", None)

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                mime_type, _ = mimetypes.guess_type(file_path)
                if not mime_type:
                    mime_type = 'application/octet-stream'
                
                self.log_debug(f"DEBUG: Uploading {file_path} with mime {mime_type}")

                with open(file_path, "rb") as f:
                    final_filename = custom_filename or os.path.basename(file_path)
                    
                    # Ensure extension matches unless forcing generic file
                    # If user provided name without extension, try to append original extension
                    if custom_filename and '.' not in custom_filename:
                         orig_ext = os.path.splitext(file_path)[1]
                         final_filename += orig_ext

                    # Forçar extensão .opus para tentar o reconhecimento de PTT no WhatsApp
                    if attachment_type == 'audio':
                         final_filename = os.path.splitext(final_filename)[0] + '.opus'
                         # Force mime-type to audio/ogg for OGG/OPUS files to be accepted as PTT by WA
                         mime_type = 'audio/ogg'

                    files = {'attachments[]': (final_filename, f, mime_type)}
                    data = {
                        'message_type': 'outgoing', 
                        'private': 'false',
                        'content': caption or ''
                    }
                    
                    self.log_debug(f"DEBUG: Sending to Chatwoot with filename: {final_filename} and data: {data}")

                    response = await client.post(
                        f"{self.base_url}/conversations/{conversation_id}/messages",
                        data=data,
                        files=files,
                        headers=upload_headers
                    )
                
                self.log_debug(f"DEBUG: Chatwoot Response Status: {response.status_code}")
                try:
                    self.log_debug(f"DEBUG: Chatwoot Response Body: {response.text}")
                except:
                    pass
                
                response.raise_for_status()
                
                # Cleanup temp file if downloaded
                if temp_download_path and os.path.exists(temp_download_path):
                    try:
                        os.remove(temp_download_path)
                        self.log_debug(f"DEBUG: Cleaned up temp file: {temp_download_path}")
                    except:
                        pass
                        
                return response.json()
            except httpx.HTTPError as e:
                self.log_debug(f"Error sending attachment to Chatwoot: {e}")
                err_msg = str(e)
                if hasattr(e, 'response') and e.response:
                    self.log_debug(f"Response: {e.response.text}")
                    err_msg += f" | Resp: {e.response.text[:100]}"
                
                return await self.send_message(conversation_id, f"[{attachment_type}] {url}\n⚠️ Erro HTTP: {err_msg}")
            except Exception as e:
                 self.log_debug(f"Unexpected error: {e}")
                 return await self.send_message(conversation_id, f"[{attachment_type}] {url}\n⚠️ Erro Inesperado: {str(e)}")

    async def get_conversations(self, inbox_id: int = None):
        if not self.api_token:
            logger.debug("Chatwoot Token not set. Mocking get_conversations.")
            return {"data": {"payload": [{"id": 1, "meta": {"sender": {"name": "Mock User"}}, "inbox_id": 1}]}}

        params = {}
        if inbox_id:
            params["inbox_id"] = inbox_id

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.get(
                    f"{self.base_url}/conversations",
                    headers=self.headers,
                    params=params
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                logger.error(f"Error fetching conversations: {e}")
                raise e

    async def get_all_conversations(self, inbox_id: int = None):
        """
        Busca todas as conversas do Chatwoot usando paginação.
        Retorna uma lista plana de todos os objetos 'payload'.
        """
        if not self.api_token:
            return [{"id": 1, "meta": {"sender": {"phone_number": "5585999999999"}}}]

        all_conversations = []
        page = 1
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            while True:
                params = {"page": page, "status": "all"} # Busca TODOS os status (open, resolved, etc)
                if inbox_id:
                    params["inbox_id"] = inbox_id
                
                try:
                    self.log_debug(f"Fetching conversations page {page} for inbox {inbox_id} with status=all...")
                    response = await client.get(
                        f"{self.base_url}/conversations",
                        headers=self.headers,
                        params=params
                    )
                    self.log_debug(f"Chatwoot API Status: {response.status_code}")
                    response.raise_for_status()
                    data = response.json()
                    
                    # O Chatwoot pode retornar a lista em diferentes formatos dependendo da versão/endpoint:
                    # 1. Direto como lista: [...]
                    # 2. Dentro de payload: {"payload": [...]}
                    # 3. Dentro de data -> payload: {"data": {"payload": [...]}}
                    
                    payload = []
                    if isinstance(data, list):
                        payload = data
                    elif isinstance(data, dict):
                        if "payload" in data:
                            payload = data["payload"]
                        elif "data" in data and isinstance(data["data"], dict) and "payload" in data["data"]:
                            payload = data["data"]["payload"]
                        elif "data" in data and isinstance(data["data"], list):
                            payload = data["data"]
                    
                    self.log_debug(f"Found {len(payload)} conversations on page {page}")
                    if not payload or not isinstance(payload, list):
                        break
                        
                    if payload and isinstance(payload, list) and page == 1:
                        self.log_debug(f"SAMPLE CONVERSATION [ID={payload[0].get('id')}, DisplayID={payload[0].get('display_id')}]: {str(payload[0])[:500]}")
                        
                    all_conversations.extend(payload)
                    
                    # Se vier menos de 25 (limite padrão), provavelmente é a última página
                    if len(payload) < 25:
                        break
                        
                    page += 1
                except httpx.HTTPError as e:
                    logger.error(f"Error fetching conversations page {page}: {e}")
                    break
        
        return all_conversations

    async def delete_conversation(self, conversation_id: int, client: httpx.AsyncClient = None):
        """
        Exclui uma conversa no Chatwoot.
        """
        if not self.api_token:
            logger.debug(f"Mocking delete_conversation: {conversation_id}")
            return {"success": True}

        async def _do_delete(cl):
            try:
                url = f"{self.base_url}/conversations/{conversation_id}"
                self.log_debug(f"📤 Request: DELETE {url}")
                response = await cl.delete(
                    url,
                    headers=self.headers
                )
                
                if response.status_code in [200, 204]:
                    self.log_debug(f"✅ Conversation {conversation_id} deleted successfully.")
                    return {"success": True}
                else:
                    self.log_debug(f"⚠️ [Chatwoot API Error] DELETE {url} returned {response.status_code}. Body: {response.text[:1000]}")
                
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    self.log_debug(f"Conversation {conversation_id} already deleted or not found (404).")
                    return {"success": True, "note": "already_deleted"}
                self.log_debug(f"❌ HTTP error deleting conversation {conversation_id}: {e}")
                raise e
            except Exception as e:
                self.log_debug(f"❌ Unexpected error deleting conversation {conversation_id}: {e}")
                raise e

        if client:
            return await _do_delete(client)
        
        async with httpx.AsyncClient(timeout=15.0) as standalone_client:
            return await _do_delete(standalone_client)

    async def get_all_contacts_stream(self, inbox_id: int = None):
        """
        Busca contatos no Chatwoot (gerador para streaming).
        """
        if not self.api_token:
             return

        page = 1
        async with httpx.AsyncClient(timeout=30.0) as client:
            while True:
                try:
                    params = {"page": page}
                    url = f"{self.base_url}/contacts"
                    response = await client.get(url, headers=self.headers, params=params)
                    
                    if response.status_code != 200:
                        break
                        
                    data = response.json()
                    payload = data.get("payload", [])
                    if not payload:
                        break
                        
                    yield payload
                    
                    if len(payload) < 15:
                        break
                        
                    page += 1
                    if page > 1000: break 
                except Exception as e:
                    self.log_debug(f"❌ Erro ao buscar contatos página {page}: {e}")
                    break

    async def get_all_contacts(self, inbox_id: int = None):
        """
        Busca todos os contatos e retorna uma lista completa.
        """
        all_contacts = []
        async for page in self.get_all_contacts_stream(inbox_id):
            all_contacts.extend(page)
        return all_contacts

    async def delete_contact(self, contact_id: int, client: httpx.AsyncClient = None):
        """
        Exclui um contato no Chatwoot.
        """
        self.log_debug(f"DEBUG: delete_contact entry for {contact_id}")
        if not self.api_token:
            return {"success": True}

        async def _do_delete(cl):
            try:
                url = f"{self.base_url}/contacts/{contact_id}"
                self.log_debug(f"📤 Request: DELETE {url}")
                response = await cl.delete(
                    url,
                    headers=self.headers
                )
                self.log_debug(f"📥 Response [{response.status_code}] for DELETE {url}")
                
                if response.status_code in [200, 204]:
                    self.log_debug(f"✅ Contact {contact_id} deleted successfully.")
                    return {"success": True}
                else:
                    self.log_debug(f"⚠️ [Chatwoot API Error] DELETE {url} returned {response.status_code}. Body: {response.text[:500]}")
                    return {"success": False, "status": response.status_code}
            except Exception as e:
                self.log_debug(f"❌ Error in _do_delete for {contact_id}: {e}")
                return {"success": False, "error": str(e)}

        if client:
            return await _do_delete(client)
        else:
            async with httpx.AsyncClient(timeout=15.0) as cl:
                return await _do_delete(cl)

    async def get_inboxes(self):
        # Use settings from DB if available
        selected_inbox_id = self.settings.get("CHATWOOT_SELECTED_INBOX_ID")
        
        if not self.api_token:
            logger.debug("Chatwoot Token not set. Mocking get_inboxes.")
            # return [{"id": 1, "name": "Whatsapp Support", "channel_type": "Channel::Whatsapp"}, {"id": 2, "name": "Website Live Chat", "channel_type": "Channel::WebWidget"}]
            # Return mocked data that respects the logic for testing
            inboxes = [{"id": 1, "name": "Whatsapp Support", "channel_type": "Channel::Whatsapp"}, {"id": 2, "name": "Website Live Chat", "channel_type": "Channel::WebWidget"}]
        else:
            async with httpx.AsyncClient(timeout=15.0) as client:
                try:
                    response = await client.get(
                        f"{self.base_url}/inboxes",
                        headers=self.headers
                    )
                    response.raise_for_status()
                    inboxes = response.json().get("payload", [])
                except httpx.HTTPError as e:
                    logger.error(f"Error fetching inboxes: {e}")
                    raise e
        
        filtered = []
        
        # 1. Check if specific IDs are requested
        selected_ids = []
        if selected_inbox_id and selected_inbox_id.strip():
            try:
                selected_ids = [int(x.strip()) for x in selected_inbox_id.split(',') if x.strip()]
            except ValueError:
                logger.debug(f"Invalid CHATWOOT_SELECTED_INBOX_ID format: {selected_inbox_id}")

        if selected_ids:
            # If IDs are set, we return exactly those, regardless of type (Trust the User)
            filtered = [i for i in inboxes if i.get('id') in selected_ids]
            if not filtered:
                available_ids = [ib.get('id') for ib in inboxes]
                logger.warning(f"⚠️ [CHATWOOT] Inbox IDs {selected_ids} not found. Available IDs: {available_ids}. Falling back to automatic WhatsApp detection.")
                # Fallback to default WhatsApp detection if specific IDs are missing
                filtered = [i for i in inboxes if 'whatsapp' in i.get('channel_type', '').lower()]
        else:
            # Default behavior: Filter ONLY WhatsApp
            filtered = [i for i in inboxes if 'whatsapp' in i.get('channel_type', '').lower()]
        return filtered

    async def create_agent(self, name: str, email: str, role: str = "agent"):
        """
        Cria um novo agente (usuário) na conta do Chatwoot.
        """
        if not self.api_token:
            logger.error("❌ [CHATWOOT] Tentativa de criar agente sem API Token configurado.")
            raise ValueError("Chatwoot API Token não configurado.")

        payload = {
            "name": name,
            "email": email,
            "role": role
        }
        
        logger.info(f"🚀 [CHATWOOT] Criando agente: {name} ({email}) - Role: {role}")
        try:
            result = await self._request("POST", "agents", json=payload)
            logger.info(f"✅ [CHATWOOT] Agente criado com sucesso: {result.get('id') if result else 'N/A'}")
            return result
        except Exception as e:
            logger.error(f"❌ [CHATWOOT] Erro ao criar agente: {str(e)}")
            raise e
    
    async def list_agents(self):
        """
        Lista todos os agentes da conta no Chatwoot.
        """
        if not self.api_token:
            return []
        return await self._request("GET", "agents")

    async def delete_agent(self, agent_id: int):
        """
        Remove um agente da conta no Chatwoot.
        """
        if not self.api_token:
            logger.error("❌ [CHATWOOT] Tentativa de deletar agente sem API Token configurado.")
            raise ValueError("Chatwoot API Token não configurado.")
        return await self._request("DELETE", f"agents/{agent_id}")
    
    async def get_default_whatsapp_inbox(self):
        if self._inbox_id_cache:
            return self._inbox_id_cache
            
        inboxes = await self.get_inboxes()
        if inboxes:
            # Prefer ones that have "whatsapp" in the name or channel_type
            best_id = None
            for ib in inboxes:
                if "whatsapp" in ib.get("channel_type", "").lower() or "whatsapp" in ib.get("name", "").lower():
                    best_id = ib["id"]
                    break
            if not best_id:
                best_id = inboxes[0]["id"]
            
            self._inbox_id_cache = best_id
            return best_id
        return None

    async def get_accounts(self):
        if not self.api_token:
             return [{"id": 1, "name": "Mock Account"}]

        # Ajuste de URL: profile fica na raiz da API, não dentro de /accounts/{id}
        # CHATWOOT_API_URL ex: https://app.chatwoot.com/api/v1
        profile_url = f"{self.api_url}/profile"
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.get(profile_url, headers=self.headers)
                response.raise_for_status()
                # Retorna a lista de contas associada ao perfil
                return response.json().get("accounts", [])
            except httpx.HTTPError as e:
                logger.error(f"Error fetching accounts: {e}")
                raise e

    async def toggle_typing(self, conversation_id: int, status: str = 'on'):
        # status: 'on' or 'off'
        if not self.api_token:
            logger.debug(f"Chatwoot Token not set. Mocking toggle_typing: {status}")
            return

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/conversations/{conversation_id}/toggle_typing",
                    json={"typing_status": status},
                    headers=self.headers
                )
                if response.status_code not in [200, 204]:
                     logger.debug(f"DEBUG: Toggle typing {status} failed ({response.status_code}): {response.text}")
                else:
                     logger.debug(f"DEBUG: Toggle typing {status} Success ({response.status_code})")

            except httpx.HTTPError as e:
                logger.error(f"Error toggling typing status: {e}")
    async def send_interactive_message(self, phone_number: str, body_text: str, buttons: list):
        """
        Envia mensagem interativa (sessão) com botões de resposta via WhatsApp Cloud API.
        buttons: lista de strings ou dicts com 'title'
        """
        wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
        
        if not wa_phone_id or not wa_token:
            return {"error": True, "detail": "Configuração do WhatsApp ausente"}
            
        clean_phone = ''.join(filter(str.isdigit, phone_number))
        url = f"https://graph.facebook.com/v24.0/{wa_phone_id}/messages"
        headers = {"Authorization": f"Bearer {wa_token}", "Content-Type": "application/json"}
        
        formatted_buttons = []
        for i, btn in enumerate(buttons[:3]): # Max 3 botões
            title = btn if isinstance(btn, str) else btn.get('title', '...')
            formatted_buttons.append({
                "type": "reply",
                "reply": {"id": f"btn_{i}", "title": title[:20]}
            })
            
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": body_text[:1024]},
                "action": {"buttons": formatted_buttons}
            }
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                
                if response.status_code not in [200, 201]:
                    try:
                        error_data = response.json()
                        err_msg = error_data.get("error", {}).get("message", response.text)
                    except:
                        err_msg = response.text
                    
                    logger.error(f"❌ [Meta API Error] Interactive send failed! Status: {response.status_code}")
                    logger.error(f"❌ Detail: {err_msg}")
                    return {"error": True, "detail": err_msg}
                    
                data = response.json()
                data["success"] = True
                return data
            except Exception as e:
                logger.error(f"❌ [Meta API Error] Exception during interactive send: {e}")
                return {"error": True, "detail": str(e)}

    async def send_template(self, phone_number: str, template_name: str, language_code: str = "pt_BR", components: list = None):
        """
        Envia template diretamente via WhatsApp Cloud API (Meta/Facebook).
        phone_number deve estar no formato internacional sem '+' (ex: 5585999999999)
        components: lista de componentes do template (botões, etc)
        """
        wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
        
        if not wa_phone_id or not wa_token:
            logger.debug(f"❌ WhatsApp credentials not set for client {self.client_id}. Cannot send template.")
            return {"error": True, "detail": "Configuração do WhatsApp ausente (Token ou ID)"}
            
        # Remove caracteres não numéricos do telefone
        clean_phone = ''.join(filter(str.isdigit, phone_number))
        
        url = f"https://graph.facebook.com/v24.0/{wa_phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {wa_token}",
            "Content-Type": "application/json"
        }
        
        # Debug logging
        logger.debug(f"DEBUG: Received components from frontend: {components}")
        
        # Components sent from frontend are already formatted correctly
        # Just ensure lowercase type field for WhatsApp API and fix pluralization
        send_components = []
        # --- SELF-HEALING: Parameter Validation against Cache ---
        try:
            from database import SessionLocal
            from models import WhatsAppTemplateCache
            import re
            
            db = SessionLocal()
            tpl_cache = db.query(WhatsAppTemplateCache).filter(
                WhatsAppTemplateCache.name == template_name,
                WhatsAppTemplateCache.client_id == self.client_id
            ).first()
            db.close()
            
            if tpl_cache and tpl_cache.body:
                # Count placeholders like {{1}}, {{2}}...
                placeholders = re.findall(r"\{\{(\d+)\}\}", tpl_cache.body)
                required_count = len(set(placeholders)) # Distinct indices
                
                # Find body component in current request
                body_comp = next((c for c in components if c.get("type") == "body"), None)
                if body_comp:
                    current_params = body_comp.get("parameters", [])
                    if len(current_params) > required_count:
                        logger.warning(f"⚠️ [SELF-HEALING] Template '{template_name}' expects {required_count} variables but {len(current_params)} were provided. Pruning...")
                        body_comp["parameters"] = current_params[:required_count]
                    elif len(current_params) < required_count:
                        logger.warning(f"⚠️ [SELF-HEALING] Template '{template_name}' expects {required_count} variables but only {len(current_params)} were provided. This might still fail at Meta.")
        except Exception as sh_err:
            logger.warning(f"⚠️ [SELF-HEALING] Failed to validate template parameters: {sh_err}")

        # Transform and check components (Media, etc)
        send_components = []
        if components:
            for comp in components:
                comp_copy = comp.copy()
                # WhatsApp API expects 'button' (singular) or 'BUTTON'
                comp_type = comp.get('type', '').lower()
                if comp_type == 'buttons':
                    comp_type = 'button'
                
                comp_copy['type'] = comp_type
                send_components.append(comp_copy)
        
        # Build template object
        template_obj = {
            "name": template_name,
            "language": {
                "code": language_code
            }
        }
        
        # Add transformed components if any
        if send_components:
            template_obj["components"] = send_components
        
        payload = {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "template",
            "template": template_obj
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                logger.info(f"📤 [Meta API] Enviando Template '{template_name}' para {clean_phone}")
                import json as json_module
                # Reduced logging level for large payloads to avoid log flooding
                logger.info(f"📤 [Meta API Payload]: {json_module.dumps(payload, ensure_ascii=False)}")
                
                response = await client.post(url, json=payload, headers=headers)
                
                logger.debug(f"DEBUG: Response Status: {response.status_code}")
                # Removed detailed body logging from INFO to avoid noise in prod
                
                if response.status_code not in [200, 201]:
                    try:
                        resp_data = response.json()
                        err_detail = resp_data.get("error", {}).get("message", response.text)
                        err_code = resp_data.get("error", {}).get("code")
                        err_subcode = resp_data.get("error", {}).get("error_subcode")
                        logger.error(f"❌ [Meta API Error] Template send failed! Status: {response.status_code}")
                        logger.error(f"❌ Detail: {err_detail} (Code: {err_code}, Subcode: {err_subcode})")
                        
                        # Special Log for #132000
                        if str(err_code) == "132000":
                             logger.error("💡 DICA: O número de variáveis enviadas não bate com o template na Meta. Clique em 'Sincronizar Templates' no ZapVoice.")

                        return {"error": True, "detail": err_detail, "code": err_code, "subcode": err_subcode}
                    except:
                        logger.error(f"❌ [Meta API Error] Raw Response ({response.status_code}): {response.text}")
                        return {"error": True, "detail": response.text}
                else:
                    logger.info(f"✅ [Meta API Success] Template '{template_name}' accepted for {clean_phone}")
                    data = response.json()
                    data["success"] = True
                    return data
            except Exception as e:
                logger.error(f"Error in send_template: {e}")
                return {"error": True, "detail": str(e)}


    async def get_whatsapp_templates(self):
        wa_account_id = get_setting("WA_BUSINESS_ACCOUNT_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)

        if not wa_account_id or not wa_token:
             logger.warning("WhatsApp Environment Variables (WA_BUSINESS_ACCOUNT_ID, WA_ACCESS_TOKEN) not set.")
             return []

        # Added limit to ensure we get all templates
        url = f"https://graph.facebook.com/v24.0/{wa_account_id}/message_templates?limit=250"
        logger.debug(f"DEBUG: Fetching templates from: {url}")
        headers = {
            "Authorization": f"Bearer {wa_token[:10]}...",
            "Content-Type": "application/json"
        }
        headers["Authorization"] = f"Bearer {wa_token}" # Restore full token
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                data = response.json()
                
                raw_list = data.get("data", [])
                logger.debug(f"Fetched {len(raw_list)} templates from Meta API.")

                templates = []
                for t in raw_list:
                    status = t.get("status")
                    # Debug log to see all found templates in console
                    logger.debug(f"DEBUG: Template found: {t.get('name')} | Status: {status} | Lang: {t.get('language')}")
                    
                    body_text = next(
                        (c.get("text") for c in t.get("components", []) if c.get("type") == "BODY"),
                        None
                    )
                    
                    templates.append({
                        "name": t.get("name"),
                        "language": t.get("language"),
                        "category": t.get("category"),
                        "id": t.get("id"),
                        "status": status,
                        "body_text": body_text,
                        "components": t.get("components", []),
                        "rejection_reason": t.get("rejection_reason"),
                        "quality_score": t.get("quality_score", {}).get("score") if t.get("quality_score") else None
                    })
                
                logger.info(f"DEBUG: Returning {len(templates)} templates.")

                # Upsert no cache local
                try:
                    from database import SessionLocal
                    from models import WhatsAppTemplateCache
                    db = SessionLocal()
                    for t in templates:
                        body_text = next(
                            (c.get("text") for c in t.get("components", []) if c.get("type") == "BODY"),
                            None
                        )
                        # Busca pelo ID (PK) para garantir upsert correto e evitar UniqueViolation
                        existing = db.query(WhatsAppTemplateCache).get(int(t["id"]))
                        
                        if existing:
                            existing.name = t["name"]
                            existing.language = t["language"]
                            existing.body = body_text
                            existing.components = t.get("components")
                            existing.client_id = self.client_id # Garante vínculo correto
                        else:
                            db.add(WhatsAppTemplateCache(
                                id=int(t["id"]),
                                client_id=self.client_id,
                                name=t["name"],
                                language=t["language"],
                                body=body_text,
                                components=t.get("components")
                            ))
                    db.commit()
                    db.close()
                except Exception as cache_err:
                    logger.warning(f"⚠️ Falha ao salvar cache de templates: {cache_err}")

                return templates
            except httpx.HTTPError as e:
                logger.error(f"Error fetching WA templates: {e}")
                if hasattr(e, 'response') and e.response:
                    logger.error(f"Details: {e.response.text}")
                return []


    async def create_whatsapp_template(self, data: dict):
        """
        Creates a WhatsApp template on Meta Graph API.
        """
        wa_account_id = get_setting("WA_BUSINESS_ACCOUNT_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)

        if not wa_account_id or not wa_token:
            return {"error": "WhatsApp credentials not set in database for this client."}

        url = f"https://graph.facebook.com/v24.0/{wa_account_id}/message_templates"
        headers = {
            "Authorization": f"Bearer {wa_token}",
            "Content-Type": "application/json"
        }

        # Build Components Payload
        components = []
        
        # 1. Header
        h_type = data.get("header_type", "NONE").upper()
        if h_type != "NONE":
            h_comp = {"type": "HEADER", "format": h_type}
            if h_type == "TEXT" and data.get("header_text"):
                h_comp["text"] = data.get("header_text")
            elif h_type in ["IMAGE", "VIDEO", "DOCUMENT"] and data.get("header_media_url"):
                h_comp["example"] = {
                    "header_handle": [data.get("header_media_url")]
                }
            components.append(h_comp)

        # 2. Body
        import re as _re
        body_text = data.get("body_text", "")
        body_comp = {"type": "BODY", "text": body_text}
        var_indices = sorted(set(int(v) for v in _re.findall(r'\{\{(\d+)\}\}', body_text)))
        if var_indices:
            body_comp["example"] = {
                "body_text": [["Exemplo" + str(i) for i in var_indices]]
            }
        components.append(body_comp)

        # 3. Footer
        if data.get("footer_text"):
            components.append({
                "type": "FOOTER",
                "text": data.get("footer_text")
            })

        # 4. Buttons
        raw_buttons = data.get("buttons", [])
        if raw_buttons:
            components.append({
                "type": "BUTTONS",
                "buttons": raw_buttons
            })

        payload = {
            "name": data.get("name").lower().replace(" ", "_"),
            "category": data.get("category", "MARKETING").upper(),
            "language": data.get("language", "pt_BR"),
            "components": components
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                import json as _json
                logger.info(f"🚀 [Meta API] Creating template: {payload['name']}")
                logger.debug(f"📦 [Meta API] Full payload:\n{_json.dumps(payload, ensure_ascii=False, indent=2)}")
                response = await client.post(url, json=payload, headers=headers)

                if response.status_code not in [200, 201]:
                    error_data = response.json()
                    err_msg = error_data.get("error", {}).get("message", "Unknown error")
                    err_code = error_data.get("error", {}).get("code")
                    err_subcode = error_data.get("error", {}).get("error_subcode")
                    err_details = error_data.get("error", {}).get("error_user_msg", "")
                    logger.error(f"❌ [Meta API] Template creation failed: {err_msg} | code={err_code} subcode={err_subcode} | user_msg={err_details}")
                    logger.error(f"❌ [Meta API] Full error response: {_json.dumps(error_data, ensure_ascii=False)}")
                    logger.error(f"❌ [Meta API] Payload sent was:\n{_json.dumps(payload, ensure_ascii=False, indent=2)}")
                    friendly_msg = err_details or err_msg
                    return {"error": friendly_msg, "status_code": response.status_code, "detail": error_data}

                logger.info(f"✅ [Meta API] Template created successfully!")
                return response.json()

            except Exception as e:
                logger.error(f"❌ Error communicating with Meta API: {e}")
                return {"error": str(e)}

    async def edit_whatsapp_template(self, template_id: str, data: dict):
        """
        Edits an existing WhatsApp template on Meta Graph API.
        """
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)

        if not wa_token:
            return {"error": "WhatsApp credentials not set in database for this client."}

        # Meta API for editing: POST /vXX.X/{template-id}
        url = f"https://graph.facebook.com/v24.0/{template_id}"
        headers = {
            "Authorization": f"Bearer {wa_token}",
            "Content-Type": "application/json"
        }

        # Build Components Payload
        components = []
        
        # 1. Header
        h_type = data.get("header_type", "NONE").upper()
        if h_type != "NONE":
            h_comp = {"type": "HEADER", "format": h_type}
            if h_type == "TEXT" and data.get("header_text"):
                h_comp["text"] = data.get("header_text")
            elif h_type in ["IMAGE", "VIDEO", "DOCUMENT"] and data.get("header_media_url"):
                media_url = data.get("header_media_url", "")
                is_meta_url = "whatsapp" in media_url or "facebook" in media_url or "fbcdn" in media_url
                if not is_meta_url:
                    h_comp["example"] = {
                        "header_handle": [media_url] 
                    }
            components.append(h_comp)

        # 2. Body
        import re as _re
        body_text = data.get("body_text", "")
        body_comp = {"type": "BODY", "text": body_text}
        var_indices = sorted(set(int(v) for v in _re.findall(r'\{\{(\d+)\}\}', body_text)))
        if var_indices:
            body_comp["example"] = {
                "body_text": [["Exemplo" + str(i) for i in var_indices]]
            }
        components.append(body_comp)

        # 3. Footer
        if data.get("footer_text"):
            components.append({
                "type": "FOOTER",
                "text": data.get("footer_text")
            })

        # 4. Buttons
        raw_buttons = data.get("buttons", [])
        if raw_buttons:
            components.append({
                "type": "BUTTONS",
                "buttons": raw_buttons
            })

        payload = {
            "components": components
        }
        
        if data.get("category"):
             payload["category"] = data.get("category").upper()

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                import json as _json
                logger.info(f"🚀 [Meta API] Editing template ID: {template_id}")
                logger.debug(f"📦 [Meta API] Full edit payload:\n{_json.dumps(payload, ensure_ascii=False, indent=2)}")
                response = await client.post(url, json=payload, headers=headers)

                if response.status_code not in [200, 201]:
                    error_data = response.json()
                    err_msg = error_data.get("error", {}).get("message", "Unknown error")
                    err_code = error_data.get("error", {}).get("code")
                    err_subcode = error_data.get("error", {}).get("error_subcode")
                    err_details = error_data.get("error", {}).get("error_user_msg", "")
                    logger.error(f"❌ [Meta API] Template edit failed: {err_msg} | code={err_code} subcode={err_subcode} | user_msg={err_details}")
                    logger.error(f"❌ [Meta API] Full error response: {_json.dumps(error_data, ensure_ascii=False)}")
                    logger.error(f"❌ [Meta API] Payload sent was:\n{_json.dumps(payload, ensure_ascii=False, indent=2)}")
                    friendly_msg = err_details or err_msg
                    return {"error": friendly_msg, "status_code": response.status_code, "detail": error_data}

                logger.info(f"✅ [Meta API] Template edited successfully!")
                return response.json()

            except Exception as e:
                logger.error(f"❌ Error communicating with Meta API: {e}")
                return {"error": str(e)}

    async def is_within_24h_window(self, conversation_id: int):
        """
        Verifica se a conversa está dentro da janela de 24 horas do WhatsApp,
        baseado na última mensagem INCOMING (do cliente).
        """
        if not self.api_token:
            return False 

        url = f"{self.base_url}/conversations/{conversation_id}/messages"
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                # Chatwoot messages list returns sorted by created_at desc (paginated)
                response = await client.get(url, headers=self.headers)
                
                if response.status_code != 200:
                    logger.error(f"❌ [24h Check] Failed to fetch messages for conv {conversation_id}: {response.status_code}")
                    return False

                messages = response.json().get("payload", [])
                
                if not messages:
                    logger.info(f"ℹ️ [24h Check] No messages found for conv {conversation_id}. Window Closed.")
                    return False

                # Find latest incoming message (message_type == 0)
                # Messages are usually returned latest first if not specified otherwise
                # Most Chatwoot installations return desc by default for /messages
                
                # Sort messages by created_at DESC just in case
                sorted_msgs = sorted(messages, key=lambda x: x.get('created_at', 0), reverse=True)
                
                for msg in sorted_msgs:
                    m_type = msg.get("message_type") # 0=Incoming, 1=Outgoing (Bot/Agent), 2=System
                    if m_type == 0:
                        m_ts = msg.get("created_at")
                        try:
                            m_dt = datetime.fromtimestamp(m_ts, tz=timezone.utc)
                            if datetime.now(timezone.utc) - m_dt < timedelta(hours=24):
                                logger.info(f"🎯 [24h Check] Window OPEN. Latest incoming message at {m_dt}")
                                return True
                            else:
                                logger.info(f"⏳ [24h Check] Window CLOSED. Latest incoming message at {m_dt}")
                                return False
                        except:
                            continue
                
                logger.info(f"ℹ️ [24h Check] No incoming messages found for conv {conversation_id} in first page. Window Closed.")
                return False
            except Exception as e:
                logger.error(f"Error in is_within_24h_window: {e}")
                return False

                for msg in sorted_msgs:
                    # CHECK MESSAGE TYPE:
                    # 0 = Incoming (User sent)
                    # 1 = Outgoing (Agent sent)
                    # 2 = Template (Sent via API/Template)
                    if msg.get("message_type") == 0: 
                        last_incoming_ts = msg.get("created_at")
                        break
                
                if not last_incoming_ts:
                    logger.info(f"ℹ️ [24h Check] No incoming messages (Type 0) found in conversation {conversation_id}. Window Closed.")
                    return False
                
                # Convert timestamp to datetime (Chatwoot created_at is unix timestamp int)
                last_incoming_dt = datetime.fromtimestamp(last_incoming_ts, tz=timezone.utc)
                now_dt = datetime.now(timezone.utc)
                
                diff = now_dt - last_incoming_dt
                
                # WINDOW RULE: 24 Hours
                is_open = diff < timedelta(hours=24)
                
                status_str = "OPEN ✅" if is_open else "CLOSED 🔒"
                logger.info(f"🕒 [24h Check] Final Verdict for Conv {conversation_id}:")
                logger.info(f"   Last Incoming: {last_incoming_dt} (UTC)")
                logger.info(f"   Now:           {now_dt} (UTC)")
                logger.info(f"   Diff:          {diff}")
                logger.info(f"   Result:        {status_str}")
                
                return is_open

            except Exception as e:
                logger.error(f"❌ [24h Check] Exception verifying window: {e}")
                return False

    async def update_template_status(self, template_id: str, status: str):
        """
        Updates the status of a WhatsApp template.
        NOTE: Meta only allows MANUALLY UNPAUSING a template that was paused by them.
        Manual pausing via API is not currently supported.
        """
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
        if not wa_token:
            return {"error": "WhatsApp credentials not set."}

        status_upper = status.upper()
        
        # Meta uses a specific endpoint for unpausing
        if status_upper == "UNPAUSED":
            url = f"https://graph.facebook.com/v24.0/{template_id}/unpause"
            payload = {} # No payload needed for /unpause
        else:
            # If they try anything else (like PAUSED), we try the standard status update,
            # but Meta usually doesn't allow manual pausing via API.
            url = f"https://graph.facebook.com/v24.0/{template_id}"
            payload = {"status": status_upper}

        headers = {
            "Authorization": f"Bearer {wa_token}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                logger.info(f"🚀 [Meta API] Action {status_upper} on template {template_id}")
                response = await client.post(url, json=payload, headers=headers)
                
                if response.status_code not in [200, 201]:
                    error_data = response.json()
                    err_msg = error_data.get("error", {}).get("message", "Unknown error")
                    
                    # Se for tentativa de PAUSE manual, dar um erro mais amigável
                    if status_upper == "PAUSED" and "invalid" in err_msg.lower():
                        err_msg = "A Meta não permite pausar templates manualmente via API, apenas reativá-los."
                        
                    logger.error(f"❌ [Meta API] Status action failed: {err_msg}")
                    return {"error": err_msg}
                return {"success": True}
            except Exception as e:
                logger.error(f"❌ Error updating status: {e}")
                return {"error": str(e)}

    async def delete_whatsapp_template(self, name: str):
        """
        Deletes a WhatsApp template by name.
        """
        wa_account_id = get_setting("WA_BUSINESS_ACCOUNT_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)

        if not wa_account_id or not wa_token:
            return {"error": "WhatsApp credentials not set."}

        url = f"https://graph.facebook.com/v24.0/{wa_account_id}/message_templates"
        params = {
            "name": name,
            "access_token": wa_token
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                logger.info(f"🚀 [Meta API] Deleting template: {name}")
                response = await client.delete(url, params=params)
                
                if response.status_code not in [200, 204]:
                    error_data = response.json()
                    err_msg = error_data.get("error", {}).get("message", "Unknown error")
                    logger.error(f"❌ [Meta API] Template deletion failed: {err_msg}")
                    return {"error": err_msg, "status_code": response.status_code}
                
                logger.info(f"✅ [Meta API] Template deleted successfully!")
                return {"success": True}
                
            except Exception as e:
                logger.error(f"❌ Error communicating with Meta API during deletion: {e}")
                return {"error": str(e)}

    async def send_interactive_poll(self, phone_number: str, question: str, options: list):
        """
        Envia uma 'Enquete' usando Mensagens Interativas (Botões ou Lista).
        A API da conta do usuário não suporta o tipo nativo 'poll', então usamos 'interactive'.
        <= 3 opções: Botões de Resposta.
        > 3 opções: Mensagem de Lista (Menu).
        """
        wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
        
        if not wa_phone_id or not wa_token:
            logger.debug("WhatsApp credentials not set. Cannot send interactive poll.")
            return None
            
        clean_phone = ''.join(filter(str.isdigit, phone_number))
        url = f"https://graph.facebook.com/v24.0/{wa_phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {wa_token}",
            "Content-Type": "application/json"
        }
        
        valid_options = options[:10]
        if not valid_options:
            return None

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "interactive",
            "interactive": {}
        }

        # Decide: Botões (<=3) ou Lista (>3)
        if len(valid_options) <= 3:
            # REPLY BUTTONS
            buttons = []
            for i, opt in enumerate(valid_options):
                # ID único, texto max 20 caracteres
                title = opt[:20] 
                buttons.append({
                    "type": "reply",
                    "reply": {
                        "id": f"btn_{i}_{int(os.urandom(4).hex(), 16)}", 
                        "title": title
                    }
                })
            
            payload["interactive"] = {
                "type": "button",
                "body": {
                    "text": question[:1024] # Limite de corpo
                },
                "action": {
                    "buttons": buttons
                }
            }
        else:
            # LIST MESSAGE (Menu)
            rows = []
            for i, opt in enumerate(valid_options):
                title = opt[:24] # Título da lista max 24 chars
                desc = opt[24:96] if len(opt) > 24 else "" # Resto vira descrição
                
                row = {
                    "id": f"row_{i}_{int(os.urandom(4).hex(), 16)}",
                    "title": title
                }
                if desc:
                    row["description"] = desc
                
                rows.append(row)
            
            payload["interactive"] = {
                "type": "list",
                "body": {
                    "text": question[:1024]
                },
                "action": {
                    "button": "Ver Opções",
                    "sections": [
                        {
                            "title": "Selecione uma opção",
                            "rows": rows
                        }
                    ]
                }
            }

        async with httpx.AsyncClient() as client:
            try:
                logger.debug(f"DEBUG: Sending Interactive Message (Poll fallback) to {clean_phone}")
                logger.debug(f"DEBUG: Payload: {payload}")
                
                response = await client.post(url, json=payload, headers=headers)
                
                if response.status_code not in [200, 201]:
                    logger.error(f"ERROR: Interactive send failed ({response.status_code}): {response.text}")
                    return None
                else:
                    return response.json()
            except Exception as e:
                logger.error(f"Error sending interactive message: {e}")
                return None

    async def upload_media_to_meta(self, file_path: str, mime_type: str = 'audio/ogg') -> str:
        """
        Uploads a media file to Meta/WhatsApp Cloud API and returns the media ID.
        """
        wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)

        if not wa_phone_id or not wa_token:
            logger.debug("WhatsApp credentials not set. Cannot upload media.")
            return None

        url = f"https://graph.facebook.com/v24.0/{wa_phone_id}/media"
        headers = {
            "Authorization": f"Bearer {wa_token}"
            # Content-Type is multipart/form-data, handle by httpx
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                with open(file_path, "rb") as f:
                    filename = os.path.basename(file_path)
                    files = {
                        'file': (filename, f, mime_type)
                    }
                    data = {
                        'messaging_product': 'whatsapp'
                    }
                    
                    logger.debug(f"DEBUG: Uploading media to Meta: {filename} ({mime_type})")
                    response = await client.post(url, headers=headers, files=files, data=data)
                    
                    if response.status_code == 200:
                        res_json = response.json()
                        media_id = res_json.get('id')
                        logger.debug(f"DEBUG: Media uploaded successfully. ID: {media_id}")
                        return media_id
                    else:
                        logger.error(f"ERROR: Media upload failed ({response.status_code}): {response.text}")
                        return None
            except Exception as e:
                logger.error(f"Error uploading media to Meta: {e}")
                return None

    async def send_official_audio(self, phone_number: str, media_id: str):
        """
        Sends an audio message (PTT) using a pre-uploaded Media ID via Meta Cloud API.
        """
        wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
        
        if not wa_phone_id or not wa_token:
            logger.debug("WhatsApp credentials not set. Cannot send official audio.")
            return None
            
        clean_phone = ''.join(filter(str.isdigit, phone_number))
        url = f"https://graph.facebook.com/v24.0/{wa_phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {wa_token}",
            "Content-Type": "application/json"
        }

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "audio",
            "audio": {
                "id": media_id
            }
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                logger.debug(f"DEBUG: Sending Official Audio (PTT) to {clean_phone} with Media ID {media_id}")
                response = await client.post(url, json=payload, headers=headers)
                
                if response.status_code not in [200, 201]:
                    logger.error(f"ERROR: Audio send failed ({response.status_code}): {response.text}")
                    return None
                else:
                    return response.json()
            except Exception as e:
                return None
            except Exception as e:
                logger.error(f"Error sending official audio: {e}")
                return None

    async def search_contact(self, query: str):
        """
        Search for a contact in Chatwoot by name, email or phone number.
        """
        if not self.api_token:
            logger.debug("Chatwoot Token not set. Mocking search_contact.")
            return {"payload": []}

        params = {"q": query}
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/contacts/search",
                    headers=self.headers,
                    params=params
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                logger.error(f"Error searching contact: {e}")
                return None

    async def get_conversations_by_contact_id(self, contact_id: int):
        """
        Get conversations for a specific contact.
        """
        if not self.api_token:
             return {"payload": []}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/contacts/{contact_id}/conversations",
                    headers=self.headers
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                logger.error(f"Error fetching contact conversations: {e}")
                return None

    async def get_contact_labels(self, contact_id: int):
        """
        Get labels/tags for a specific contact.
        """
        if not self.api_token:
             return []

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/contacts/{contact_id}/labels",
                    headers=self.headers
                )
                response.raise_for_status()
                # Retorna lista de strings (nomes das tags)
                return response.json().get("payload", [])
            except Exception as e:
                logger.error(f"Error fetching contact labels: {e}")
                return []

    async def send_interactive_buttons(self, contact_phone: str, body_text: str, buttons: list):
        """
        Sends an interactive message with buttons directly via WhatsApp Cloud API.
        
        Args:
            contact_phone (str): The recipient's phone number.
            body_text (str): The body text of the message.
            buttons (list): A list of button titles (max 3 strings).
            
        Returns:
            dict: The response from the Meta API.
        """
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
        wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=self.client_id)

        if not wa_token or not wa_phone_id:
            msg = "META TOKEN or PHONE ID missing in environment variables"
            self.log_debug(msg)
            logger.debug(msg)
            return None

        # Format phone: remove + if present and ensure only digits
        to_phone = ''.join(filter(str.isdigit, contact_phone))

        # Construct Button Layout
        # Limitation: Max 3 buttons for 'reply' type
        action_buttons = []
        for idx, btn_text in enumerate(buttons[:3]):
            action_buttons.append({
                "type": "reply",
                "reply": {
                    "id": f"btn_{idx}",
                    "title": btn_text[:20] # WhatsApp limit title length
                }
            })

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {
                    "text": body_text
                },
                "action": {
                    "buttons": action_buttons
                }
            }
        }

        url = f"https://graph.facebook.com/v24.0/{wa_phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {wa_token}",
            "Content-Type": "application/json"
        }

        self.log_debug(f"Sending Interactive Buttons to {to_phone}. Payload: {payload}")

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                
                if response.status_code not in [200, 201]:
                    self.log_debug(f"Meta Interactive Error: {response.text}")
                    return {"error": True, "detail": response.text, "status": response.status_code}
                    
                data = response.json()
                data["success"] = True
                self.log_debug(f"Meta Interactive Response: {data}")
                return data
            except httpx.HTTPError as e:
                err_msg = f"Meta API Interactive Error: {e}"
                self.log_debug(err_msg)
                logger.debug(err_msg)
                return {"error": True, "detail": str(e)}
            except Exception as e:
                err_msg = f"Meta API Unexpected Error: {e}"
                self.log_debug(err_msg)
                return {"error": True, "detail": str(e)}
    async def create_contact(self, name: str, phone_number: str, inbox_id: int):
        if not self.api_token:
            return {"payload": {"contact": {"id": 999, "name": name, "phone_number": phone_number}}}

        # Ensure phone has +
        if not phone_number.startswith('+'):
             phone_number = f"+{phone_number}"

        payload = {
            "inbox_id": inbox_id,
            "name": name,
            "phone_number": phone_number
        }
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                # Chatwoot API: POST /contacts
                response = await client.post(
                    f"{self.base_url}/contacts",
                    json=payload,
                    headers=self.headers
                )
                if response.status_code == 422:
                     # Already exists, try search
                     self.log_debug(f"Contact creation returned 422 (likely exists): {response.text}")
                     return None
                
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Error creating contact: {e}")
                return None

    async def get_contact_inboxes(self, contact_id: int):
        """
        Retorna todos os inboxes associados a um contato.
        """
        return await self._request("GET", f"contacts/{contact_id}/contact_inboxes")

    async def get_contact_inbox_source_id(self, contact_id: int, inbox_id: int):
        """
        Tenta encontrar o source_id (identificador no canal) do contato para um inbox específico.
        """
        try:
            res = await self.get_contact_inboxes(contact_id)
            if res and isinstance(res, list):
                for ci in res:
                    if ci.get("inbox_id") == inbox_id:
                        return ci.get("source_id")
            elif isinstance(res, dict) and "payload" in res:
                payload = res["payload"]
                if isinstance(payload, list):
                    for ci in payload:
                        if ci.get("inbox_id") == inbox_id:
                            return ci.get("source_id")
            return None
        except:
            return None

    async def create_conversation(self, contact_id: int, inbox_id: int, source_id: str = None):
        if not self.api_token:
            return {"id": 888}

        # Para WhatsApp, o source_id DEVE ser o telefone para evitar duplicidade
        payload = {
            "source_id": source_id or f"api_conv_{int(datetime.now().timestamp())}",
            "inbox_id": inbox_id,
            "contact_id": contact_id,
            "status": "open"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                self.log_debug(f"📤 [Chatwoot API] Creating conversation: contact={contact_id}, source_id={payload['source_id']}")
                response = await client.post(
                    f"{self.base_url}/conversations",
                    json=payload,
                    headers=self.headers
                )
                
                # Se der erro de source_id já existente, tenta buscar a conversa existente
                if response.status_code == 422:
                     self.log_debug(f"⚠️ Conversation with source_id {payload['source_id']} already exists (422).")
                     return None

                response.raise_for_status()
                return response.json()
            except Exception as e:
                msg = f"Error creating conversation: {e}"
                logger.error(msg)
                self.log_debug(msg)
                return None

    async def ensure_conversation(self, phone_number: str, name: str, inbox_id: int = None):
        """
        Helper method to ensure a conversation exists for a phone number.
        Returns a dict: { "conversation_id": int, "contact_id": int, "account_id": int }
        PRIORITIZES: Most recent interaction (incoming message).
        """
        self.log_debug(f"Ensuring conversation for {phone_number} (Inbox: {inbox_id})")
        
        # 1. Search Contact
        clean_phone = ''.join(filter(str.isdigit, phone_number))
        contact_id = None
        
        search_queries = [clean_phone, f"+{clean_phone}"]
        if clean_phone.startswith("55"):
            if len(clean_phone) == 13:
                short_phone = clean_phone[:4] + clean_phone[5:]
                search_queries.append(short_phone)
            elif len(clean_phone) == 12:
                long_phone = clean_phone[:4] + "9" + clean_phone[4:]
                search_queries.append(long_phone)
        if len(clean_phone) >= 8:
            search_queries.append(clean_phone[-8:])

        for q in search_queries:
            search_res = await self.search_contact(q)
            if search_res and isinstance(search_res, dict) and search_res.get("payload"):
                payload_arr = search_res["payload"]
                if isinstance(payload_arr, list) and len(payload_arr) > 0:
                    contact_id = payload_arr[0].get("id")
                    break
        
        if not contact_id:
            if inbox_id:
                  res = await self.create_contact(name or phone_number, phone_number, inbox_id)
                  if res and res.get("payload"):
                      contact_id = res["payload"]["contact"]["id"]
                  else:
                      search_res = await self.search_contact(f"+{clean_phone}")
                      if search_res and search_res.get("payload"):
                          contact_id = search_res["payload"][0]["id"]
        
        if not contact_id:
             return None

        # 3. Check conversations (get_contact_conversations already sorts by interaction desc)
        conversations = await self.get_contact_conversations(contact_id=contact_id)
        conversation_id = None
        
        if conversations:
            eligible_convs = [c for c in conversations if not inbox_id or c.get("inbox_id") == inbox_id]
            
            # 🎯 Estratégia de Janela 24h: Tenta as 5 mais recentes que estão abertas
            if eligible_convs:
                for conv in eligible_convs[:5]:
                    if await self.is_within_24h_window(conv["id"]):
                        conversation_id = conv["id"]
                        logger.info(f"✅ Found active 24h conversation: {conversation_id} (Interaction: {conv.get('last_incoming_at')})")
                        break
                
                # 🎯 Estratégia Fallback 1: Primeira conversa no status preferido (Mais recente por causa da ordenação)
                if not conversation_id:
                    for status_pref in ['open', 'pending', 'resolved']:
                        for conv in eligible_convs:
                            if conv.get("status") == status_pref:
                                conversation_id = conv["id"]
                                logger.info(f"✅ Fallback to {status_pref} conversation: {conversation_id}")
                                break
                        if conversation_id: break
            
            # 🎯 Estratégia Fallback 2: O que tiver (Último recurso)
            if not conversation_id and not inbox_id and conversations:
                conversation_id = conversations[0]["id"]
                logger.info(f"✅ Fallback to absolute latest conversation found: {conversation_id}")
        
        # 4. Create if needed
        if not conversation_id and inbox_id:
            target_source_id = await self.get_contact_inbox_source_id(contact_id, inbox_id) or clean_phone
            logger.info(f"🆕 No suitable conversation found. Creating new one in inbox {inbox_id}...")
            new_conv = await self.create_conversation(contact_id, inbox_id, source_id=target_source_id)
            if new_conv:
                conversation_id = new_conv["id"]
            else:
                # Last ditch search if creation failed (race condition?)
                final_convs = await self.get_contact_conversations(contact_id=contact_id)
                if final_convs:
                    for c in final_convs:
                        if c.get("inbox_id") == inbox_id:
                             conversation_id = c["id"]
                             break

        if conversation_id:
             return {
                 "conversation_id": conversation_id,
                 "contact_id": contact_id,
                 "account_id": self.account_id
             }
        
        return None
        return None
        

    async def upload_media_to_meta(self, file_path: str, mime_type: str = 'audio/ogg') -> str:
        """
        Uploads a media file to Meta/WhatsApp Cloud API and returns the media ID.
        """
        wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)

        if not wa_phone_id or not wa_token:
            logger.debug("WhatsApp credentials not set. Cannot upload media.")
            return None

        url = f"https://graph.facebook.com/v24.0/{wa_phone_id}/media"
        headers = {
            "Authorization": f"Bearer {wa_token}"
            # Content-Type is multipart/form-data, handled by httpx
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                with open(file_path, "rb") as f:
                    filename = os.path.basename(file_path)
                    files = {
                        'file': (filename, f, mime_type)
                    }
                    data = {
                        'messaging_product': 'whatsapp'
                    }
                    
                    logger.debug(f"DEBUG: Uploading media to Meta: {filename} ({mime_type})")
                    response = await client.post(url, headers=headers, files=files, data=data)
                    
                    if response.status_code == 200:
                        res_json = response.json()
                        media_id = res_json.get('id')
                        logger.debug(f"DEBUG: Media uploaded successfully. ID: {media_id}")
                        return media_id
                    else:
                        logger.error(f"ERROR: Media upload failed ({response.status_code}): {response.text}")
                        return None
            except Exception as e:
                logger.error(f"Error uploading media to Meta: {e}")
                return None

    async def send_audio_official(self, phone_number: str, url: str):
        """
        Sends an audio as a Voice Note (PTT) directly via WhatsApp Cloud API.
        Attempts to force OGG/OPUS MIME type.
        """
        # 1. DOWNLOAD / RESOLVE FILE
        # Reuse logic from send_attachment (simplified)
        import tempfile
        from urllib.parse import unquote
        
        file_path = None
        temp_download_path = None
        
        # Try Local
        if "static/uploads" in url:
            try:
                file_name_part = unquote(url.split("/static/")[1])
                base_path = os.path.dirname(os.path.abspath(__file__))
                file_path = os.path.join(base_path, "static", *file_name_part.split('/'))
            except: pass

        if not file_path or not os.path.exists(file_path):
            # Try plain filename in uploads
             try:
                 filename = url.split("/")[-1]
                 base_path = os.path.dirname(os.path.abspath(__file__))
                 potential = os.path.join(base_path, "static", "uploads", filename)
                 if os.path.exists(potential): file_path = potential
             except: pass

        # Download if needed
        if not file_path or not os.path.exists(file_path):
             try:
                logger.debug(f"DEBUG: Downloading audio for official send: {url}")
                async with httpx.AsyncClient(timeout=30.0) as dl:
                    r = await dl.get(url)
                    if r.status_code == 200:
                        t_dir = tempfile.gettempdir()
                        fname = f"wa_audio_{int(datetime.now(timezone.utc).timestamp())}.ogg"
                        temp_download_path = os.path.join(t_dir, fname)
                        with open(temp_download_path, "wb") as f:
                            f.write(r.content)
                        file_path = temp_download_path
             except Exception as e:
                 logger.error(f"ERROR: Download failed: {e}")
                 return {"error": str(e)}

        if not file_path or not os.path.exists(file_path):
            return {"error": "File not found"}

        try:
            # 2. UPLOAD TO META
            # WhatsApp requires audio/ogg for PTT (Voice Messages)
            media_id = await self.upload_media_to_meta(file_path, "audio/ogg")
            if not media_id:
                return {"error": "Failed to upload audio to Meta"}

            # 3. SEND MESSAGE
            wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=self.client_id)
            wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
            clean_phone = ''.join(filter(str.isdigit, phone_number))

            send_url = f"https://graph.facebook.com/v24.0/{wa_phone_id}/messages"
            headers = {
                "Authorization": f"Bearer {wa_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "messaging_product": "whatsapp",
                "to": clean_phone,
                "type": "audio",
                "audio": { 
                    "id": media_id 
                }
            }
            
            logger.info(f"📤 [Meta API] Direto: Enviando Audio (PTT) para {phone_number}")
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(send_url, headers=headers, json=payload)
                if response.status_code == 200:
                    logger.info(f"✅ [Meta API Success] Audio accepted for {phone_number}")
                    return response.json()
                else:
                    logger.error(f"❌ [Meta API Error] Audio failed ({response.status_code}): {response.text}")
                    return {"error": response.text}
        except Exception as e:
            logger.error(f"ERROR in send_audio_official: {e}")
            return {"error": str(e)}
        finally:
            if temp_download_path and os.path.exists(temp_download_path):
                try: os.remove(temp_download_path)
                except: pass

    async def send_text_official(self, phone_number: str, text: str):
        """
        Sends a plain text message directly via WhatsApp Cloud API (Bypassing Chatwoot queue).
        """
        wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
        clean_phone = ''.join(filter(str.isdigit, phone_number))

        if not wa_phone_id or not wa_token:
            return {"error": "Meta credentials missing"}

        url = f"https://graph.facebook.com/v24.0/{wa_phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {wa_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "text",
            "text": {"body": text}
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                logger.info(f"📤 [Meta API] Direto: Enviando Texto para {phone_number}")
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    logger.info(f"✅ [Meta API Success] Text accepted for {phone_number}")
                    return response.json()
                else:
                    logger.error(f"❌ [Meta API Error] Text failed ({response.status_code}): {response.text}")
                    return {"error": response.text}
            except Exception as e:
                logger.error(f"ERROR in send_text_official: {e}")
                return {"error": str(e)}

    async def send_image_official(self, phone_number: str, image_url: str, caption: str = ""):
        """
        Sends an image directly via WhatsApp Cloud API.
        """
        wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
        clean_phone = ''.join(filter(str.isdigit, phone_number))

        if not wa_phone_id or not wa_token:
            return {"error": "Meta credentials missing"}

        url = f"https://graph.facebook.com/v24.0/{wa_phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {wa_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "image",
            "image": {
                "link": image_url,
                "caption": caption
            }
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                logger.info(f"📤 [Meta API] Direto: Enviando Imagem para {phone_number}")
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    logger.info(f"✅ [Meta API Success] Image accepted for {phone_number}")
                    return response.json()
                else:
                    logger.error(f"❌ [Meta API Error] Image failed ({response.status_code}): {response.text}")
                    return {"error": response.text}
            except Exception as e:
                logger.error(f"ERROR in send_image_official: {e}")
                return {"error": str(e)}

    async def send_text_direct(self, phone_number: str, content: str):
        """
        Sends a simple text message directly via WhatsApp Cloud API.
        Used when the 24h window is known to be open and no template is needed.
        """
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
        wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=self.client_id)

        if not wa_token or not wa_phone_id:
            msg = "META TOKEN or PHONE ID missing in environment variables"
            self.log_debug(msg)
            logger.debug(msg)
            return None

        clean_phone = ''.join(filter(str.isdigit, phone_number))
        url = f"https://graph.facebook.com/v24.0/{wa_phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {wa_token}",
            "Content-Type": "application/json"
        }

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "text",
            "text": {
                "body": content
            }
        }

        self.log_debug(f"Sending Direct Text to {clean_phone}. Content: {content[:50]}...")

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                
                if response.status_code not in [200, 201]:
                    self.log_debug(f"Meta Text API Error: {response.text}")
                    return {"error": True, "detail": response.text}
                    
                data = response.json()
                data["success"] = True
                self.log_debug(f"Meta Text API Response: {data}")
                return data
            except httpx.HTTPError as e:
                err_msg = f"Meta API Text Error: {e}"
                self.log_debug(err_msg)
                logger.debug(err_msg)
                return {"error": True, "detail": str(e)}
            except Exception as e:
                err_msg = f"Meta Unexpected Error: {e}"
                self.log_debug(err_msg)
                return {"error": True, "detail": str(e)}


    async def update_contact(self, contact_id: int, payload: dict):
        """
        Update a contact in Chatwoot (e.g. change name).
        """
        if not self.api_token:
            return None

        async with httpx.AsyncClient() as client:
            try:
                response = await client.put(
                    f"{self.base_url}/contacts/{contact_id}",
                    headers=self.headers,
                    json=payload
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                logger.error(f"Error updating contact {contact_id}: {e}")
                return None

    async def get_all_labels(self):
        """
        List all available labels for the Chatwoot account.
        """
        if not self.api_token:
            return []

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/labels",
                    headers=self.headers
                )
                response.raise_for_status()
                # Returns: { "payload": [ { "id": 1, "title": "tag", ... } ] }
                return response.json().get("payload", [])
            except Exception as e:
                logger.error(f"Error fetching all labels: {e}")
                return []

    async def create_label(self, title: str, color: str = "#3352f9", description: str = ""):
        """
        Creates a new global label in the Chatwoot account.
        """
        if not self.api_token:
            return {"id": 1, "title": title, "color": color}

        payload = {
            "title": title,
            "description": description,
            "color": color,
            "show_on_sidebar": True
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/labels",
                    headers=self.headers,
                    json=payload
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                logger.error(f"Error creating Chatwoot label: {e}")
                if hasattr(e, 'response') and e.response:
                    logger.error(f"Response: {e.response.text}")
                raise e

    async def add_label_to_contact(self, contact_id: int, labels: Union[str, List[str]]):
        """
        Add specified label(s) to a contact in Chatwoot.
        Normalizes input to a list of labels to support multiple tags at once.
        """
        if not self.api_token or not labels:
            return None

        # Normalize input to a list of non-empty strings
        if isinstance(labels, str):
            new_labels = [l.strip() for l in labels.split(',') if l.strip()]
        elif isinstance(labels, list):
            new_labels = [str(l).strip() for l in labels if l and str(l).strip()]
        else:
            return None

        if not new_labels:
            return None

        payload = {"labels": new_labels}
        return await self._request("POST", f"contacts/{contact_id}/labels", json=payload)

    async def get_labels(self):
        """
        Fetch all available labels for the current Chatwoot account.
        """
        if not self.api_token:
            return []

        data = await self._request("GET", "labels")
        return data.get("payload", []) if data else []

    async def get_conversation_labels(self, conversation_id: int):
        """
        Get the current labels for a specific conversation.
        """
        if not self.api_token:
            return []

        data = await self._request("GET", f"conversations/{conversation_id}/labels")
        return data.get("payload", []) if data else []

    async def add_label_to_conversation(self, conversation_id: int, labels: Union[str, List[str]]):
        """
        Add specified label(s) to a conversation in Chatwoot (Appending safely).
        labels: can be a single string (legacy) or a list of strings (new).
        """
        if not self.api_token or not labels:
            return None

        # Normalize input to a list of non-empty strings
        if isinstance(labels, str):
            new_labels = [l.strip() for l in labels.split(',') if l.strip()]
        elif isinstance(labels, list):
            new_labels = [str(l).strip() for l in labels if l and str(l).strip()]
        else:
            return None
            
        if not new_labels:
            return None

        # 1. Get existing labels to avoid overwriting and duplicates
        existing_labels = await self.get_conversation_labels(conversation_id)
        
        # 2. Merge existing with new, maintaining uniqueness
        merged_labels = list(set(existing_labels) | set(new_labels))
        
        # 3. Only update if there are actually new labels to add
        if len(merged_labels) == len(existing_labels):
            logger.debug(f"Labels already exist in conversation {conversation_id}. Skipping update.")
            return {"payload": existing_labels}

        payload = {"labels": merged_labels}
        return await self._request("POST", f"conversations/{conversation_id}/labels", json=payload)



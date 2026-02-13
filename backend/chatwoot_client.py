import os
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
    
    def log_debug(self, message):
         with open("zapvoice_debug.log", "a", encoding="utf-8") as f:
             timestamp = datetime.now(timezone.utc).isoformat()
             f.write(f"[{timestamp}] [ChatwootClient] {message}\n")

    async def send_message(self, conversation_id: int, content: str, private: bool = False):
        if not self.api_token:
            print("Chatwoot Token not set. Mocking send_message.")
            return {"id": 123, "content": content}

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                payload = {
                    "content": content,
                    "private": private
                }
                
                # Para notas privadas, omitimos o message_type ou deixamos o Chatwoot decidir
                # Para mensagens normais, forçamos 'outgoing'
                if not private:
                    payload["message_type"] = "outgoing"
                
                print(f"DEBUG: sending message to {self.base_url}/conversations/{conversation_id}/messages")
                
                response = await client.post(
                    f"{self.base_url}/conversations/{conversation_id}/messages",
                    json=payload,
                    headers=self.headers
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                logger.error(f"Error sending message to Chatwoot: {e}")
                raise e

    async def send_private_note(self, conversation_id: int, content: str):
        """
        Sends a private internal note to the conversation.
        """
        return await self.send_message(conversation_id, content, private=True)

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
                
                print(f"DEBUG: Resolving path for URL {url} -> {file_path}")
                self.log_debug(f"DEBUG: Resolving path for URL {url} -> {file_path}")
                print(f"DEBUG: File exists: {os.path.exists(file_path)}")
            except Exception as e:
                print(f"Error parsing local URL: {e}")
        
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
            print("Chatwoot Token not set. Mocking get_conversations.")
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
                print(f"Error fetching conversations: {e}")
                raise e

    async def get_inboxes(self):
        # Use settings from DB if available
        selected_inbox_id = self.settings.get("CHATWOOT_SELECTED_INBOX_ID")
        
        if not self.api_token:
            print("Chatwoot Token not set. Mocking get_inboxes.")
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
                    print(f"Error fetching inboxes: {e}")
                    raise e
        
        filtered = []
        
        # 1. Check if specific IDs are requested
        selected_ids = []
        if selected_inbox_id and selected_inbox_id.strip():
            try:
                selected_ids = [int(x.strip()) for x in selected_inbox_id.split(',') if x.strip()]
            except ValueError:
                print(f"Invalid CHATWOOT_SELECTED_INBOX_ID format: {selected_inbox_id}")

        if selected_ids:
            # If IDs are set, we return exactly those, regardless of type (Trust the User)
            filtered = [i for i in inboxes if i.get('id') in selected_ids]
            if not filtered:
                print(f"Warning: Selected Inbox IDs {selected_ids} not found in Chatwoot response.")
        else:
            # Default behavior: Filter ONLY WhatsApp
            filtered = [i for i in inboxes if 'whatsapp' in i.get('channel_type', '').lower()]
        
        return filtered
    
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
                print(f"Error fetching accounts: {e}")
                raise e

    async def toggle_typing(self, conversation_id: int, status: str = 'on'):
        # status: 'on' or 'off'
        if not self.api_token:
            print(f"Chatwoot Token not set. Mocking toggle_typing: {status}")
            return

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/conversations/{conversation_id}/toggle_typing",
                    json={"typing_status": status},
                    headers=self.headers
                )
                if response.status_code not in [200, 204]:
                     print(f"DEBUG: Toggle typing {status} failed ({response.status_code}): {response.text}")
                else:
                     print(f"DEBUG: Toggle typing {status} Success ({response.status_code})")

            except httpx.HTTPError as e:
                print(f"Error toggling typing status: {e}")
    async def send_template(self, phone_number: str, template_name: str, language_code: str = "pt_BR", components: list = None):
        """
        Envia template diretamente via WhatsApp Cloud API (Meta/Facebook).
        phone_number deve estar no formato internacional sem '+' (ex: 5585999999999)
        components: lista de componentes do template (botões, etc)
        """
        wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
        
        if not wa_phone_id or not wa_token:
            print(f"❌ WhatsApp credentials not set for client {self.client_id}. Cannot send template.")
            return {"error": True, "detail": "Configuração do WhatsApp ausente (Token ou ID)"}
            
        # Remove caracteres não numéricos do telefone
        clean_phone = ''.join(filter(str.isdigit, phone_number))
        
        url = f"https://graph.facebook.com/v24.0/{wa_phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {wa_token}",
            "Content-Type": "application/json"
        }
        
        # Debug logging
        print(f"DEBUG: Received components from frontend: {components}")
        
        # Components sent from frontend are already formatted correctly
        # Just ensure lowercase type field for WhatsApp API and fix pluralization
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
                print(f"=" * 80)
                print(f"DEBUG: Sending WhatsApp Template '{template_name}' to {clean_phone}")
                print(f"DEBUG: API URL: {url}")
                print(f"DEBUG: Full Payload:")
                import json as json_module
                print(json_module.dumps(payload, indent=2, ensure_ascii=False))
                print(f"=" * 80)
                
                response = await client.post(url, json=payload, headers=headers)
                
                print(f"DEBUG: Response Status: {response.status_code}")
                print(f"DEBUG: Response Headers: {dict(response.headers)}")
                print(f"DEBUG: Response Body:")
                try:
                    response_json = response.json()
                    print(json_module.dumps(response_json, indent=2, ensure_ascii=False))
                except:
                    print(response.text)
                print(f"=" * 80)
                
                if response.status_code not in [200, 201]:
                    err_payload = {"error": True, "detail": response.text}
                    try: 
                        err_payload["detail"] = response.json().get("error", {}).get("message", response.text)
                    except: pass
                    print(f"ERROR: Template send failed ({response.status_code}): {err_payload['detail']}")
                    return err_payload
                else:
                    print(f"SUCCESS: Template sent! WhatsApp accepted the request.")
                    return response.json()
            except Exception as e:
                print(f"Error in send_template: {e}")
                return {"error": True, "detail": str(e)}

    async def get_whatsapp_templates(self):
        wa_account_id = get_setting("WA_BUSINESS_ACCOUNT_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)

        if not wa_account_id or not wa_token:
             logger.warning("WhatsApp Environment Variables (WA_BUSINESS_ACCOUNT_ID, WA_ACCESS_TOKEN) not set.")
             return []

        # Added limit to ensure we get all templates
        url = f"https://graph.facebook.com/v24.0/{wa_account_id}/message_templates?limit=250"
        print(f"DEBUG: Fetching templates from: {url}")
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
                print(f"DEBUG: Fetched {len(raw_list)} templates from Meta API.") 

                templates = []
                for t in raw_list:
                    status = t.get("status")
                    # Debug log to see all found templates in console
                    print(f"DEBUG: Template found: {t.get('name')} | Status: {status} | Lang: {t.get('language')}")
                    
                    templates.append({
                        "name": t.get("name"),
                        "language": t.get("language"),
                        "category": t.get("category"),
                        "id": t.get("id"),
                        "status": status,
                        "components": t.get("components", [])  # Include components
                    })
                
                logger.info(f"DEBUG: Returning {len(templates)} templates.")
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
        components.append({
            "type": "BODY",
            "text": data.get("body_text", "")
        })

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
                logger.info(f"🚀 [Meta API] Creating template: {payload['name']}")
                response = await client.post(url, json=payload, headers=headers)
                
                if response.status_code not in [200, 201]:
                    error_data = response.json()
                    err_msg = error_data.get("error", {}).get("message", "Unknown error")
                    logger.error(f"❌ [Meta API] Template creation failed: {err_msg}")
                    return {"error": err_msg, "status_code": response.status_code}
                
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
        components.append({
            "type": "BODY",
            "text": data.get("body_text", "")
        })

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
                logger.info(f"🚀 [Meta API] Editing template ID: {template_id}")
                response = await client.post(url, json=payload, headers=headers)
                
                if response.status_code not in [200, 201]:
                    error_data = response.json()
                    err_msg = error_data.get("error", {}).get("message", "Unknown error")
                    logger.error(f"❌ [Meta API] Template edit failed: {err_msg}")
                    return {"error": err_msg, "status_code": response.status_code}
                
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
            return False # Mock conservative

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
                # But let's check safely. Chatwoot payload can be reverse chronological.
                
                last_incoming_ts = None
                
                # Sort messages by created_at DESC just in case
                sorted_msgs = sorted(messages, key=lambda x: x.get('created_at', 0), reverse=True)
                
                # DEBUG: Log top 5 messages to see what's happening
                for i, msg in enumerate(sorted_msgs[:5]):
                    m_type = msg.get("message_type") # 0=Incoming, 1=Outgoing
                    m_ts = msg.get("created_at")
                    m_content = (msg.get("content") or "")[:20]
                    # Convert to readable time
                    try:
                        m_dt = datetime.fromtimestamp(m_ts, tz=timezone.utc)
                    except: 
                        m_dt = "Invalid TS"
                    logger.info(f"🔎 [24h Debug] Msg {i}: Type={m_type} | TS={m_ts} ({m_dt}) | Content='{m_content}...'")

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
            print("WhatsApp credentials not set. Cannot send interactive poll.")
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
                print(f"DEBUG: Sending Interactive Message (Poll fallback) to {clean_phone}")
                print(f"DEBUG: Payload: {payload}")
                
                response = await client.post(url, json=payload, headers=headers)
                
                if response.status_code not in [200, 201]:
                    print(f"ERROR: Interactive send failed ({response.status_code}): {response.text}")
                    return None
                else:
                    return response.json()
            except Exception as e:
                print(f"Error sending interactive message: {e}")
                return None

    async def upload_media_to_meta(self, file_path: str, mime_type: str = 'audio/ogg') -> str:
        """
        Uploads a media file to Meta/WhatsApp Cloud API and returns the media ID.
        """
        wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)

        if not wa_phone_id or not wa_token:
            print("WhatsApp credentials not set. Cannot upload media.")
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
                    
                    print(f"DEBUG: Uploading media to Meta: {filename} ({mime_type})")
                    response = await client.post(url, headers=headers, files=files, data=data)
                    
                    if response.status_code == 200:
                        res_json = response.json()
                        media_id = res_json.get('id')
                        print(f"DEBUG: Media uploaded successfully. ID: {media_id}")
                        return media_id
                    else:
                        print(f"ERROR: Media upload failed ({response.status_code}): {response.text}")
                        return None
            except Exception as e:
                print(f"Error uploading media to Meta: {e}")
                return None

    async def send_official_audio(self, phone_number: str, media_id: str):
        """
        Sends an audio message (PTT) using a pre-uploaded Media ID via Meta Cloud API.
        """
        wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
        
        if not wa_phone_id or not wa_token:
            print("WhatsApp credentials not set. Cannot send official audio.")
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
                print(f"DEBUG: Sending Official Audio (PTT) to {clean_phone} with Media ID {media_id}")
                response = await client.post(url, json=payload, headers=headers)
                
                if response.status_code not in [200, 201]:
                    print(f"ERROR: Audio send failed ({response.status_code}): {response.text}")
                    return None
                else:
                    return response.json()
            except Exception as e:
                return None
            except Exception as e:
                print(f"Error sending official audio: {e}")
                return None

    async def search_contact(self, query: str):
        """
        Search for a contact in Chatwoot by name, email or phone number.
        """
        if not self.api_token:
            print("Chatwoot Token not set. Mocking search_contact.")
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
                print(f"Error searching contact: {e}")
                return None

    async def get_contact_conversations(self, contact_id: int):
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
                print(f"Error fetching contact conversations: {e}")
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
                print(f"Error fetching contact labels: {e}")
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
            print(msg)
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

        url = f"https://graph.facebook.com/v21.0/{wa_phone_id}/messages"
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
                    return None
                    
                data = response.json()
                self.log_debug(f"Meta Interactive Response: {data}")
                return data
            except httpx.HTTPError as e:
                err_msg = f"Meta API Interactive Error: {e}"
                self.log_debug(err_msg)
                print(err_msg)
                return None
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
                print(f"Error creating contact: {e}")
                return None

    async def create_conversation(self, contact_id: int, inbox_id: int):
        if not self.api_token:
            return {"id": 888}

        payload = {
            "source_id": contact_id,
            "inbox_id": inbox_id,
            "contact_id": contact_id
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/conversations",
                    json=payload,
                    headers=self.headers
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                msg = f"Error creating conversation: {e}"
                print(msg)
                self.log_debug(msg)
                return None

    async def ensure_conversation(self, phone_number: str, name: str, inbox_id: int = None):
        """
        Helper method to ensure a conversation exists for a phone number.
        Returns the conversation ID.
        """
        self.log_debug(f"Ensuring conversation for {phone_number} (Inbox: {inbox_id})")
        
        # 1. Search Contact
        clean_phone = ''.join(filter(str.isdigit, phone_number))
        contact_id = None
        
        # Multiple attempts at searching to be robust
        search_queries = [clean_phone, f"+{clean_phone}"]
        
        # ADDED: Search by last 8 digits (ignoring 9th digit and DDD mismatch)
        if len(clean_phone) >= 8:
            search_queries.append(clean_phone[-8:])

        for q in search_queries:
            search_res = await self.search_contact(q)
            if search_res and search_res.get("payload"):
                contact_id = search_res["payload"][0]["id"]
                self.log_debug(f"Contact found for query '{q}': {contact_id}")
                break
        
        if not contact_id:
            # 2. Create Contact
            if inbox_id:
                  self.log_debug(f"Contact not found. Creating new contact for {phone_number}...")
                  res = await self.create_contact(name or phone_number, phone_number, inbox_id)
                  if res and res.get("payload"):
                      contact_id = res["payload"]["contact"]["id"]
                      self.log_debug(f"New contact created: {contact_id}")
                  else:
                      # If already exists (422), try search with + format one last time
                      self.log_debug(f"Contact creation failed or already exists. Retrying search with + format...")
                      search_res = await self.search_contact(f"+{clean_phone}")
                      if search_res and search_res.get("payload"):
                          contact_id = search_res["payload"][0]["id"]
        
        if not contact_id:
             self.log_debug(f"❌ Aborting ensure_conversation: Could not find or create contact for {phone_number}")
             return None

        # 3. Check for existing conversation in the CORRECT inbox
        convs_res = await self.get_contact_conversations(contact_id)
        if convs_res and convs_res.get("payload"):
            conversations = convs_res.get("payload", [])
            
            # Prefer an open/pending conversation in the requested inbox
            for status_pref in ['open', 'pending', 'resolved']:
                for conv in conversations:
                    # Match Inbox
                    if inbox_id and conv.get("inbox_id") != inbox_id:
                         continue
                         
                    # Match Status
                    if conv.get("status") == status_pref:
                        self.log_debug(f"Using existing {status_pref} conversation {conv['id']} in inbox {conv.get('inbox_id')} for {phone_number}")
                        return conv["id"]
            
            # Fallback for when inbox_id is not specified (rare in this app)
            if not inbox_id:
                active = conversations[0]
                self.log_debug(f"Using most recent conversation {active['id']} (No inbox filter) for {phone_number}")
                return active["id"]
        
        # 4. Create new conversation if none found in correct inbox (or if all were closed and we want a fresh one)
        # Note: Chatwoot usually reopens resolved conversations if a new message arrives, 
        # but create_conversation is safer if we want to ensure it exists in the right inbox.
        if inbox_id:
            self.log_debug(f"No suitable conversation found in inbox {inbox_id}. Creating new one for contact {contact_id}...")
            new_conv = await self.create_conversation(contact_id, inbox_id)
            if new_conv:
                self.log_debug(f"Created new conversation {new_conv['id']} for {phone_number}")
                return new_conv["id"]
        
        self.log_debug(f"❌ Failed to ensure conversation for {phone_number}")
        return None

    async def upload_media_to_meta(self, file_path: str, mime_type: str = 'audio/ogg') -> str:
        """
        Uploads a media file to Meta/WhatsApp Cloud API and returns the media ID.
        """
        wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)

        if not wa_phone_id or not wa_token:
            print("WhatsApp credentials not set. Cannot upload media.")
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
                    
                    print(f"DEBUG: Uploading media to Meta: {filename} ({mime_type})")
                    response = await client.post(url, headers=headers, files=files, data=data)
                    
                    if response.status_code == 200:
                        res_json = response.json()
                        media_id = res_json.get('id')
                        print(f"DEBUG: Media uploaded successfully. ID: {media_id}")
                        return media_id
                    else:
                        print(f"ERROR: Media upload failed ({response.status_code}): {response.text}")
                        return None
            except Exception as e:
                print(f"Error uploading media to Meta: {e}")
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
                print(f"DEBUG: Downloading audio for official send: {url}")
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
                 print(f"ERROR: Download failed: {e}")
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
            
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(send_url, json=payload, headers=headers)
                print(f"DEBUG: Send Audio Response: {resp.status_code} - {resp.text}")
                return resp.json()

        except Exception as e:
            print(f"ERROR in send_audio_official: {e}")
            return {"error": str(e)}
        finally:
            if temp_download_path and os.path.exists(temp_download_path):
                try: os.remove(temp_download_path)
                except: pass

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
            print(msg)
            return None

        clean_phone = ''.join(filter(str.isdigit, phone_number))
        url = f"https://graph.facebook.com/v21.0/{wa_phone_id}/messages"
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
                self.log_debug(f"Meta Text API Response: {data}")
                return data
            except httpx.HTTPError as e:
                err_msg = f"Meta API Text Error: {e}"
                self.log_debug(err_msg)
                print(err_msg)
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
                print(f"Error updating contact {contact_id}: {e}")
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
                print(f"Error fetching all labels: {e}")
                return []

    async def add_label_to_contact(self, contact_id: int, label: str):
        """
        Add a specified label to a contact in Chatwoot.
        In Chatwoot, this endpoint typically expects an array of labels.
        """
        if not self.api_token:
            return None

        # First, we need to know existing labels if we want to APPEND.
        # However, the POST /labels endpoint on a contact usually appends.
        # Let's check: Chatwoot API docs for "Add Labels to a Contact" say payload: { "labels": ["label1"] }
        payload = {"labels": [label]}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/contacts/{contact_id}/labels",
                    headers=self.headers,
                    json=payload
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                print(f"Error adding label to contact {contact_id}: {e}")
                return None

    async def add_label_to_conversation(self, conversation_id: int, label: str):
        """
        Add a specified label to a conversation in Chatwoot.
        In Chatwoot, this endpoint typically expects an array of labels.
        """
        if not self.api_token:
            return None

        payload = {"labels": [label]}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/conversations/{conversation_id}/labels",
                    headers=self.headers,
                    json=payload
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                print(f"Error adding label to conversation {conversation_id}: {e}")
                return None



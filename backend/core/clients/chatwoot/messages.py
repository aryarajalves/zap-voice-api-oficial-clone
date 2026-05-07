import os
import mimetypes
import httpx
from datetime import datetime, timezone
from core.logger import setup_logger

logger = setup_logger("ChatwootClient")

class ChatwootMessagesMixin:
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

    async def send_private_note(self, conversation_id: int, content: str):
        return await self.send_message(conversation_id, content, private=True)

    async def create_private_note(self, conversation_id: int, content: str):
        return await self.send_private_note(conversation_id, content)

    async def send_attachment(self, conversation_id: int, url: str, attachment_type: str, custom_filename: str = None, caption: str = None):
        if not self.api_token:
            self.log_debug(f"Chatwoot Token not set. Mocking send_attachment ({attachment_type}): {url}")
            return {"id": 124, "content": url, "attachment": True}

        self.log_debug(f"DEBUG: send_attachment called with URL: {url}, type: {attachment_type}")

        from urllib.parse import unquote

        # Resolve local file path
        file_path = self._resolve_local_path(url)
        
        # Download from URL if not found locally
        temp_download_path = None
        if not file_path or not os.path.exists(file_path):
            file_path, temp_download_path = await self._download_remote_file(url)

        if not file_path or not os.path.exists(file_path):
             self.log_debug(f"File not found locally: {file_path}. Sending as text link.")
             content = f"[{attachment_type.upper()}] {url}\n⚠️ Arquivo local não encontrado: {file_path}"
             return await self.send_message(conversation_id, content)

        # Prepare headers without Content-Type
        upload_headers = self.headers.copy()
        upload_headers.pop("Content-Type", None)

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                mime_type, _ = mimetypes.guess_type(file_path)
                if not mime_type:
                    mime_type = 'application/octet-stream'
                
                self.log_debug(f"DEBUG: Uploading {file_path} with mime {mime_type}")

                with open(file_path, "rb") as f:
                    final_filename = self._prepare_filename(file_path, custom_filename, attachment_type)
                    
                    if attachment_type == 'audio':
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
                response.raise_for_status()
                
                if temp_download_path and os.path.exists(temp_download_path):
                    try: os.remove(temp_download_path)
                    except: pass
                        
                return response.json()
            except httpx.HTTPError as e:
                err_msg = str(e)
                if hasattr(e, 'response') and e.response:
                    err_msg += f" | Resp: {e.response.text[:100]}"
                return await self.send_message(conversation_id, f"[{attachment_type}] {url}\n⚠️ Erro HTTP: {err_msg}")
            except Exception as e:
                 return await self.send_message(conversation_id, f"[{attachment_type}] {url}\n⚠️ Erro Inesperado: {str(e)}")

    async def toggle_typing(self, conversation_id: int, status: str = 'on'):
        if not self.api_token:
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
            except httpx.HTTPError as e:
                logger.error(f"Error toggling typing status: {e}")

    # Helper methods for attachment handling
    def _resolve_local_path(self, url: str) -> str:
        from urllib.parse import unquote
        file_path = None
        if "static/uploads" in url:
            try:
                file_name_part = unquote(url.split("/static/")[1])
                base_path = os.path.dirname(os.path.abspath(__file__))
                # Ajuste para subir 3 níveis: chatwoot/ -> clients/ -> core/ -> backend/
                project_root = os.path.dirname(os.path.dirname(os.path.dirname(base_path)))
                parts = file_name_part.split('/')
                file_path = os.path.join(project_root, "static", *parts)
                file_path = os.path.normpath(file_path)
            except Exception as e:
                logger.error(f"Error parsing local URL: {e}")
        
        if not file_path or not os.path.exists(file_path):
             try:
                 filename = url.split("/")[-1]
                 base_path = os.path.dirname(os.path.abspath(__file__))
                 project_root = os.path.dirname(os.path.dirname(os.path.dirname(base_path)))
                 potential_path = os.path.join(project_root, "static", "uploads", filename)
                 if os.path.exists(potential_path):
                     file_path = potential_path
             except: pass
        return file_path

    async def _download_remote_file(self, url: str):
        import tempfile
        temp_download_path = None
        file_path = None
        try:
            self.log_debug(f"DEBUG: File not found locally. Attempting to download from URL: {url}")
            async with httpx.AsyncClient(timeout=30.0) as dl_client:
                dl_response = await dl_client.get(url)
                if dl_response.status_code == 200:
                     filename = url.split("/")[-1]
                     if not filename: filename = f"temp_file_{int(datetime.now(timezone.utc).timestamp())}"
                     temp_dir = tempfile.gettempdir()
                     temp_download_path = os.path.join(temp_dir, filename)
                     with open(temp_download_path, "wb") as f:
                         f.write(dl_response.content)
                     file_path = temp_download_path
                     self.log_debug(f"DEBUG: Successfully downloaded to temp path: {file_path}")
        except Exception as e:
            self.log_debug(f"DEBUG: Error downloading remote file: {e}")
        return file_path, temp_download_path

    def _prepare_filename(self, file_path: str, custom_filename: str, attachment_type: str) -> str:
        final_filename = custom_filename or os.path.basename(file_path)
        if custom_filename and '.' not in custom_filename:
             orig_ext = os.path.splitext(file_path)[1]
             final_filename += orig_ext
        if attachment_type == 'audio':
             final_filename = os.path.splitext(final_filename)[0] + '.opus'
        return final_filename

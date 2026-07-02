import os
import mimetypes
import httpx
from datetime import datetime, timezone
from core.logger import setup_logger

logger = setup_logger("AtendimentoClient")

class ChatwootMessagesMixin:
    async def get_messages(self, conversation_id: int):
        if not self.api_token:
            logger.debug("Chatwoot Token not set. Mocking get_messages.")
            return {"payload": []}
        return await self._request("GET", f"conversations/{conversation_id}/messages")

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
        # Chatwoot foi desativado neste projeto — nunca fazemos upload para o Chatwoot.
        # (Este método fazia uma requisição HTTP direta, fora do `_request` centralizado,
        # então precisa ser interrompido aqui também.)
        return None

    async def toggle_typing(self, conversation_id: int, status: str = 'on'):
        # Chatwoot foi desativado neste projeto.
        return None

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
            async with httpx.AsyncClient(timeout=60.0) as dl_client:
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

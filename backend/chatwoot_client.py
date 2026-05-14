import os
import httpx
import asyncio
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timezone, timedelta
from core.logger import setup_logger
from config_loader import get_setting, get_settings

# Importando os novos clientes modulares
from core.clients.chatwoot.client import ChatwootClient as ModularChatwootClient
from core.clients.whatsapp.client import WhatsAppClient as ModularWhatsAppClient

logger = setup_logger("ChatwootClientFacade")

class ChatwootClient:
    """
    Fachada de compatibilidade para o ChatwootClient modularizado.
    Delega chamadas para o ModularChatwootClient ou ModularWhatsAppClient.
    """
    def __init__(self, account_id: str = None, client_id: int = None):
        self.client_id = client_id
        self._cw = ModularChatwootClient(account_id=account_id, client_id=client_id)
        self._wa = ModularWhatsAppClient(client_id=client_id)
        
        # Copiando atributos públicos essenciais para compatibilidade
        self.account_id = self._cw.account_id
        self.api_url = self._cw.api_url
        self.api_token = self._cw.api_token
        self.base_url = self._cw.base_url
        self.headers = self._cw.headers

    # --- Chatwoot Methods (Delegated to _cw) ---
    
    def log_debug(self, message): return self._cw.log_debug(message)
    
    async def _request(self, method: str, path: str, **kwargs):
        return await self._cw._request(method, path, **kwargs)

    async def send_message(self, *args, **kwargs): return await self._cw.send_message(*args, **kwargs)
    async def send_private_note(self, *args, **kwargs): return await self._cw.send_private_note(*args, **kwargs)
    async def create_private_note(self, *args, **kwargs): return await self._cw.create_private_note(*args, **kwargs)
    async def send_private_message(self, *args, **kwargs): return await self._cw.send_private_note(*args, **kwargs)
    async def send_attachment(self, *args, **kwargs): return await self._cw.send_attachment(*args, **kwargs)
    async def toggle_typing(self, *args, **kwargs): return await self._cw.toggle_typing(*args, **kwargs)
    
    async def get_contact_conversations(self, *args, **kwargs): return await self._cw.get_contact_conversations(*args, **kwargs)
    async def get_conversations(self, *args, **kwargs): return await self._cw.get_conversations(*args, **kwargs)
    async def get_all_conversations(self, *args, **kwargs): return await self._cw.get_all_conversations(*args, **kwargs)
    async def get_all_contacts(self, *args, **kwargs): return await self._cw.get_all_contacts(*args, **kwargs)
    async def delete_conversation(self, *args, **kwargs): return await self._cw.delete_conversation(*args, **kwargs)
    async def delete_contact(self, *args, **kwargs): return await self._cw.delete_contact(*args, **kwargs)
    async def create_contact(self, *args, **kwargs): return await self._cw.create_contact(*args, **kwargs)
    async def update_contact(self, *args, **kwargs): return await self._cw.update_contact(*args, **kwargs)
    async def search_contact(self, *args, **kwargs): return await self._cw.search_contact(*args, **kwargs)
    async def create_conversation(self, *args, **kwargs): return await self._cw.create_conversation(*args, **kwargs)
    async def ensure_conversation(self, *args, **kwargs): return await self._cw.ensure_conversation(*args, **kwargs)
    async def is_within_24h_window(self, *args, **kwargs): return await self._cw.is_within_24h_window(*args, **kwargs)
    
    async def create_agent(self, *args, **kwargs): return await self._cw.create_agent(*args, **kwargs)
    async def list_agents(self, *args, **kwargs): return await self._cw.list_agents(*args, **kwargs)
    async def delete_agent(self, *args, **kwargs): return await self._cw.delete_agent(*args, **kwargs)
    async def get_inboxes(self, *args, **kwargs): return await self._cw.get_inboxes(*args, **kwargs)
    async def get_accounts(self, *args, **kwargs): return await self._cw.get_accounts(*args, **kwargs)
    async def get_default_whatsapp_inbox(self, *args, **kwargs): return await self._cw.get_default_whatsapp_inbox(*args, **kwargs)
    
    async def get_all_labels(self, *args, **kwargs): return await self._cw.get_all_labels(*args, **kwargs)
    async def create_label(self, *args, **kwargs): return await self._cw.create_label(*args, **kwargs)
    async def add_label_to_contact(self, *args, **kwargs): return await self._cw.add_label_to_contact(*args, **kwargs)
    async def get_labels(self, *args, **kwargs): return await self._cw.get_labels(*args, **kwargs)
    async def get_conversation_labels(self, *args, **kwargs): return await self._cw.get_conversation_labels(*args, **kwargs)
    async def add_label_to_conversation(self, *args, **kwargs): return await self._cw.add_label_to_conversation(*args, **kwargs)
    async def update_label(self, *args, **kwargs): return await self._cw.update_label(*args, **kwargs)
    async def delete_label(self, *args, **kwargs): return await self._cw.delete_label(*args, **kwargs)

    # --- WhatsApp Methods (Delegated to _wa) ---
    
    async def send_template(self, *args, **kwargs): return await self._wa.send_template(*args, **kwargs)
    async def get_whatsapp_templates(self, *args, **kwargs): return await self._wa.get_whatsapp_templates(*args, **kwargs)
    async def create_whatsapp_template(self, *args, **kwargs): return await self._wa.create_whatsapp_template(*args, **kwargs)
    async def edit_whatsapp_template(self, *args, **kwargs): return await self._wa.edit_whatsapp_template(*args, **kwargs)
    async def update_template_status(self, *args, **kwargs): return await self._wa.update_template_status(*args, **kwargs)
    async def delete_whatsapp_template(self, *args, **kwargs): return await self._wa.delete_whatsapp_template(*args, **kwargs)
    async def send_interactive_poll(self, *args, **kwargs): return await self._wa.send_interactive_poll(*args, **kwargs)
    async def upload_media_to_meta(self, *args, **kwargs): return await self._wa.upload_media_to_meta(*args, **kwargs)
    async def send_official_audio(self, *args, **kwargs): return await self._wa.send_official_audio(*args, **kwargs)
    async def send_audio_official(self, *args, **kwargs): return await self._wa.send_audio_official(*args, **kwargs)
    async def send_text_official(self, *args, **kwargs): return await self._wa.send_text_official(*args, **kwargs)
    async def send_image_official(self, *args, **kwargs): return await self._wa.send_image_official(*args, **kwargs)
    async def send_text_direct(self, *args, **kwargs): return await self._wa.send_text_direct(*args, **kwargs)
    async def send_interactive_buttons(self, *args, **kwargs): return await self._wa.send_interactive_buttons(*args, **kwargs)

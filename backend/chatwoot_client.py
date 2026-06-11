import os
import httpx
import asyncio
import random
import uuid
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
    Se SIMULATE_MESSAGING estiver ativo (via env var), simula as requisições
    sem dispará-las de verdade.
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
        self.settings = self._cw.settings

        # Configurações de Simulação
        sim_env = os.getenv("SIMULATE_MESSAGING", "false").strip().lower()
        self.simulate = sim_env in ("true", "1", "yes")

        sim_rl = os.getenv("SIMULATE_CHATWOOT_RATELIMIT", "false").strip().lower()
        self.simulate_ratelimit = sim_rl in ("true", "1", "yes")

    def _maybe_raise_ratelimit(self):
        """Lança um erro simulado de Rate Limit HTTP 429 se ativado."""
        if self.simulate and self.simulate_ratelimit:
            # 10% de probabilidade de simular 429
            if random.random() < 0.10:
                logger.warning("🚨 [SIMULATED RATELIMIT] Disparando erro simulado HTTP 429 (Rate Limit)!")
                request = httpx.Request("POST", "https://simulated.chatwoot.com")
                response = httpx.Response(status_code=429, json={"error": "Too Many Requests (Simulated)"}, request=request)
                raise httpx.HTTPStatusError("Too Many Requests (Simulated)", request=request, response=response)

    # --- Chatwoot Methods (Delegated to _cw) ---
    
    def log_debug(self, message): return self._cw.log_debug(message)
    
    async def _request(self, method: str, path: str, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            await asyncio.sleep(random.uniform(0.01, 0.05))
            return {"success": True}
        return await self._cw._request(method, path, **kwargs)

    async def send_message(self, conversation_id, content, message_type="outgoing", *args, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            await asyncio.sleep(random.uniform(0.01, 0.05))
            logger.info(f"🤖 [MOCK send_message] Enviando mensagem ({message_type}) na conversa {conversation_id}: {content[:50]}...")
            return {"id": random.randint(10000, 99999), "content": content}
        private = kwargs.pop("private", False)
        return await self._cw.send_message(conversation_id, content, private=private, message_type=message_type, *args, **kwargs)

    async def send_private_note(self, conversation_id, content, *args, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            await asyncio.sleep(random.uniform(0.01, 0.05))
            logger.info(f"🤖 [MOCK send_private_note] Enviando nota privada na conversa {conversation_id}: {content[:50]}...")
            return {"id": random.randint(10000, 99999), "content": content}
        return await self._cw.send_private_note(conversation_id, content, *args, **kwargs)

    async def create_private_note(self, conversation_id, content, *args, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            await asyncio.sleep(random.uniform(0.01, 0.05))
            logger.info(f"🤖 [MOCK create_private_note] Nota privada adicionada na conversa {conversation_id}: {content[:50]}...")
            return {"success": True, "id": random.randint(1000, 9999)}
        return await self._cw.create_private_note(conversation_id, content, *args, **kwargs)

    async def send_private_message(self, conversation_id, content, *args, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            await asyncio.sleep(random.uniform(0.01, 0.05))
            logger.info(f"🤖 [MOCK send_private_message] Nota privada na conversa {conversation_id}: {content[:50]}...")
            return {"success": True}
        return await self._cw.send_private_note(conversation_id, content, *args, **kwargs)

    async def send_attachment(self, *args, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            await asyncio.sleep(random.uniform(0.01, 0.05))
            return {"success": True, "id": random.randint(10000, 99999)}
        return await self._cw.send_attachment(*args, **kwargs)

    async def toggle_typing(self, *args, **kwargs):
        if self.simulate:
            return {"success": True}
        return await self._cw.toggle_typing(*args, **kwargs)

    async def get_messages(self, *args, **kwargs):
        if self.simulate:
            return []
        return await self._cw.get_messages(*args, **kwargs)
    
    async def get_contact_conversations(self, *args, **kwargs):
        if self.simulate:
            return []
        return await self._cw.get_contact_conversations(*args, **kwargs)

    async def get_conversations(self, *args, **kwargs):
        if self.simulate:
            return []
        return await self._cw.get_conversations(*args, **kwargs)

    async def get_all_conversations(self, *args, **kwargs):
        if self.simulate:
            return []
        return await self._cw.get_all_conversations(*args, **kwargs)

    async def get_all_contacts(self, *args, **kwargs):
        if self.simulate:
            return []
        return await self._cw.get_all_contacts(*args, **kwargs)

    async def get_contacts_by_label(self, *args, **kwargs):
        if self.simulate:
            return []
        return await self._cw.get_contacts_by_label(*args, **kwargs)

    async def delete_conversation(self, *args, **kwargs):
        if self.simulate:
            return {"success": True}
        return await self._cw.delete_conversation(*args, **kwargs)

    async def delete_contact(self, *args, **kwargs):
        if self.simulate:
            return {"success": True}
        return await self._cw.delete_contact(*args, **kwargs)

    async def create_contact(self, *args, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            await asyncio.sleep(random.uniform(0.01, 0.05))
            return {"id": random.randint(10000, 99999), "name": "Simulated"}
        return await self._cw.create_contact(*args, **kwargs)

    async def update_contact(self, *args, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            return {"success": True}
        return await self._cw.update_contact(*args, **kwargs)

    async def search_contact(self, *args, **kwargs):
        if self.simulate:
            return []
        return await self._cw.search_contact(*args, **kwargs)

    async def create_conversation(self, *args, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            await asyncio.sleep(random.uniform(0.01, 0.05))
            return {"id": random.randint(10000, 99999)}
        return await self._cw.create_conversation(*args, **kwargs)

    async def ensure_conversation(self, contact_phone, contact_name="", inbox_id=None, *args, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            await asyncio.sleep(random.uniform(0.01, 0.05))
            # Garantir ID de conversa estável por telefone para simulações
            sim_conv_id = int(str(abs(hash(contact_phone)))[:9])
            logger.info(f"🤖 [MOCK ensure_conversation] Resolvendo conversa {sim_conv_id} para {contact_phone}")
            return {
                "conversation_id": sim_conv_id,
                "contact_id": sim_conv_id + 100
            }
        return await self._cw.ensure_conversation(contact_phone, contact_name, inbox_id, *args, **kwargs)

    async def is_within_24h_window(self, *args, **kwargs):
        if self.simulate:
            return True
        return await self._cw.is_within_24h_window(*args, **kwargs)

    async def find_existing_conversation(self, *args, **kwargs):
        if self.simulate:
            return None
        return await self._cw.find_existing_conversation(*args, **kwargs)
    
    async def create_agent(self, *args, **kwargs):
        if self.simulate:
            return {"id": random.randint(100, 999)}
        return await self._cw.create_agent(*args, **kwargs)

    async def list_agents(self, *args, **kwargs):
        if self.simulate:
            return []
        return await self._cw.list_agents(*args, **kwargs)

    async def delete_agent(self, *args, **kwargs):
        if self.simulate:
            return {"success": True}
        return await self._cw.delete_agent(*args, **kwargs)

    async def get_inboxes(self, *args, **kwargs):
        if self.simulate:
            return []
        return await self._cw.get_inboxes(*args, **kwargs)

    async def get_accounts(self, *args, **kwargs):
        if self.simulate:
            return []
        return await self._cw.get_accounts(*args, **kwargs)

    async def get_default_whatsapp_inbox(self, *args, **kwargs):
        if self.simulate:
            return 1
        return await self._cw.get_default_whatsapp_inbox(*args, **kwargs)
    
    async def get_all_labels(self, *args, **kwargs):
        if self.simulate:
            return []
        return await self._cw.get_all_labels(*args, **kwargs)

    async def create_label(self, *args, **kwargs):
        if self.simulate:
            return {"success": True}
        return await self._cw.create_label(*args, **kwargs)

    async def add_label_to_contact(self, *args, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            return {"success": True}
        return await self._cw.add_label_to_contact(*args, **kwargs)

    async def get_labels(self, *args, **kwargs):
        if self.simulate:
            return []
        return await self._cw.get_labels(*args, **kwargs)

    async def get_conversation_labels(self, *args, **kwargs):
        if self.simulate:
            return []
        return await self._cw.get_conversation_labels(*args, **kwargs)

    async def add_label_to_conversation(self, conversation_id, labels, *args, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            await asyncio.sleep(random.uniform(0.01, 0.05))
            logger.info(f"🤖 [MOCK add_label_to_conversation] Marcando conversa {conversation_id} com as labels {labels}")
            return {"success": True}
        return await self._cw.add_label_to_conversation(conversation_id, labels, *args, **kwargs)

    async def remove_label_from_conversation(self, conversation_id, labels, *args, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            await asyncio.sleep(random.uniform(0.01, 0.05))
            logger.info(f"🤖 [MOCK remove_label_from_conversation] Removendo labels {labels} da conversa {conversation_id}")
            return {"success": True}
        return await self._cw.remove_label_from_conversation(conversation_id, labels, *args, **kwargs)

    async def assign_agent_to_conversation(self, conversation_id: int, agent_id: int):
        if self.simulate:
            logger.info(f"🤖 [MOCK assign_agent_to_conversation] Atribuindo agente {agent_id} à conversa {conversation_id}")
            return {"success": True}
        return await self._cw.assign_agent_to_conversation(conversation_id, agent_id)

    async def remove_label_from_contact(self, contact_id, labels, *args, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            await asyncio.sleep(random.uniform(0.01, 0.05))
            logger.info(f"🤖 [MOCK remove_label_from_contact] Removendo labels {labels} do contato {contact_id}")
            return {"success": True}
        return await self._cw.remove_label_from_contact(contact_id, labels, *args, **kwargs)

    async def update_label(self, *args, **kwargs):
        if self.simulate:
            return {"success": True}
        return await self._cw.update_label(*args, **kwargs)

    async def delete_label(self, *args, **kwargs):
        if self.simulate:
            return {"success": True}
        return await self._cw.delete_label(*args, **kwargs)

    # --- WhatsApp Methods (Delegated to _wa) ---
    
    async def send_template(self, contact_phone, template_name, template_language="pt_BR", template_components=None, *args, **kwargs):
        # Evita conflito se for passado 'components' via kwargs (ex: em disparos em massa)
        components = template_components
        if "components" in kwargs:
            components = kwargs.pop("components")

        if self.simulate:
            self._maybe_raise_ratelimit()
            await asyncio.sleep(random.uniform(0.01, 0.05))
            
            # Simular instabilidade do servidor da Meta com 3% de chance total
            # Sorteando entre os erros #2 e #131000 para testar o fluxo de pausa de 30s e retentativas
            if random.random() < 0.03:
                error_type = random.choice([
                    "(#2) Serviço temporariamente indisponível (Erro do Servidor da Meta)",
                    "(#131000) Algo deu errado (Erro do Servidor da Meta)"
                ])
                logger.warning(f"🤖 [MOCK send_template] Simulado erro do Servidor da Meta para {contact_phone}: {error_type}")
                return {
                    "error": True,
                    "detail": error_type
                }
                
            logger.info(f"🤖 [MOCK send_template] Enviando template {template_name} para {contact_phone}")
            return {
                "messages": [{"id": f"wamid.simulated_{uuid.uuid4().hex}"}]
            }
        return await self._wa.send_template(contact_phone, template_name, template_language, components, *args, **kwargs)

    async def get_whatsapp_templates(self, *args, **kwargs):
        if self.simulate:
            return []
        return await self._wa.get_whatsapp_templates(*args, **kwargs)

    async def create_whatsapp_template(self, *args, **kwargs):
        if self.simulate:
            return {"id": random.randint(10000, 99999)}
        return await self._wa.create_whatsapp_template(*args, **kwargs)

    async def edit_whatsapp_template(self, *args, **kwargs):
        if self.simulate:
            return {"success": True}
        return await self._wa.edit_whatsapp_template(*args, **kwargs)

    async def update_template_status(self, *args, **kwargs):
        if self.simulate:
            return {"success": True}
        return await self._wa.update_template_status(*args, **kwargs)

    async def delete_whatsapp_template(self, *args, **kwargs):
        if self.simulate:
            return {"success": True}
        return await self._wa.delete_whatsapp_template(*args, **kwargs)

    async def send_interactive_poll(self, *args, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            return {"messages": [{"id": f"wamid.simulated_{uuid.uuid4().hex}"}]}
        return await self._wa.send_interactive_poll(*args, **kwargs)

    async def upload_media_to_meta(self, *args, **kwargs):
        if self.simulate:
            return {"id": f"simulated_media_id_{random.randint(1000, 9999)}"}
        return await self._wa.upload_media_to_meta(*args, **kwargs)

    async def send_official_audio(self, *args, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            return {"messages": [{"id": f"wamid.simulated_{uuid.uuid4().hex}"}]}
        return await self._wa.send_official_audio(*args, **kwargs)

    async def send_audio_official(self, *args, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            return {"messages": [{"id": f"wamid.simulated_{uuid.uuid4().hex}"}]}
        return await self._wa.send_audio_official(*args, **kwargs)

    async def send_text_official(self, *args, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            return {"messages": [{"id": f"wamid.simulated_{uuid.uuid4().hex}"}]}
        return await self._wa.send_text_official(*args, **kwargs)

    async def send_image_official(self, *args, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            return {"messages": [{"id": f"wamid.simulated_{uuid.uuid4().hex}"}]}
        return await self._wa.send_image_official(*args, **kwargs)

    async def send_text_direct(self, *args, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            return {"messages": [{"id": f"wamid.simulated_{uuid.uuid4().hex}"}]}
        return await self._wa.send_text_direct(*args, **kwargs)

    async def send_interactive_buttons(self, *args, **kwargs):
        if self.simulate:
            self._maybe_raise_ratelimit()
            return {"messages": [{"id": f"wamid.simulated_{uuid.uuid4().hex}"}]}
        return await self._wa.send_interactive_buttons(*args, **kwargs)


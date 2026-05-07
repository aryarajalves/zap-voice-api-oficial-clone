import httpx
from core.logger import setup_logger

logger = setup_logger("ChatwootClient")

class ChatwootAgentsMixin:
    async def create_agent(self, name: str, email: str, role: str = "agent"):
        if not self.api_token: raise ValueError("Chatwoot API Token não configurado.")
        payload = {"name": name, "email": email, "role": role}
        return await self._request("POST", "agents", json=payload)
    
    async def list_agents(self):
        if not self.api_token: return []
        return await self._request("GET", "agents")

    async def delete_agent(self, agent_id: int):
        if not self.api_token: raise ValueError("Chatwoot API Token não configurado.")
        return await self._request("DELETE", f"agents/{agent_id}")

    async def get_inboxes(self):
        selected_inbox_id = self.settings.get("CHATWOOT_SELECTED_INBOX_ID")
        if not self.api_token:
            inboxes = [{"id": 1, "name": "Whatsapp Support", "channel_type": "Channel::Whatsapp"}, {"id": 2, "name": "Website Live Chat", "channel_type": "Channel::WebWidget"}]
        else:
            data = await self._request("GET", "inboxes")
            inboxes = data.get("payload", []) if data else []
        
        selected_ids = []
        if selected_inbox_id and selected_inbox_id.strip():
            try: selected_ids = [int(x.strip()) for x in selected_inbox_id.split(',') if x.strip()]
            except: pass

        if selected_ids:
            filtered = [i for i in inboxes if i.get('id') in selected_ids]
            if not filtered:
                filtered = [i for i in inboxes if 'whatsapp' in i.get('channel_type', '').lower()]
        else:
            filtered = [i for i in inboxes if 'whatsapp' in i.get('channel_type', '').lower()]
        return filtered

    async def get_default_whatsapp_inbox(self):
        if self._inbox_id_cache: return self._inbox_id_cache
        inboxes = await self.get_inboxes()
        if inboxes:
            best_id = next((ib["id"] for ib in inboxes if "whatsapp" in ib.get("channel_type", "").lower()), inboxes[0]["id"])
            self._inbox_id_cache = best_id
            return best_id
        return None

    async def get_accounts(self):
        if not self.api_token: return [{"id": 1, "name": "Mock Account"}]
        # Profile is at api/v1/profile
        profile_url = f"{self.api_url}/profile"
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.get(profile_url, headers=self.headers)
                response.raise_for_status()
                return response.json().get("accounts", [])
            except Exception as e:
                logger.error(f"Error fetching accounts: {e}")
                raise e

from typing import Union, List
from core.logger import setup_logger

logger = setup_logger("ChatwootClient")

class ChatwootLabelsMixin:
    async def get_all_labels(self):
        data = await self._request("GET", "labels")
        return data.get("payload", []) if data else []

    async def get_labels(self):
        """Alias for get_all_labels."""
        return await self.get_all_labels()

    async def create_label(self, title: str, color: str = "#3352f9", description: str = ""):
        payload = {
            "title": title,
            "description": description,
            "color": color,
            "show_on_sidebar": True
        }
        return await self._request("POST", "labels", json=payload)

    async def update_label(self, label_id: int, title: str, color: str = None, description: str = None):
        payload = {"title": title}
        if color: payload["color"] = color
        if description is not None: payload["description"] = description
        return await self._request("PATCH", f"labels/{label_id}", json=payload)

    async def delete_label(self, label_id: int):
        return await self._request("DELETE", f"labels/{label_id}")

    async def get_contact_labels(self, contact_id: int):
        data = await self._request("GET", f"contacts/{contact_id}/labels")
        return data.get("payload", []) if data else []

    async def add_label_to_contact(self, contact_id: int, labels: Union[str, List[str]]):
        new_labels = self._normalize_labels(labels)
        if not new_labels: return None
        payload = {"labels": new_labels}
        return await self._request("POST", f"contacts/{contact_id}/labels", json=payload)

    async def get_conversation_labels(self, conversation_id: int):
        data = await self._request("GET", f"conversations/{conversation_id}/labels")
        return data.get("payload", []) if data else []

    async def add_label_to_conversation(self, conversation_id: int, labels: Union[str, List[str]]):
        new_labels = self._normalize_labels(labels)
        if not new_labels: return None
        
        existing_labels = await self.get_conversation_labels(conversation_id)
        merged_labels = list(set(existing_labels) | set(new_labels))
        
        if len(merged_labels) == len(existing_labels):
            return {"payload": existing_labels}

        payload = {"labels": merged_labels}
        return await self._request("POST", f"conversations/{conversation_id}/labels", json=payload)

    def _normalize_labels(self, labels: Union[str, List[str]]) -> List[str]:
        if not labels: return []
        if isinstance(labels, str):
            if labels.startswith('[') and labels.endswith(']'):
                try:
                    import json
                    parsed = json.loads(labels)
                    if isinstance(parsed, list):
                        return [str(l).strip() for l in parsed if l and str(l).strip()]
                except: pass
            return [l.strip() for l in labels.split(',') if l.strip()]
        elif isinstance(labels, list):
            result = []
            for l in labels:
                if not l: continue
                if isinstance(l, dict):
                    val = l.get('value') or l.get('title') or l.get('label')
                    if val: result.append(str(val).strip())
                else:
                    result.append(str(l).strip())
            return result
        return []

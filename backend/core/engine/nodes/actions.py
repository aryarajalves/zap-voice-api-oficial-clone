import logging
import random
from datetime import datetime, timezone
import models
from ..utils import apply_vars

logger = logging.getLogger("FunnelEngine.Nodes.Actions")

async def handle_update_contact_node(db, trigger, node, chatwoot, contact_phone, apply_vars_func):
    data = node.get("data", {})
    name_type = data.get("nameType", "fixed")
    new_name = (trigger.contact_name or "Cliente WhatsApp") if name_type == "official" else apply_vars_func(data.get("newName", ""))

    if new_name:
        clean_phone = ''.join(filter(str.isdigit, contact_phone))
        contact_res = await chatwoot.search_contact(clean_phone)
        if contact_res and contact_res.get("payload"):
            await chatwoot.update_contact(contact_res["payload"][0]["id"], {"name": new_name})
    return "continue"

async def handle_label_node(db, trigger, node, chatwoot, contact_phone, conversation_id):
    label = node.get("data", {}).get("label")
    if label:
        if conversation_id and int(conversation_id) > 0:
            await chatwoot.add_label_to_conversation(conversation_id, label)
        clean_phone = ''.join(filter(str.isdigit, contact_phone))
        contact_res = await chatwoot.search_contact(clean_phone)
        if contact_res and contact_res.get("payload"):
            await chatwoot.add_label_to_contact(contact_res["payload"][0]["id"], label)
    return "continue"

def handle_randomizer_node(node):
    percent_a = int(node.get("data", {}).get("percentA", 50))
    return "a" if random.randint(1, 100) <= percent_a else "b"

async def handle_link_funnel_node(db, trigger, node, contact_phone, conversation_id):
    target_funnel_id = node.get("data", {}).get("funnelId")
    if target_funnel_id:
        db.add(models.ScheduledTrigger(
            client_id=trigger.client_id, funnel_id=target_funnel_id, parent_id=trigger.id,
            conversation_id=conversation_id, contact_phone=contact_phone, status='queued',
            scheduled_time=datetime.now(timezone.utc), is_bulk=False, product_name="HIDDEN_CHILD"
        ))
        db.commit()
    return "continue"

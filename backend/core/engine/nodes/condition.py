import logging
import zoneinfo
from datetime import datetime, timezone
from ..utils import normalize_text, get_next_node

logger = logging.getLogger("FunnelEngine.Nodes.Condition")

async def handle_condition_node(db, trigger, node, chatwoot, contact_phone, edges):
    data = node.get("data", {})
    current_node_id = node["id"]
    condition_type = data.get("conditionType", "text")
    source_handle = 'no'
    
    if condition_type == "tag":
        required_tag = normalize_text(data.get("tag", ""))
        clean_phone = ''.join(filter(str.isdigit, contact_phone))
        contact_res = await chatwoot.search_contact(clean_phone)
        if contact_res and contact_res.get("payload"):
            contact_id = contact_res["payload"][0]["id"]
            contact_labels = await chatwoot.get_contact_labels(contact_id)
            if required_tag in [normalize_text(t) for t in contact_labels]:
                source_handle = 'yes'

    elif condition_type == "datetime_range":
        tz = zoneinfo.ZoneInfo('America/Sao_Paulo')
        now_dt = datetime.now(tz)
        start_str, end_str = data.get("startDateTime"), data.get("endDateTime")
        
        if start_str and end_str:
            start_dt = datetime.fromisoformat(start_str).replace(tzinfo=tz)
            end_dt = datetime.fromisoformat(end_str).replace(tzinfo=tz)
            
            if now_dt < start_dt: result = 'before'
            elif now_dt > end_dt: result = 'after'
            else: result = 'between'
            
            action = data.get(f"{result}Action", "follow")
            if action == "stop": return "break"
            elif action == "wait":
                wait_until = start_dt if result == "before" else (end_dt if result == "between" else None)
                next_h = "between" if result == "before" else ("after" if result == "between" else None)
                if wait_until:
                    next_node_id = get_next_node(current_node_id, edges, next_h)
                    if next_node_id:
                        trigger.status = 'queued'
                        trigger.scheduled_time = wait_until.astimezone(timezone.utc)
                        trigger.current_node_id = next_node_id
                        db.commit()
                        return "stop"
                return "break"
            else: source_handle = result

    elif condition_type == "weekday":
        tz = zoneinfo.ZoneInfo('America/Sao_Paulo')
        current_day = str(datetime.now(tz).weekday())
        if current_day in data.get("allowedDays", []): source_handle = 'yes'
    
    else:
        condition_text = data.get("condition", "").lower()
        if not any(neg in condition_text for neg in ['não', 'nao', 'false', 'no', '0']):
            source_handle = 'yes'
            
    return source_handle

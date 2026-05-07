import logging
import random
import asyncio
from datetime import datetime, timezone, timedelta
from ..utils import get_next_node, BRAZIL_TZ
from ..logging import log_node_execution

logger = logging.getLogger("FunnelEngine.Nodes.Delay")

async def handle_delay_node(db, trigger, node, edges, funnel):
    data = node.get("data", {})
    current_node_id = node["id"]
    
    use_random = data.get("useRandom", False)
    raw_time = data.get("time") or data.get("minTime") or 10
    min_time = int(raw_time)
    max_time = int(data.get("maxTime") or min_time)
    
    if use_random and max_time > min_time:
        delay_sec = random.randint(min_time, max_time)
    else:
        delay_sec = min_time
    
    unit = data.get("unit", "seconds")
    if unit == "minutes": delay_sec *= 60
    elif unit == "hours": delay_sec *= 3600
    elif unit == "days": delay_sec *= 86400
    
    if delay_sec >= 30:
        resume_time = datetime.now(timezone.utc) + timedelta(seconds=delay_sec)
        next_node_id = get_next_node(current_node_id, edges, None)
        
        if next_node_id:
            trigger.status = 'queued'
            trigger.scheduled_time = resume_time
            trigger.current_node_id = next_node_id
            db.commit()
            resume_time_br = resume_time.astimezone(BRAZIL_TZ)
            log_node_execution(db, trigger, current_node_id, "waiting", f"Agendado para {resume_time_br.strftime('%H:%M:%S')}", {"target_time": resume_time.isoformat()})
            return "stop"
        else:
            return "break"
    else:
        # Buffer de 1s para garantir que a UI mostre o tempo cheio
        target_time = datetime.now(timezone.utc) + timedelta(seconds=delay_sec + 1)
        log_node_execution(db, trigger, current_node_id, "waiting", f"Aguardando {delay_sec}s", {"target_time": target_time.isoformat()})
        await asyncio.sleep(delay_sec)
        finish_time = datetime.now(BRAZIL_TZ).strftime('%H:%M:%S')
        log_node_execution(db, trigger, current_node_id, "completed", f"Finalizado no tempo {finish_time}")
        return "continue"

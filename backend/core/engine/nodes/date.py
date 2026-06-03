from core.logger import setup_logger
from datetime import datetime, timezone
from ..utils import get_next_node, BRAZIL_TZ
from ..logging import log_node_execution

logger = setup_logger("FunnelEngine.Nodes.Date")

async def handle_date_node(db, trigger, node, edges, funnel):
    data = node.get("data", {})
    current_node_id = node["id"]
    
    mode = data.get("mode", "date") # "date", "time", "datetime"
    date_val = data.get("dateValue")
    time_val = data.get("timeValue") or "00:00"
    
    now_br = datetime.now(BRAZIL_TZ)
    resume_time_br = now_br
    has_target = False
    immediate = False
    try:
        if mode == "date" and date_val:
            y, m, d = map(int, date_val.split("-"))
            resume_time_br = now_br.replace(year=y, month=m, day=d, hour=0, minute=0, second=0, microsecond=0)
            has_target = True
            
        elif mode == "time" and time_val:
            h, mins = map(int, time_val.split(":"))
            resume_time_br = now_br.replace(hour=h, minute=mins, second=0, microsecond=0)
            has_target = True
            if now_br >= resume_time_br:
                immediate = True
                
        elif mode == "datetime" and date_val and time_val:
            y, m, d = map(int, date_val.split("-"))
            h, mins = map(int, time_val.split(":"))
            resume_time_br = now_br.replace(year=y, month=m, day=d, hour=h, minute=mins, second=0, microsecond=0)
            has_target = True
        else:
            immediate = True
    except Exception as e:
        logger.error(f"Erro ao processar data/horário no Nó Data: {e}")
        immediate = True
        
    resume_time_utc = resume_time_br.astimezone(timezone.utc)
    now_utc = datetime.now(timezone.utc)
    
    if immediate or resume_time_utc <= now_utc:
        enable_late_bypass = data.get("enableLateBypass", False)
        source_handle = "default"
        
        if enable_late_bypass and has_target:
            max_delay_value = float(data.get("maxDelayValue", 3))
            max_delay_unit = data.get("maxDelayUnit", "hours")
            
            if max_delay_unit == "minutes":
                max_delay_seconds = max_delay_value * 60
            else: # hours
                max_delay_seconds = max_delay_value * 3600
                
            time_difference = now_utc - resume_time_utc
            if time_difference.total_seconds() > max_delay_seconds:
                source_handle = "late"

        next_node_id = get_next_node(current_node_id, edges, source_handle)
        
        if source_handle == "default" and not next_node_id:
            next_node_id = get_next_node(current_node_id, edges, None)
            
        if source_handle == "late" and not next_node_id:
            log_node_execution(db, trigger, current_node_id, "completed", "Execução com atraso excedido. Rota 'late' não conectada, fluxo encerrado.")
            return "stop"
            
        finish_time = datetime.now(BRAZIL_TZ).strftime('%d/%m/%Y %H:%M:%S')
        log_message = f"Passou da data/hora alvo. Fluxo continuado em {finish_time}."
        if source_handle == "late":
            log_message = f"Atraso excedido detectado. Fluxo redirecionado pela porta 'late' em {finish_time}."
            
        log_node_execution(db, trigger, current_node_id, "completed", log_message)
        return source_handle
    else:
        # Pausa e agenda para resume_time_utc
        next_node_id = get_next_node(current_node_id, edges, "default")
        if not next_node_id:
            next_node_id = get_next_node(current_node_id, edges, None)
            
        if next_node_id:
            trigger.status = 'queued'
            trigger.scheduled_time = resume_time_utc
            trigger.current_node_id = next_node_id
            db.commit()
            
            resume_time_str = resume_time_br.strftime('%d/%m/%Y %H:%M:%S')
            log_node_execution(
                db, 
                trigger, 
                current_node_id, 
                "waiting", 
                f"Aguardando data/hora alvo: {resume_time_str}", 
                {"target_time": resume_time_utc.isoformat()}
            )
            return "stop"
        else:
            return "break"

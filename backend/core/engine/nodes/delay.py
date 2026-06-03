import random
from core.logger import setup_logger
import asyncio
from datetime import datetime, timezone, timedelta
from ..utils import get_next_node, BRAZIL_TZ
from ..logging import log_node_execution

logger = setup_logger("FunnelEngine.Nodes.Delay")

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
    
    # Ajuste inteligente de horário
    smart_hour_adjust = data.get("smartHourAdjust", False)
    smart_triggered = False
    smart_log_detail = ""
    
    if smart_hour_adjust:
        limit_hour_str = data.get("limitHour", "18:00")
        proximity_margin = int(data.get("proximityMargin", 30))
        
        now_br = datetime.now(BRAZIL_TZ)
        try:
            limit_h, limit_m = map(int, limit_hour_str.split(":"))
            limit_dt = now_br.replace(hour=limit_h, minute=limit_m, second=0, microsecond=0)
        except Exception as e:
            logger.error(f"Erro ao parsear limitHour {limit_hour_str}: {e}")
            limit_dt = now_br.replace(hour=18, minute=0, second=0, microsecond=0)
            
        margin_td = timedelta(minutes=proximity_margin)
        is_already_past = now_br >= limit_dt
        is_approaching = (limit_dt - margin_td) <= now_br < limit_dt
        
        if is_already_past:
            smart_triggered = True
            past_action = data.get("pastAction", "skip") # "skip", "reduce", "postpone"
            if past_action == "skip":
                delay_sec = 0
                smart_log_detail = f"Já passou de {limit_hour_str} (atual: {now_br.strftime('%H:%M')}). Delay pulado."
            elif past_action == "reduce":
                reduced_time = int(data.get("pastReducedTime") or 5)
                reduced_unit = data.get("pastReducedUnit", "minutes")
                delay_sec = reduced_time
                if reduced_unit == "minutes": delay_sec *= 60
                elif reduced_unit == "hours": delay_sec *= 3600
                elif reduced_unit == "days": delay_sec *= 86400
                
                unit_label = "m" if reduced_unit == "minutes" else "s" if reduced_unit == "seconds" else "h" if reduced_unit == "hours" else "d"
                smart_log_detail = f"Já passou de {limit_hour_str} (atual: {now_br.strftime('%H:%M')}). Reduzido para {reduced_time}{unit_label}."
            elif past_action == "postpone":
                postpone_hour = data.get("pastPostponeHour", "08:00")
                try:
                    post_h, post_m = map(int, postpone_hour.split(":"))
                except Exception:
                    post_h, post_m = 8, 0
                tomorrow_br = now_br + timedelta(days=1)
                tomorrow_scheduled_br = tomorrow_br.replace(hour=post_h, minute=post_m, second=0, microsecond=0)
                resume_time = tomorrow_scheduled_br.astimezone(timezone.utc)
                delay_sec = int((resume_time - datetime.now(timezone.utc)).total_seconds())
                if delay_sec < 0:
                    delay_sec = 0
                smart_log_detail = f"Já passou de {limit_hour_str} (atual: {now_br.strftime('%H:%M')}). Adiado para amanhã às {postpone_hour}."
                
        elif is_approaching:
            smart_triggered = True
            approach_action = data.get("approachAction", "reduce") # "skip", "reduce"
            if approach_action == "skip":
                delay_sec = 0
                smart_log_detail = f"Próximo de {limit_hour_str} (atual: {now_br.strftime('%H:%M')}). Delay pulado."
            elif approach_action == "reduce":
                reduced_time = int(data.get("approachReducedTime") or 5)
                reduced_unit = data.get("approachReducedUnit", "minutes")
                delay_sec = reduced_time
                if reduced_unit == "minutes": delay_sec *= 60
                elif reduced_unit == "hours": delay_sec *= 3600
                elif reduced_unit == "days": delay_sec *= 86400
                
                unit_label = "m" if reduced_unit == "minutes" else "s" if reduced_unit == "seconds" else "h" if reduced_unit == "hours" else "d"
                smart_log_detail = f"Próximo de {limit_hour_str} (atual: {now_br.strftime('%H:%M')}). Reduzido para {reduced_time}{unit_label}."
            logger.info(f"⚡ [SMART DELAY] {smart_log_detail}")
            
    # Determinar qual porta/handle de saída usar no React Flow
    source_handle = "default"
    if smart_triggered:
        if is_already_past:
            source_handle = "past"
        elif is_approaching:
            source_handle = "approach"

    if delay_sec >= 30:
        resume_time = datetime.now(timezone.utc) + timedelta(seconds=delay_sec)
        
        # Buscar nó correspondente ao handle de saída específico, com fallbacks robustos
        next_node_id = get_next_node(current_node_id, edges, source_handle)
        if not next_node_id:
            next_node_id = get_next_node(current_node_id, edges, "default")
        if not next_node_id:
            next_node_id = get_next_node(current_node_id, edges, None)
        
        if next_node_id:
            trigger.status = 'queued'
            trigger.scheduled_time = resume_time
            trigger.current_node_id = next_node_id
            db.commit()
            resume_time_br = resume_time.astimezone(BRAZIL_TZ)
            detail_msg = f"Agendado para {resume_time_br.strftime('%H:%M:%S')}"
            if smart_triggered:
                detail_msg += f" - {smart_log_detail}"
            log_node_execution(db, trigger, current_node_id, "waiting", detail_msg, {"target_time": resume_time.isoformat()})
            return "stop"
        else:
            return "break"
    else:
        # Buffer de 1s para garantir que a UI mostre o tempo cheio
        target_time = datetime.now(timezone.utc) + timedelta(seconds=delay_sec + 1)
        detail_msg = f"Aguardando {delay_sec}s"
        if smart_triggered:
            detail_msg += f" - {smart_log_detail}"
        log_node_execution(db, trigger, current_node_id, "waiting", detail_msg, {"target_time": target_time.isoformat()})
        if delay_sec > 0:
            await asyncio.sleep(delay_sec)
        
        finish_time = datetime.now(BRAZIL_TZ).strftime('%H:%M:%S')
        finish_msg = f"Finalizado no tempo {finish_time}"
        if smart_triggered:
            finish_msg += f" - {smart_log_detail}"
        log_node_execution(db, trigger, current_node_id, "completed", finish_msg)
        return source_handle

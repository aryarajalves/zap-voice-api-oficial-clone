from datetime import datetime, timezone, timedelta
from core.logger import setup_logger
from ..utils import get_next_node, BRAZIL_TZ
from ..logging import log_node_execution

logger = setup_logger("FunnelEngine.Nodes.BusinessHours")

async def handle_business_hours_node(db, trigger, node, edges, funnel):
    data = node.get("data", {})
    current_node_id = node["id"]
    
    schedule = data.get("schedule", {})
    # Grade padrão caso não esteja configurado
    if not schedule:
        schedule = {
            "0": {"open": True, "periods": [{"start": "08:00", "end": "18:00"}]},
            "1": {"open": True, "periods": [{"start": "08:00", "end": "18:00"}]},
            "2": {"open": True, "periods": [{"start": "08:00", "end": "18:00"}]},
            "3": {"open": True, "periods": [{"start": "08:00", "end": "18:00"}]},
            "4": {"open": True, "periods": [{"start": "08:00", "end": "18:00"}]},
            "5": {"open": True, "periods": [{"start": "08:00", "end": "12:00"}]},
            "6": {"open": False, "periods": [{"start": "08:00", "end": "18:00"}]}
        }

    wait_until_open = data.get("waitUntilOpen", False) or data.get("wait_until_open", False)
    
    now_br = datetime.now(BRAZIL_TZ)
    weekday = now_br.weekday()
    weekday_str = str(weekday)
    
    is_open = False
    day_config = schedule.get(weekday_str)
    
    periods = []
    if day_config and day_config.get("open", False):
        if "periods" in day_config and isinstance(day_config["periods"], list):
            periods = day_config["periods"]
        else:
            periods = [{"start": day_config.get("start", "08:00"), "end": day_config.get("end", "18:00")}]

    for period in periods:
        try:
            start_str = period.get("start", "08:00")
            end_str = period.get("end", "18:00")
            sh, sm = map(int, start_str.split(":"))
            eh, em = map(int, end_str.split(":"))
            
            start_dt = now_br.replace(hour=sh, minute=sm, second=0, microsecond=0)
            end_dt = now_br.replace(hour=eh, minute=em, second=0, microsecond=0)
            
            if start_dt <= now_br < end_dt:
                is_open = True
                break
        except Exception as e:
            logger.error(f"Erro ao analisar período {period} para o dia {weekday_str}: {e}")

    if is_open:
        log_node_execution(db, trigger, current_node_id, "completed", "Dentro do horário de atendimento. Rota: aberto")
        return "aberto"
    else:
        if wait_until_open:
            # Encontrar o próximo horário de abertura
            next_opening_dt = None
            for offset in range(8):
                check_day = now_br + timedelta(days=offset)
                check_weekday = check_day.weekday()
                check_weekday_str = str(check_weekday)
                
                check_config = schedule.get(check_weekday_str)
                if check_config and check_config.get("open", False):
                    check_periods = []
                    if "periods" in check_config and isinstance(check_config["periods"], list):
                        check_periods = check_config["periods"]
                    else:
                        check_periods = [{"start": check_config.get("start", "08:00"), "end": check_config.get("end", "18:00")}]
                        
                    for period in check_periods:
                        try:
                            start_str = period.get("start", "08:00")
                            sh, sm = map(int, start_str.split(":"))
                            opening_dt = check_day.replace(hour=sh, minute=sm, second=0, microsecond=0)
                            if opening_dt > now_br:
                                if next_opening_dt is None or opening_dt < next_opening_dt:
                                    next_opening_dt = opening_dt
                        except Exception:
                            pass
            
            if next_opening_dt:
                next_opening_utc = next_opening_dt.astimezone(timezone.utc)
                next_node_id = get_next_node(current_node_id, edges, "aberto")
                if not next_node_id:
                    next_node_id = get_next_node(current_node_id, edges, None)
                
                if next_node_id:
                    trigger.status = 'queued'
                    trigger.scheduled_time = next_opening_utc
                    trigger.current_node_id = next_node_id
                    db.commit()
                    
                    resume_time_str = next_opening_dt.strftime('%d/%m/%Y %H:%M:%S')
                    log_node_execution(
                        db, 
                        trigger, 
                        current_node_id, 
                        "waiting", 
                        f"Fora do horário de atendimento. Aguardando abertura em: {resume_time_str}", 
                        {"target_time": next_opening_utc.isoformat()}
                    )
                    return "break"
        
        log_node_execution(db, trigger, current_node_id, "completed", "Fora do horário de atendimento. Rota: fechado")
        return "fechado"

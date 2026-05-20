from datetime import datetime, timedelta, timezone
from .utils import BRAZIL_TZ

def is_within_business_hours_generic(dt_to_check, allowed_days, start_str, end_str) -> bool:
    """Verifica se um datetime específico (em UTC ou qualquer timezone) está dentro da janela configurada."""
    try:
        dt_br = dt_to_check.astimezone(BRAZIL_TZ)
        if dt_br.weekday() not in allowed_days: return False
        
        start_h, start_m = (int(x) for x in start_str.split(":"))
        end_h, end_m = (int(x) for x in end_str.split(":"))
        
        current_minutes = dt_br.hour * 60 + dt_br.minute
        start_minutes = start_h * 60 + start_m
        end_minutes = end_h * 60 + end_m
        
        return start_minutes <= current_minutes < end_minutes
    except:
        return True

def get_next_business_hour_start_generic(dt_to_check, allowed_days, start_str):
    """Calcula a próxima data/hora em que começa o período comercial a partir de dt_to_check."""
    try:
        dt_br = dt_to_check.astimezone(BRAZIL_TZ)
        start_h, start_m = (int(x) for x in start_str.split(":"))
        
        if dt_br.weekday() in allowed_days:
            today_start = dt_br.replace(hour=start_h, minute=start_m, second=0, microsecond=0)
            if dt_br < today_start: 
                return today_start.astimezone(timezone.utc)
        
        current_day = dt_br
        for _ in range(1, 8):
            current_day += timedelta(days=1)
            if current_day.weekday() in allowed_days:
                next_start = current_day.replace(hour=start_h, minute=start_m, second=0, microsecond=0)
                return next_start.astimezone(timezone.utc)
                
        return (dt_br + timedelta(days=1)).replace(hour=start_h, minute=start_m).astimezone(timezone.utc)
    except:
        return dt_to_check

def is_within_business_hours(funnel) -> bool:
    """Verifica se o momento atual está dentro do horário comercial configurado."""
    allowed_days = getattr(funnel, "business_hours_days", None) or [0, 1, 2, 3, 4]
    start_str = getattr(funnel, "business_hours_start", None) or "08:00"
    end_str = getattr(funnel, "business_hours_end", None) or "18:00"
    return is_within_business_hours_generic(datetime.now(timezone.utc), allowed_days, start_str, end_str)

def get_next_business_hour_start(funnel):
    """Calcula o datetime (UTC) do início do próximo período comercial."""
    allowed_days = getattr(funnel, "business_hours_days", None) or [0, 1, 2, 3, 4]
    start_str = getattr(funnel, "business_hours_start", None) or "08:00"
    return get_next_business_hour_start_generic(datetime.now(timezone.utc), allowed_days, start_str)

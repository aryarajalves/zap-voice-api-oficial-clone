
from datetime import datetime, time, timedelta, timezone
import calendar

# Fuso horário de Brasília (UTC-3)
BRT = timezone(timedelta(hours=-3))

def calculate_next_run(base_date: datetime, frequency: str, days_of_week: list = None, day_of_month: any = None, scheduled_time_str: str = "09:00"):
    """
    Calcula a próxima data/hora de execução suportando múltiplos dias e horários.
    base_date: Ponto de partida (geralmente agora)
    days_of_week: [{'day': 0, 'time': '09:00'}, ...] - 0=Seg, 6=Dom
    day_of_month: [1, 15] ou apenas 1 (legado)
    scheduled_time_str: Horário de fallback HH:mm
    """
    if base_date.tzinfo is None:
        base_date = base_date.replace(tzinfo=timezone.utc)
    
    potential_dates = []

    def parse_time(t_str):
        try:
            h, m = map(int, t_str.split(':'))
            return time(h, m)
        except:
            return time(9, 0)

    if frequency == 'weekly' and days_of_week:
        for entry in days_of_week:
            # Suporte a legado (lista de ints) e novo (lista de dicts)
            if isinstance(entry, int):
                d_idx = entry
                t_obj = parse_time(scheduled_time_str)
            else:
                d_idx = entry.get('day', 0)
                t_obj = parse_time(entry.get('time', scheduled_time_str))
            
            # 0=Monday, 6=Sunday
            current_weekday = base_date.weekday()
            days_diff = (d_idx - current_weekday) % 7
            
            candidate = base_date + timedelta(days=days_diff)
            # Trata o horário configurado como Brasília (UTC-3) e converte para UTC
            candidate = datetime.combine(candidate.date(), t_obj).replace(tzinfo=BRT)

            # Se for hoje e já passou o horário, pula para próxima semana
            if candidate <= base_date:
                candidate += timedelta(days=7)
            
            potential_dates.append(candidate)

    elif frequency == 'monthly' and day_of_month:
        # Suporte a int único (legado), lista de ints ou lista de dicts
        entries = day_of_month if isinstance(day_of_month, list) else [day_of_month]

        for entry in entries:
            if isinstance(entry, int):
                d_idx = entry
                t_obj = parse_time(scheduled_time_str)
            else:
                d_idx = entry.get('day', 1)
                t_obj = parse_time(entry.get('time', scheduled_time_str))

            # Procura o próximo dia disponível (pode ser este mês ou próximos)
            found = False
            for delta_month in range(0, 13): # Tenta até 12 meses à frente
                test_month = base_date.month + delta_month
                test_year = base_date.year + (test_month - 1) // 12
                test_month = (test_month - 1) % 12 + 1
                
                last_day = calendar.monthrange(test_year, test_month)[1]
                actual_day = min(d_idx, last_day) # Trata 31 em meses curtos
                
                candidate = datetime.combine(datetime(test_year, test_month, actual_day).date(), t_obj).replace(tzinfo=BRT)
                if candidate > base_date:
                    potential_dates.append(candidate)
                    found = True
                    break
    
    if not potential_dates:
        return None
    
    return min(potential_dates)

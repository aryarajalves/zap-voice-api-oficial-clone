"""
Serviço de cálculo e estimativa de custos da Meta Cloud API (WhatsApp Business).
Atualizado de acordo com a política vigente em 01/10/2026:
- 1.000 mensagens de serviço gratuitas por mês (franquia)
- Mensagens de serviço excedentes: R$ 0,0350 por mensagem
- Mensagens de utilidade / autenticação: R$ 0,0350 por mensagem
- Mensagens de marketing (templates promocionais): R$ 0,3500 por mensagem
"""
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from calendar import monthrange
import pytz
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
import models

# Tarifas oficiais aproximadas para o Brasil (BRL) vigentes em 01/10/2026
RATE_MARKETING_BRL = 0.3500
RATE_SERVICE_BRL = 0.0350
RATE_UTILITY_BRL = 0.0350
FREE_SERVICE_QUOTA = 1000


def get_meta_costs_summary(
    db: Session,
    client_id: int,
    target_month: Optional[str] = None  # Formato: "YYYY-MM"
) -> Dict[str, Any]:
    tz_br = pytz.timezone("America/Sao_Paulo")
    now_br = datetime.now(timezone.utc).astimezone(tz_br)

    if target_month:
        try:
            year_str, month_str = target_month.split("-")
            selected_year = int(year_str)
            selected_month = int(month_str)
        except ValueError:
            selected_year = now_br.year
            selected_month = now_br.month
    else:
        selected_year = now_br.year
        selected_month = now_br.month

    # Determina limites de data para o mês selecionado
    _, last_day = monthrange(selected_year, selected_month)
    start_dt_br = tz_br.localize(datetime(selected_year, selected_month, 1, 0, 0, 0))
    end_dt_br = tz_br.localize(datetime(selected_year, selected_month, last_day, 23, 59, 59, 999999))
    
    start_dt_utc = start_dt_br.astimezone(timezone.utc)
    end_dt_utc = end_dt_br.astimezone(timezone.utc)

    # 1. Contagem de Disparos de Templates (ScheduledTrigger)
    # Exclui registros técnicos internos
    triggers = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client_id,
        models.ScheduledTrigger.status.in_(["completed", "processing"]),
        models.ScheduledTrigger.created_at >= start_dt_utc,
        models.ScheduledTrigger.created_at <= end_dt_utc,
        or_(
            models.ScheduledTrigger.template_name != "HIDDEN_CHILD",
            models.ScheduledTrigger.template_name == None
        ),
        or_(
            models.ScheduledTrigger.product_name != "HIDDEN_CHILD",
            models.ScheduledTrigger.product_name == None
        )
    ).all()

    marketing_count = 0
    utility_count = 0

    for t in triggers:
        delivered = t.total_delivered or 0
        paid = t.total_paid_templates or 0
        if paid == 0 and delivered > 0 and t.template_name:
            # Fallback se não foi marcado como free
            if not ((t.sent_as == "FREE_MESSAGE") or (t.is_free_message == True)):
                paid = delivered
        
        # Se for integração de vendas com webhook (ex: compra aprovada, pix, boleto), é Utilidade
        if t.integration_id:
            utility_count += paid
        else:
            marketing_count += paid

    # 2. Contagem de Mensagens de Serviço (ChatMessage do Chat/Atendimento)
    # Mensagens enviadas pela empresa/atendente ou bot (sender_type != 'contact') com status entregue/lido
    service_count = db.query(func.count(models.ChatMessage.id)).join(
        models.ChatConversation,
        models.ChatMessage.conversation_id == models.ChatConversation.id
    ).filter(
        models.ChatConversation.client_id == client_id,
        models.ChatMessage.sender_type.in_(["user", "system", "agent"]),
        models.ChatMessage.timestamp >= start_dt_utc,
        models.ChatMessage.timestamp <= end_dt_utc,
        models.ChatMessage.status.in_(["sent", "delivered", "read"])
    ).scalar() or 0

    # 3. Cálculo da Franquia e Custos
    # Franquia de 1.000 mensagens para mensagens de serviço
    free_quota_total = FREE_SERVICE_QUOTA
    free_quota_used = min(service_count, free_quota_total)
    free_quota_remaining = max(0, free_quota_total - free_quota_used)
    service_billable_count = max(0, service_count - free_quota_total)

    cost_marketing = marketing_count * RATE_MARKETING_BRL
    cost_utility = utility_count * RATE_UTILITY_BRL
    cost_service = service_billable_count * RATE_SERVICE_BRL
    total_cost_month = cost_marketing + cost_utility + cost_service

    # Economia gerada pela franquia gratuita (1.000 msgs de serviço)
    savings_free_quota = free_quota_used * RATE_SERVICE_BRL

    # 4. Projeção de Fechamento do Mês
    is_current_month = (selected_year == now_br.year and selected_month == now_br.month)
    days_passed = now_br.day if is_current_month else last_day
    days_passed = max(1, days_passed)

    daily_average_cost = total_cost_month / days_passed
    projected_total_month = round(daily_average_cost * last_day, 2) if is_current_month else round(total_cost_month, 2)

    return {
        "month": f"{selected_year:04d}-{selected_month:02d}",
        "rates": {
            "marketing_rate": RATE_MARKETING_BRL,
            "service_rate": RATE_SERVICE_BRL,
            "utility_rate": RATE_UTILITY_BRL,
            "free_quota": FREE_SERVICE_QUOTA,
        },
        "counts": {
            "marketing_count": marketing_count,
            "utility_count": utility_count,
            "service_count": service_count,
            "total_messages": marketing_count + utility_count + service_count,
        },
        "quota": {
            "total": free_quota_total,
            "used": free_quota_used,
            "remaining": free_quota_remaining,
            "percent_used": round((free_quota_used / free_quota_total) * 100, 1),
            "billable_service_count": service_billable_count,
        },
        "costs": {
            "marketing_cost": round(cost_marketing, 2),
            "utility_cost": round(cost_utility, 2),
            "service_cost": round(cost_service, 2),
            "total_cost": round(total_cost_month, 2),
            "savings_quota": round(savings_free_quota, 2),
            "projected_total": projected_total_month,
        }
    }

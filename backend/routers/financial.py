from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import Optional
from datetime import datetime, timezone, timedelta
import pytz
import models
from core.deps import get_current_user, get_db

router = APIRouter()


@router.get("/financial/summary", summary="Resumo Financeiro de Disparos")
def get_financial_summary(
    period: str = "monthly",  # daily, weekly, monthly, yearly
    source: str = "all",      # all, bulk, webhook, other
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retorna resumo financeiro de disparos agrupados por período.
    Mostra quantos templates foram pagos vs gratuitos, custo total e economia estimada.
    source: 'all' | 'bulk' (disparo em massa) | 'webhook' (integração webhook) | 'other' (funil/manual)
    """
    client_id = x_client_id if x_client_id else current_user.client_id

    from sqlalchemy import or_

    query = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client_id,
        models.ScheduledTrigger.status.in_(["completed", "processing"]),
        # Exclui registros técnicos internos
        or_(
            models.ScheduledTrigger.template_name != "HIDDEN_CHILD",
            models.ScheduledTrigger.template_name == None
        ),
        or_(
            models.ScheduledTrigger.product_name != "HIDDEN_CHILD",
            models.ScheduledTrigger.product_name == None
        ),
    )

    # Filter by source/origin
    if source == "bulk":
        query = query.filter(models.ScheduledTrigger.is_bulk == True)
    elif source == "webhook":
        query = query.filter(models.ScheduledTrigger.integration_id != None)
    elif source == "other":
        query = query.filter(
            models.ScheduledTrigger.is_bulk != True,
            models.ScheduledTrigger.integration_id == None
        )

    triggers = query.all()

    # Build per-day buckets
    from collections import defaultdict

    buckets = defaultdict(lambda: {
        "total_triggers": 0,
        "total_sent": 0,
        "paid_triggers": 0,
        "paid_sent": 0,
        "free_triggers": 0,
        "free_sent": 0,
        "total_cost": 0.0,
        "estimated_savings": 0.0,
    })

    # Average Meta marketing template price in BRL (used to estimate savings)
    AVG_TEMPLATE_PRICE_BRL = 0.35

    # Brasilia Timezone
    tz_br = pytz.timezone('America/Sao_Paulo')

    for t in triggers:
        if not t.created_at:
            continue

        # Adjust UTC to Brasilia Timezone before grouping
        dt_utc = t.created_at
        if dt_utc.tzinfo is None:
            dt_utc = dt_utc.replace(tzinfo=timezone.utc)
        
        dt_br = dt_utc.astimezone(tz_br)
        day_key = dt_br.strftime("%Y-%m-%d")
        b = buckets[day_key]

        is_paid = (t.sent_as == "TEMPLATE") or (t.is_free_message == False and t.sent_as != "FREE_MESSAGE")
        is_free = (t.sent_as == "FREE_MESSAGE") or (t.is_free_message == True)

        b["total_triggers"] += 1
        b["total_sent"] += t.total_sent or 0

        if is_paid:
            b["paid_triggers"] += 1
            b["paid_sent"] += t.total_sent or 0
            cost = float(t.total_cost or 0)
            if cost == 0 and t.total_sent:
                cost = float(t.cost_per_unit or AVG_TEMPLATE_PRICE_BRL) * (t.total_sent or 0)
            b["total_cost"] += cost
        elif is_free:
            b["free_triggers"] += 1
            b["free_sent"] += t.total_sent or 0
            # Savings = what it would have cost if paid
            cost_per = float(t.cost_per_unit or AVG_TEMPLATE_PRICE_BRL)
            b["estimated_savings"] += cost_per * (t.total_sent or 0)

    # Aggregate into requested period
    def group_key(day_str: str, period: str) -> str:
        d = datetime.strptime(day_str, "%Y-%m-%d")
        if period == "daily":
            return day_str
        elif period == "weekly":
            # ISO week: YYYY-Www
            return d.strftime("%Y-W%W")
        elif period == "monthly":
            return d.strftime("%Y-%m")
        elif period == "yearly":
            return d.strftime("%Y")
        return day_str

    grouped = defaultdict(lambda: {
        "total_triggers": 0,
        "total_sent": 0,
        "paid_triggers": 0,
        "paid_sent": 0,
        "free_triggers": 0,
        "free_sent": 0,
        "total_cost": 0.0,
        "estimated_savings": 0.0,
    })

    for day_str, data in buckets.items():
        key = group_key(day_str, period)
        g = grouped[key]
        g["total_triggers"] += data["total_triggers"]
        g["total_sent"] += data["total_sent"]
        g["paid_triggers"] += data["paid_triggers"]
        g["paid_sent"] += data["paid_sent"]
        g["free_triggers"] += data["free_triggers"]
        g["free_sent"] += data["free_sent"]
        g["total_cost"] += data["total_cost"]
        g["estimated_savings"] += data["estimated_savings"]

    # Sort by period key descending
    sorted_items = sorted(grouped.items(), key=lambda x: x[0], reverse=True)

    rows = []
    for key, data in sorted_items:
        rows.append({
            "period": key,
            **{k: round(v, 2) if isinstance(v, float) else v for k, v in data.items()}
        })

    # Build totals
    totals = {
        "total_triggers": sum(r["total_triggers"] for r in rows),
        "total_sent": sum(r["total_sent"] for r in rows),
        "paid_triggers": sum(r["paid_triggers"] for r in rows),
        "paid_sent": sum(r["paid_sent"] for r in rows),
        "free_triggers": sum(r["free_triggers"] for r in rows),
        "free_sent": sum(r["free_sent"] for r in rows),
        "total_cost": round(sum(r["total_cost"] for r in rows), 2),
        "estimated_savings": round(sum(r["estimated_savings"] for r in rows), 2),
    }

    return {
        "period_type": period,
        "rows": rows,
        "totals": totals,
    }

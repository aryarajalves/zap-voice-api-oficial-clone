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

        total_delivered = t.total_delivered or 0
        paid_sent = t.total_paid_templates or 0
        
        # Se o gatilho foi explicitamente marcado como gratuito (Mensagem de Sessão/Interação)
        is_session_message = (t.sent_as == "FREE_MESSAGE") or (t.is_free_message == True)
        
        if is_session_message:
            paid_sent = 0
            free_sent = total_delivered
        else:
            # Fallback para registros antigos onde total_paid_templates pode estar zerado mas era um template
            if t.template_name and paid_sent == 0 and total_delivered > 0:
                # Se não temos custo mas é template, tratamos como pago para manter consistência com dados antigos
                # exceto se o custo for explicitamente 0 no total_cost (indicando que o worker processou e viu que era free)
                if (t.total_cost or 0) == 0 and t.total_delivered > 0:
                    paid_sent = 0
                else:
                    paid_sent = total_delivered
            
            free_sent = max(0, total_delivered - paid_sent)

        b["total_triggers"] += 1
        b["total_sent"] += total_delivered

        if paid_sent > 0:
            b["paid_triggers"] += 1
            b["paid_sent"] += paid_sent
            
            # Cálculo de Custo
            cost = float(t.total_cost or 0)
            if cost == 0:
                cost = float(t.cost_per_unit or AVG_TEMPLATE_PRICE_BRL) * paid_sent
            b["total_cost"] += cost
            
        if free_sent > 0:
            b["free_triggers"] += 1
            b["free_sent"] += free_sent
            # Economia = o que custaria se fosse um template pago
            cost_per = float(t.cost_per_unit or AVG_TEMPLATE_PRICE_BRL)
            b["estimated_savings"] += cost_per * free_sent

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


@router.get("/financial/sales", summary="Métricas de Vendas dos Webhooks")
def get_financial_sales(
    period: str = "monthly",  # daily, weekly, monthly, yearly
    status: str = "all",      # all, approved, pending, refunded, canceled
    platform: str = "all",    # all, hotmart, kiwify, eduzz, etc.
    product: str = "all",     # all, ou nomes separados por vírgula
    start_date: Optional[str] = None, # YYYY-MM-DD
    end_date: Optional[str] = None,   # YYYY-MM-DD
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retorna estatísticas de faturamento de vendas recebidas via webhooks.
    """
    client_id = x_client_id if x_client_id else current_user.client_id

    # Busca históricos de webhook relacionados à integrações desse cliente
    query = db.query(models.WebhookHistory).join(
        models.WebhookIntegration,
        models.WebhookHistory.integration_id == models.WebhookIntegration.id
    ).filter(
        models.WebhookIntegration.client_id == client_id
    )

    # Brasilia Timezone
    tz_br = pytz.timezone('America/Sao_Paulo')

    # Calculate default start/end dates based on period if not explicitly provided
    if not (start_date and start_date.strip()) and not (end_date and end_date.strip()):
        now_br = datetime.now(tz_br)
        if period == "daily":
            # Last 30 days
            start_dt = now_br - timedelta(days=30)
            start_date = start_dt.strftime("%Y-%m-%d")
        elif period == "weekly":
            # Last 12 weeks (84 days)
            start_dt = now_br - timedelta(days=84)
            start_date = start_dt.strftime("%Y-%m-%d")
        elif period == "monthly":
            # Last 12 months (365 days)
            start_dt = now_br - timedelta(days=365)
            start_date = start_dt.strftime("%Y-%m-%d")
        elif period == "yearly":
            # Last 5 years
            start_dt = now_br - timedelta(days=5*365)
            start_date = start_dt.strftime("%Y-%m-%d")

    # Apply date filters if provided
    # The database holds UTC timestamps, so we should convert start_date/end_date (which are local to BR)
    # into UTC bounds.
    if start_date and start_date.strip():
        try:
            # start of day in BR
            dt_start_br = datetime.strptime(start_date, "%Y-%m-%d")
            dt_start_br = tz_br.localize(dt_start_br.replace(hour=0, minute=0, second=0, microsecond=0))
            dt_start_utc = dt_start_br.astimezone(pytz.utc)
            query = query.filter(models.WebhookHistory.created_at >= dt_start_utc)
        except ValueError:
            pass

    if end_date and end_date.strip():
        try:
            # end of day in BR
            dt_end_br = datetime.strptime(end_date, "%Y-%m-%d")
            dt_end_br = tz_br.localize(dt_end_br.replace(hour=23, minute=59, second=59, microsecond=999999))
            dt_end_utc = dt_end_br.astimezone(pytz.utc)
            query = query.filter(models.WebhookHistory.created_at <= dt_end_utc)
        except ValueError:
            pass

    histories = query.all()

    totals = {
        "total_revenue": 0.0,
        "total_sales": 0,
        "total_refunds": 0,
        "total_pending": 0,
    }

    # Grouped by period buckets
    from collections import defaultdict
    buckets = defaultdict(lambda: {
        "revenue": 0.0,
        "sales_count": 0,
    })

    # Ranking of products
    product_stats = defaultdict(lambda: {
        "sales_count": 0,
        "total_revenue": 0.0
    })

    # Todos os produtos distintos (para popular dropdown no frontend)
    all_product_names: set = set()

    # Filtro por produto (suporta múltiplos nomes separados por vírgula)
    product_list = [p.strip() for p in product.split(',') if p.strip() and p.strip() != 'all']

    # Detailed transactions list
    transactions = []

    for h in histories:
        if not h.created_at:
            continue
            
        data = h.processed_data or {}
        price_str = data.get("price") or "0"
        try:
            price_val = float(price_str)
        except ValueError:
            price_val = 0.0

        p_name = data.get("product_name") or "Produto Desconhecido"
        tx_platform = (data.get("platform") or "outros").lower().strip()
        payment_method = data.get("payment_method") or "—"
        raw_status = data.get("raw_status") or h.status
        buyer_name = data.get("name") or "—"
        
        evt = h.event_type or ""

        # Determine transaction category for status filter
        tx_status_category = "other"
        if evt in ["compra_aprovada", "compra_aprovada_ob", "compra_aprovada_com_ob", "compra_aprovada_upsell"]:
            tx_status_category = "approved"
        elif evt in ["pix_gerado", "boleto_impresso"]:
            tx_status_category = "pending"
        elif evt == "reembolso":
            tx_status_category = "refunded"
        elif evt in ["cartao_recusado", "pix_expirado", "chargeback"]:
            tx_status_category = "canceled"

        # Coleta todos os nomes de produto distintos (antes de qualquer filtro de produto)
        # para retornar a lista completa ao frontend
        if p_name and p_name != "Produto Desconhecido":
            all_product_names.add(p_name)

        # Apply platform filter (suporta múltiplas plataformas separadas por vírgula)
        platform_list = [p.strip().lower() for p in platform.split(',') if p.strip() and p.strip() != 'all']
        if platform_list and tx_platform not in platform_list:
            continue

        # Apply product filter (filtra por nome exato do produto)
        if product_list and p_name not in product_list:
            continue

        # Apply status filter
        status_list = [s.strip() for s in status.split(',') if s.strip() and s.strip() != 'all']
        if status_list:
            if tx_status_category not in status_list:
                continue
        else:
            # Sem filtro específico: histórico de transações exibe apenas compra_aprovada e reembolso
            if evt not in ['compra_aprovada', 'compra_aprovada_ob', 'compra_aprovada_com_ob', 'compra_aprovada_upsell', 'reembolso']:
                continue

        # Classify totals
        # Adjust UTC to Brasilia Timezone for period grouping
        dt_utc = h.created_at
        if dt_utc.tzinfo is None:
            dt_utc = dt_utc.replace(tzinfo=timezone.utc)
        dt_br = dt_utc.astimezone(tz_br)

        # Classify totals
        APPROVED_EVENTS = {"compra_aprovada", "compra_aprovada_ob", "compra_aprovada_com_ob", "compra_aprovada_upsell"}
        if evt in APPROVED_EVENTS:
            totals["total_revenue"] += price_val
            totals["total_sales"] += 1
            product_stats[p_name]["sales_count"] += 1
            product_stats[p_name]["total_revenue"] += price_val
            
            day_key = dt_br.strftime("%Y-%m-%d")
            buckets[day_key]["revenue"] += price_val
            buckets[day_key]["sales_count"] += 1
        elif evt == "reembolso":
            totals["total_refunds"] += 1
            totals["total_revenue"] -= price_val
            product_stats[p_name]["total_revenue"] -= price_val
            
            day_key = dt_br.strftime("%Y-%m-%d")
            buckets[day_key]["revenue"] -= price_val
            buckets[day_key]["sales_count"] -= 1
        elif evt in ["pix_gerado", "boleto_impresso"]:
            totals["total_pending"] += 1

        EVENT_TYPE_LABELS = {
            "compra_aprovada": "Compra Aprovada",
            "compra_aprovada_ob": "Compra Aprovada (OB)",
            "compra_aprovada_com_ob": "Compra Aprovada + OB",
            "compra_aprovada_upsell": "Compra Aprovada (Upsell)",
            "compra_concluida": "Compra Concluída",
            "compra_cancelada": "Compra Cancelada",
            "cartao_recusado": "Cartão Recusado",
            "reembolso": "Reembolso",
            "chargeback": "Chargeback",
            "carrinho_abandonado": "Carrinho Abandonado",
            "pix_gerado": "Pix Gerado",
            "pix_expirado": "Pix Expirado",
            "boleto_impresso": "Boleto Gerado",
            "boleto_expirado": "Boleto Expirado",
            "assinatura_cancelada": "Assinatura Cancelada",
            "assinatura_atrasada": "Assinatura Atrasada",
            "assinatura_vencida": "Assinatura Vencida",
            "assinatura_renovada": "Assinatura Renovada",
            "form_submission": "Formulário",
            "evento_aluno": "Evento de Aluno",
            "outros": "Outro",
        }
        status_label = EVENT_TYPE_LABELS.get(evt, raw_status or evt)

        transactions.append({
            "id": h.id,
            "created_at": dt_br.isoformat(),
            "buyer_name": buyer_name,
            "product_name": p_name,
            "price": price_val,
            "platform": tx_platform.upper(),
            "payment_method": payment_method,
            "status": status_label,
            "event_type": evt,
            "category": tx_status_category
        })

    def group_key(day_str: str, period: str) -> str:
        d = datetime.strptime(day_str, "%Y-%m-%d")
        if period == "daily":
            return day_str
        elif period == "weekly":
            return d.strftime("%Y-W%W")
        elif period == "monthly":
            return d.strftime("%Y-%m")
        elif period == "yearly":
            return d.strftime("%Y")
        return day_str

    grouped = defaultdict(lambda: {
        "revenue": 0.0,
        "sales_count": 0,
    })

    for day_str, data in buckets.items():
        key = group_key(day_str, period)
        grouped[key]["revenue"] += data["revenue"]
        grouped[key]["sales_count"] += data["sales_count"]

    sorted_rows = []
    for key in sorted(grouped.keys(), reverse=True):
        sorted_rows.append({
            "period": key,
            "revenue": round(grouped[key]["revenue"], 2),
            "sales_count": grouped[key]["sales_count"]
        })

    sorted_products = []
    for p_name, stats in sorted(product_stats.items(), key=lambda x: x[1]["total_revenue"], reverse=True):
        sorted_products.append({
            "product_name": p_name,
            "sales_count": stats["sales_count"],
            "total_revenue": round(stats["total_revenue"], 2)
        })

    transactions.sort(key=lambda x: x["created_at"], reverse=True)

    totals["total_revenue"] = round(totals["total_revenue"], 2)

    # Lista completa de produtos distintos (ordenada alfabeticamente)
    all_products_list = sorted(list(all_product_names))

    return {
        "period_type": period,
        "totals": totals,
        "rows": sorted_rows,
        "top_products": sorted_products,
        "all_products": all_products_list,
        "transactions": transactions
    }


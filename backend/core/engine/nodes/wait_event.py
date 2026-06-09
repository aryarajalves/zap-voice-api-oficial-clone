import asyncio
from datetime import datetime, timezone, timedelta
from core.logger import setup_logger
import models
from ..logging import log_node_execution

logger = setup_logger("FunnelEngine.Nodes.WaitEvent")

async def handle_wait_event_node(db, trigger, node, chatwoot, contact_phone):
    """
    Nó de Aguardar Ação (Monitor de Checkout/Conversão)
    Pausa o fluxo (suspende) e monitora a ocorrência de um evento de conversão por um tempo determinado.
    
    Se o evento já ocorreu ou ocorrer a tempo -> vai para porta 'realizado'
    Caso contrário, ao expirar o tempo -> vai para porta 'nao_realizado'
    """
    current_node_id = node.get("id")
    data = node.get("data", {})
    
    event_type = data.get("eventType", "compra_aprovada") # Compra Aprovada, Carrinho Abandonado Recuperado, etc.
    product_name = data.get("productName", "").strip()
    wait_value = int(data.get("waitValue", 1))
    wait_unit = data.get("waitUnit", "hours") # hours, minutes, days
    
    # 1. Verificar se o evento de conversão já aconteceu para este lead
    # Buscamos no histórico de webhooks por um evento de sucesso recebido após a criação da trigger ou antes
    # O check é feito pelo telefone e tipo do evento
    clean_phone = "".join(filter(str.isdigit, contact_phone))
    
    # Busca um registro de webhook history com status 'processed' para este fone e evento
    # Se houver, a conversão já foi feita.
    query = db.query(models.WebhookHistory).join(
        models.WebhookIntegration,
        models.WebhookHistory.integration_id == models.WebhookIntegration.id
    ).filter(
        models.WebhookIntegration.client_id == trigger.client_id,
        models.WebhookHistory.event_type == event_type,
        models.WebhookHistory.status == "processed",
        models.WebhookHistory.created_at >= trigger.created_at
    )

    if product_name:
        # Filtra o JSONB processed_data na coluna product_name para ser exatamente o configurado
        from sqlalchemy import cast, String
        query = query.filter(cast(models.WebhookHistory.processed_data['product_name'], String).like(f"%{product_name}%"))

    existing_conversion = query.first()

    if existing_conversion:
        prod_desc = f" para o produto '{product_name}'" if product_name else ""
        log_node_execution(
            db, trigger, current_node_id, "completed", 
            f"✅ Conversão detectada! Evento '{event_type}'{prod_desc} já foi realizado."
        )
        return "realizado"

    # Se a trigger já estava suspensa aguardando este nó e o tempo limite expirou
    # Podemos verificar se o tempo atual passou do prazo calculado
    # Calculamos o prazo limite baseado em quando a trigger entrou neste nó pela primeira vez
    # Para isso, usamos a propriedade nodeState ou executionHistory se houver
    now = datetime.now(timezone.utc)
    
    # Vamos salvar o timestamp de expiração no trigger.execution_history ou similar
    # Ou simplesmente calculamos usando metadata ou o scheduled_time
    history_entries = trigger.execution_history or []
    node_start_time_str = None
    for entry in history_entries:
        if entry.get("node_id") == current_node_id and entry.get("status") == "suspended":
            node_start_time_str = entry.get("timestamp")
            break
            
    if node_start_time_str:
        try:
            node_start_time = datetime.fromisoformat(node_start_time_str.replace("Z", "+00:00"))
        except Exception:
            node_start_time = trigger.updated_at or trigger.created_at
    else:
        node_start_time = now

    # Calcula a expiração
    if wait_unit == "minutes":
        delta = timedelta(minutes=wait_value)
    elif wait_unit == "days":
        delta = timedelta(days=wait_value)
    else: # hours
        delta = timedelta(hours=wait_value)
        
    expiration_time = node_start_time + delta

    # 2. Se o prazo já passou e não comprou
    if now >= expiration_time and node_start_time_str:
        log_node_execution(
            db, trigger, current_node_id, "completed", 
            f"⏱️ Tempo esgotado ({wait_value} {wait_unit}). Evento '{event_type}' não foi realizado."
        )
        return "nao_realizado"

    # 3. Caso contrário, suspendemos o funil e agendamos a verificação de expiração para o final do prazo
    trigger.status = "suspended"
    trigger.current_node_id = current_node_id
    
    # Atualiza o scheduled_time do trigger para atuar como o cron de expiração (se o webhook não acordar o funil antes)
    trigger.scheduled_time = expiration_time
    db.commit()
    
    log_node_execution(
        db, trigger, current_node_id, "suspended", 
        f"⏳ Aguardando evento '{event_type}' por até {wait_value} {wait_unit} (Prazo: {expiration_time.isoformat()})."
    )
    return "stop"

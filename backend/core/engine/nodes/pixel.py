import httpx
import hashlib
from datetime import datetime, timezone
from core.logger import setup_logger
from ..logging import log_node_execution

logger = setup_logger("FunnelEngine.Nodes.Pixel")

async def handle_pixel_node(db, trigger, node, contact_phone):
    current_node_id = node.get("id")
    data = node.get("data", {})
    
    pixel_id = data.get("pixelId", "").strip()
    access_token = data.get("accessToken", "").strip()
    event_name = data.get("eventName", "Lead").strip()
    value = data.get("value", "").strip()
    currency = data.get("currency", "BRL").strip()
    
    log_node_execution(
        db, trigger, current_node_id, "processing", 
        f"📡 Disparando evento de Pixel '{event_name}' (Pixel ID: {pixel_id or 'Não informado'})..."
    )

    if not pixel_id or not access_token:
        log_node_execution(
            db, trigger, current_node_id, "completed",
            "Disparo de pixel ignorado: ID do Pixel ou Token de Acesso não configurados."
        )
        return "default"

    # Preparação dos dados do usuário (hash SHA-256 para conformidade com a Meta)
    clean_phone = "".join(filter(str.isdigit, str(contact_phone)))
    # Meta espera o telefone com DDI (código do país)
    hashed_phone = hashlib.sha256(clean_phone.encode('utf-8')).hexdigest()
    
    # Event Data para a Conversions API da Meta (CAPI)
    user_data = {
        "ph": [hashed_phone]
    }
    
    # Adicionar nome se disponível
    if trigger.contact_name:
        hashed_name = hashlib.sha256(trigger.contact_name.strip().lower().encode('utf-8')).hexdigest()
        user_data["fn"] = [hashed_name]

    custom_data = {}
    if value:
        try:
            custom_data["value"] = float(value)
            custom_data["currency"] = currency
        except Exception:
            pass

    payload = {
        "data": [{
            "event_name": event_name,
            "event_time": int(datetime.now(timezone.utc).timestamp()),
            "user_data": user_data,
            "custom_data": custom_data,
            "action_source": "system",
            "event_source_url": "https://zapvoice.local/funnel"
        }]
    }

    url = f"https://graph.facebook.com/v19.0/{pixel_id}/events"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                url,
                params={"access_token": access_token},
                json=payload
            )
            res_json = response.json()
            
            if response.status_code == 200:
                log_node_execution(
                    db, trigger, current_node_id, "completed",
                    f"Pixel enviado com sucesso para a API da Meta. Evento: {event_name}."
                )
            else:
                log_node_execution(
                    db, trigger, current_node_id, "completed",
                    f"Erro retornado pela API da Meta ao enviar Pixel (Status {response.status_code}): {res_json.get('error', {}).get('message', 'Erro desconhecido')}. Seguindo o fluxo."
                )
    except Exception as e:
        logger.error(f"Erro ao disparar evento de Pixel no nó {current_node_id}: {e}")
        log_node_execution(
            db, trigger, current_node_id, "completed",
            f"Falha de conexão com a API da Meta ao enviar Pixel: {str(e)}. Seguindo o fluxo."
        )

    return "default"

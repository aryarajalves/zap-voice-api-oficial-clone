import os
import zoneinfo
import httpx
import unicodedata
import re
import logging
from datetime import datetime, timezone

logger = logging.getLogger("FunnelEngine.Utils")

BRAZIL_TZ = zoneinfo.ZoneInfo("America/Sao_Paulo")
UPLOAD_DIR = "static/uploads"

NODE_TYPE_LABELS = {
    "start": "Início",
    "messageNode": "Mensagem",
    "audioNode": "Áudio",
    "mediaNode": "Mídia",
    "waitNode": "Aguardar",
    "conditionNode": "Condição",
    "end": "Fim",
    "inputNode": "Entrada",
    "actionNode": "Ação",
    "updateContactNode": "Atualizar Contato no Chatwoot"
}

def normalize_text(text: str) -> str:
    """Normaliza texto para comparação (Tags)."""
    if not text: return ""
    text = str(text).replace("#", "").lower()
    text = "".join(c for c in unicodedata.normalize('NFKD', text) if not unicodedata.combining(c))
    text = re.sub(r'[^a-z0-9 ]', '', text)
    return ' '.join(text.split())

async def validate_media_url(url: str) -> tuple[bool, str]:
    """Verifica se uma URL é válida e acessível."""
    if not url: return False, "URL de mídia está vazia."
    if not url.startswith(("http://", "https://")):
        return False, f"URL de mídia inválida ou privada (Meta requer https público): {url}"
    
    # DNS Fix: Se a URL aponta para o nosso próprio domínio público, mas estamos dentro de um container
    # que não consegue resolver esse domínio, tentamos validar via localhost se estiver no mesmo container
    # ou simplesmente assumimos que o arquivo existe se for local.
    
    try:
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            # Tentar HEAD primeiro (mais rápido)
            try:
                response = await client.head(url, follow_redirects=True)
                if 200 <= response.status_code < 400: return True, ""
            except Exception as e_head:
                logger.warning(f"⚠️ HEAD failed for {url}: {e_head}")
            
            # Tentar GET se o HEAD falhar
            try:
                response = await client.get(url, follow_redirects=True)
                if 200 <= response.status_code < 400: return True, ""
                return False, f"Arquivo de mídia inacessível (Status {response.status_code}): {url}"
            except Exception as e_get:
                # Se falhar por DNS (gaierror -2), tentamos um log mais informativo
                err_str = str(e_get)
                if "Name or service not known" in err_str:
                    logger.error(f"❌ DNS Error resolving {url} in worker. Considere adicionar extra_hosts no docker-compose.")
                    # Fallback: Se for o nosso domínio, vamos tentar validar apenas se o arquivo existe em static/uploads
                    if "/static/uploads/" in url:
                        filename = url.split("/static/uploads/")[-1].split("?")[0]
                        local_path = os.path.join("static", "uploads", filename)
                        if os.path.exists(local_path):
                            logger.info(f"✅ URL {url} não resolveu via DNS, mas o arquivo local {local_path} existe. Validado.")
                            return True, ""
                
                return False, f"Erro ao tentar validar URL de mídia (Rede): {err_str}"
                
    except Exception as e:
        logger.error(f"💥 Erro crítico ao validar URL {url}: {e}")
        return False, f"Erro ao tentar validar URL de mídia: {str(e)}"

def trigger_to_dict(trigger):
    """Converte ScheduledTrigger para dicionário seguro para JSON."""
    return {
        "id": trigger.id,
        "client_id": trigger.client_id,
        "integration_id": str(trigger.integration_id) if trigger.integration_id else None,
        "funnel_id": trigger.funnel_id,
        "status": trigger.status,
        "contact_name": trigger.contact_name,
        "contact_phone": trigger.contact_phone,
        "event_type": trigger.event_type,
        "template_name": trigger.template_name,
        "product_name": trigger.product_name,
        "is_bulk": trigger.is_bulk,
        "is_interaction": trigger.is_interaction,
        "sent_as": trigger.sent_as,
        "total_sent": trigger.total_sent or 0,
        "total_delivered": trigger.total_delivered or 0,
        "total_read": trigger.total_read or 0,
        "total_failed": trigger.total_failed or 0,
        "total_interactions": trigger.total_interactions or 0,
        "total_blocked": trigger.total_blocked or 0,
        "total_cost": trigger.total_cost or 0.0,
        "total_paid_templates": trigger.total_paid_templates or 0,
        "total_memory_sent": trigger.total_memory_sent or 0,
        "execution_history": trigger.execution_history or [],
        "failure_reason": trigger.failure_reason,
        "created_at": trigger.created_at.isoformat() if trigger.created_at else None,
        "scheduled_time": trigger.scheduled_time.isoformat() if trigger.scheduled_time else None,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

def apply_vars(text: str, trigger, global_map: dict) -> str:
    """Aplica substituição de variáveis no texto."""
    if not text: return text
    
    local_vars = {
        "nome": trigger.contact_name or "Contato",
        "telefone": trigger.contact_phone or "",
        "produto": trigger.product_name or "",
    }
    
    t_comp = trigger.template_components
    if t_comp:
        if isinstance(t_comp, list):
            for i, val in enumerate(t_comp): local_vars[str(i+1)] = val
        elif isinstance(t_comp, dict):
            local_vars.update(t_comp)

    if hasattr(trigger, 'processed_data') and trigger.processed_data:
         if isinstance(trigger.processed_data, dict):
             local_vars.update(trigger.processed_data)

    full_map = {**local_vars, **global_map}
    
    for key, val in full_map.items():
        str_val = str(val) if val is not None else ""
        if key == "1" and not str_val.strip(): continue
        text = text.replace(f"{{{{{key}}}}}", str_val)
    
    if "{{1}}" in text and trigger.contact_name:
        text = text.replace("{{1}}", trigger.contact_name)
        
    return text

def get_next_node(current_id, edges, source_handle=None):
    """Localiza o próximo nó no grafo baseado no handle de saída."""
    if not current_id: return None
    cid_str = str(current_id)
    source_edges = [e for e in edges if str(e.get("source")) == cid_str]
    
    for edge in source_edges:
        if source_handle:
            if edge.get("sourceHandle") == source_handle:
                return edge["target"]
        else:
            return edge["target"]
    return None

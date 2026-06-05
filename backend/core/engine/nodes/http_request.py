import httpx
import json
from core.logger import setup_logger
from ..logging import log_node_execution

logger = setup_logger("FunnelEngine.Nodes.HttpRequest")

async def handle_http_request_node(db, trigger, node, apply_vars_func):
    current_node_id = node.get("id")
    data = node.get("data", {})
    method = data.get("method", "POST").upper()
    url = data.get("url", "").strip()
    headers_list = data.get("headers", [])
    payload_str = data.get("payload", "").strip()
    
    log_node_execution(db, trigger, current_node_id, "processing", f"🌐 Iniciando requisição HTTP ({method}) para: {url}...")
    
    if not url:
        log_node_execution(db, trigger, current_node_id, "failed", "URL de destino não configurada.")
        return "fail"
    
    # Aplicar variáveis à URL
    resolved_url = apply_vars_func(url)
    
    # Processar headers
    headers = {}
    if isinstance(headers_list, list):
        for h in headers_list:
            if isinstance(h, dict):
                k = apply_vars_func(h.get("key", "")).strip()
                v = apply_vars_func(h.get("value", "")).strip()
                if k:
                    headers[k] = v
    elif isinstance(headers_list, dict):
        for k, v in headers_list.items():
            resolved_k = apply_vars_func(str(k)).strip()
            resolved_v = apply_vars_func(str(v)).strip()
            if resolved_k:
                headers[resolved_k] = resolved_v
                
    # Processar payload
    payload_type = data.get("payloadType")
    if not payload_type:
        if "payloadFields" in data:
            payload_type = "fields"
        else:
            payload_type = "raw"
            
    json_data = None
    content_data = None

    if payload_type == "fields":
        payload_fields = data.get("payloadFields", [])
        if isinstance(payload_fields, list):
            json_data = {}
            for f in payload_fields:
                if isinstance(f, dict):
                    k = apply_vars_func(f.get("key", "")).strip()
                    v = apply_vars_func(f.get("value", "")).strip()
                    if k:
                        json_data[k] = v
    else:  # raw ou fallback
        payload_raw = data.get("payloadRaw", "").strip() or data.get("payload", "").strip()
        if payload_raw:
            resolved_payload = apply_vars_func(payload_raw)
            try:
                json_data = json.loads(resolved_payload)
            except Exception:
                # Se não for JSON válido, envia como texto bruto
                content_data = resolved_payload

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            if method == "GET":
                params = json_data if isinstance(json_data, dict) else None
                response = await client.get(resolved_url, headers=headers, params=params)
            elif method == "PUT":
                if json_data is not None:
                    response = await client.put(resolved_url, headers=headers, json=json_data)
                else:
                    response = await client.put(resolved_url, headers=headers, content=content_data)
            else:  # POST e outros fallbacks
                if json_data is not None:
                    response = await client.post(resolved_url, headers=headers, json=json_data)
                else:
                    response = await client.post(resolved_url, headers=headers, content=content_data)
                    
            resolved_payload_str = ""
            if json_data is not None:
                try:
                    resolved_payload_str = json.dumps(json_data, ensure_ascii=False, indent=2)
                except Exception:
                    resolved_payload_str = str(json_data)
            elif content_data is not None:
                resolved_payload_str = str(content_data)

            extra_log_data = {
                "resolved_url": resolved_url,
                "resolved_payload": resolved_payload_str
            }
            
            status_code = response.status_code
            response_text = response.text[:500]  # Limitar tamanho do log
            
            if 200 <= status_code < 300:
                log_node_execution(
                    db, trigger, current_node_id, "completed", 
                    f"Requisição bem-sucedida (Status {status_code}). Resposta: {response_text}",
                    extra_data=extra_log_data
                )
                return "success"
            else:
                log_node_execution(
                    db, trigger, current_node_id, "failed", 
                    f"Requisição falhou (Status {status_code}). Resposta: {response_text}",
                    extra_data=extra_log_data
                )
                return "fail"
                
    except Exception as e:
        logger.error(f"Erro na execução da requisição HTTP no nó {current_node_id}: {e}")
        resolved_payload_str = ""
        if json_data is not None:
            try:
                resolved_payload_str = json.dumps(json_data, ensure_ascii=False, indent=2)
            except Exception:
                resolved_payload_str = str(json_data)
        elif content_data is not None:
            resolved_payload_str = str(content_data)

        extra_log_data = {
            "resolved_url": resolved_url if 'resolved_url' in locals() else url,
            "resolved_payload": resolved_payload_str
        }
        log_node_execution(
            db, trigger, current_node_id, "failed", 
            f"Erro de conexão/timeout ao enviar requisição HTTP: {str(e)}",
            extra_data=extra_log_data
        )
        return "fail"

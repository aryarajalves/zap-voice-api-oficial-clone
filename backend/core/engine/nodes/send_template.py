import asyncio
from core.logger import setup_logger
from datetime import datetime, timezone
import models
from ..utils import apply_vars
from ..logging import log_node_execution
from ..sync import wait_for_delivery_sync

logger = setup_logger("FunnelEngine.Nodes.SendTemplate")

async def handle_send_template_node(db, trigger, node, chatwoot, contact_phone, apply_vars_func):
    current_node_id = node.get("id")
    data = node.get("data", {})
    
    template_name = data.get("templateName")
    language = data.get("language", "pt_BR")
    mappings = data.get("mappings") or [] # Lista de { paramIndex: x, value: '...' }

    log_node_execution(
        db, trigger, current_node_id, "processing", 
        f"📩 Disparando Template Ativo '{template_name}' (Idioma: {language})..."
    )

    if not template_name:
        log_node_execution(db, trigger, current_node_id, "failed", "Disparo abortado: Nenhum template selecionado no nó.")
        return "fail"

    # Reconstrói a lista ordenada de parâmetros (components) a partir dos mappings do frontend
    # Componentes para a API do Chatwoot/Meta esperam a seguinte estrutura para o corpo:
    # [{"type": "body", "parameters": [{"type": "text", "text": "Valor 1"}, {"type": "text", "text": "Valor 2"}]}]
    components = []
    if mappings:
        # Ordena pelo paramIndex para garantir a correspondência correta
        sorted_mappings = sorted(mappings, key=lambda m: m.get("paramIndex", 1))
        parameters = []
        for mapping in sorted_mappings:
            val_raw = mapping.get("value", "").strip()
            # Avalia e substitui variáveis
            val_resolved = apply_vars_func(val_raw) if val_raw else ""
            parameters.append({
                "type": "text",
                "text": val_resolved
            })
        if parameters:
            components.append({
                "type": "body",
                "parameters": parameters
            })

    try:
        # Dispara o template utilizando o cliente integrado do Chatwoot/WhatsApp
        result = await chatwoot.send_template(contact_phone, template_name, language, components)
        
        # 1. Se a API retornar erro direto
        if isinstance(result, dict) and result.get("error"):
            log_node_execution(
                db, trigger, current_node_id, "failed",
                f"Erro retornado ao enviar template: {result.get('detail') or result.get('error')}"
            )
            return "fail"
        
        # 2. Se o envio foi aceito, registra a mensagem e aguarda a confirmação de entrega
        if isinstance(result, dict) and result.get("messages"):
            raw_id = result["messages"][0].get("id")
            wamid = raw_id.replace("wamid.", "") if raw_id else raw_id
            
            if wamid:
                template_body = None
                try:
                    tpl_cache = db.query(models.WhatsAppTemplateCache).filter(
                        models.WhatsAppTemplateCache.name == template_name,
                        models.WhatsAppTemplateCache.client_id == trigger.client_id
                    ).first()
                    if tpl_cache:
                        template_body = tpl_cache.body
                except Exception:
                    pass

                tpl_media_url = None
                if components:
                    for comp in components:
                        if str(comp.get("type", "")).lower() == "header":
                            params = comp.get("parameters", [])
                            for param in params:
                                param_type = str(param.get("type", "")).lower()
                                if param_type in ["image", "video", "document"]:
                                    media_data = param.get(param_type, {})
                                    if isinstance(media_data, dict):
                                        tpl_media_url = media_data.get("link") or media_data.get("url")

                content_val = template_body or f"[Template: {template_name}]"
                new_ms = models.MessageStatus(
                    trigger_id=trigger.id,
                    message_id=wamid,
                    phone_number=contact_phone,
                    status='sent',
                    message_type='TEMPLATE',
                    content=content_val,
                    publish_external_event=False,
                    var5=tpl_media_url
                )
                new_ms.pending_private_note = f"{content_val}\n\n📢 Enviado via Template Ativo: {template_name}"
                
                db.add(new_ms)
                trigger.total_sent = (trigger.total_sent or 0) + 1
                db.commit()

                # Se não for envio em lote, aguarda sincronização de entrega para validar a porta Success/Fail
                if not trigger.is_bulk:
                    log_node_execution(db, trigger, current_node_id, "processing", "Aguardando confirmação de entrega do template...")
                    state, detail = await wait_for_delivery_sync(db, wamid, trigger, current_node_id)
                    if state == "failed":
                        log_node_execution(db, trigger, current_node_id, "failed", f"Falha na entrega do template: {detail}")
                        return "fail"
                
                # Verifica se o template enviado possui botões interativos QUICK_REPLY para suspender o funil
                has_buttons = False
                try:
                    tpl_cache = db.query(models.WhatsAppTemplateCache).filter(
                        models.WhatsAppTemplateCache.name == template_name,
                        models.WhatsAppTemplateCache.client_id == trigger.client_id
                    ).first()
                    if tpl_cache and tpl_cache.components:
                        btn_comp = next((c for c in tpl_cache.components if c.get("type") == "BUTTONS"), None)
                        if btn_comp and btn_comp.get("buttons"):
                            quick_replies = [b for b in btn_comp["buttons"] if b.get("type") == "QUICK_REPLY"]
                            if quick_replies:
                                has_buttons = True
                except Exception:
                    pass

                if has_buttons:
                    trigger.status = 'suspended'
                    trigger.current_node_id = current_node_id
                    db.commit()
                    log_node_execution(db, trigger, current_node_id, "suspended", "Template com botões enviado com sucesso. Funil suspenso aguardando clique.")
                    return "stop"

                log_node_execution(db, trigger, current_node_id, "completed", f"Template '{template_name}' enviado e entregue com sucesso.")
                return "success"
                
        # Se a estrutura de retorno não for a esperada
        log_node_execution(db, trigger, current_node_id, "failed", f"Retorno inesperado da API ao disparar template: {result}")
        return "fail"

    except Exception as e:
        logger.error(f"Erro ao disparar template ativo no nó {current_node_id}: {e}")
        log_node_execution(db, trigger, current_node_id, "failed", f"Erro de conexão/execução: {str(e)}")
        return "fail"

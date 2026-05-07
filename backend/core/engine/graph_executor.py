import logging
import asyncio
from datetime import datetime, timezone
import models
from .utils import apply_vars, get_next_node
from .logging import log_node_execution
from .nodes.message import handle_message_node
from .nodes.audio import handle_audio_node
from .nodes.media import handle_media_node
from .nodes.delay import handle_delay_node
from .nodes.condition import handle_condition_node
from .nodes.template import handle_template_node
from .nodes.actions import handle_update_contact_node, handle_label_node, handle_randomizer_node, handle_link_funnel_node

logger = logging.getLogger("FunnelEngine.GraphExecutor")

async def execute_graph_funnel(trigger, graph_data, chatwoot, conversation_id, contact_phone, db, apply_vars_func, chatwoot_contact_id=None):
    current_node_id = trigger.current_node_id
    nodes = {str(n["id"]): n for n in graph_data.get("nodes", [])}
    edges = graph_data.get("edges", [])
    funnel = trigger.funnel
    
    if not current_node_id:
        # 1. Tentar encontrar nó do tipo 'start' ou marcado com isStart
        start_node = next((n for n in nodes.values() if n.get("type") == "start" or n.get("data", {}).get("isStart")), None)
        
        # 2. Fallback: Se não encontrou, pegar o primeiro nó que não seja um 'start' (pois se fosse start teria sido pego acima)
        # e que faça sentido começar (ex: mensagem, áudio, mídia)
        if not start_node and nodes:
            logger.warning(f"⚠️ [GRAPH] Nenhum nó de início (start) encontrado para o Funil {funnel.id}. Usando fallback para o primeiro nó disponível.")
            # Priorizar tipos de conteúdo
            priority_nodes = [n for n in nodes.values() if n.get("type") in ["message", "messageNode", "audioNode", "mediaNode", "templateNode"]]
            if priority_nodes:
                start_node = priority_nodes[0]
            else:
                start_node = list(nodes.values())[0]
        
        if not start_node:
            logger.error(f"❌ [GRAPH] Falha crítica: Funil {funnel.id} não possui NENHUM nó configurado.")
            trigger.status = 'failed'
            trigger.failure_reason = "Funil sem nós configurados."
            db.commit()
            return
            
        current_node_id = start_node["id"]
        logger.info(f"🚀 [GRAPH] Iniciando execução pelo Nó: {current_node_id} (Tipo: {start_node.get('type')})")
    
    while current_node_id:
        node = nodes.get(current_node_id)
        if not node: 
            logger.warning(f"⚠️ [GRAPH] Nó {current_node_id} não encontrado no dicionário de nós.")
            break
            
        node_type = node.get("type")
        logger.info(f"📍 [GRAPH] Processando Nó: {current_node_id} (Tipo: {node_type})")
        source_handle = None 
        
        # Orquestração de Handlers
        if node_type == "start": pass
        elif node_type in ["message", "messageNode"]:
            res = await handle_message_node(db, trigger, node, chatwoot, conversation_id, contact_phone, apply_vars_func, funnel)
            if isinstance(res, dict): conversation_id = res.get("conversation_id", conversation_id)
            if res in ["stop", "abort"]: 
                logger.info(f"🛑 [GRAPH] Nó {current_node_id} solicitou interrupção: {res}")
                return
        elif node_type == "audioNode":
            res = await handle_audio_node(db, trigger, node, chatwoot, conversation_id, contact_phone, apply_vars_func, funnel)
            if isinstance(res, dict): conversation_id = res.get("conversation_id", conversation_id)
            if res in ["stop", "abort"]: 
                logger.info(f"🛑 [GRAPH] Nó {current_node_id} solicitou interrupção: {res}")
                return
        elif node_type in ["media", "mediaNode"]:
            res = await handle_media_node(db, trigger, node, chatwoot, conversation_id, contact_phone, apply_vars_func, funnel, chatwoot_contact_id)
            if isinstance(res, dict): conversation_id = res.get("conversation_id", conversation_id)
            if res in ["stop", "abort"]: 
                logger.info(f"🛑 [GRAPH] Nó {current_node_id} solicitou interrupção: {res}")
                return
        elif node_type in ["delay", "delayNode"]:
            res = await handle_delay_node(db, trigger, node, edges, funnel)
            if res == "stop": 
                logger.info(f"🛑 [GRAPH] Nó {current_node_id} (Delay) interrompeu a execução.")
                return
            if res == "break": 
                logger.info(f"⏸️ [GRAPH] Nó {current_node_id} (Delay) pausou a execução (Scheduled).")
                break
        elif node_type in ["condition", "conditionNode"]:
            res = await handle_condition_node(db, trigger, node, chatwoot, contact_phone, edges)
            if res == "stop": return
            if res in ["break", "abort"]: break
            source_handle = res
        elif node_type in ["template", "templateNode"]:
            res = await handle_template_node(db, trigger, node, chatwoot, conversation_id, contact_phone, apply_vars_func, chatwoot_contact_id)
            if isinstance(res, dict): conversation_id = res.get("conversation_id", conversation_id)
            if res in ["stop", "abort"]: return
        elif node_type in ["update_contact", "updateContactNode"]:
            await handle_update_contact_node(db, trigger, node, chatwoot, contact_phone, apply_vars_func)
        elif node_type in ["chatwoot_label", "labelNode"]:
            await handle_label_node(db, trigger, node, chatwoot, contact_phone, conversation_id)
        elif node_type in ["randomizer", "randomizerNode"]:
            source_handle = handle_randomizer_node(node)
        elif node_type in ["link_funnel", "linkFunnelNode"]:
            await handle_link_funnel_node(db, trigger, node, contact_phone, conversation_id)

        next_node_id = get_next_node(current_node_id, edges, source_handle)
        if next_node_id:
            logger.info(f"➡️ [GRAPH] Avançando do Nó {current_node_id} para {next_node_id}")
            current_node_id = next_node_id
            trigger.current_node_id = current_node_id
            db.commit()
        else: 
            logger.info(f"🔚 [GRAPH] Fim do caminho alcançado no Nó {current_node_id}")
            break

    trigger.status = 'completed'
    log_node_execution(db, trigger, "FINISH", "completed", "Funil concluído com sucesso.")
    db.commit()

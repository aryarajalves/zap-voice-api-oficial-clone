import asyncio
from core.logger import setup_logger
from datetime import datetime, timezone
import models
from services.window_manager import is_window_open_strict
from ..logging import log_node_execution

logger = setup_logger("FunnelEngine.Nodes.CheckWindow")

async def handle_check_window_node(db, trigger, node, chatwoot, contact_phone, conversation_id):
    current_node_id = node.get("id")
    
    log_node_execution(
        db, trigger, current_node_id, "processing", 
        f"🔍 Verificando janela de 24 horas para o contato {contact_phone} (ID Conversa: {conversation_id})..."
    )

    try:
        # Verifica se a janela está aberta
        is_open = await is_window_open_strict(
            client_id=trigger.client_id,
            phone=contact_phone,
            current_conversation_id=conversation_id,
            db=db,
            chatwoot=chatwoot
        )

        if is_open:
            log_node_execution(
                db, trigger, current_node_id, "completed", 
                "✅ Janela de 24 horas está ABERTA."
            )
            return "open"
        else:
            log_node_execution(
                db, trigger, current_node_id, "completed", 
                "❌ Janela de 24 horas está FECHADA."
            )
            return "closed"

    except Exception as e:
        logger.error(f"Erro ao verificar janela de 24h no nó {current_node_id}: {e}")
        log_node_execution(
            db, trigger, current_node_id, "failed", 
            f"Erro na verificação de janela de 24h: {str(e)}"
        )
        return "closed"

from core.logger import setup_logger
from ..utils import normalize_text
from ..logging import log_node_execution
import models

logger = setup_logger("FunnelEngine.Nodes.NewConversation")


async def handle_new_conversation_node(db, trigger, node, contact_phone, conversation_id=None):
    """
    Nó de Gatilho de Nova Conversa (Switch).
    Analisa a primeira mensagem enviada pelo usuário na nova conversa e avalia
    as rotas configuradas, retornando o ID da rota correspondente ou 'default'.
    """
    data = node.get("data", {})
    current_node_id = node.get("id")
    routes = data.get("routes", [])

    # 1. Recuperar a primeira mensagem do contato
    first_message = ""
    if trigger and hasattr(trigger, "processed_data") and isinstance(trigger.processed_data, dict):
        first_message = trigger.processed_data.get("first_message") or ""

    # Se não estiver no processed_data, busca no histórico local da conversa
    effective_convo_id = conversation_id or getattr(trigger, "conversation_id", None)
    if not first_message and effective_convo_id and db:
        chat_msg = db.query(models.ChatMessage).filter(
            models.ChatMessage.conversation_id == effective_convo_id,
            models.ChatMessage.sender_type == "contact"
        ).order_by(models.ChatMessage.id.asc()).first()
        if chat_msg and chat_msg.content:
            first_message = chat_msg.content

    # Fallback para var1/var2 caso existam
    if not first_message and trigger:
        first_message = getattr(trigger, "var2", "") or getattr(trigger, "var1", "") or ""

    clean_input = normalize_text(first_message) if first_message else ""
    logger.info(f"🔍 [NEW_CONVO_NODE] Avaliando nó #{current_node_id} para {contact_phone}. 1ª Mensagem: '{first_message}' (Normalizada: '{clean_input}')")

    matched_route_id = None
    matched_route_label = None

    if clean_input and routes:
        for route in routes:
            route_id = route.get("id")
            route_label = route.get("label") or route_id
            phrases_raw = route.get("phrases", "")
            match_type = route.get("match_type") or route.get("matchType") or "contains"

            # Lista de frases da rota separadas por vírgula
            phrases = [normalize_text(p.strip()) for p in phrases_raw.split(",") if p.strip()]

            for phrase in phrases:
                is_match = False
                if match_type == "exact":
                    is_match = (clean_input == phrase)
                else:  # default 'contains'
                    is_match = (phrase in clean_input)

                if is_match:
                    matched_route_id = route_id
                    matched_route_label = route_label
                    logger.info(f"🎯 [NEW_CONVO_NODE] Coincidência na rota '{route_label}' (ID: {route_id}) com a frase '{phrase}'")
                    break

            if matched_route_id:
                break

    if matched_route_id:
        log_node_execution(
            db, trigger, current_node_id, "completed",
            f"Gatilho Nova Conversa: Rota '{matched_route_label}' ({matched_route_id}) selecionada.",
            {"selected_route": matched_route_id, "first_message": first_message}
        )
        return matched_route_id

    # Rota Padrão (Fallback)
    log_node_execution(
        db, trigger, current_node_id, "completed",
        "Gatilho Nova Conversa: Nenhuma rota específica coincidiu. Seguindo pela rota padrão (default).",
        {"selected_route": "default", "first_message": first_message}
    )
    return "default"

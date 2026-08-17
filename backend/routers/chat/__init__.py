from fastapi import APIRouter

from core.clients.whatsapp.client import WhatsAppClient
from chatwoot_client import ChatwootClient

from .common import (
    get_client_id,
    LabelCreateRequest,
    ResendAgentFlowPayload,
    ReactRequest,
)
from .conversation_routes import (
    router as conversation_router,
    get_or_create_conversation,
    list_conversations,
    update_conversation_status,
    assign_conversation,
    mark_as_read,
    toggle_pin_conversation,
    toggle_urgent_conversation,
    reset_24h_window,
    clear_conversation_messages,
    delete_conversation,
    delete_conversations_bulk,
    seed_conversations,
)
from .message_routes import (
    router as message_router,
    list_messages,
    list_conversation_media,
    send_chat_message,
    send_chat_template,
    proxy_whatsapp_media,
    send_chat_media_message,
    delete_chat_message,
    resend_message_to_agentflow,
    react_to_message,
)
from .funnel_routes import (
    router as funnel_router,
    trigger_funnel_for_conversation,
    cancel_funnel_for_conversation,
)
from .notes_and_labels_routes import (
    router as notes_labels_router,
    list_chat_agents,
    list_custom_labels,
    create_custom_label,
    update_conversation_labels,
    bulk_tag_conversations,
    update_conversation_note,
    update_private_note_message,
    list_human_conversations,
    finish_human_handover,
    get_ai_config,
    analyze_conversation_doubts,
    analyze_conversations_doubts_bulk,
)
from .message_search_routes import (
    router as message_search_router,
    search_conversation_messages,
)
from .share_contact_routes import (
    router as share_contact_router,
    share_contact_message,
)

router = APIRouter()
router.include_router(conversation_router)
router.include_router(message_router)
router.include_router(funnel_router)
router.include_router(notes_labels_router)
router.include_router(message_search_router)
router.include_router(share_contact_router)

__all__ = [
    "router",
    "WhatsAppClient",
    "ChatwootClient",
    "get_client_id",
    "LabelCreateRequest",
    "ResendAgentFlowPayload",
    "ReactRequest",
    "get_or_create_conversation",
    "list_conversations",
    "update_conversation_status",
    "assign_conversation",
    "mark_as_read",
    "toggle_pin_conversation",
    "toggle_urgent_conversation",
    "reset_24h_window",
    "clear_conversation_messages",
    "delete_conversation",
    "delete_conversations_bulk",
    "seed_conversations",
    "list_messages",
    "list_conversation_media",
    "send_chat_message",
    "send_chat_template",
    "proxy_whatsapp_media",
    "send_chat_media_message",
    "delete_chat_message",
    "resend_message_to_agentflow",
    "react_to_message",
    "trigger_funnel_for_conversation",
    "cancel_funnel_for_conversation",
    "list_chat_agents",
    "list_custom_labels",
    "create_custom_label",
    "update_conversation_labels",
    "bulk_tag_conversations",
    "update_conversation_note",
    "update_private_note_message",
    "list_human_conversations",
    "finish_human_handover",
    "get_ai_config",
    "analyze_conversation_doubts",
    "analyze_conversations_doubts_bulk",
]

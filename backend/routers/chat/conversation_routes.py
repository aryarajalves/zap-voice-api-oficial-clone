from fastapi import APIRouter

from .conversation_modules import (
    list_router,
    status_router,
    toggle_router,
    delete_router,
    get_or_create_conversation,
    list_conversations,
    update_conversation_status,
    toggle_archive_conversation,
    bulk_archive_conversations,
    assign_conversation,
    mark_as_read,
    toggle_pin_conversation,
    toggle_urgent_conversation,
    reset_24h_window,
    clear_conversation_messages,
    delete_conversation,
    delete_conversations_bulk,
    seed_conversations,
    build_conversation_filter_query,
    get_blocked_and_resting_data,
    get_block_info,
    get_active_funnels_map,
)

router = APIRouter()
router.include_router(list_router)
router.include_router(status_router)
router.include_router(toggle_router)
router.include_router(delete_router)

__all__ = [
    "router",
    "get_or_create_conversation",
    "list_conversations",
    "update_conversation_status",
    "toggle_archive_conversation",
    "bulk_archive_conversations",
    "assign_conversation",
    "mark_as_read",
    "toggle_pin_conversation",
    "toggle_urgent_conversation",
    "reset_24h_window",
    "clear_conversation_messages",
    "delete_conversation",
    "delete_conversations_bulk",
    "seed_conversations",
    "build_conversation_filter_query",
    "get_blocked_and_resting_data",
    "get_block_info",
    "get_active_funnels_map",
]

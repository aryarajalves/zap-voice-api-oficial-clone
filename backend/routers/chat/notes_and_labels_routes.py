"""
Módulo de Rotas de Anotações, Etiquetas, Atendimento Humano e IA (ZapVoice Chat)
Refatorado de forma modular com separação de domínios:
- notes_labels_modules/notes_routes.py: Anotações privadas da conversa.
- notes_labels_modules/labels_routes.py: CRUD de etiquetas e etiquetagem em lote (bulk-tag).
- notes_labels_modules/human_handover_routes.py: Atendimento humano, transbordo e agentes.
- notes_labels_modules/ai_analysis_routes.py: Análise de dúvidas não respondidas com OpenAI.
- notes_labels_modules/mention_routes.py: Listagem e busca de contatos para menção (@).
"""

from fastapi import APIRouter

from .notes_labels_modules import (
    notes_router,
    update_conversation_note,
    update_private_note_message,
    labels_router,
    list_custom_labels,
    create_custom_label,
    update_conversation_labels,
    bulk_tag_conversations,
    human_handover_router,
    list_chat_agents,
    list_human_conversations,
    finish_human_handover,
    bulk_finish_human_handover,
    ai_analysis_router,
    get_ai_config,
    analyze_conversation_doubts,
    analyze_conversations_doubts_bulk,
    mention_router,
    list_mention_contacts,
)

router = APIRouter()

router.include_router(notes_router)
router.include_router(labels_router)
router.include_router(human_handover_router)
router.include_router(ai_analysis_router)
router.include_router(mention_router)

__all__ = [
    "router",
    "list_chat_agents",
    "list_custom_labels",
    "create_custom_label",
    "update_conversation_labels",
    "bulk_tag_conversations",
    "update_conversation_note",
    "update_private_note_message",
    "list_human_conversations",
    "finish_human_handover",
    "bulk_finish_human_handover",
    "get_ai_config",
    "analyze_conversation_doubts",
    "analyze_conversations_doubts_bulk",
    "list_mention_contacts",
]

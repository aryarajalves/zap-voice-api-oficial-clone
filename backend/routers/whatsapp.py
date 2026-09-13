"""
Módulo de Rotas do WhatsApp (ZapVoice)
Refatorado de forma modular com separação de domínios:
- whatsapp_modules/connection_routes.py: Teste de token, debug de ambiente e labels.
- whatsapp_modules/template_routes.py: CRUD de templates, tags, pin, status e arquivamento.
- whatsapp_modules/media_routes.py: Transcodificação FFmpeg e upload de mídia na Meta.
- whatsapp_modules/send_routes.py: Envio de templates e tracking de mensagens manuais.
- whatsapp_modules/client_helper.py: Helper de injeção/mock para ChatwootClient.
"""

from fastapi import APIRouter
from chatwoot_client import ChatwootClient

from .whatsapp_modules.connection_routes import (
    router as connection_router,
    debug_env,
    test_whatsapp_token,
    list_labels,
    TestTokenRequest,
)
from .whatsapp_modules.template_routes import (
    router as template_router,
    list_templates,
    archive_template,
    unarchive_template,
    update_template_tags,
    pin_template,
    delete_template_tag_global,
    create_template,
    update_template,
    delete_template,
    reset_template_24h_history,
    update_template_status,
)
from .whatsapp_modules.media_routes import (
    router as media_router,
    upload_template_media,
)
from .whatsapp_modules.send_routes import (
    router as send_router,
    send_template,
)
from .whatsapp_modules.client_helper import get_chatwoot_client

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])

router.include_router(connection_router)
router.include_router(template_router)
router.include_router(media_router)
router.include_router(send_router)

__all__ = [
    "router",
    "ChatwootClient",
    "get_chatwoot_client",
    "debug_env",
    "test_whatsapp_token",
    "list_labels",
    "TestTokenRequest",
    "list_templates",
    "archive_template",
    "unarchive_template",
    "update_template_tags",
    "pin_template",
    "delete_template_tag_global",
    "create_template",
    "update_template",
    "delete_template",
    "reset_template_24h_history",
    "update_template_status",
    "upload_template_media",
    "send_template",
]

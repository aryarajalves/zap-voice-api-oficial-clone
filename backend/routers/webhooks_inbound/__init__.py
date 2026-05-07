from fastapi import APIRouter
from .chatwoot import router as chatwoot_router
from .meta import router as meta_router
from .external import router as external_router
from .management import router as management_router

router = APIRouter()

# Rotas do Chatwoot
router.include_router(chatwoot_router, tags=["Chatwoot Webhooks"])

# Rotas da Meta (WhatsApp)
router.include_router(meta_router, tags=["Meta Webhooks"])

# Rotas de Sistemas Externos (Slug, N8N, Ping)
router.include_router(external_router, tags=["External Webhooks"])

# Rotas de Gestão de Eventos
router.include_router(management_router, tags=["Webhook Management"])

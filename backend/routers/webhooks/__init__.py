from fastapi import APIRouter
from .integrations import router as integrations_router
from .history import router as history_router
from .dispatches import router as dispatches_router
from .actions import router as actions_router

router = APIRouter()

# CRUD de integrações (Raiz)
router.include_router(integrations_router, prefix="/webhook-integrations", tags=["Webhook Integrations"])

# Gestão de Histórico
router.include_router(history_router, prefix="/webhook-integrations", tags=["Webhook History"])

# Gestão de Disparos
router.include_router(dispatches_router, prefix="/webhook-integrations", tags=["Webhook Dispatches"])

# Ações Especiais
router.include_router(actions_router, prefix="/webhook-integrations", tags=["Webhook Actions"])

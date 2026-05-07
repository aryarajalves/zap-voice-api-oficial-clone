from fastapi import APIRouter
from .management import router as management_router
from .actions import router as actions_router
from .bulk import router as bulk_router
from .details import router as details_router

router = APIRouter()

# CRUD e Listagem (Raiz /triggers)
router.include_router(management_router, prefix="/triggers", tags=["Triggers Management"])

# Ações de Controle (/triggers/{id}/...)
router.include_router(actions_router, prefix="/triggers", tags=["Triggers Actions"])

# Detalhes e Mensagens (/triggers/{id}/...)
router.include_router(details_router, prefix="/triggers", tags=["Triggers Details"])

# Disparos em Massa (Rotas variadas: /trigger-bulk, /bulk-send, /funnels)
# Estas rotas mantêm seus caminhos originais para compatibilidade com o frontend
router.include_router(bulk_router, tags=["Triggers Bulk"])

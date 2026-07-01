from fastapi import APIRouter
from .management import router as management_router
from .actions import router as actions_router
from .bulk import router as bulk_router
from .details import router as details_router
from .stress_test import router as stress_test_router
from .folders import router as folders_router

router = APIRouter()

# Pastas (/triggers/folders, /triggers/bulk-move-folder, /triggers/{id}/folder)
# IMPORTANTE: precisa vir ANTES do management_router, pois este define GET/DELETE "/{trigger_id}"
# que, sendo genérico, "casaria" com "/folders" se viesse primeiro (FastAPI tenta rotas na ordem de registro).
router.include_router(folders_router, prefix="/triggers", tags=["Trigger Folders"])

# CRUD e Listagem (Raiz /triggers)
router.include_router(management_router, prefix="/triggers", tags=["Triggers Management"])

# Ações de Controle (/triggers/{id}/...)
router.include_router(actions_router, prefix="/triggers", tags=["Triggers Actions"])

# Detalhes e Mensagens (/triggers/{id}/...)
router.include_router(details_router, prefix="/triggers", tags=["Triggers Details"])

# Disparos em Massa (Rotas variadas: /trigger-bulk, /bulk-send, /funnels)
# Estas rotas mantêm seus caminhos originais para compatibilidade com o frontend
router.include_router(bulk_router, tags=["Triggers Bulk"])

# Teste de Escala e Estresse (/stress-test)
router.include_router(stress_test_router, tags=["Stress Test"])

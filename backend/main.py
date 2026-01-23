from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
load_dotenv()
import asyncio
import os
import sentry_sdk

from database import engine
import models

# Routers
from routers import funnels, triggers, webhooks, uploads, chatwoot, auth, whatsapp, settings, clients, blocked, health

# Services / Utils
from services.scheduler import scheduler_task
from rabbitmq_client import rabbitmq
from websocket_manager import manager

# Security
from core.security import limiter
from core.logger import logger
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

load_dotenv()

# Create database tables
# Conexão com banco de dados (Postgres ou SQLite)
models.Base.metadata.create_all(bind=engine) # Ensure tables exist

app = FastAPI(
    title="ZapVoice API - Automação Chatwoot",
    description="""
## 🚀 ZapVoice API v1.0.40

Esta API fornece todo o backend para automação de mensagens no Chatwoot.

### Funcionalidades
* **Funis de Vendas:** Crie fluxos automáticos com delays, áudios e vídeos.
* **Disparos em Massa:** Envie templates aprovados para milhares de contatos.
* **Webhooks:** Integração bidirecional com Chatwoot e n8n.
* **Agendamento Inteligente:** Otimização de filas e prevenção de bloqueios.

### Autenticação
Use o endpoint `/auth/token` para obter seu `access_token`.
    """,
    version="1.0.40",
    contact={
        "name": "Documentação Oficial",
        "url": "http://localhost:8000/docs",
    }
)

# Sentry
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=1.0)

# Setup Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Mount static files
# Mount static files
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Mount Vite Assets (Production/Docker)
if os.path.exists("static/dist/assets"):
    app.mount("/assets", StaticFiles(directory="static/dist/assets"), name="assets")

# Configuração CORS
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:8000"
]
env_origins = os.getenv("CORS_ORIGINS", "")
if env_origins:
    default_origins.extend([origin.strip() for origin in env_origins.split(",")])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for debugging
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include Routers
app.include_router(funnels.router, tags=["Funnels"])
app.include_router(triggers.router, tags=["Triggers"])
app.include_router(webhooks.router, tags=["Webhooks"])
app.include_router(uploads.router, tags=["Uploads"])
app.include_router(chatwoot.router, tags=["Chatwoot"])
app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(whatsapp.router)
app.include_router(settings.router)
app.include_router(blocked.router)
app.include_router(health.router, prefix="/api")

# Startup Events
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Iniciando ZapVoice API... (Reloaded)")
    
    # Seed Super Admin
    seed_super_admin()
    
    # Inicia Scheduler (Processa agendamentos)
    asyncio.create_task(scheduler_task())
    
    # Inicia Listener de Eventos (Para WebSocket)
    asyncio.create_task(event_listener())

def seed_super_admin():
    """Garante que o Super Admin exista conforme o .env"""
    from database import SessionLocal
    from models import User
    from core.security import get_password_hash
    
    email = os.getenv("SUPER_ADMIN_EMAIL")
    password = os.getenv("SUPER_ADMIN_PASSWORD")
    
    if not email or not password:
        logger.warning("⚠️ SUPER_ADMIN_EMAIL ou SUPER_ADMIN_PASSWORD não configurados no .env")
        return
        
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        hashed_password = get_password_hash(password)
        
        if user:
            logger.info(f"🔄 Atualizando Super Admin existente: {email}")
            user.hashed_password = hashed_password
            user.role = "super_admin"
            user.is_active = True
        else:
            logger.info(f"✨ Criando novo Super Admin: {email}")
            new_user = User(
                email=email,
                hashed_password=hashed_password,
                role="super_admin",
                full_name="Super Admin",
                is_active=True
            )
            db.add(new_user)
            
        db.commit()
    except Exception as e:
        logger.error(f"❌ Erro ao realizar seed do Super Admin: {e}")
        db.rollback()
    finally:
        db.close()

async def event_listener():
    """Conecta ao RabbitMQ para ouvir eventos de progresso e repassar ao Frontend"""
    await asyncio.sleep(5) 
    try:
        logger.info("Conectando Websocket Listener ao RabbitMQ...")
        await rabbitmq.subscribe_events(manager.broadcast)
    except Exception as e:
        logger.error(f"Erro ao iniciar listener de eventos: {e}")

# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text() 
    except Exception:
        manager.disconnect(websocket)

@app.get("/")
async def read_root():
    # Serve React App in Production (Docker)
    index_path = "static/dist/index.html"
    if os.path.exists(index_path):
        from fastapi.responses import FileResponse
        return FileResponse(index_path)
    
    return {
        "message": "ZapVoice Chatwoot API",
        "docs": "/docs",
        "status": "online",
        "version": "2.0 (Refactored)",
        "mode": "development (frontend not built)"
    }

# Serve env-config.js with no-cache headers
@app.get("/env-config.js")
async def serve_env_config():
    config_path = "static/dist/env-config.js"
    if os.path.exists(config_path):
        from fastapi.responses import FileResponse
        response = FileResponse(config_path, media_type="application/javascript")
        # Disable caching for this file to ensure runtime updates take effect
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        return response
    return {"message": "Config file not found"}, 404

# SPA Catch-all (Run AFTER all other routes)
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    # Ignore API/Static/Webhooks paths
    if full_path.startswith("api") or full_path.startswith("static") or full_path.startswith("docs") or full_path.startswith("openapi") or full_path.startswith("triggers"):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Not Found")

    index_path = "static/dist/index.html"
    if os.path.exists(index_path):
        from fastapi.responses import FileResponse
        return FileResponse(index_path)
        
    return {"message": "Path not found (Frontend not built)"}

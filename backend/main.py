# Reload trigger 3 (Fix Login & 404)
from fastapi import FastAPI, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
load_dotenv()
import asyncio
import os
import json
import sentry_sdk
from datetime import datetime, timezone

from database import engine, auto_migrate
import models

# Routers
from routers import (
    auth, funnels, triggers, schedules, settings, chatwoot, whatsapp, webhooks, blocked, clients, uploads,
    global_vars, health, webhooks_integrations, webhooks_public
)

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
auto_migrate(engine) # Ensure new columns exist

app = FastAPI(
    title="ZapVoice API - Automação Chatwoot",
    description="""
## 🚀 ZapVoice API v2.0.17 (Monitoring Active)

Esta API fornece todo o backend para automação de mensagens no Chatwoot.

### Funcionalidades
* **Funis de Vendas:** Crie fluxos automáticos com delays, áudios e vídeos.
* **Disparos em Massa:** Envie templates aprovados para milhares de contatos.
* **Webhooks:** Integração bidirecional com Chatwoot e n8n.
* **Agendamento Inteligente:** Otimização de filas e prevenção de bloqueios.

### Autenticação
Use o endpoint `/auth/token` para obter seu `access_token`.
    """,
    version="2.0.0",
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
    "http://localhost:5176",
    "http://127.0.0.1:5176",
    "http://localhost:3000",
    "http://localhost:8000"
]
env_origins = os.getenv("CORS_ORIGINS", "")
if env_origins:
    default_origins.extend([origin.strip() for origin in env_origins.split(",")])

app.add_middleware(
    CORSMiddleware,
    allow_origins=default_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Client-ID", "X-Register-API-Key", "Accept"],
    expose_headers=["Content-Disposition"]
)
logger.info(f"🔒 CORS origins enabled: {default_origins}")

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Include Routers
app.include_router(funnels.router, prefix="/api", tags=["Funnels"])
app.include_router(schedules.router, prefix="/api", tags=["Schedules"])
app.include_router(triggers.router, prefix="/api", tags=["Triggers"])
app.include_router(webhooks.router, prefix="/api", tags=["Webhooks"])
app.include_router(uploads.router, prefix="/api", tags=["Uploads"])
app.include_router(chatwoot.router, prefix="/api", tags=["Chatwoot"])
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(clients.router, prefix="/api", tags=["Clients"])
app.include_router(whatsapp.router, prefix="/api", tags=["WhatsApp"])
app.include_router(settings.router, prefix="/api", tags=["Settings"])
app.include_router(blocked.router, prefix="/api", tags=["Blocked"])
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(global_vars.router, prefix="/api")
app.include_router(webhooks_integrations.router, prefix="/api", tags=["Webhooks Integrations"])
app.include_router(webhooks_public.router, prefix="/api", tags=["Webhooks Public"])

# Startup Events
@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Ignora caminhos de assets estáticos e docs para não poluir
    if not any(x in request.url.path for x in ["/static", "/assets", "/docs", "/openapi.json", "/favicon.ico"]):
        logger.info(f"🔍 [REQUEST] {request.method} {request.url.path}")
        
        # Se for POST em um webhook, logamos o corpo para saber o que está chegando
        if request.method == "POST" and "webhook" in request.url.path:
            try:
                # IMPORTANTE: Para ler o corpo no middleware sem travar o processamento,
                # precisamos fazer uma manobra com o stream ou ler e recolocar
                body = await request.body()
                logger.info(f"📥 [WEBHOOK_HIT] Path: {request.url.path} | Body: {body.decode('utf-8')[:500]}...")
                
                # Para que o FastAPI consiga ler o corpo depois, precisamos "resetar" o request
                async def receive():
                    return {"type": "http.request", "body": body}
                request._receive = receive
            except Exception as e:
                logger.error(f"Erro ao logar corpo do webhook: {e}")
            
    response = await call_next(request)
    return response

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Iniciando ZapVoice API...")
    
    # Seed Super Admin
    seed_super_admin()
    
    # Executa migrações críticas de banco
    run_migrations()
    
    # Inicia Scheduler (Processa agendamentos)
    asyncio.create_task(scheduler_task())
    
    # Inicia Consumers (Worker Interno)
    # Isso garante que o processamento ocorra mesmo sem um container de worker separado
    try:
        from worker import handle_bulk_send, handle_whatsapp_event, handle_funnel_execution, handle_chatwoot_private_message
        logger.info("🔧 Iniciando Workers Internos (Consumers)...")
        await rabbitmq.connect()
        await rabbitmq.consume("zapvoice_bulk_sends", handle_bulk_send, prefetch_count=1)
        await rabbitmq.consume("whatsapp_events", handle_whatsapp_event, prefetch_count=20)
        await rabbitmq.consume("zapvoice_funnel_executions", handle_funnel_execution, prefetch_count=5)
        await rabbitmq.consume("chatwoot_private_messages", handle_chatwoot_private_message, prefetch_count=50)
        logger.info("✅ Workers Internos Iniciados!")
    except Exception as e:
        logger.error(f"❌ Falha ao iniciar workers internos: {e}")

    # Inicia Listener de Eventos (Para WebSocket)
    asyncio.create_task(event_listener())
    
    # Inicia Monitoramento de Sistema
    asyncio.create_task(system_monitor_task())

def seed_super_admin():
    """Garante que o Super Admin exista conforme o .env"""
    from database import SessionLocal
    from models import User
    from core.security import get_password_hash, verify_password
    
    email = os.getenv("SUPER_ADMIN_EMAIL")
    password = os.getenv("SUPER_ADMIN_PASSWORD")
    
    # Limpar aspas que podem vir do Portainer/Docker e espaços em branco
    if email: email = email.strip('"').strip("'").strip()
    if password: password = password.strip('"').strip("'").strip()
    
    if not email or not password:
        logger.warning("⚠️ SUPER_ADMIN_EMAIL ou SUPER_ADMIN_PASSWORD não configurados no .env")
        return
        
    db = SessionLocal()
    try:
        # 1. Remover o admin antigo se ele não for o atual configurado
        if email != "admin@admin.com":
            old_admin = db.query(User).filter(User.email == "admin@admin.com").first()
            if old_admin:
                logger.info("🗑️ Removendo admin legado (admin@admin.com)")
                db.delete(old_admin)
                db.commit()

        # 2. Garantir o admin atual e forçar sincronização de senha se necessário
        user = db.query(User).filter(User.email == email).first()
        
        if user:
            # Verifica se a senha atual do banco bate com a do ENV (com aspas e espaços limpos)
            if not verify_password(password, user.hashed_password):
                logger.info(f"🔑 Senha do Super Admin ({email}) desalinhada com o ENV. Forçando atualização para garantir acesso...")
                user.hashed_password = get_password_hash(password)
            else:
                logger.info(f"✨ Super Admin {email} já está com a senha correta.")
            
            user.role = "super_admin"
            user.is_active = True
        else:
            logger.info(f"🚀 Criando novo Super Admin: {email}")
            hashed_password = get_password_hash(password)
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

def run_migrations():
    """Garante que todas as tabelas e colunas necessárias existam no banco."""
    from database import SessionLocal
    from sqlalchemy import text
    
    db = SessionLocal()
    try:
        # 1. status_info table and columns
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS status_info (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL,
                webhook_id INTEGER,
                phone VARCHAR NOT NULL,
                name VARCHAR,
                product_name VARCHAR,
                status VARCHAR,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))
        db.execute(text("ALTER TABLE status_info ADD COLUMN IF NOT EXISTS trigger_id INTEGER"))
        
        # 2. scheduled_triggers columns
        db.execute(text("ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS product_name VARCHAR"))
        db.execute(text("ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS label_added BOOLEAN DEFAULT FALSE"))
        db.execute(text("ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS publish_external_event BOOLEAN DEFAULT FALSE"))
        db.execute(text("ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS chatwoot_label VARCHAR"))
        db.execute(text("ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS event_type VARCHAR"))
        db.execute(text("ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS integration_id UUID"))
        db.execute(text("ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS is_free_message BOOLEAN DEFAULT FALSE"))
        db.execute(text("ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE"))
        
        db.execute(text("ALTER TABLE webhook_event_mappings ADD COLUMN IF NOT EXISTS publish_external_event BOOLEAN DEFAULT FALSE"))
        db.execute(text("ALTER TABLE webhook_event_mappings ADD COLUMN IF NOT EXISTS send_as_free_message BOOLEAN DEFAULT FALSE"))
        
        # 3. webhook_configs columns
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS delay_amount INTEGER DEFAULT 0"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS delay_unit VARCHAR DEFAULT 'seconds'"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS approved_delay_amount INTEGER DEFAULT 0"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS approved_delay_unit VARCHAR DEFAULT 'seconds'"))
        
        # 4. product_status table
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS product_status (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL,
                phone VARCHAR NOT NULL,
                customer_name VARCHAR,
                product_name VARCHAR NOT NULL,
                status VARCHAR NOT NULL,
                last_payload JSON,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))
        
        db.execute(text("ALTER TABLE funnels ADD COLUMN IF NOT EXISTS allowed_phones JSON"))
        db.execute(text("ALTER TABLE funnels ADD COLUMN IF NOT EXISTS blocked_phones JSON"))
        db.execute(text("ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR"))
        
        # 7. whatsapp_template_cache columns
        db.execute(text("ALTER TABLE whatsapp_template_cache ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()"))
        db.execute(text("ALTER TABLE whatsapp_template_cache ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()"))
        
        # 6. global_variables table
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS global_variables (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL REFERENCES clients(id),
                name VARCHAR NOT NULL,
                value TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_global_variables_id ON global_variables (id)"))
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_global_variables_client_id ON global_variables (client_id)"))
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_global_variables_name ON global_variables (name)"))

        db.commit()
        logger.info("✅ Migrações de banco de dados concluídas!")
    except Exception as e:
        logger.error(f"❌ Erro nas migrações: {e}")
        db.rollback()
    finally:
        db.close()

async def system_monitor_task():
    """Coleta e envia estatísticas de sistema via WebSocket a cada 5 segundos"""
    from services.monitor import SystemMonitor
    
    # Primeira chamada para inicializar o psutil.cpu_percent
    SystemMonitor.get_cpu_usage()
    
    await asyncio.sleep(2) # Aguarda o sistema estabilizar (era 10s)
    
    while True:
        logger.debug("Iniciando ciclo de monitoramento de sistema...")
        try:
            # Coleta métricas globais uma vez por ciclo
            global_stats = await SystemMonitor.collect_all()
            
            # Itera sobre as conexões para enviar dados personalizados
            for ws, metadata in manager.active_connections.copy().items():
                try:
                    stats = global_stats.copy()
                    client_id = metadata.get("client_id")
                    
                    if client_id:
                        # Adiciona dados específicos do cliente
                        stats["client_stats"] = await SystemMonitor.get_client_stats(client_id)
                    
                    await manager.send_personal_message({
                        "event": "system_stats",
                        "data": stats
                    }, ws)
                except Exception as e:
                    logger.warning(f"Erro ao enviar stats individual: {e}")
                    
        except Exception as e:
            logger.error(f"Erro na tarefa de monitoramento: {e}")
        
        # logger.debug("Estatísticas de sistema enviadas.") # Reduzir spam
        await asyncio.sleep(5) # Intervalo de atualização

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
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    from jose import jwt, JWTError
    from core.security import SECRET_KEY, ALGORITHM

    if not token:
        await websocket.close(code=4001)
        return

    try:
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        await websocket.close(code=4001)
        return

    origin = websocket.headers.get("origin")
    logger.info(f"🔌 Tentativa de conexão WS de origin: {origin}")
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("event") == "subscribe_client":
                    client_id = message.get("client_id")
                    await manager.update_metadata(websocket, {"client_id": client_id})
                    logger.info(f"👤 Cliente {client_id} assinado na conexão WS.")
                    
                    # Envia resposta imediata para não deixar a tela carregando
                    from services.monitor import SystemMonitor
                    stats = await SystemMonitor.collect_all(client_id=client_id)
                    await manager.send_personal_message({
                        "event": "system_stats",
                        "data": stats
                    }, websocket)
            except Exception as e:
                logger.error(f"Erro ao processar mensagem WS: {e}")
    except Exception as e:
        logger.info(f"🔌 Conexão WS encerrada: {str(e)}")
        manager.disconnect(websocket)


def get_index_with_cache_busting():
    """
    Lê o index.html e injeta timestamp no script de configuração
    para garantir que os navegadores não usem cache antigo.
    """
    import time
    index_path = "static/dist/index.html"
    if not os.path.exists(index_path):
        return None
    
    try:
        with open(index_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Injeta timestamp no env-config.js
        # Ex: src="/env-config.js" -> src="/env-config.js?v=17382910..."
        timestamp = int(time.time())
        content = content.replace(
            'src="/env-config.js"', 
            f'src="/env-config.js?v={timestamp}"'
        )
        return content
    except Exception as e:
        logger.error(f"Erro ao ler index.html para cache busting: {e}")
        return None

@app.get("/")
async def read_root():
    # Serve React App com Cache Busting Dinâmico
    content = get_index_with_cache_busting()
    if content:
        from fastapi.responses import HTMLResponse
        response = HTMLResponse(content)
        # Headers BRUTAIS de anti-cache
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    
    return {
        "message": "ZapVoice Chatwoot API",
        "docs": "/docs",
        "status": "online",
        "version": "2.0.17 (Monitoring Dash Active)",
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

    content = get_index_with_cache_busting()
    if content:
        from fastapi.responses import HTMLResponse
        response = HTMLResponse(content)
        # Headers BRUTAIS de anti-cache
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
        
    return {"message": "Path not found (Frontend not built)"}

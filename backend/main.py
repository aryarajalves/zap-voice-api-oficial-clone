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

from routers import (
    auth, funnels, triggers, schedules, settings, chatwoot, whatsapp, webhooks, blocked, clients, uploads,
    global_vars, health, webhooks_integrations, webhooks_public, leads, financial
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
# models.Base.metadata.create_all(bind=engine) # Movido para run_migrations() para evitar deadlock
# auto_migrate(engine) # Movido para run_migrations() para evitar deadlock

app = FastAPI(
    title="ZapVoice API Oficial",
    version="3.0.11",
    description="""
## 🚀 ZapVoice API v3.0.11

Esta API fornece todo o backend para automação de mensagens no Chatwoot.

### Funcionalidades
* **Funis de Vendas:** Crie fluxos automáticos com delays, áudios, etc. Bem-vindo à versão **3.0.11** do **ZapVoice**!
* **Agendamento Inteligente:** Otimização de filas e prevenção de bloqueios.

### Autenticação
Use o endpoint `/auth/token` para obter seu `access_token`.
    """,
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
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(_BASE_DIR, "static", "uploads"), exist_ok=True)
app.mount("/static", StaticFiles(directory=os.path.join(_BASE_DIR, "static")), name="static")

# Mount Vite Assets (Production/Docker)
if os.path.exists(os.path.join(_BASE_DIR, "static", "dist", "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(_BASE_DIR, "static", "dist", "assets")), name="assets")

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
app.include_router(uploads.router, prefix="/api", tags=["Uploads"])
app.include_router(chatwoot.router, prefix="/api", tags=["Chatwoot"])
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(clients.router, prefix="/api", tags=["Clients"])
app.include_router(whatsapp.router, prefix="/api", tags=["WhatsApp"])
app.include_router(settings.router, prefix="/api", tags=["Settings"])
app.include_router(blocked.router, prefix="/api", tags=["Blocked"])
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(global_vars.router, prefix="/api")

# --- Webhooks & Integrations Routers ---
# 1. Rotas públicas do Meta (verificação de webhook) - DEVE vir antes do router de integrações
# pois /webhooks/{integration_id} capturaria "meta" como parâmetro e exigiria auth.
app.include_router(webhooks.router, prefix="/api", tags=["Webhooks"])

# 2. Gerenciamento de Integrações (Dashboard)
app.include_router(webhooks_integrations.router, prefix="/api", tags=["Webhooks Integrations"])

# 3. Endpoints Públicos de Recebimento (WordPress, Elementor, Hotmart, etc.)
app.include_router(webhooks_public.router, prefix="/api", tags=["Webhooks Public"])
# --- End Routers ---

app.include_router(leads.router, prefix="/api", tags=["Leads"])
app.include_router(financial.router, prefix="/api", tags=["Financial"])

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
    if not any(x in request.url.path for x in ["/static", "/assets", "/docs", "/openapi.json", "/favicon.ico"]):
        logger.info(f"✅ [RESPONSE] {request.method} {request.url.path} - Status: {response.status_code}")
    return response

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Iniciando ZapVoice API...")
    
    # Seed Super Admin (Com Retry para aguardar o banco se necessário)
    try:
        seed_super_admin()
    except Exception as e:
        logger.error(f"❌ Falha crítica ao realizar seed do admin: {e}")
        
    # Executa migrações críticas de banco
    run_migrations()
    
    # Inicia Scheduler (Processa agendamentos)
    asyncio.create_task(scheduler_task())
    
    # Inicia Consumers (Worker Interno)
    # Isso garante que o processamento ocorra mesmo sem um container de worker separado
    try:
        from worker import (
            handle_bulk_send, handle_whatsapp_event, handle_funnel_execution, 
            handle_chatwoot_private_message, handle_agent_memory_webhook
        )
        logger.info("🔧 Iniciando Workers Internos (Consumers)...")
        await rabbitmq.connect()
        await rabbitmq.consume("zapvoice_bulk_sends", handle_bulk_send, prefetch_count=1)
        await rabbitmq.consume("whatsapp_events", handle_whatsapp_event, prefetch_count=20)
        await rabbitmq.consume("zapvoice_funnel_executions", handle_funnel_execution, prefetch_count=5)
        await rabbitmq.consume("chatwoot_private_messages", handle_chatwoot_private_message, prefetch_count=50, requeue_on_error=True)
        
        # Webhook de Memória (Agente de IA) - Sequencial 1 a 1
        await rabbitmq.consume("agent_memory_webhook_queue", handle_agent_memory_webhook, prefetch_count=1)
        
        logger.info("✅ Workers Internos Iniciados!")
    except Exception as e:
        logger.error(f"❌ Falha ao iniciar workers internos: {e}")

    # Inicia Listener de Eventos (Para WebSocket)
    asyncio.create_task(event_listener())
    
    # Inicia Monitoramento de Sistema
    asyncio.create_task(system_monitor_task())

def seed_super_admin():
    """Garante que o Super Admin exista conforme o .env com lógica de retry"""
    from database import SessionLocal
    from models import User
    from core.security import get_password_hash, verify_password
    from sqlalchemy.exc import OperationalError
    
    email = os.getenv("SUPER_ADMIN_EMAIL")
    password = os.getenv("SUPER_ADMIN_PASSWORD")
    
    # Limpar aspas que podem vir do Portainer/Docker e espaços em branco
    if email: email = email.strip('"').strip("'").strip()
    if password: password = password.strip('"').strip("'").strip()
    
    if not email or not password:
        logger.warning("⚠️ SUPER_ADMIN_EMAIL ou SUPER_ADMIN_PASSWORD não configurados no .env")
        return

    logger.info(f"🔑 Verificando configuração de Super Admin para: {email}")
    
    max_retries = 5
    retry_delay = 5
    
    for attempt in range(max_retries):
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
                # Verifica se a senha atual do banco bate com a do ENV
                if not verify_password(password, user.hashed_password):
                    logger.info(f"🔑 Senha do Super Admin ({email}) desalinhada com o ENV. Atualizando...")
                    user.hashed_password = get_password_hash(password)
                else:
                    logger.info(f"✨ Super Admin {email} já está com a senha correta no banco.")
                
                user.role = "super_admin"
                user.is_active = True
                user.full_name = "Super Admin"
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
            logger.info(f"✅ Sincronização de Super Admin ({email}) concluída com sucesso!")
            break # Sucesso, sai do loop de retry
            
        except OperationalError as e:
            logger.warning(f"⏳ Banco de dados ainda não está pronto (Tentativa {attempt + 1}/{max_retries}). Aguardando {retry_delay}s...")
            if attempt == max_retries - 1:
                logger.error(f"❌ Não foi possível conectar ao banco após {max_retries} tentativas: {e}")
                raise
            asyncio.run(asyncio.sleep(retry_delay))
        except Exception as e:
            logger.error(f"❌ Erro inesperado ao realizar seed do Super Admin: {e}")
            db.rollback()
            raise
        finally:
            db.close()

def run_migrations():
    """Garante que todas as tabelas e colunas necessárias existam no banco."""
    # O auto_migrate agora é dinâmico e resolve tudo baseado no models.py
    # Ele já chama Base.metadata.create_all(bind=engine) internamente
    auto_migrate(engine)

    from database import SessionLocal
    db = SessionLocal()
    try:
        # Diagnostic Log
        from models import WebhookIntegration, WebhookConfig, WebhookEventMapping
        count_new = db.query(WebhookIntegration).count()
        count_old = db.query(WebhookConfig).count()
        count_mappings = db.query(WebhookEventMapping).count()
        logger.info(f"📊 [DATABASE] Webhooks encontrados: {count_new} (Novos), {count_old} (Antigos), {count_mappings} (Mapeamentos).")
    except Exception as diag_err:
        logger.warning(f"⚠️ [DATABASE] Não foi possível contar registros: {diag_err}")
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
    index_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "dist", "index.html")
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
async def root():
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
        "version": "3.0.9",
        "mode": "production"
    }

# Serve env-config.js with no-cache headers
@app.get("/env-config.js")
async def serve_env_config():
    config_path = os.path.join(_BASE_DIR, "static", "dist", "env-config.js")
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
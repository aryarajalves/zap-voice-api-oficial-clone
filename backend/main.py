# Gatilho de recarga 4 (Corrigindo travamento)

# Framework principal da API — cria rotas, middlewares, WebSocket, etc.
from fastapi import FastAPI, WebSocket, Request, Depends, Response, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse

# Sessão do banco de dados (SQLAlchemy) — usada nas rotas que precisam acessar o banco
from sqlalchemy.orm import Session

# Middleware que libera acesso ao frontend (evita erro de CORS no navegador)
from fastapi.middleware.cors import CORSMiddleware

# Permite servir arquivos estáticos (imagens, uploads, build do React)
from fastapi.staticfiles import StaticFiles

# Carrega as variáveis do arquivo .env para o ambiente
from dotenv import load_dotenv

# Bibliotecas nativas do Python
import asyncio
import os
import sys
import time
import json
import mimetypes

# Monitoramento de erros em produção — captura exceções e envia pro painel do Sentry
import sentry_sdk

# Biblioteca nativa — manipulação de datas e fusos horários
from datetime import datetime, timezone

# Conexão com o banco de dados e função de migração automática de tabelas
from database import engine, auto_migrate

# Modelos do banco de dados (tabelas/entidades do SQLAlchemy)
import models

# Registrar listeners do Webhook de Mensagens
import services.chat_webhook_service

# Roteadores internos — cada um representa um módulo da API
from routers import (
    auth,             # Autenticação e geração de tokens JWT
    funnels,          # Funis de vendas e automações de mensagens
    schedules,        # Agendamentos de disparos
    settings,         # Configurações gerais do sistema
    whatsapp,         # Conexão e envio via WhatsApp
    whatsapp_profile, # Configurações e Perfil do WhatsApp
    blocked,          # Lista de contatos bloqueados
    clients,          # Gerenciamento de clientes/tenants
    uploads,          # Upload de arquivos (áudios, imagens, docs)
    global_vars,      # Variáveis globais das automações
    health,           # Healthcheck da API
    webhooks_public,  # Webhooks públicos (WordPress, Hotmart, etc.)
    leads,            # Gestão de leads captados externamente
    leads_import,     # Importação e integração de leads
    financial,        # Controle financeiro e planos
    backup,           # Backup do banco de dados (Super Admin)
    hot_leads,        # Leads quentes e roteamento interno
    instagram,        # Automação do Instagram
    resting,          # Contatos em repouso
    invitations,      # Convites de cadastro de usuário (Super Admin)
    projects,         # Projetos compartilhados
    logs,             # Visualizador de logs (Super Admin)
    chat,             # Atendimento e Chat local
    chat_labels,      # Etiquetas e marcadores do chat
    api_keys,         # Gerenciamento de chaves de API (Tokens de API)
    reminders,        # Lembretes de agendamento (Re-disparos de calendário)
    email_marketing,  # Disparo de e-mails em massa
    waba_payment,     # Métodos de pagamento e faturas da Meta WABA
    quick_messages,   # Respostas e mensagens rápidas
    checkout_presell, # Páginas de pré-venda e checkout
    capture_page      # Páginas de captura de leads
)

# Webhooks de entrada (sistemas externos, gestão de eventos)
from routers.webhooks_inbound import router as webhooks_inbound_router

# Handler e roteador do Meta (Facebook/Instagram)
from routers.webhooks_inbound.meta import meta_webhook_handler, router as meta_router

# Rotas públicas de contatos e leads via API Key
from routers.contacts_public import router as contacts_public_router
from routers.leads_public import router as leads_public_router

# Gerenciamento de integrações externas (configuração pelo dashboard)
from routers.webhooks import router as webhooks_integrations_router

# Gatilhos automáticos baseados em eventos
from routers.triggers import router as triggers_router

# Tarefa de agendamento que roda em background (dispara mensagens nos horários certos)
from services.scheduler import scheduler_task
from services.admin_seed_service import seed_super_admin
from services.background_tasks import system_monitor_task, backup_scheduler_task, event_listener
from services.websocket_service import handle_websocket_connection
from services.spa_service import (
    get_index_with_cache_busting,
    serve_spa_index_response,
    serve_spa_env_config_response,
    serve_spa_catchall_response
)

# Cliente RabbitMQ — fila de mensagens para processar eventos de forma assíncrona
from rabbitmq_client import rabbitmq

# Gerenciador de conexões WebSocket — controla quem está conectado em tempo real
from websocket_manager import manager

# Limitador de requisições (rate limit) — protege a API contra abuso
from core.security import limiter, RequestContextMiddleware
from slowapi.middleware import SlowAPIMiddleware

# Função que retorna uma sessão do banco de dados para as rotas
from core.deps import get_db

# Logger centralizado do projeto — usado para registrar eventos e erros
from core.logger import logger

# Exceção lançada quando o rate limit é excedido
from slowapi.errors import RateLimitExceeded

# Handler que retorna resposta HTTP 429 quando o rate limit é atingido
from slowapi import _rate_limit_exceeded_handler

load_dotenv()

# Criação das tabelas do banco de dados
# Conexão com banco de dados (Postgres ou SQLite)
# models.Base.metadata.create_all(bind=engine) # Movido para run_migrations() para evitar deadlock
# auto_migrate(engine) # Movido para run_migrations() para evitar deadlock

# Habilita o /docs apenas em ambiente local (DEBUG=true no .env)
# Documentação de API Swagger (/docs) e ReDoc (/redoc)
ENABLE_DOCS = os.getenv("ENABLE_DOCS", "true").lower() == "true"

app = FastAPI(
    title="ZapVoice - API Oficial de Automação & Mensageria",
    version="1.8.2",
    docs_url="/docs" if ENABLE_DOCS else None,
    redoc_url="/redoc" if ENABLE_DOCS else None,
    openapi_url="/openapi.json" if ENABLE_DOCS else None,
    description="""
## ⚡ ZapVoice API Oficial (Meta Cloud API & Webhooks)

Esta API fornece endpoints completos para integração externa e automações:
* 📤 **Disparo de Mensagens e Templates:** Envio via API Oficial da Meta (Cloud API WhatsApp)
* 👥 **Gestão de Leads e Contatos:** Cadastro, consulta e atualização de leads
* 🔄 **Recepção de Webhooks:** Integração com plataformas de checkout (Kiwify, Hotmart, Eduzz, ZapGroup, etc.)
* 🚀 **Funis Automáticos e Agendamentos:** Execução de fluxos inteligentes
* 🔑 **Autenticação:** Suporte a Bearer JWT Token (`/auth/token`) e API Keys (`X-API-Key`)
    """,
    contact={
        "name": "ZapVoice API Documentation",
        "url": "http://localhost:8000/docs",
    }
)

# Sentry
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=1.0)

# Configuração do limitador de requisições
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Adiciona middlewares do rate limiter. O RequestContextMiddleware deve rodar primeiro (LIFO)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(RequestContextMiddleware)

def _sanitize_validation_errors(errors: list) -> list:
    """
    Sanitiza os erros de validação do Pydantic para evitar vazamento de dados sensíveis
    (ex: senhas em texto puro digitadas no campo 'input' do erro).
    """
    sensitive_keys = {
        "password", "senha", "current_password", "new_password", 
        "token", "secret", "api_key", "access_token", "hashed_password", 
        "app_secret", "refresh_token"
    }
    sanitized = []
    for err in errors:
        err_copy = dict(err)
        loc = err_copy.get("loc", ())
        # Se qualquer parte do location contiver um nome de campo sensível
        if any(str(part).lower() in sensitive_keys for part in loc):
            if "input" in err_copy:
                err_copy["input"] = "******"
            if "ctx" in err_copy and isinstance(err_copy["ctx"], dict):
                err_copy["ctx"] = {k: ("******" if k.lower() in sensitive_keys else v) for k, v in err_copy["ctx"].items()}
        sanitized.append(err_copy)
    return sanitized

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    sanitized_errors = _sanitize_validation_errors(exc.errors())
    logger.warning(f"⚠️ [VALIDATION_ERROR] {request.method} {request.url.path} - Erros: {sanitized_errors}")
    return JSONResponse(
        status_code=422,
        content={"detail": sanitized_errors}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Erro inesperado em {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno do servidor. Tente novamente mais tarde."}
    )


# Servindo arquivos estáticos
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(_BASE_DIR, "static", "uploads"), exist_ok=True)
app.mount("/static", StaticFiles(directory=os.path.join(_BASE_DIR, "static")), name="static")

# Servindo assets do Vite (Produção/Docker)
assets_path = os.path.join(_BASE_DIR, "static", "dist", "assets")
if os.path.exists(assets_path):
    logger.info(f"📂 [STATIC] Pasta assets encontrada em: {assets_path}")
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")
else:
    logger.warning(f"⚠️ [STATIC] Pasta assets NÃO encontrada em: {assets_path}")

# Configuração CORS
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5176",
    "http://127.0.0.1:5176",
    "http://localhost:5177",
    "http://127.0.0.1:5177",
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

# Registro dos Roteadores
# --- Webhooks & Integrations Routers (PRIORIDADE MÁXIMA PARA RECEBIMENTO) ---
# Registro direto no app para evitar erro 405 de roteadores aninhados
@app.get("/api/meta")
@limiter.exempt
async def meta_webhook_verification(request: Request, db: Session = Depends(get_db)):
    return await meta_webhook_handler(request, db)

@app.post("/api/meta")
@limiter.exempt
async def meta_webhook_events(request: Request, db: Session = Depends(get_db)):
    return await meta_webhook_handler(request, db)

@app.get("/api/meta/{slug}")
@limiter.exempt
async def meta_webhook_verification_slug(slug: str, request: Request, db: Session = Depends(get_db)):
    return await meta_webhook_handler(request, db, slug=slug)

@app.post("/api/meta/{slug}")
@limiter.exempt
async def meta_webhook_events_slug(slug: str, request: Request, db: Session = Depends(get_db)):
    return await meta_webhook_handler(request, db, slug=slug)


# 1. Rotas de recebimento (Chatwoot, Inbound)
app.include_router(webhooks_inbound_router, prefix="/api", tags=["Webhooks Inbound"])

# Registrar também o roteador do Meta para endpoints adicionais como status
app.include_router(meta_router, prefix="/api", tags=["Meta Webhooks"])

# 2. Endpoints Públicos de Recebimento (WordPress, Elementor, Hotmart, etc.)
app.include_router(webhooks_public.router, prefix="/api", tags=["Webhooks Public"])

# 3. Gerenciamento de Integrações (Dashboard)
app.include_router(webhooks_integrations_router, prefix="/api", tags=["Webhooks Integrations"])

# --- API Routers ---
app.include_router(funnels.router, prefix="/api", tags=["Funnels"])
app.include_router(schedules.router, prefix="/api", tags=["Schedules"])
app.include_router(triggers_router, prefix="/api", tags=["Triggers"])
app.include_router(uploads.router, prefix="/api", tags=["Uploads"])
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(invitations.router, prefix="/api", tags=["Invitations"])
app.include_router(clients.router, prefix="/api", tags=["Clients"])
app.include_router(whatsapp.router, prefix="/api", tags=["WhatsApp"])
app.include_router(whatsapp_profile.router, prefix="/api", tags=["WhatsApp"])
app.include_router(settings.router, prefix="/api", tags=["Settings"])
app.include_router(blocked.router, prefix="/api", tags=["Blocked"])
app.include_router(resting.router, prefix="/api", tags=["Resting"])
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(global_vars.router, prefix="/api")
app.include_router(leads.router, prefix="/api", tags=["Leads"])
app.include_router(leads_import.router, prefix="/api", tags=["Leads Import"])
app.include_router(projects.router, prefix="/api", tags=["Projects"])
app.include_router(financial.router, prefix="/api", tags=["Financial"])
app.include_router(backup.router, prefix="/api", tags=["Backup"])
app.include_router(logs.router, prefix="/api", tags=["Logs"])
app.include_router(hot_leads.router, prefix="/api", tags=["HotLeads"])
app.include_router(instagram.router, prefix="/api")
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(chat_labels.router, prefix="/api", tags=["Chat Labels"])
app.include_router(api_keys.router, prefix="/api")
app.include_router(reminders.router, prefix="/api")
app.include_router(email_marketing.router, prefix="/api/email", tags=["Email Marketing"])
app.include_router(waba_payment.router, prefix="/api", tags=["WABA Payment"])
app.include_router(quick_messages.router, prefix="/api", tags=["QuickMessages"])

# Router público para atualização de campos de contatos via API Key
app.include_router(contacts_public_router, prefix="/api", tags=["Contacts Public API"])
app.include_router(leads_public_router, prefix="/api", tags=["Leads Public API"])
app.include_router(checkout_presell.router)
app.include_router(capture_page.router, prefix="/api")

# --- Fim dos Webhooks ---


# Eventos de Inicialização
@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    # Loga apenas erros HTTP (4xx e 5xx) para não poluir o log com requisições normais
    if response.status_code >= 400:
        logger.warning(f"⚠️ [HTTP {response.status_code}] {request.method} {request.url.path}")
    return response

def resume_stuck_imports():
    """
    Ao iniciar, retoma importações que estavam em 'processing' ou 'pending'
    quando o servidor foi reiniciado — desde que o arquivo ainda exista em disco.
    Importações sem arquivo salvo são marcadas como falha.
    """
    from database import SessionLocal
    from routers.leads_import import process_import_in_bg
    import json as _json

    db = SessionLocal()
    try:
        stuck = db.query(models.ContactImportHistory).filter(
            models.ContactImportHistory.status.in_(["processing", "pending"])
        ).all()

        for h in stuck:
            if h.file_path and os.path.exists(h.file_path):
                logger.info(f"🔄 Retomando importação #{h.id} ({h.filename}) a partir de {(h.imported_rows or 0) + (h.error_rows or 0)} linhas...")
                try:
                    mapping_dict = _json.loads(h.mapping_json) if h.mapping_json else {}
                except Exception:
                    mapping_dict = {}
                import threading
                t = threading.Thread(
                    target=process_import_in_bg,
                    args=(h.id, None, h.file_ext or "csv", mapping_dict, h.client_id, h.fixed_tags or "", h.fixed_remove_tags or ""),
                    daemon=True
                )
                t.start()
            else:
                logger.warning(f"⚠️ Importação #{h.id} ({h.filename}) interrompida sem arquivo salvo — marcando como falha.")
                h.status = "failed"
                h.error_message = "Processamento interrompido (servidor reiniciado). Por favor, reimporte o arquivo."
                db.commit()
    except Exception as e:
        logger.error(f"❌ Erro ao retomar importações: {e}")
    finally:
        db.close()

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Iniciando ZapVoice API...")

    # Inicia o worker de retry de webhooks em background
    try:
        from services.webhook_retry_worker import start_webhook_retry_worker
        start_webhook_retry_worker()
    except Exception as e:
        logger.error(f"❌ Erro ao iniciar webhook retry worker: {e}")

    # Garantir que o schema do banco está atualizado (adiciona colunas novas se necessário)
    try:
        await asyncio.get_event_loop().run_in_executor(None, lambda: auto_migrate(engine))
        logger.info("✅ Schema do banco verificado/atualizado.")
    except Exception as e:
        logger.error(f"❌ Erro ao verificar schema: {e}")

    # Seed Super Admin (Com Retry para aguardar o banco se necessário)
    try:
        # Usamos wait_for para garantir que o seed não trave o boot da API indefinidamente
        await asyncio.wait_for(seed_super_admin(), timeout=30.0)
    except Exception as e:
        logger.error(f"❌ Falha crítica ao realizar seed do admin: {e}")

    # Retoma importações que foram interrompidas por reinicialização do servidor
    try:
        await asyncio.get_event_loop().run_in_executor(None, resume_stuck_imports)
    except Exception as e:
        logger.error(f"❌ Erro ao retomar importações: {e}")

    # Inicia Tarefas de Background (Totalmente desacoplado do Boot)
    async def start_all_background_tasks():
        await asyncio.sleep(2)
        logger.info("🔧 Iniciando tarefas de background (Scheduler, Monitor, Listener)...")
        
        # Scheduler condicional
        if os.getenv("ENABLE_SCHEDULER", "true").lower() == "true":
            logger.info("⏰ [SCHEDULER] Ativado via variável de ambiente.")
            asyncio.create_task(scheduler_task())
        else:
            logger.info("🔕 [SCHEDULER] Desativado nesta instância (ENABLE_SCHEDULER=false).")

        asyncio.create_task(system_monitor_task())
        # Inicia a task de backup agendado
        asyncio.create_task(backup_scheduler_task())
        await asyncio.sleep(3)
        try:
            from services.pg_realtime_listener import start_pg_listener
            await start_pg_listener()
        except Exception as e_pg:
            logger.error(f"❌ Erro ao iniciar pg_realtime_listener: {e_pg}")

        try:
            await event_listener()
        except Exception as e:
            logger.error(f"❌ Erro ao iniciar event_listener: {e}")

    asyncio.create_task(start_all_background_tasks())
    # try:
    #     from worker import (
    #         handle_bulk_send, handle_whatsapp_event, handle_funnel_execution, 
    #         handle_chatwoot_private_message, handle_agent_memory_webhook
    #     )
    #     logger.info("🔧 Iniciando Workers Internos (Consumers)...")
    #     await rabbitmq.connect()
    #     await rabbitmq.consume("zapvoice_bulk_sends", handle_bulk_send, prefetch_count=1)
    #     await rabbitmq.consume("whatsapp_events", handle_whatsapp_event, prefetch_count=20)
    #     await rabbitmq.consume("zapvoice_funnel_executions", handle_funnel_execution, prefetch_count=5)
    #     await rabbitmq.consume("chatwoot_private_messages", handle_chatwoot_private_message, prefetch_count=50, requeue_on_error=True)
    #     
    #     # Webhook de Memória (Agente de IA) - Sequencial 1 a 1
    #     await rabbitmq.consume("agent_memory_webhook_queue", handle_agent_memory_webhook, prefetch_count=1)
    #     
    #     logger.info("✅ Workers Internos Iniciados!")
    # except Exception as e:
    #     logger.error(f"❌ Falha ao iniciar workers internos: {e}")

    # Diagnóstico de Rotas (apenas conta, não lista cada uma)
    route_count = len([r for r in app.routes if getattr(r, "methods", None)])
    logger.info(f"🔍 {route_count} rotas registradas.")

    # Fim do startup
    logger.info("✅ Startup finalizado. Servidor pronto!")

def run_migrations():
    """Garante que todas as tabelas e colunas necessárias existam no banco."""
    auto_migrate(engine)

    from database import SessionLocal
    db = SessionLocal()
    try:
        from models import WebhookIntegration, WebhookConfig, WebhookEventMapping
        count_new = db.query(WebhookIntegration).count()
        count_old = db.query(WebhookConfig).count()
        count_mappings = db.query(WebhookEventMapping).count()
        logger.info(f"📊 [DATABASE] Webhooks encontrados: {count_new} (Novos), {count_old} (Antigos), {count_mappings} (Mapeamentos).")
    except Exception as diag_err:
        logger.warning(f"⚠️ [DATABASE] Não foi possível contar registros: {diag_err}")
    finally:
        db.close()


# Endpoint WebSocket
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    await handle_websocket_connection(websocket, token=token)


@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    if not ENABLE_DOCS:
        raise HTTPException(status_code=404)
    from core.swagger_docs import get_swagger_ui_html
    return get_swagger_ui_html()


@app.get("/")
async def root():
    return serve_spa_index_response()


# Servindo env-config.js sem cache
@app.get("/env-config.js")
async def serve_env_config():
    return serve_spa_env_config_response()


# Rota coringa do SPA (deve rodar APÓS todas as outras rotas)
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    return serve_spa_catchall_response(full_path)
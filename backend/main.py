# Gatilho de recarga 4 (Corrigindo travamento)

# Framework principal da API — cria rotas, middlewares, WebSocket, etc.
from fastapi import FastAPI, WebSocket, Request, Depends, Response

# Sessão do banco de dados (SQLAlchemy) — usada nas rotas que precisam acessar o banco
from sqlalchemy.orm import Session

# Middleware que libera acesso ao frontend (evita erro de CORS no navegador)
from fastapi.middleware.cors import CORSMiddleware

# Permite servir arquivos estáticos (imagens, uploads, build do React)
from fastapi.staticfiles import StaticFiles

# Carrega as variáveis do arquivo .env para o ambiente
from dotenv import load_dotenv

# Biblioteca nativa do Python para rodar tarefas assíncronas em paralelo
import asyncio

# Biblioteca nativa — acessa variáveis de ambiente e o sistema de arquivos
import os

# Biblioteca nativa — acessa informações do sistema (versão do Python, etc.)
import sys

# Biblioteca nativa — usada para medir tempo (ex: cache busting do index.html)
import time

# Log de depuração precoce para confirmar leitura do arquivo no servidor
print("DEBUG: Lendo main.py - Iniciando carregamento de dependências...", flush=True)

# Biblioteca nativa — converte dados para/de JSON
import json

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
    auth,           # Autenticação e geração de tokens JWT
    funnels,        # Funis de vendas e automações de mensagens
    schedules,      # Agendamentos de disparos
    settings,       # Configurações gerais do sistema
    whatsapp,       # Conexão e envio via WhatsApp
    whatsapp_profile, # Configurações e Perfil do WhatsApp
    blocked,        # Lista de contatos bloqueados
    clients,        # Gerenciamento de clientes/tenants
    uploads,        # Upload de arquivos (áudios, imagens, docs)
    global_vars,    # Variáveis globais das automações
    health,         # Healthcheck da API
    webhooks_public, # Webhooks públicos (WordPress, Hotmart, etc.)
    leads,          # Gestão de leads captados externamente
    leads_import,   # Importação e integração de leads
    financial,      # Controle financeiro e planos
    backup,         # Backup do banco de dados (Super Admin)
    hot_leads,      # Leads quentes e roteamento interno
    instagram,      # Automação do Instagram
    resting,        # Contatos em repouso
    invitations,    # Convites de cadastro de usuário (Super Admin)
    projects,       # Projetos compartilhados
    logs,           # Visualizador de logs (Super Admin)
    chat,            # Atendimento e Chat local
    api_keys        # Gerenciamento de chaves de API (Tokens de API)
)

# Webhooks de entrada (sistemas externos, gestão de eventos — Chatwoot removido)
from routers.webhooks_inbound import router as webhooks_inbound_router

# Handler direto do Meta (Facebook/Instagram) — registrado com prioridade máxima
from routers.webhooks_inbound.meta import meta_webhook_handler

# Gerenciamento de integrações externas (configuração pelo dashboard)
from routers.webhooks import router as webhooks_integrations_router

# Gatilhos automáticos baseados em eventos
from routers.triggers import router as triggers_router

# Tarefa de agendamento que roda em background (dispara mensagens nos horários certos)
from services.scheduler import scheduler_task

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
# Em produção o /docs fica desabilitado para não expor as rotas publicamente
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

app = FastAPI(
    title="ZapVoice API Oficial",
    version="4.0.5",
    docs_url=None,
    redoc_url="/redoc" if DEBUG else None,
    openapi_url="/openapi.json" if DEBUG else None,
    description="""
## 🚀 ZapVoice API v4.0.5

Esta API fornece todo o backend para automação de mensagens no chat local do ZapVoice.

### Funcionalidades
* **Funis de Vendas:** Crie fluxos automáticos com delays, áudios, etc. Bem-vindo à versão **4.0.5** do **ZapVoice**!
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

# Configuração do limitador de requisições
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Adiciona middlewares do rate limiter. O RequestContextMiddleware deve rodar primeiro (LIFO)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(RequestContextMiddleware)

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Erro de validação em {request.method} {request.url.path}: {exc.errors()} | Body: {await request.body()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
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
from routers.webhooks_inbound.meta import router as meta_router
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
from routers import chat_labels
app.include_router(chat_labels.router, prefix="/api", tags=["Chat Labels"])
app.include_router(api_keys.router, prefix="/api")

# Router público para atualização de campos de contatos via API Key
from routers.contacts_public import router as contacts_public_router
from routers.leads_public import router as leads_public_router
app.include_router(contacts_public_router, prefix="/api", tags=["Contacts Public API"])
app.include_router(leads_public_router, prefix="/api", tags=["Leads Public API"])

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

async def seed_super_admin():
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
            # 1. Remover outros admins legados e outros super_admins que não sejam o atual do ENV
            old_admins = db.query(User).filter(User.role == "super_admin", User.email != email).all()
            for old_adm in old_admins:
                logger.info(f"🗑️ Removendo super admin legado/antigo: {old_adm.email}")
                db.delete(old_adm)

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
            break # Sucesso — sai do loop de tentativas
            
        except OperationalError as e:
            logger.warning(f"⏳ Banco de dados ainda não está pronto (Tentativa {attempt + 1}/{max_retries}). Aguardando {retry_delay}s...")
            if attempt == max_retries - 1:
                logger.error(f"❌ Não foi possível conectar ao banco após {max_retries} tentativas: {e}")
                raise
            await asyncio.sleep(retry_delay)
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
        # Log de diagnóstico
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

async def backup_scheduler_task():
    """Verifica periodicamente se há um backup agendado a executar."""
    from database import SessionLocal
    from models import BackupConfig
    from routers.backup import _run_backup_job

    await asyncio.sleep(30)  # Aguarda o sistema estabilizar antes de começar
    logger.info("⏰ [BACKUP-SCHEDULER] Task de backup agendado iniciada.")

    while True:
        try:
            db = SessionLocal()
            try:
                config = db.query(BackupConfig).first()
                if (
                    config
                    and config.enabled
                    and config.interval_type != "manual"
                    and config.next_backup_at is not None
                ):
                    now = datetime.now(timezone.utc)
                    next_at = config.next_backup_at
                    if next_at.tzinfo is None:
                        from datetime import timezone as tz
                        next_at = next_at.replace(tzinfo=timezone.utc)

                    if now >= next_at:
                        config_id = config.id
                        logger.info(f"⏰ [BACKUP-SCHEDULER] Disparando backup agendado (próximo era {next_at.isoformat()})...")
                        loop = asyncio.get_event_loop()
                        await loop.run_in_executor(None, _run_backup_job, "", config_id)
            finally:
                db.close()
        except Exception as e:
            logger.error(f"❌ [BACKUP-SCHEDULER] Erro na verificação de agendamento: {e}")

        await asyncio.sleep(60)  # Verifica a cada 60 segundos



async def event_listener():
    """Conecta ao RabbitMQ para ouvir eventos de progresso e repassar ao Frontend"""
    await asyncio.sleep(5) 
    try:
        logger.info("Conectando Websocket Listener ao RabbitMQ...")
        await rabbitmq.subscribe_events(manager.broadcast)
    except Exception as e:
        logger.error(f"Erro ao iniciar listener de eventos: {e}")


# Endpoint WebSocket
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
    index_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "dist", "index.html")
    if not os.path.exists(index_path):
        logger.error(f"❌ [STATIC] Arquivo index.html não encontrado em: {index_path}")
        return None
    
    try:
        with open(index_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Injeta timestamp no env-config.js para forçar recarregamento
        # Ex: src="/env-config.js" → src="/env-config.js?v=17382910..."
        timestamp = int(time.time())
        content = content.replace(
            'src="/env-config.js"', 
            f'src="/env-config.js?v={timestamp}"'
        )
        return content
    except Exception as e:
        logger.error(f"Erro ao ler index.html para cache busting: {e}")
        return None

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    if not DEBUG:
        from fastapi import HTTPException
        raise HTTPException(status_code=404)
    
    from fastapi.responses import HTMLResponse
    
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
    <link type="text/css" rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
    <link rel="shortcut icon" href="https://fastapi.tiangolo.com/img/favicon.png">
    <title>ZapVoice API Oficial - Swagger UI</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #fafafa;
        }
        .swagger-ui .topbar {
            background-color: #0f172a;
        }
        .category-select-container {
            margin: 20px auto 10px auto;
            max-width: 1460px;
            padding: 0 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            font-family: sans-serif;
        }
        .category-select-label {
            font-weight: bold;
            font-size: 14px;
            color: #3b82f6;
        }
        .category-select {
            padding: 8px 32px 8px 16px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 14px;
            outline: none;
            cursor: pointer;
            background-color: #ffffff;
            color: #334155;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            appearance: none;
            -webkit-appearance: none;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
            background-position: right 8px center;
            background-repeat: no-repeat;
            background-size: 20px;
            transition: all 0.2s;
        }
        .category-select:hover {
            border-color: #cbd5e1;
            box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.05);
        }
        .category-select:focus {
            border-color: #3b82f6;
        }
    </style>
    </head>
    <body>
    <div id="swagger-ui">
    </div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
    window.onload = function() {
        const ui = SwaggerUIBundle({
            url: '/openapi.json',
            dom_id: '#swagger-ui',
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.SwaggerUIStandalonePreset
            ],
            layout: "BaseLayout",
            deepLinking: true,
            showExtensions: true,
            showCommonExtensions: true,
            filter: true
        });
        window.ui = ui;

        const interval = setInterval(() => {
            const tags = document.querySelectorAll('.opblock-tag-section h4 a span');
            if (tags.length > 0) {
                clearInterval(interval);
                
                const filterContainer = document.createElement('div');
                filterContainer.className = 'category-select-container';
                
                const label = document.createElement('span');
                label.className = 'category-select-label';
                label.innerText = 'Filtrar por Categoria:';
                
                const select = document.createElement('select');
                select.className = 'category-select';
                
                const optionAll = document.createElement('option');
                optionAll.value = 'all';
                optionAll.innerText = 'Todas as Categorias';
                select.appendChild(optionAll);
                
                const tagNames = Array.from(tags).map(el => el.innerText.trim());
                const uniqueTags = [...new Set(tagNames)];
                
                uniqueTags.forEach(tag => {
                    const opt = document.createElement('option');
                    opt.value = tag;
                    opt.innerText = tag;
                    select.appendChild(opt);
                });
                
                select.addEventListener('change', (e) => {
                    const selected = e.target.value;
                    const sections = document.querySelectorAll('.opblock-tag-section');
                    sections.forEach(section => {
                        const tagEl = section.querySelector('h4 a span');
                        if (tagEl) {
                            const currentTagName = tagEl.innerText.trim();
                            if (selected === 'all' || currentTagName === selected) {
                                section.style.display = 'block';
                            } else {
                                section.style.display = 'none';
                            }
                        }
                    });
                });
                
                filterContainer.appendChild(label);
                filterContainer.appendChild(select);
                
                const wrapper = document.querySelector('.swagger-ui .wrapper');
                if (wrapper) {
                    wrapper.parentNode.insertBefore(filterContainer, wrapper.nextSibling);
                }
            }
        }, 300);
    }
    </script>
    </body>
    </html>
    """
    return HTMLResponse(html_content)

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
        "message": "ZapVoice API",
        "docs": "/docs",
        "status": "online",
        "version": "4.0.5",
        "mode": "production"
    }

# Servindo env-config.js sem cache
@app.get("/env-config.js")
async def serve_env_config():
    config_path = os.path.join(_BASE_DIR, "static", "dist", "env-config.js")
    if os.path.exists(config_path):
        from fastapi.responses import FileResponse
        response = FileResponse(config_path, media_type="application/javascript")
        # Desabilita cache para garantir que atualizações em tempo de execução sejam aplicadas
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        return response
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Config file not found")

# Mapeamento de extensões para media types
_STATIC_MEDIA_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".txt": "text/plain",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".eot": "font/eot",
}

# Rota coringa do SPA (deve rodar APÓS todas as outras rotas)
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    # Ignorar caminhos de API, Estáticos e Webhooks para não dar conflito de método (POST vs GET)
    path_lower = full_path.lower()
    if path_lower.startswith("api") or path_lower.startswith("static") or path_lower.startswith("docs") or path_lower.startswith("openapi") or path_lower.startswith("triggers"):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="API route not found via Frontend Catch-all")

    # Verificar se é um arquivo estático que existe na pasta dist/
    # (imagens, fontes, manifests, etc. que não são servidos pelo mount /assets)
    import mimetypes
    _, ext = os.path.splitext(full_path)
    if ext.lower() in _STATIC_MEDIA_TYPES:
        static_file = os.path.join(_BASE_DIR, "static", "dist", full_path)
        if os.path.isfile(static_file):
            from fastapi.responses import FileResponse
            media_type = _STATIC_MEDIA_TYPES[ext.lower()]
            return FileResponse(static_file, media_type=media_type)
        # Arquivo estático não encontrado - não redirecionar para SPA
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Static file not found: {full_path}")

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
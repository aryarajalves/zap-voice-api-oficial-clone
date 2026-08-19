"""
pg_realtime_listener.py
Serviço de escuta contínua de notificações PostgreSQL via LISTEN / NOTIFY.
Repassa eventos em tempo real para os clientes conectados via WebSocket Manager.
"""
import os
import json
import select
import asyncio
import psycopg2
import psycopg2.extensions
from core.logger import logger
from database import SQLALCHEMY_DATABASE_URL
from websocket_manager import manager


async def start_pg_listener():
    """Inicia a rotina de escuta de LISTEN / NOTIFY do PostgreSQL em background."""
    if not SQLALCHEMY_DATABASE_URL or "postgresql" not in SQLALCHEMY_DATABASE_URL:
        logger.info("ℹ️ [PG-REALTIME] Banco de dados não é PostgreSQL. Listener em tempo real desativado.")
        return

    logger.info("📡 [PG-REALTIME] Iniciando PostgreSQL LISTEN no canal 'zapvoice_realtime_events'...")
    loop = asyncio.get_event_loop()
    # Executa a thread de escuta no executor para não bloquear o loop de eventos assíncrono
    asyncio.create_task(run_listener_loop(loop))


async def run_listener_loop(loop: asyncio.AbstractEventLoop):
    """Executa o loop de escuta em thread separada com reconnect resiliente."""
    await loop.run_in_executor(None, _listen_forever, loop)


def _listen_forever(loop: asyncio.AbstractEventLoop):
    """Thread contínua de escuta das notificações emitidas pelos Triggers do PostgreSQL."""
    # Trata a URL do SQLAlchemy para conexão padrão do psycopg2
    db_url = SQLALCHEMY_DATABASE_URL
    if db_url.startswith("postgresql+psycopg2://"):
        db_url = db_url.replace("postgresql+psycopg2://", "postgresql://", 1)

    while True:
        try:
            conn = psycopg2.connect(db_url)
            conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)

            curs = conn.cursor()
            curs.execute("LISTEN zapvoice_realtime_events;")
            logger.info("✅ [PG-REALTIME] Conectado e escutando 'zapvoice_realtime_events'.")

            while True:
                # Bloqueia por até 5 segundos aguardando notificação na conexão
                if select.select([conn], [], [], 5) == ([], [], []):
                    # Timeout sem evento — continua vivo
                    continue

                conn.poll()
                while conn.notifies:
                    notify = conn.notifies.pop(0)
                    try:
                        payload = json.loads(notify.payload)
                    except Exception:
                        payload = {"raw": notify.payload}

                    # Envia o evento de forma thread-safe para o WebSocket Manager no loop assíncrono
                    asyncio.run_coroutine_threadsafe(
                        manager.broadcast(payload),
                        loop
                    )
        except Exception as e:
            logger.warning(f"⚠️ [PG-REALTIME] Conexão com PostgreSQL perdida ({e}). Reconectando em 5s...")
            import time
            time.sleep(5)

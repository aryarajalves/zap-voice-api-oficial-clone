import asyncio
import logging
import os
from rabbitmq_client import rabbitmq

# Handlers
from .handlers.bulk import handle_bulk_send
from .handlers.funnel import handle_funnel_execution
from .handlers.chatwoot import handle_chatwoot_private_message
from .handlers.whatsapp import handle_whatsapp_event
from .handlers.memory import handle_agent_memory_webhook

# Configuração de logs
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("Worker")

# Worker Configuration
PREFETCH_COUNT = int(os.getenv("RABBITMQ_PREFETCH_COUNT", 100))
MESSAGE_DELAY = float(os.getenv("RABBITMQ_MESSAGE_DELAY", 1.0))

async def start_worker():
    """Inicia o worker e conecta às filas"""
    logger.info(f"👷 Iniciando ZapVoice Worker Modular | Prefetch Funis: {PREFETCH_COUNT} | Delay: {MESSAGE_DELAY}s")
    
    # Conecta ao RabbitMQ
    await rabbitmq.connect()
    
    # Define os consumidores
    await rabbitmq.consume("zapvoice_bulk_sends", handle_bulk_send, prefetch_count=1)
    await rabbitmq.consume("agent_memory_webhook_queue", handle_agent_memory_webhook, prefetch_count=1)
    await rabbitmq.consume("whatsapp_events", handle_whatsapp_event, prefetch_count=50)
    await rabbitmq.consume("zapvoice_funnel_executions", handle_funnel_execution, prefetch_count=PREFETCH_COUNT)
    await rabbitmq.consume("chatwoot_private_messages", handle_chatwoot_private_message, prefetch_count=50, requeue_on_error=True)

    logger.info("🚀 Worker rodando e aguardando processamento...")
    
    try:
        await asyncio.Future()
    except asyncio.CancelledError:
        logger.info("🛑 Worker parando...")
        await rabbitmq.close()

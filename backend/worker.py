import asyncio
import logging
import sys
import os

# Adiciona o diretório atual ao path para garantir que core seja encontrado
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.worker import start_worker
from core.worker.handlers.bulk import handle_bulk_send
from core.worker.handlers.whatsapp import handle_whatsapp_event
from core.worker.handlers.funnel import handle_funnel_execution
from core.worker.handlers.chatwoot import handle_chatwoot_private_message
from core.worker.handlers.memory import handle_agent_memory_webhook

if __name__ == "__main__":
    try:
        asyncio.run(start_worker())
    except KeyboardInterrupt:
        print("\n🛑 Worker parado manualmente (KeyboardInterrupt)")
    except Exception as e:
        print(f"\n❌ Erro fatal ao iniciar o worker: {e}")
        sys.exit(1)

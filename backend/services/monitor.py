import os
import psutil
import asyncio
from core.logger import setup_logger
from rabbitmq_client import rabbitmq
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from datetime import datetime, timezone

logger = setup_logger(__name__)

class SystemMonitor:
    @staticmethod
    def get_cpu_usage():
        """Retorna a porcentagem de uso da CPU"""
        try:
            # interval=None para não bloquear o loop de eventos
            return psutil.cpu_percent(interval=None)
        except Exception as e:
            logger.error(f"Erro ao obter uso de CPU: {e}")
            return 0.0

    @staticmethod
    def get_ram_usage():
        """Retorna o uso de RAM (bytes e percentual) adaptado para Docker/Host"""
        try:
            # No Docker, o psutil.virtual_memory() pode retornar a RAM do HOST.
            # Tentamos ler do cgroup para precisão no container.
            if os.path.exists('/sys/fs/cgroup/memory/memory.usage_in_bytes'):
                with open('/sys/fs/cgroup/memory/memory.usage_in_bytes', 'r') as f:
                    usage = int(f.read().strip())
                with open('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'r') as f:
                    limit = int(f.read().strip())
                
                # Alguns sistemas retornam números gigantescos se não houver limite
                if limit > 9223372036854771712: 
                    # Fallback para psutil se o limite do cgroup for o máximo do SO
                    mem = psutil.virtual_memory()
                    return {"used": mem.used, "percent": mem.percent, "total": mem.total}
                
                percent = (usage / limit) * 100
                return {"used": usage, "percent": round(percent, 2), "total": limit}
            
            # Fallback para PSUtil (Local/Windows)
            mem = psutil.virtual_memory()
            return {"used": mem.used, "percent": mem.percent, "total": mem.total}
        except Exception as e:
            logger.error(f"Erro ao obter uso de RAM: {e}")
            return {"used": 0, "percent": 0.0, "total": 0}

    @staticmethod
    async def get_queue_stats():
        """Retorna o total de mensagens pendentes nas filas do RabbitMQ"""
        try:
            total_messages = 0
            queues = ["zapvoice_bulk_sends", "whatsapp_events", "zapvoice_funnel_executions", "chatwoot_private_messages"]
            
            if not rabbitmq.channel or rabbitmq.channel.is_closed:
                await rabbitmq.connect()
            
            if rabbitmq.channel:
                for q_name in queues:
                    try:
                        # Declara como passivo apenas para pegar o count
                        q = await rabbitmq.channel.declare_queue(q_name, passive=True)
                        total_messages += q.declaration_result.message_count
                    except Exception:
                        # Se a fila não existir ainda, apenas ignora
                        continue
            
            return total_messages
        except Exception as e:
            logger.error(f"Erro ao obter status das filas: {e}")
            return 0

    @staticmethod
    async def get_service_status():
        """Verifica se os serviços essenciais estão online"""
        status = {
            "database": "offline",
            "rabbitmq": "offline",
            "worker": "online" # Assume online se o backend está rodando? Podemos melhorar depois.
        }
        
        # Test Database
        db = SessionLocal()
        try:
            db.execute(models.text("SELECT 1"))
            status["database"] = "online"
        except Exception:
            status["database"] = "offline"
        finally:
            db.close()
            
        # Test RabbitMQ
        if rabbitmq.connection and not rabbitmq.connection.is_closed:
            status["rabbitmq"] = "online"
        else:
            status["rabbitmq"] = "offline"
            
        return status

    @classmethod
    async def collect_all(cls):
        """Coleta todos os dados de uma vez"""
        cpu = cls.get_cpu_usage()
        ram = cls.get_ram_usage()
        queue = await cls.get_queue_stats()
        services = await cls.get_service_status()
        
        return {
            "cpu": cpu,
            "ram": ram,
            "queue_size": queue,
            "services": services,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

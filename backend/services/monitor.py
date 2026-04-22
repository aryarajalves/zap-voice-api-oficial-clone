import os
import psutil
import asyncio
from core.logger import setup_logger
from rabbitmq_client import rabbitmq
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from datetime import datetime, timezone

logger = setup_logger(__name__)

class SystemMonitor:
    _last_stats = None
    _last_collect_time = 0
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
                async def get_q_count(q_name):
                    try:
                        q = await asyncio.wait_for(
                            rabbitmq.channel.declare_queue(q_name, passive=True),
                            timeout=1.0
                        )
                        return q.declaration_result.message_count
                    except Exception:
                        return 0
                
                counts = await asyncio.gather(*(get_q_count(q) for q in queues))
                total_messages = sum(counts)
            
            return total_messages
        except Exception as e:
            logger.error(f"Erro ao obter status das filas: {e}")
            return 0

    @staticmethod
    def _check_db_sync():
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            return "online"
        except Exception:
            return "offline"
        finally:
            db.close()

    @staticmethod
    async def get_service_status():
        """Verifica se os serviços essenciais estão online"""
        status = {
            "database": "offline",
            "rabbitmq": "offline",
            "worker": "online"
        }
        
        # Test Database via thread
        status["database"] = await asyncio.to_thread(SystemMonitor._check_db_sync)
            
        # Test RabbitMQ
        if rabbitmq.connection and not rabbitmq.connection.is_closed:
            status["rabbitmq"] = "online"
        else:
            status["rabbitmq"] = "offline"
            
        return status

    @staticmethod
    def _get_client_stats_sync(client_id: int):
        db = SessionLocal()
        try:
            # Count triggers that are pending or queued
            scheduled = db.query(models.ScheduledTrigger).filter(
                models.ScheduledTrigger.client_id == client_id,
                models.ScheduledTrigger.status.in_(['pending', 'queued'])
            ).count()

            # Count triggers processed today
            from sqlalchemy import func
            today = datetime.now().date()
            
            # Garantir que usamos as colunas corretas: status e updated_at
            sent_today = db.query(models.ScheduledTrigger).filter(
                models.ScheduledTrigger.client_id == client_id,
                models.ScheduledTrigger.status.in_(['completed', 'processed', 'sent']),
                func.date(models.ScheduledTrigger.updated_at) == today
            ).count()

            return {
                "scheduled_count": scheduled,
                "sent_today": sent_today
            }
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas do cliente {client_id}: {str(e)}")
            return {"scheduled_count": 0, "sent_today": 0}
        finally:
            db.close()

    @classmethod
    async def get_client_stats(cls, client_id: int):
        """Coleta estatísticas específicas de um cliente único (Async Wrapper)"""
        # Execute in thread pool to avoid blocking async loop
        return await asyncio.to_thread(cls._get_client_stats_sync, client_id)

    @classmethod
    async def collect_all(cls, client_id: int = None, force_refresh: bool = False):
        """Coleta apenas CPU e RAM para máxima velocidade em produção"""
        import time
        now = time.time()
        
        # Cache de 1 segundo para não sobrecarregar
        if not force_refresh and cls._last_stats and (now - cls._last_collect_time < 1):
            return cls._last_stats

        # CPU e RAM são rápidos
        cpu = cls.get_cpu_usage()
        ram = cls.get_ram_usage()
        
        data = {
            "cpu": cpu,
            "ram": ram,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            # Placeholders para compatibilidade com o frontend (enquanto não atualizado)
            "queue_size": 0,
            "services": {"database": "online", "rabbitmq": "online", "worker": "online"},
            "client_stats": {"scheduled_count": 0, "sent_today": 0}
        }

        cls._last_stats = data
        cls._last_collect_time = now
        return data

import os
import asyncio
from datetime import datetime, timezone
from core.logger import logger
from websocket_manager import manager
from rabbitmq_client import rabbitmq

async def system_monitor_task():
    """Coleta e envia estatísticas de sistema via WebSocket a cada 5 segundos"""
    from services.monitor import SystemMonitor
    
    # Primeira chamada para inicializar o psutil.cpu_percent
    SystemMonitor.get_cpu_usage()
    
    await asyncio.sleep(2)  # Aguarda o sistema estabilizar
    
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
                        stats["client_stats"] = await SystemMonitor.get_client_stats(client_id)
                    
                    await manager.send_personal_message({
                        "event": "system_stats",
                        "data": stats
                    }, ws)
                except Exception as e:
                    logger.warning(f"Erro ao enviar stats individual: {e}")
                    
        except Exception as e:
            logger.error(f"Erro na tarefa de monitoramento: {e}")
        
        await asyncio.sleep(5)

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

        await asyncio.sleep(60)

async def event_listener():
    """Conecta ao RabbitMQ para ouvir eventos de progresso e repassar ao Frontend"""
    await asyncio.sleep(5) 
    try:
        logger.info("Conectando Websocket Listener ao RabbitMQ...")
        await rabbitmq.subscribe_events(manager.broadcast)
    except Exception as e:
        logger.error(f"Erro ao iniciar listener de eventos: {e}")

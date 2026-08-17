import asyncio
import os
import uuid
import models
from sqlalchemy import and_, or_, func
from database import SessionLocal
from datetime import datetime, timezone, timedelta
import rabbitmq_client
from core.logger import setup_logger

logger = setup_logger(__name__)


def _get_pkg_var(name: str, default=None):
    try:
        import services.scheduler as _sched
        return getattr(_sched, name, default)
    except Exception:
        return default


def _set_pkg_var(name: str, value):
    try:
        import services.scheduler as _sched
        setattr(_sched, name, value)
    except Exception:
        pass


def get_rabbitmq():
    """Obtém cliente rabbitmq através do pacote services.scheduler para suporte a mocks."""
    try:
        import services.scheduler as _sched
        if hasattr(_sched, "rabbitmq"):
            return _sched.rabbitmq
    except Exception:
        pass
    return rabbitmq_client.rabbitmq


async def run_log_file_cleanup():
    """Remove linhas antigas do zapvoice_debug.log com mais de LOG_RETENTION_DAYS dias."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if _get_pkg_var("_last_cleanup_log") == today:
        return

    retention_days = int(os.getenv("LOG_RETENTION_DAYS", "0"))
    if retention_days <= 0:
        _set_pkg_var("_last_cleanup_log", today)
        return

    def _sync_cleanup():
        log_path = "logs/zapvoice_debug.log"
        if not os.path.exists(log_path):
            return
        
        logger.info(f"🔍 [LOG CLEANUP] Iniciando limpeza do arquivo de log (retenção: {retention_days} dias)...")
        cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
        cutoff_str = cutoff.strftime("%Y-%m-%d")
        
        try:
            with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()

            kept = [l for l in lines if (len(l) >= 10 and (l[:10] >= cutoff_str or l[3:5] == cutoff_str[5:7])) or len(l) < 10]
            removed = len(lines) - len(kept)

            if removed > 0:
                with open(log_path, "w", encoding="utf-8") as f:
                    f.writelines(kept)
                logger.info(f"🧹 [LOG CLEANUP] {removed} linha(s) removidas do log (>{retention_days} dias).")
        except Exception as e:
            logger.error(f"❌ [LOG CLEANUP] Erro na limpeza síncrona: {e}")

    try:
        await asyncio.to_thread(_sync_cleanup)
    except Exception as e:
        logger.error(f"❌ [LOG CLEANUP] Erro ao disparar thread de limpeza: {e}")
    finally:
        _set_pkg_var("_last_cleanup_log", today)


async def run_history_cleanup():
    """Remove registros de WebhookHistory mais antigos que HISTORY_RETENTION_DAYS dias."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if _get_pkg_var("_last_cleanup_history") == today:
        return

    retention_days = int(os.getenv("HISTORY_RETENTION_DAYS", "0"))
    if retention_days <= 0:
        _set_pkg_var("_last_cleanup_history", today)
        return

    logger.info(f"🔍 [HISTORY CLEANUP] Iniciando limpeza do histórico de webhooks (retenção: {retention_days} dias)...")
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    db = SessionLocal()
    try:
        deleted = db.query(models.WebhookHistory).filter(
            models.WebhookHistory.created_at < cutoff
        ).delete(synchronize_session=False)
        db.commit()
        if deleted:
            logger.info(f"🧹 [HISTORY CLEANUP] {deleted} registro(s) removidos do histórico.")
        else:
            logger.info("✅ [HISTORY CLEANUP] Nenhum registro antigo encontrado no histórico.")
    except Exception as e:
        logger.error(f"❌ [HISTORY CLEANUP] Erro na limpeza de histórico: {e}")
        db.rollback()
    finally:
        db.close()
        _set_pkg_var("_last_cleanup_history", today)


async def run_bulk_crash_detection(db_session=None):
    """
    Detecta disparos em massa cujo worker morreu (last_heartbeat > 10 min atras).
    Cria MessageStatus 'failed' para cada contato pendente e marca o trigger como 'failed'.
    Roda a cada minuto (controle por _last_bulk_crash_check).
    """
    now_utc = datetime.now(timezone.utc)
    minute_key = now_utc.strftime("%Y-%m-%d %H:%M")
    if _get_pkg_var("_last_bulk_crash_check") == minute_key:
        return

    db = db_session if db_session is not None else SessionLocal()
    try:
        # Triggers em 'cancelling' há mais de 30 segundos sem worker ativo = forçar cancelled
        cutoff_cancelling = now_utc - timedelta(seconds=30)
        stuck_cancelling = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.is_bulk == True,
            models.ScheduledTrigger.status == 'cancelling',
            models.ScheduledTrigger.updated_at < cutoff_cancelling,
        ).all()
        for tr in stuck_cancelling:
            logger.warning(f"🛑 [CRASH-REAPER] Trigger #{tr.id} preso em 'cancelling' por mais de 2min. Forçando 'cancelled'.")
            tr.status = 'cancelled'
            db.commit()
            try:
                from services.engine import log_node_execution
                log_node_execution(db, tr, node_id=tr.current_node_id or 'DELIVERY',
                                   status='cancelled', details='Cancelamento forçado pelo reaper: trigger preso em cancelling sem heartbeat.')
            except Exception:
                pass
        if stuck_cancelling:
            db.commit()
            rmq = get_rabbitmq()
            for tr in stuck_cancelling:
                await rmq.publish_event("trigger_updated", {"trigger_id": tr.id, "status": "cancelled", "client_id": tr.client_id})

        # Busca todos os disparos bulk em 'processing'
        cutoff_processing = now_utc - timedelta(minutes=15)
        candidates = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.is_bulk == True,
            models.ScheduledTrigger.status == 'processing',
            models.ScheduledTrigger.updated_at < cutoff_processing,
        ).all()

        HEARTBEAT_TIMEOUT = 10 * 60
        FAILURE_REASON = (
            "Servidor reiniciado durante o disparo. "
            "Este contato nao foi processado pois o sistema caiu enquanto o disparo estava em andamento."
        )
        crashed = []
        for tr in candidates:
            pdata = tr.processed_data or {}
            hb_str = pdata.get("last_heartbeat")
            if not hb_str:
                crashed.append(tr)
                continue
            try:
                hb = datetime.fromisoformat(hb_str)
                if hb.tzinfo is not None:
                    hb = hb.astimezone(timezone.utc).replace(tzinfo=None)
                diff = (now_utc.replace(tzinfo=None) - hb).total_seconds()
                if diff >= HEARTBEAT_TIMEOUT:
                    crashed.append(tr)
            except Exception:
                crashed.append(tr)

        if not crashed:
            return

        from services.utils.phone_utils import normalize_phone

        for tr in crashed:
            logger.warning(
                f"💀 [CRASH-REAPER] Bulk trigger #{tr.id} sem heartbeat por >10min. "
                f"Pendentes: {len(tr.pending_contacts or [])} contatos."
            )

            pending = list(tr.pending_contacts or [])

            existing_phones = set(
                p for (p,) in db.query(models.MessageStatus.phone_number)
                .filter(models.MessageStatus.trigger_id == tr.id)
                .all()
            )

            new_failures = 0
            for phone_raw in pending:
                phone = normalize_phone(phone_raw) or phone_raw
                match = any(
                    phone == ep or (len(phone) >= 8 and phone[-10:] in ep)
                    for ep in existing_phones
                )
                if match:
                    continue
                msg = models.MessageStatus(
                    trigger_id=tr.id,
                    message_id=f"crash_{tr.id}_{phone}_{uuid.uuid4().hex[:8]}",
                    phone_number=phone,
                    contact_name=phone,
                    status="failed",
                    failure_reason=FAILURE_REASON,
                    message_type=tr.template_name and "TEMPLATE" or "FREE_MESSAGE",
                )
                db.add(msg)
                new_failures += 1

            tr.total_failed = (tr.total_failed or 0) + new_failures
            tr.status = "failed"
            tr.failure_reason = (
                f"Queda do servidor durante o disparo. "
                f"{new_failures} contato(s) nao processado(s) registrado(s) como falha."
            )
            tr.pending_contacts = []
            db.commit()

            try:
                from services.engine import log_node_execution
                log_node_execution(
                    db, tr,
                    node_id=tr.current_node_id or "DELIVERY",
                    status="failed",
                    details=tr.failure_reason,
                )
            except Exception:
                pass

        db.commit()
        logger.info(
            f"💀 [CRASH-REAPER] {len(crashed)} disparo(s) de crash detectado(s) e encerrado(s)."
        )

    except Exception as e:
        logger.error(f"❌ [CRASH-REAPER] Erro na deteccao de crash: {e}")
        db.rollback()
    finally:
        if db_session is None:
            db.close()
        _set_pkg_var("_last_bulk_crash_check", minute_key)


async def run_stale_triggers_cleanup(db_session=None):
    """Cancela Gatilhos travados ou aguardando entrega por muito tempo."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d %H")  # Rodar de hora em hora
    
    if _get_pkg_var("_last_cleanup_stale") == today and db_session is None:
        return

    db = db_session if db_session is not None else SessionLocal()
    try:
        # 1. Gatilhos pausados aguardando entrega por mais de 24 horas (Meta window)
        logger.info("🔍 [STALE CLEANUP] Verificando funis pausados há mais de 24h...")
        cutoff_24h = datetime.now(timezone.utc) - timedelta(hours=24)
        stale_waiting = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.status == 'paused_waiting_delivery',
            models.ScheduledTrigger.updated_at < cutoff_24h
        ).all()
        
        for tr in stale_waiting:
            logger.warning(f"🧟 [REAPER] Cancelando Trigger {tr.id}: tempo de espera (24h) excedido.")
            tr.status = 'failed'
            tr.failure_reason = "Mensagem não entregue ao WhatsApp do cliente em 24h (aparelho offline ou impossibilitado)."
            db.commit()
            try:
                from services.engine import log_node_execution
                log_node_execution(db, tr, node_id=tr.current_node_id, status="failed", details=tr.failure_reason)
            except Exception:
                pass

        # 2. Gatilhos travados em 'processing' ou 'queued' por mais de 2 horas (Worker crash / RabbitMQ issue)
        logger.info("🔍 [STALE CLEANUP] Verificando disparos travados há mais de 2h...")
        cutoff_2h = datetime.now(timezone.utc) - timedelta(hours=2)
        stale_processing = db.query(models.ScheduledTrigger).filter(
            or_(
                and_(
                    models.ScheduledTrigger.status == 'queued',
                    models.ScheduledTrigger.scheduled_time < cutoff_2h
                ),
                and_(
                    models.ScheduledTrigger.status.in_(['processing', 'cancelling']),
                    models.ScheduledTrigger.updated_at < cutoff_2h
                )
            )
        ).all()

        for tr in stale_processing:
            logger.warning(f"🧟 [REAPER] Falhando Trigger {tr.id}: travado em {tr.status} por mais de 2h.")
            tr.status = 'failed'
            tr.failure_reason = f"Disparo travado: O tempo limite de processamento (2h) foi excedido. Possível queda do sistema ou erro crítico no worker durante o status {tr.status}."
            db.commit()
            try:
                from services.engine import log_node_execution
                log_node_execution(db, tr, node_id=tr.current_node_id or 'DELIVERY', status="failed", details=tr.failure_reason)
            except Exception:
                pass

        # 3. Mensagens individuais presas na fila da Meta há mais de 24 horas
        logger.info("🔍 [STALE CLEANUP] Verificando mensagens presas na fila da Meta há mais de 24h...")
        stale_queue_messages = db.query(models.MessageStatus).filter(
            models.MessageStatus.status == 'sent',
            models.MessageStatus.delivered_counted == False,
            models.MessageStatus.read_counted == False,
            models.MessageStatus.timestamp < cutoff_24h
        ).all()

        if stale_queue_messages:
            queue_fail_reason = "Ultrapassou 24 horas ainda na fila da Meta (WhatsApp) sem confirmação de entrega — disparo abortado."
            failed_per_trigger = {}
            for ms in stale_queue_messages:
                ms.status = 'failed'
                ms.failure_reason = queue_fail_reason
                failed_per_trigger[ms.trigger_id] = failed_per_trigger.get(ms.trigger_id, 0) + 1

            if failed_per_trigger:
                triggers_to_update = db.query(models.ScheduledTrigger).filter(
                    models.ScheduledTrigger.id.in_(failed_per_trigger.keys())
                ).all()
                for tr in triggers_to_update:
                    tr.total_failed = (tr.total_failed or 0) + failed_per_trigger.get(tr.id, 0)

            logger.warning(f"🧟 [REAPER] {len(stale_queue_messages)} mensagem(ns) presas na fila da Meta há +24h marcadas como falha.")

        db.commit()
        if not stale_waiting and not stale_processing and not stale_queue_messages:
            logger.info("✅ [STALE CLEANUP] Nenhum gatilho obsoleto encontrado.")
        else:
            logger.info(f"🧹 [STALE CLEANUP] Limpeza concluída: {len(stale_waiting)} expirados, {len(stale_processing)} travados, {len(stale_queue_messages)} presos na fila da Meta.")
            
    except Exception as e:
        logger.error(f"❌ [STALE CLEANUP] Erro ao limpar gatilhos obsoletos: {e}")
        db.rollback()
    finally:
        if db_session is None:
            db.close()
        _set_pkg_var("_last_cleanup_stale", today)


async def run_closed_window_label_cleanup(db_session=None):
    """
    Remove etiquetas configuradas no WA_WINDOW_CLOSED_REMOVE_LABELS das conversas do chat interno
    cuja janela de 24h foi fechada. Roda a cada minuto.
    """
    now_utc = datetime.now(timezone.utc)
    minute_key = now_utc.strftime("%Y-%m-%d %H:%M")
    
    if _get_pkg_var("_last_closed_window_cleanup") == minute_key and db_session is None:
        return
        
    db = db_session if db_session is not None else SessionLocal()
    try:
        # 1. Obter todas as configurações de etiquetas para remoção
        configs = db.query(models.AppConfig).filter(
            models.AppConfig.key == "WA_WINDOW_CLOSED_REMOVE_LABELS"
        ).all()
        
        if not configs:
            return
            
        safety_limit = now_utc - timedelta(hours=24)
        
        for config in configs:
            client_id = config.client_id
            val = config.value or ""
            target_labels = [l.strip() for l in val.split(",") if l.strip()]
            if not target_labels:
                continue
                
            target_labels_lower = [tl.lower() for tl in target_labels]
            
            # Buscar conversas ativas do cliente
            conversations = db.query(models.ChatConversation).filter(
                models.ChatConversation.client_id == client_id,
                models.ChatConversation.status == "open"
            ).all()
            
            for convo in conversations:
                # Verificar se a janela de 24h está fechada
                last_msg_at = convo.last_contact_message_at
                is_closed = False
                if last_msg_at is None:
                    is_closed = True
                else:
                    if last_msg_at.tzinfo is None:
                        last_msg_at = last_msg_at.replace(tzinfo=timezone.utc)
                    if last_msg_at < safety_limit:
                        is_closed = True
                        
                if is_closed:
                    convo_labels = convo.labels or []
                    has_label_to_remove = False
                    new_labels = []
                    
                    removed_labels = []
                    for lbl in convo_labels:
                        if lbl.lower() in target_labels_lower:
                            has_label_to_remove = True
                            removed_labels.append(lbl)
                        else:
                            new_labels.append(lbl)
                            
                    if has_label_to_remove:
                        convo.labels = new_labels
                        
                        from services.chat_label_service import get_brasilia_now
                        now_br = get_brasilia_now()
                        date_str = now_br.strftime("%d/%m/%Y")
                        time_str = now_br.strftime("%H:%M")
                        
                        event_text = f"O sistema removeu marcador(es) por expiração da janela de 24h em {date_str} às {time_str}: {', '.join(removed_labels)}"
                        sys_msg = models.ChatMessage(
                            conversation_id=convo.id,
                            sender_type="system",
                            message_type="text",
                            content=event_text,
                            timestamp=datetime.now(timezone.utc)
                        )
                        db.add(sys_msg)
                        
                        convo.last_message_content = f"Marcador(es) '{', '.join(removed_labels)}' removido(s) (janela de 24h)"
                        convo.last_message_at = datetime.now(timezone.utc)
                        db.commit()
                        db.refresh(sys_msg)
                        
                        # Notifica o frontend via WebSocket usando RabbitMQ
                        payload_msg = {
                            "id": sys_msg.id,
                            "conversation_id": sys_msg.conversation_id,
                            "sender_type": sys_msg.sender_type,
                            "message_type": sys_msg.message_type,
                            "content": sys_msg.content,
                            "media_url": sys_msg.media_url,
                            "meta_data": sys_msg.meta_data,
                            "timestamp": sys_msg.timestamp.isoformat() if sys_msg.timestamp else datetime.now(timezone.utc).isoformat(),
                            "client_id": client_id
                        }
                        payload_ws = {
                            "conversation_id": convo.id,
                            "id": convo.id,
                            "client_id": client_id,
                            "labels": new_labels,
                            "last_message_content": convo.last_message_content,
                            "last_message_at": convo.last_message_at.isoformat() if convo.last_message_at else None
                        }
                        rmq = get_rabbitmq()
                        await rmq.publish_event("new_message", payload_msg)
                        await rmq.publish_event("conversation_updated", payload_ws)
                        logger.info(f"🧹 [LABEL-CLEANUP] Janela fechada para conversa {convo.id}. "
                                    f"Etiquetas removidas do chat interno: {removed_labels}. Mensagem de sistema criada ({date_str} às {time_str}).")
                                    
    except Exception as e:
        logger.error(f"❌ [LABEL-CLEANUP] Erro no ciclo de limpeza de etiquetas: {e}")
        db.rollback()
    finally:
        if db_session is None:
            db.close()
        _set_pkg_var("_last_closed_window_cleanup", minute_key)

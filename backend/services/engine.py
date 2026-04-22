
import asyncio
import os
import subprocess
import random
import time
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
import models
from chatwoot_client import ChatwootClient
import logging
import unicodedata
import re
import zoneinfo
from core.logger import setup_logger
from services.window_manager import get_best_conversation, is_window_open_strict
from config_loader import get_setting
from rabbitmq_client import rabbitmq
from services.ai_memory import notify_agent_memory_webhook


logger = setup_logger("FunnelEngine")

BRAZIL_TZ = zoneinfo.ZoneInfo("America/Sao_Paulo")
NODE_TYPE_LABELS = {
    "start": "Início",
    "messageNode": "Mensagem",
    "audioNode": "Áudio",
    "mediaNode": "Mídia",
    "waitNode": "Aguardar",
    "conditionNode": "Condição",
    "end": "Fim",
    "inputNode": "Entrada",
    "actionNode": "Ação",
    "updateContactNode": "Atualizar Contato no Chatwoot"
}

def is_within_business_hours(funnel) -> bool:
    """
    Verifica se o momento atual está dentro do horário comercial configurado no funil.
    Retorna True (pode enviar) ou False (fora do horário comercial).
    """
    try:
        now_br = datetime.now(BRAZIL_TZ)
        allowed_days = getattr(funnel, "business_hours_days", None) or [0, 1, 2, 3, 4]
        current_weekday = now_br.weekday()  # 0=Seg, 6=Dom
        if current_weekday not in allowed_days:
            return False

        start_str = getattr(funnel, "business_hours_start", None) or "08:00"
        end_str = getattr(funnel, "business_hours_end", None) or "18:00"
        
        start_h, start_m = (int(x) for x in start_str.split(":"))
        end_h, end_m = (int(x) for x in end_str.split(":"))
        
        current_minutes = now_br.hour * 60 + now_br.minute
        start_minutes = start_h * 60 + start_m
        end_minutes = end_h * 60 + end_m
        
        return start_minutes <= current_minutes < end_minutes
    except:
        return True

def get_next_business_hour_start(funnel):
    """
    Calcula o datetime (UTC) do início do próximo período comercial permitido.
    """
    now_br = datetime.now(BRAZIL_TZ)
    allowed_days = getattr(funnel, "business_hours_days", None) or [0, 1, 2, 3, 4]
    start_str = getattr(funnel, "business_hours_start", None) or "08:00"
    start_h, start_m = (int(x) for x in start_str.split(":"))
    
    # Check if we can still run today (today is allowed and we are BEFORE start time)
    if now_br.weekday() in allowed_days:
        today_start = now_br.replace(hour=start_h, minute=start_m, second=0, microsecond=0)
        if now_br < today_start:
            return today_start.astimezone(timezone.utc)
    
    # Find next allowed day
    current_day = now_br
    for _ in range(1, 8):
        current_day += timedelta(days=1)
        if current_day.weekday() in allowed_days:
            next_start = current_day.replace(hour=start_h, minute=start_m, second=0, microsecond=0)
            return next_start.astimezone(timezone.utc)
            
    return (now_br + timedelta(days=1)).replace(hour=start_h, minute=start_m).astimezone(timezone.utc)

def normalize_text(text: str) -> str:
    """
    Normaliza texto para comparação (Tags): 
    - Remove #
    - Transforma em minúsculo
    - Remove acentos e caracteres especiais (mantém apenas letras, números e espaços)
    """
    if not text: return ""
    text = str(text).replace("#", "").lower()
    # Decompor caracteres com acento e remover diacríticos
    text = "".join(c for c in unicodedata.normalize('NFKD', text) if not unicodedata.combining(c))
    # Manter apenas a-z, 0-9 e espaço
    text = re.sub(r'[^a-z0-9 ]', '', text)
    # Remover espaços extras e trim
    text = ' '.join(text.split())
    return text

async def publish_node_external_event(db, trigger, data, content, contact_phone, node_id, event_type="funnel_message_sent"):
    """
    Publica um evento externo (RabbitMQ) se o nó estiver configurado para isso.
    Mesma fila e lógica usada nos Webhooks (zapvoice_external_delivery).
    """
    # NEW: Só dispara se o toggle individual estiver ON (obrigatoriamente)
    # E a memória estiver configurada globalmente
    is_memory_configured = bool(get_setting("AGENT_MEMORY_WEBHOOK_URL", "", client_id=trigger.client_id))
    node_toggle_on = data.get("publishExternalEvent", False)
    
    if not node_toggle_on:
        # Se o nó não quer enviar (switch off), não envia nada de externo.
        return
        
    if not is_memory_configured:
        log_node_execution(db, trigger, node_id=node_id, status="completed", details=None, extra_data={"memory_status": "not_configured"})
        return
        
    external_event_data = {
        "event": event_type,
        "status": "sent",
        "trigger_id": trigger.id,
        "contact_phone": contact_phone,
        "contact_name": trigger.contact_name,
        "content": content,
        "funnel_id": trigger.funnel_id,
        "event_type": trigger.event_type,
        "product_name": trigger.product_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "integration_id": str(trigger.integration_id) if trigger.integration_id else None
    }
    
    # Redirecionado: Não envia mais para RabbitMQ (External Delivery), apenas para Memória IA
    logger.info(f"🧠 [EXTERNAL EVENT] Nó {node_id} ('{event_type}') capturado para Memória IA.")

    # NEW: Custom Webhook Memory Notification
    try:
        # Mark in history that memory sync was requested
        # USE THE PASSED db SESSION (avoid nested session conflicts)
        log_node_execution(
            db, trigger, 
            node_id=node_id, 
            status="processing", # UI will show pulsing state
            details=None, 
            extra_data={"memory_status": "queued"}
        )

        await notify_agent_memory_webhook(
            client_id=trigger.client_id,
            phone=contact_phone,
            name=trigger.contact_name,
            template_name=f"Node: {event_type}", # Or just None if it's not a template
            content=content,
            trigger_id=trigger.id,
            node_id=node_id
        )
    except Exception as e:
        logger.error(f"❌ [EXTERNAL EVENT] Erro ao notificar webhook de memória: {e}")

# Instância local para uso no engine
UPLOAD_DIR = "static/uploads"

def trigger_to_dict(trigger):
    """Converte um ScheduledTrigger para um dicionário seguro para JSON com todos os campos para a UI."""
    return {
        "id": trigger.id,
        "client_id": trigger.client_id,
        "integration_id": str(trigger.integration_id) if trigger.integration_id else None,
        "funnel_id": trigger.funnel_id,
        "status": trigger.status,
        "contact_name": trigger.contact_name,
        "contact_phone": trigger.contact_phone,
        "event_type": trigger.event_type,
        "template_name": trigger.template_name,
        "product_name": trigger.product_name,
        "is_bulk": trigger.is_bulk,
        "is_interaction": trigger.is_interaction,
        "sent_as": trigger.sent_as,
        "total_sent": trigger.total_sent or 0,
        "total_delivered": trigger.total_delivered or 0,
        "total_read": trigger.total_read or 0,
        "total_failed": trigger.total_failed or 0,
        "total_interactions": trigger.total_interactions or 0,
        "total_blocked": trigger.total_blocked or 0,
        "total_cost": trigger.total_cost or 0.0,
        "total_memory_sent": trigger.total_memory_sent or 0,
        "execution_history": trigger.execution_history or [],
        "failure_reason": trigger.failure_reason,
        "created_at": trigger.created_at.isoformat() if trigger.created_at else None,
        "scheduled_time": trigger.scheduled_time.isoformat() if trigger.scheduled_time else None,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


def log_node_execution(db, trigger, node_id, status, details=None, extra_data=None, emit_event=True):
    """Adds or updates an entry in the trigger's execution_history log."""
    try:
        from sqlalchemy.orm.attributes import flag_modified
        
        # 1. Acquire row lock and get most recent data
        trigger = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.id == trigger.id
        ).with_for_update().first()
        
        if not trigger:
            logger.warning(f"⚠️ [LOG] Trigger not found for logging: {node_id}")
            return

        history = list(trigger.execution_history or [])
        
        # Check if we already have this node_id in history to update it
        entry = next((item for item in history if item['node_id'] == node_id), None)
        
        if entry:
            # SAFETY: If the node is already 'completed', don't allow it to go back to 'processing' or 'waiting'
            # This prevents a slow worker loop from overwriting a fast webhook result.
            if entry.get('status') == 'completed' and status != 'completed':
                logger.debug(f"⚠️ [LOG SAFETY] Ignorando atualização de {node_id} para '{status}' pois já está 'completed'.")
                return
                
            entry['status'] = status
            entry['updated_at'] = datetime.now(timezone.utc).isoformat()
            if details: entry['details'] = details
            if extra_data: 
                if 'extra' not in entry: entry['extra'] = {}
                # Update extra data without overwriting other keys
                entry['extra'].update(extra_data)
        else:
            history.append({
                "node_id": node_id,
                "status": status,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "details": details,
                "extra": extra_data or {}
            })
            
        # 2. Force reassignment to a new list object to ensure SQLAlchemy detects the change
        trigger.execution_history = list(history)
        flag_modified(trigger, "execution_history")
        
        # 3. Commit and refresh again for consistency
        db.commit()
        db.refresh(trigger) 

        # 4. Emit Real-time Event if requested
        if emit_event:
            try:
                import asyncio
                from rabbitmq_client import rabbitmq
                
                # Check if we are in an event loop
                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    loop = None

                event_payload = trigger_to_dict(trigger)

                if loop and loop.is_running():
                    loop.create_task(rabbitmq.publish_event("trigger_progress", event_payload))
                else:
                    # In sync context, we use a separate loop or just log it
                    # Since workers are async, this branch is rarely hit for critical nodes
                    pass
            except Exception as ev_err:
                logger.warning(f"⚠️ [EVENT] Failed to emit progress event: {ev_err}")
    except Exception as e:
        logger.error(f"❌ [ENGINE LOG] Failed to log node execution: {e}")
        db.rollback()

async def wait_for_delivery_sync(db, message_id, trigger, current_node_id, timeout=60):
    """
    Aguarda a confirmação de recebimento (delivered/read) via webhook do WhatsApp.
    """
    # NEW: Interactive triggers bypass the wait to provide near-instant response
    if getattr(trigger, 'is_interaction', False):
        logger.info(f"⚡ [INTERACTION] Short-circuiting delivery sync for trigger {trigger.id}")
        return "delivered", "Entregue (Interação)"

    start_time = time.time()
    clean_id = message_id.replace("wamid.", "")
    
    last_log_time = 0
    
    while time.time() - start_time < timeout:
        # Consulta o status mais recente no banco (vindo do webhook)
        status_record = db.query(models.MessageStatus).filter(
            (models.MessageStatus.message_id == message_id) |
            (models.MessageStatus.message_id == clean_id)
        ).first()
        
        if status_record:
            if status_record.status in ['delivered', 'read', 'interaction']:
                logger.info(f"✅ [WEBHOOK CONFIRMADO] Mensagem {message_id} entregue para {trigger.contact_phone}")
                return "delivered", "Entregue"
            if status_record.status == 'failed':
                logger.error(f"❌ [WEBHOOK FALHA] Mensagem {message_id} falhou para {trigger.contact_phone}: {status_record.failure_reason}")
                return "failed", f"Falha na entrega: {status_record.failure_reason}"
        
        # Atualiza o log da UI periodicamente para mostrar progresso
        now = time.time()
        if now - last_log_time >= 5:
            elapsed = int(now - start_time)
            log_node_execution(db, trigger, current_node_id, "processing", f"WhatsApp: Aguardando entrega ({elapsed}s)...")
            last_log_time = now
            
        await asyncio.sleep(2)
        try:
            # Forçar expiração para garantir que o SELECT subsequente pegue dados novos do commit do Webhook
            db.expire_all()
            db.refresh(trigger)
        except:
            pass

    # TIMEOUT: Modo Reativo (Opção C)
    logger.warning(f"⏳ [TIMEOUT WEBHOOK] Mensagem {message_id} não confirmada em {timeout}s. Pausando funil para aguardar internet.")
    
    # 1. Alterar status para modo de pausa reativa
    trigger.status = 'paused_waiting_delivery'
    # trigger.current_node_id já está correto (é o nó atual que disparou a espera)
    
    # 2. Registrar no log da UI
    log_node_execution(db, trigger, current_node_id, "waiting", "Aguardando o celular do contato receber a mensagem (até 24h)...", {
        "paused_at": datetime.now(timezone.utc).isoformat(),
        "waiting_for_wamid": clean_id
    })
    
    db.commit()
    return "suspended", "Aguardando internet do contato"

async def execute_funnel(
    funnel_id: int, 
    conversation_id: int, 
    trigger_id: int, 
    contact_phone: str, 
    db: Session, 
    skip_block_check: bool = False,
    chatwoot_contact_id: int = None,
    chatwoot_account_id: int = None,
    chatwoot_inbox_id: int = None
):
    # Busca funil
    funnel = db.query(models.Funnel).filter(models.Funnel.id == funnel_id).first()
    if not funnel:
        logger.error(f"❌ Funil {funnel_id} não encontrado durante a execução")
        # Marca trigger como falho
        trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id).first()
        if trigger:
            trigger.status = 'failed'
            db.commit()
        return

    # Busca trigger para pegar client_id
    trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id).first()
    if not trigger:
        logger.error(f"❌ Trigger {trigger_id} não encontrado")
        return

    # Instancia o Cliente com Contexto - Passa account_id se disponível para evitar buscas
    chatwoot = ChatwootClient(client_id=trigger.client_id, account_id=chatwoot_account_id)

    # 1. Carregar Variáveis Globais para Substituição
    global_vars = db.query(models.GlobalVariable).filter(models.GlobalVariable.client_id == trigger.client_id).all()
    global_map = {v.name: v.value for v in global_vars}
    
    def apply_vars(text: str) -> str:
        if not text: return text
        
        # 1. Base Variables from Trigger/Contact
        local_vars = {
            "nome": trigger.contact_name or "Contato",
            "telefone": trigger.contact_phone or "",
            "produto": trigger.product_name or "",
        }
        
        # 2. Template/Bulk Variables (supports {{1}}, {{2}}... or named)
        t_comp = trigger.template_components
        if t_comp:
            if isinstance(t_comp, list):
                for i, val in enumerate(t_comp):
                    local_vars[str(i+1)] = val
            elif isinstance(t_comp, dict):
                local_vars.update(t_comp)

        # 3. Webhook Processed Data Variables
        # Some integrations might store vars in a different field
        if hasattr(trigger, 'processed_data') and trigger.processed_data:
             if isinstance(trigger.processed_data, dict):
                 local_vars.update(trigger.processed_data)

        # 4. Merge with Global Variables
        full_map = {**local_vars, **global_map}
        
        # Replace occurrences
        for key, val in full_map.items():
            str_val = str(val) if val is not None else ""
            
            # Se for a variável principal de nome (1) e estiver vazia, 
            # não substituímos aqui para deixar o fallback de contato agir.
            if key == "1" and not str_val.strip():
                continue
                
            text = text.replace(f"{{{{{key}}}}}", str_val)
        
        # Fallback para {{1}} se ainda existir e tivermos o nome
        if "{{1}}" in text and trigger.contact_name:
            text = text.replace("{{1}}", trigger.contact_name)
            
        return text

    logger.info(f"⚙️ Iniciando funil {funnel.name} para conversa {conversation_id} (Trigger {trigger_id})")
    print(f"⚙️ [ENGINE] Iniciando funil {funnel_id} (Nome: {funnel.name}) | Trigger: {trigger_id} | Telefone: {contact_phone}")
    
    # 🔍 [REFATORADO] Não resolver conversa ID prematuramente.
    # Será resolvido no webhook de entrega para evitar "Ghost Conversations".
    if not conversation_id or int(conversation_id) == 0:
        logger.info(f"⏳ [ENGINE] Funil iniciado sem Conversation ID. As mensagens serão enviadas via Meta Oficial até a entrega ser confirmada.")
    else:
        logger.info(f"🔗 [ENGINE] Conversation ID presente: {conversation_id}")

    # 🔗 Log Chatwoot discovery for UI feedback
    log_node_execution(
        db, trigger, 
        node_id='DISCOVERY', 
        status='completed', 
        details='⚡ CONTEXTO: CHATWOOT SINCRONIZADO' if getattr(trigger, 'is_interaction', False) else '🧬 CONTEXTO: CHATWOOT SINCRONIZADO',
        extra_data={
            "account_id": chatwoot_account_id or trigger.chatwoot_account_id or chatwoot.account_id,
            "conversation_id": conversation_id or trigger.conversation_id,
            "contact_id": chatwoot_contact_id or trigger.chatwoot_contact_id
        }
    )
    logger.info(f"🧬 [ENGINE] Discovery Logged. Now attempting to acquire lock for Trigger {trigger_id}...")

    # Check de status - ATOMIC LOCK
    # Usamos SELECT FOR UPDATE para travar a linha no DB e evitar que outro Worker comece em paralelo
    trigger = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.id == trigger_id
    ).with_for_update(skip_locked=True).first()

    if not trigger:
        logger.warning(f"⚠️ [LOCK] Trigger {trigger_id} já está sendo processado por outro Worker (SKIP LOCKED) ou não existe. Pulando.")
        return

    logger.info(f"🔐 [LOCK] Lock adquirido com sucesso para Trigger {trigger_id}")

    if trigger.status == 'completed':
        logger.warning(f"⚠️ [LOCK] Trigger {trigger_id} já consta como COMPLETADO. Pulando.")
        return
    
    # Se for Single, o status esperado é 'queued' ou algo que não seja 'processing'/'completed'
    if trigger.status == 'processing' and not trigger.is_bulk:
         # Se já está como processing e somos um Trigger individual, só prosseguimos se:
         # 1. For um "resgate" de job travado (mais de 30 minutos sem atualização)
         # 2. OU se for um disparo MUITO recente (menos de 60s), indicando que o scheduler/worker acabou de marcá-lo.
         ref_dt = trigger.updated_at or trigger.created_at
         if ref_dt and ref_dt.tzinfo is None:
             ref_dt = ref_dt.replace(tzinfo=timezone.utc)
         
         time_diff = (datetime.now(timezone.utc) - ref_dt).total_seconds() if ref_dt else 9999
         
         # Se o tempo for entre 60s e 30 min, aí sim consideramos que já tem alguém rodando de verdade
         if 60 < time_diff < 1800:
             logger.warning(f"⚠️ [LOCK] Trigger {trigger_id} já está em PROCESSAMENTO ATIVO há {time_diff}s (Status: {trigger.status}). ABORTANDO para evitar duplicidade.")
             return
         
         if time_diff >= 1800:
             logger.info(f"🔄 [RECOVERY] Resgatando Trigger {trigger_id} que parece estar travado há {time_diff}s.")
         else:
             logger.info(f"✅ [LOCK] Trigger {trigger_id} em status 'processing' recente ({time_diff}s). Permitindo prosseguir.")

    # Marcar como em processamento ANTES de começar de fato
    if trigger.status != 'processing':
        trigger.status = 'processing'
        trigger.updated_at = datetime.now(timezone.utc)
        db.commit()
        # Re-buscar com o lock após o commit se necessário, mas aqui o lock liberou. 
        # Como marcamos como 'processing', o próximo que tentar o skip_locked vai pular.
        trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id).first()

    # DETECT FORMAT: Legacy List vs New Graph
    steps_data = funnel.steps
    is_legacy = isinstance(steps_data, list)
    
    # --- CONTACT RESTRICTION (ALLOWED / BLOCKED) ---
    clean_phone = ''.join(filter(str.isdigit, contact_phone))
    
    # 0. Global Blocked List Check (Exclusão Global)
    if not skip_block_check:
        from models import BlockedContact
        from sqlalchemy import or_
        
        # Busca por número exato ou sufixo (últimos 8 dígitos) para maior segurança
        suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone
        is_globally_blocked = db.query(BlockedContact).filter(
            BlockedContact.client_id == trigger.client_id,
            or_(
                BlockedContact.phone == clean_phone,
                BlockedContact.phone == f"+{clean_phone}",
                BlockedContact.phone.like(f"%{suffix}")
            )
        ).first()
        
        if is_globally_blocked:
            logger.warning(f"🚫 [GUARD] Forçando ABORTO: Contato {contact_phone} está na lista GLOBAL de bloqueados.")
            if not trigger.is_bulk:
                trigger.status = 'failed'
                trigger.failure_reason = "Contato bloqueado globalmente (Lista de Exclusão)."
            db.commit()
            return
    else:
        logger.info(f"⏭️ Skipping Global Blocked check for {contact_phone} (skip_block_check=True)")

    # 1. Funnel-Specific Blocked List Check
    blocked_raw_list = funnel.blocked_phones or []
    if isinstance(blocked_raw_list, str):
        blocked_raw_list = [p.strip() for p in blocked_raw_list.split(",") if p.strip()]
        
    for p in blocked_raw_list:
        if not p: continue
        # Normaliza o número da lista (apenas dígitos)
        p_clean = "".join(filter(str.isdigit, str(p)))
        if not p_clean: continue
        
        # Comparação Robusta: Baseada em Sufixo (últimos 8 dígitos) para contornar nono dígito
        is_match = False
        if len(p_clean) >= 8 and len(clean_phone) >= 8:
            is_match = (p_clean[-8:] == clean_phone[-8:])
        else:
            is_match = clean_phone.endswith(p_clean)
            
        if is_match:
            logger.warning(f"🚫 [GUARD] Forçando ABORTO: Contato {contact_phone} bloqueado nas configurações deste FUNIL.")
            if not trigger.is_bulk:
                trigger.status = 'failed'
                trigger.failure_reason = "Contato bloqueado nas configurações deste funil."
            db.commit()
            return

    # 2. Allowed List Check
    allowed_raw_list = funnel.allowed_phones or []
    if isinstance(allowed_raw_list, str):
        allowed_raw_list = [p.strip() for p in allowed_raw_list.split(",") if p.strip()]
        
    if funnel.allowed_phone: # Legacy support
        allowed_raw_list.append(funnel.allowed_phone)
        
    if allowed_raw_list:
        is_allowed = False
        for p in allowed_raw_list:
            if not p: continue
            p_clean = "".join(filter(str.isdigit, str(p)))
            if not p_clean: continue
            
            # Comparação Robusta (Sufixo 8 dígitos)
            if len(p_clean) >= 8 and len(clean_phone) >= 8:
                if p_clean[-8:] == clean_phone[-8:]:
                    is_allowed = True
                    break
            elif clean_phone.endswith(p_clean):
                is_allowed = True
                break
        
        if not is_allowed:
            logger.warning(f"🚫 [GUARD] Forçando ABORTO: Contato {contact_phone} NÃO está na lista permitida deste funil.")
            if not trigger.is_bulk:
                trigger.status = 'failed'
                trigger.failure_reason = "Contato não está na lista permitida deste funil."
            db.commit()
            return

    try:
        if is_legacy:
            # ---------------------------------------------------------
            # LEGACY LINEAR EXECUTION (Keep for safety/transition)
            # ---------------------------------------------------------
            logger.info("📺 Executing LEGACY (Linear) Funnel")
            print(f"📺 [ENGINE] Legacy Funnel Execution Started for Trigger {trigger_id}")
            await execute_legacy_funnel(trigger, steps_data, chatwoot, conversation_id, contact_phone, db, apply_vars)
        else:
            # ---------------------------------------------------------
            # NEW GRAPH EXECUTION
            # ---------------------------------------------------------
            logger.info("🕸️ Executing GRAPH Funnel")
            print(f"🕸️ [ENGINE] Graph Funnel Execution Started for Trigger {trigger_id}")
            logger.info(f"🚀 [ENGINE] Iniciando execução do Grafo (execute_graph_funnel) para Trigger {trigger.id}")
            await execute_graph_funnel(trigger, steps_data, chatwoot, conversation_id, contact_phone, db, apply_vars, chatwoot_contact_id=chatwoot_contact_id)
            
        # Finish — only mark as completed if inner execution didn't suspend (queued for delay) or fail
        db.refresh(trigger)
        if trigger.status not in ('queued', 'failed', 'cancelled'):
            trigger.status = 'completed'
            db.commit()
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ CRITICAL ERROR in funnel execution for trigger {trigger_id}: {str(e)}")
        
        # Log to execution history so user can see it in UI
        try:
            log_node_execution(db, trigger, "CRITICAL_ERROR", "failed", f"❌ ERRO CRÍTICO: {str(e)}")
        except:
            pass

        # Em uma nova transação (ou após o rollback), marcar como falha se não for bulk
        try:
            if not getattr(trigger, 'is_bulk', False):
                trigger.status = 'failed'
                trigger.failure_reason = str(e)
            db.commit()
        except:
            db.rollback()
        raise e




async def execute_graph_funnel(trigger, graph_data, chatwoot, conversation_id, contact_phone, db, apply_vars, chatwoot_contact_id=None):
    """
    Executes the funnel based on Nodes and Edges.
    graph_data: { "nodes": [...], "edges": [...] }
    """
    # 1. SCOPE SAFETY: Explicitly initialize current_node_id at function entry
    current_node_id = trigger.current_node_id
    nodes = {str(n["id"]): n for n in graph_data.get("nodes", [])}
    edges = graph_data.get("edges", [])
    
    # NEW: Track if we are at the very beginning of the trigger execution (Passo 1 instantâneo)
    is_interactive_start = getattr(trigger, 'is_interaction', False) and (current_node_id is None)
    nodes_executed_this_turn = 0
    
    # NEW: Log "delay concluido" if resuming from a delay node
    if current_node_id and trigger.status in ['queued', 'processing']:
        incoming_edge = next((e for e in edges if str(e.get("target")) == str(current_node_id)), None)
        if incoming_edge:
            source_id = incoming_edge.get("source")
            source_node = nodes.get(str(source_id))
            if source_node and source_node.get("type") in ["delay", "delayNode"]:
                log_node_execution(db, trigger, source_id, "completed", "delay concluido")
    
    if not current_node_id:
        # New execution: find "start" node
        start_node = next((n for n in nodes.values() if n.get("type") == "start"), None)
        if not start_node:
             # Fallback 1: Try to find node with data.isStart = True
             start_node = next((n for n in nodes.values() if n.get("data", {}).get("isStart") is True), None)
        if not start_node:
             # Fallback 2: Try to find node with ID "start"
             start_node = nodes.get("start")
        
        if not start_node:
            logger.error("❌ No START node found in graph!")
            trigger.status = 'failed'
            db.commit()
            return
        
        current_node_id = start_node["id"]
        logger.info(f"✨ [ENGINE] Start Node identificado: {current_node_id} (Type: {start_node.get('type')})")
        # Skip executing the 'start' node logic itself, just move to next
        # Actually start node usually has no logic, just an output edge.
    
    # Execution Loop
    while current_node_id:
        node = nodes.get(current_node_id)
        if not node:
            logger.error(f"❌ Node {current_node_id} not found in graph.")
            break
            
        node_type = node.get("type")
        data = node.get("data", {})
        
        logger.info(f"📍 PROCESSING NODE: Type={node_type} ID={current_node_id}")
        print(f"📍 [ENGINE] Processing Node: {node_type} ({current_node_id}) for {contact_phone}")
        
        # Log node start with friendly name
        display_type = NODE_TYPE_LABELS.get(node_type, node_type.upper())
        log_node_execution(db, trigger, current_node_id, "started", f"Executando nó tipo: {display_type}")
        
        # Default next handle (single output)
        source_handle = None 
        
        # --- NODE LOGIC HANDLERS ---
        
        if node_type == "start":
            pass # Just move on
            
        elif node_type in ["message", "messageNode"]:
            # ── HORÁRIO COMERCIAL ─────────────────────────────────────────────
            if data.get("onlyBusinessHours"):
                if not is_within_business_hours(funnel):
                    next_run = get_next_business_hour_start(funnel)
                    logger.info(f"⏰ [BUSINESS HOURS] Nó {current_node_id} fora do horário comercial. Repropgramando trigger para {next_run}")
                    trigger.status = 'queued'
                    trigger.scheduled_time = next_run
                    trigger.current_node_id = current_node_id
                    db.commit()
                    return # Suspende execução do funil
            # ─────────────────────────────────────────────────────────────────
            content = data.get("content", "")
            variations = data.get("variations", [])
            logger.info(f"📩 Sending Message Node {current_node_id}. Content: '{content}' | publishExternalEvent={data.get('publishExternalEvent')} | conv={conversation_id} | account={trigger.chatwoot_account_id}")
            
            # Pool de opções (principal + variações não vazias)
            options = [content] if content else []
            options.extend([v for v in variations if v.strip()])
            
            if options:
                # Early processing log for UI feedback
                log_node_execution(db, trigger, current_node_id, "processing", "📩 Enviando mensagem...")
                final_content = apply_vars(random.choice(options))
                # Early log of content for UI (includes conversation/account IDs for monitor display)
                log_node_execution(db, trigger, current_node_id, "started", None, {
                    "content": final_content,
                    "conversation_id": str(conversation_id) if conversation_id else None,
                    "account_id": str(trigger.chatwoot_account_id) if trigger.chatwoot_account_id else None,
                })
                db.refresh(trigger) # Immediate refresh to ensure frontend sees it

                # Removido daqui para ser executado após o envio e delay
                # await publish_node_external_event(db, trigger, data, final_content, contact_phone, node_id=current_node_id)
                
                # -----------------------------------------------------------------
                # Smart 24h Window Redirection & Enforcement
                # -----------------------------------------------------------------
                msg_id = None
                if conversation_id and int(conversation_id) > 0:
                    resolved_convo_id = await get_best_conversation(trigger.client_id, contact_phone, conversation_id, db, chatwoot)
                    if resolved_convo_id != conversation_id:
                        logger.info(f"   🔄 [ENGINE] Switching conversation from {conversation_id} to {resolved_convo_id} due to 24h window")
                        conversation_id = resolved_convo_id
                        trigger.conversation_id = resolved_convo_id
                        db.commit()

                    # MANDATORY VERIFICATION: If window is still strictly closed, we MUST NOT send session messages
                    is_open = await is_window_open_strict(trigger.client_id, contact_phone, conversation_id, db, chatwoot)
                    if not is_open:
                        logger.error(f"🔒 [ENGINE] Aborting message node {current_node_id}: 24h window is CLOSED for {contact_phone}")
                        trigger.status = 'failed'
                        trigger.failure_reason = "Janela de 24h fechada para envio de mensagem de sessão (Texto)."
                        db.commit()
                        return # Stop funnel execution

                    # Try Chatwoot first if conversation exists
                    try:
                        # LOG DE DISPARO (Início)
                        now_br = datetime.now(BRAZIL_TZ).strftime("%d/%m/%Y %H:%M:%S")
                        print(f"🚀 [DISPARO] [Trigger {trigger.id}] [{now_br}] [{contact_phone}] Tipo: LIVRE (Chatwoot) | Convo: {conversation_id}")
                        
                        res = await chatwoot.send_message(conversation_id, final_content)

                        if res and isinstance(res, dict) and res.get("id"):
                            # 1. Identificar ID da mensagem
                            source_id = res.get("source_id", "")
                            chatwoot_id = str(res.get("id", ""))
                            msg_identifier = source_id if source_id else chatwoot_id
                            
                            if source_id:
                                logger.info(f"   ✅ [DISPARO SUCESSO] Trigger {trigger.id} | wamid={source_id}")
                            else:
                                logger.info(f"   ✅ [DISPARO SUCESSO] Trigger {trigger.id} | chatwoot_id={chatwoot_id}")

                            # 2. ⏳ AGUARDAR CONFIRMAÇÃO REAL (Delivered)
                            if not trigger.is_bulk:
                                log_node_execution(db, trigger, current_node_id, "processing", "Aguardando confirmação do WhatsApp...")
                                state, detail = await wait_for_delivery_sync(db, msg_identifier, trigger, current_node_id)
                                
                                if state == "suspended":
                                    return # STOP WORKER (REACTIVE MODE)
                                    
                                if state == "failed":
                                    trigger.status = 'failed'
                                    trigger.failure_reason = detail
                                    db.commit()
                                    return
                                
                                # 3. ⏳ DELAY DE ESTABILIZAÇÃO (10s) - Skip if interaction
                                if not getattr(trigger, 'is_interaction', False):
                                    target_time = (datetime.now(timezone.utc) + timedelta(seconds=10)).isoformat()
                                    log_node_execution(db, trigger, "STABILIZATION", "processing", f"{detail}. Estabilizando...", {"target_time": target_time})
                                    await asyncio.sleep(10)
                                    log_node_execution(db, trigger, "STABILIZATION", "completed", "Estabilização concluída.")
                                else:
                                    logger.info(f"⚡ [INTERACTION] Skipping stabilization delay for trigger {trigger.id}")
                            else:
                                # BULK: Just mark as sent and continue fast
                                detail = "Enviado (Bulk)"
                        else:
                            # Se retornou erro ou resposta vazia, registramos mas NÃO tentamos fallback automático via Meta 
                            error_data = res.get("error") if isinstance(res, dict) else "Resposta inválida"
                            logger.error(f"❌ [DISPARO FALHA] Chatwoot retornou erro para Trigger {trigger.id}: {error_data}")
                            trigger.status = 'failed'
                            trigger.failure_reason = f"Chatwoot Error: {error_data}"
                            db.commit()
                            return
                    except Exception as cw_err:
                        logger.error(f"❌ [DISPARO ERRO] Exceção ao enviar via Chatwoot (Trigger {trigger.id}): {cw_err}")
                        trigger.status = 'failed'
                        trigger.failure_reason = f"Network Error: {cw_err}"
                        db.commit()
                        return
                    
                else:
                    # Envio Direto via Meta Oficial (Sem conversa no Chatwoot ainda)
                    now_br = datetime.now(BRAZIL_TZ).strftime("%d/%m/%Y %H:%M:%S")
                    print(f"🚀 [DISPARO] [Trigger {trigger.id}] [{now_br}] [{contact_phone}] Tipo: LIVRE (Meta Oficial Direto)")
                    
                    res = await chatwoot.send_text_official(contact_phone, final_content)

                    # ⏳ NOVO: Aguardar 10 segundos para processamento sequencial com Countdown - Skip if interaction
                    if not getattr(trigger, 'is_interaction', False):
                        target_time = (datetime.now(timezone.utc) + timedelta(seconds=10)).isoformat()
                        log_node_execution(db, trigger, "STABILIZATION", "processing", "Aguardando sincronia segura...", {"target_time": target_time})
                        await asyncio.sleep(10)
                        log_node_execution(db, trigger, "STABILIZATION", "completed", "Estabilização concluída.")
                    else:
                        logger.info(f"⚡ [INTERACTION] Skipping secure sync delay for trigger {trigger.id}")
                    if res and not res.get("error"):
                        msg_id = res.get("messages", [{}])[0].get("id", "direct_meta")
                        logger.info(f"   ✅ [DISPARO SUCESSO] Trigger {trigger.id} (Via Meta Direto)")
                    else:
                        error_detail = res.get('error') if res else 'Unknown error'
                        if isinstance(error_detail, dict):
                            error_detail = error_detail.get('message', str(error_detail))
                        
                        logger.error(f"❌ [DISPARO FALHA] Meta API retornou erro para Trigger {trigger.id}: {error_detail}")
                        trigger.status = 'failed'
                        trigger.failure_reason = f"Meta API: {error_detail}"
                        db.commit()
                        return # Stop execution on failure

                # NEW: Record and handle private note post-delivery
                if msg_id:
                    # Normalize ID: Always save without 'wamid.' prefix for consistency
                    msg_id = str(msg_id).replace("wamid.", "")
                    new_ms = models.MessageStatus(
                        trigger_id=trigger.id,
                        message_id=msg_id,
                        phone_number=contact_phone,
                        status='sent',
                        message_type='FREE_MESSAGE',
                        content=final_content,
                        publish_external_event=data.get("publishExternalEvent", False)
                    )
                    db.add(new_ms)
                    # Increment total_sent for history tracking
                    trigger.total_sent = (trigger.total_sent or 0) + 1
                    db.commit()
                    logger.info(f"💾 [ENGINE] MessageStatus salvo para Trigger {trigger.id} (Msg: {msg_id})")


                # --- MEMORY SYNC & COMPLETION ---
                await publish_node_external_event(db, trigger, data, final_content, contact_phone, node_id=current_node_id)
                log_node_execution(db, trigger, current_node_id, "completed", "Mensagem enviada e sincronizada.", {"content": final_content})

            else:
                logger.warning(f"⚠️ Message Node {current_node_id} has empty content.")
            
        elif node_type in ["audioNode"]:
            # ── HORÁRIO COMERCIAL ─────────────────────────────────────────────
            if data.get("onlyBusinessHours"):
                if not is_within_business_hours(funnel):
                    next_run = get_next_business_hour_start(funnel)
                    logger.info(f"⏰ [BUSINESS HOURS] Áudio {current_node_id} fora do horário comercial. Reprogramando para {next_run}")
                    trigger.status = 'queued'
                    trigger.scheduled_time = next_run
                    trigger.current_node_id = current_node_id
                    db.commit()
                    return
            # ─────────────────────────────────────────────────────────────────
            file_url = data.get("mediaUrl") or data.get("url")
            if file_url:
                # Early processing log for UI feedback
                log_node_execution(db, trigger, current_node_id, "processing", "🎵 Preparando áudio...")
                # Early log of content for UI
                log_node_execution(db, trigger, current_node_id, "started", None, {
                    "media_type": "audio",
                    "media_url": file_url,
                    "media_file": data.get("fileName", "Áudio")
                })
                
                # Removido daqui
                # await publish_node_external_event(db, trigger, data, f"[Áudio: {file_url}]", contact_phone, node_id=current_node_id, event_type="funnel_audio_sent")
                
                # -----------------------------------------------------------------
                # Smart 24h Window Redirection & Enforcement
                # -----------------------------------------------------------------
                msg_id = None
                if conversation_id and int(conversation_id) > 0:
                    resolved_convo_id = await get_best_conversation(trigger.client_id, contact_phone, conversation_id, db, chatwoot)
                    if resolved_convo_id != conversation_id:
                        logger.info(f"   🔄 [ENGINE] Switching conversation from {conversation_id} to {resolved_convo_id} due to 24h window")
                        conversation_id = resolved_convo_id
                        trigger.conversation_id = resolved_convo_id
                        db.commit()

                    # MANDATORY VERIFICATION: If window is still strictly closed, we MUST NOT send session messages
                    is_open = await is_window_open_strict(trigger.client_id, contact_phone, conversation_id, db, chatwoot)
                    if not is_open:
                        logger.error(f"🔒 [ENGINE] Aborting audio node {current_node_id}: 24h window is CLOSED for {contact_phone}")
                        trigger.status = 'failed'
                        trigger.failure_reason = "Janela de 24h fechada para envio de mensagem de sessão (Áudio)."
                        db.commit()
                        return # Stop funnel execution

                    # Try Chatwoot first
                    try:
                        now_br = datetime.now(BRAZIL_TZ).strftime("%d/%m/%Y %H:%M:%S")
                        print(f"🚀 [DISPARO] [Trigger {trigger.id}] [{now_br}] [{contact_phone}] Tipo: ÁUDIO (Chatwoot)")
                        
                        res = await chatwoot.send_attachment(conversation_id, file_url, "audio")

                        if res and isinstance(res, dict) and res.get("id"):
                            # 1. Identificar ID da mensagem
                            source_id = res.get("source_id", "")
                            chatwoot_id = str(res.get("id", ""))
                            msg_identifier = source_id if source_id else chatwoot_id
                            
                            logger.info(f"   ✅ [DISPARO SUCESSO] Trigger {trigger.id} (Áudio) | id={msg_identifier}")

                            # 2. ⏳ AGUARDAR CONFIRMAÇÃO REAL (Delivered)
                            if not trigger.is_bulk:
                                log_node_execution(db, trigger, current_node_id, "processing", "Aguardando confirmação do WhatsApp...")
                                state, detail = await wait_for_delivery_sync(db, msg_identifier, trigger, current_node_id)
                                
                                if state == "suspended":
                                    return
                                    
                                if state == "failed":
                                    trigger.status = 'failed'
                                    trigger.failure_reason = detail
                                    db.commit()
                                    return
                                
                                # 3. ⏳ DELAY DE ESTABILIZAÇÃO (10s) - Skip if interaction
                                if not getattr(trigger, 'is_interaction', False):
                                    target_time = (datetime.now(timezone.utc) + timedelta(seconds=10)).isoformat()
                                    log_node_execution(db, trigger, current_node_id, "processing", f"{detail}. Estabilizando...", {"target_time": target_time})
                                    await asyncio.sleep(10)
                                else:
                                    logger.info(f"⚡ [INTERACTION] Skipping audio stabilization delay for trigger {trigger.id}")
                                msg_id = msg_identifier
                            else:
                                # BULK: Skip wait and delay
                                detail = "Enviado (Bulk)"
                                msg_id = msg_identifier
                        else:
                            error_data = res.get("error") if isinstance(res, dict) else "Erro desconhecido"
                            logger.error(f"❌ [DISPARO FALHA] Chatwoot Áudio retornou erro (Trigger {trigger.id}): {error_data}")
                            trigger.status = 'failed'
                            trigger.failure_reason = f"Chatwoot Audio Error: {error_data}"
                            db.commit()
                            return
                    except Exception as cw_err:
                        logger.error(f"❌ [DISPARO ERRO] Exceção ao enviar Áudio (Trigger {trigger.id}): {cw_err}")
                        trigger.status = 'failed'
                        trigger.failure_reason = f"Network Audio Error: {cw_err}"
                        db.commit()
                        return
                else:
                    # Direto via Meta
                    now_br = datetime.now(BRAZIL_TZ).strftime("%d/%m/%Y %H:%M:%S")
                    print(f"🚀 [DISPARO] [Trigger {trigger.id}] [{now_br}] [{contact_phone}] Tipo: ÁUDIO (Meta Direto)")
                    
                    res = await chatwoot.send_audio_official(contact_phone, file_url)

                    # ⏳ NOVO: Aguardar 10 segundos para processamento sequencial com Countdown - Skip if interaction
                    if not getattr(trigger, 'is_interaction', False):
                        target_time = (datetime.now(timezone.utc) + timedelta(seconds=10)).isoformat()
                        log_node_execution(db, trigger, current_node_id, "processing", "Aguardando entrega...", {"target_time": target_time})
                        await asyncio.sleep(10)
                    else:
                        logger.info(f"⚡ [INTERACTION] Skipping audio secure sync delay (Meta) for trigger {trigger.id}")
                    if res and not res.get("error"):
                        msg_id = res.get("messages", [{}])[0].get("id", "direct_meta")
                        logger.info(f"   ✅ [DISPARO SUCESSO] Trigger {trigger.id} (Áudio via Meta)")
                    else:
                        error_detail = res.get('error') if res else 'Unknown'
                        if isinstance(error_detail, dict):
                            error_detail = error_detail.get('message', str(error_detail))
                            
                        logger.error(f"❌ [DISPARO FALHA] Meta Áudio retornou erro (Trigger {trigger.id}): {error_detail}")
                        trigger.status = 'failed'
                        trigger.failure_reason = f"Meta API (Audio): {error_detail}"
                        db.commit()
                        return
                
                # NEW: Record and handle private note post-delivery
                if msg_id:
                    wamid = msg_id
                    wamid = wamid.replace("wamid.", "")
                    new_ms = models.MessageStatus(
                        trigger_id=trigger.id,
                        message_id=wamid,
                        phone_number=contact_phone,
                        status='sent',
                        message_type='FREE_MESSAGE',
                        content=f"[Áudio: {file_url}]",
                        publish_external_event=data.get("publishExternalEvent", False)
                    )
                    if data.get("sendPrivateNote") and data.get("privateNoteContent"):
                        new_ms.pending_private_note = apply_vars(data.get("privateNoteContent"))
                        logger.info(f"   ⏳ Private note stored for audio {wamid}, waiting for delivery.")
                    db.add(new_ms)
                    db.commit()


                # --- MEMORY SYNC & COMPLETION ---
                await publish_node_external_event(db, trigger, data, f"[Áudio: {file_url}]", contact_phone, node_id=current_node_id, event_type="funnel_audio_sent")
                log_node_execution(db, trigger, current_node_id, "completed", "Áudio enviado e sincronizado.", {
                    "media_type": "audio",
                    "media_url": file_url,
                    "media_file": data.get("fileName", "Áudio")
                })
            else:
                logger.warning(f"⚠️ AudioNode {current_node_id} has no mediaUrl. Skipping.")
                 
        elif node_type in ["media", "mediaNode"]:
            # Early processing log
            log_node_execution(db, trigger, current_node_id, "processing", "📁 Processando Mídia...")
            
            # Handle Image/Video/PDF/Audio
            # ── HORÁRIO COMERCIAL ─────────────────────────────────────────────
            if data.get("onlyBusinessHours"):
                if not is_within_business_hours(funnel):
                    next_run = get_next_business_hour_start(funnel)
                    logger.info(f"⏰ [BUSINESS HOURS] Mídia {current_node_id} fora do horário comercial. Reprogramando para {next_run}")
                    trigger.status = 'queued'
                    trigger.scheduled_time = next_run
                    trigger.current_node_id = current_node_id
                    db.commit()
                    return
            # ─────────────────────────────────────────────────────────────────
            file_url = data.get("mediaUrl") or data.get("url")
            media_type = data.get("mediaType", "image") # image, video, document, audio
            caption = data.get("caption", "")
            
            if file_url:
                caption_processed = apply_vars(caption)
                # Early log of content for UI
                log_node_execution(db, trigger, current_node_id, "started", None, {
                    "media_type": media_type,
                    "media_url": file_url,
                    "media_file": data.get("fileName", "Mídia"),
                    "caption": caption_processed
                })
                
                # Removido daqui
                # await publish_node_external_event(db, trigger, data, f"[{media_type.capitalize()}: {file_url}] {caption_processed if caption_processed else ''}", contact_phone, node_id=current_node_id, event_type=f"funnel_{media_type}_sent")
                
                # -----------------------------------------------------------------
                # Redirecionamento Inteligente (Janela 24h)
                # -----------------------------------------------------------------
                msg_id = None
                if conversation_id and int(conversation_id) > 0:
                    # BYPASS: Se temos IDs diretos de uma interação verificada, confiamos no conversation_id fornecido
                    if chatwoot_contact_id and conversation_id and int(conversation_id) > 0:
                        logger.info(f"   🎯 [ENGINE] Usando ID DIRETO do webhook: {conversation_id}. Pulando re-resolução.")
                        resolved_convo_id = conversation_id
                    else:
                        resolved_convo_id = await get_best_conversation(trigger.client_id, contact_phone, conversation_id, db, chatwoot)

                    if resolved_convo_id != conversation_id:
                        logger.info(f"   🔄 [ENGINE] Trocando conversa de {conversation_id} para {resolved_convo_id} devido à janela 24h")
                        conversation_id = resolved_convo_id
                        trigger.conversation_id = resolved_convo_id
                        db.commit()

                    # Fallback Logic: Try Meta Direct if Chatwoot is problematic
                    try:
                        # LOG DE DISPARO
                        now_br = datetime.now(BRAZIL_TZ).strftime("%d/%m/%Y %H:%M:%S")
                        print(f"🚀 [DISPARO] [Trigger {trigger.id}] [{now_br}] [{contact_phone}] Tipo: MÍDIA ({media_type}) (Chatwoot)")
                        
                        res = await chatwoot.send_attachment(conversation_id, file_url, media_type, caption=caption_processed)

                        if res and isinstance(res, dict) and res.get("id"):
                            # 1. Identificar ID da mensagem
                            source_id = res.get("source_id", "")
                            chatwoot_id = str(res.get("id", ""))
                            msg_identifier = source_id if source_id else chatwoot_id
                            
                            logger.info(f"   ✅ [DISPARO SUCESSO] Trigger {trigger.id} (Mídia {media_type}) | id={msg_identifier}")

                            # 2. ⏳ AGUARDAR CONFIRMAÇÃO REAL (Delivered)
                            if not trigger.is_bulk:
                                log_node_execution(db, trigger, current_node_id, "processing", "Aguardando confirmação do WhatsApp...")
                                state, detail = await wait_for_delivery_sync(db, msg_identifier, trigger, current_node_id)
                                
                                if state == "suspended":
                                    return
                                    
                                if state == "failed":
                                    trigger.status = 'failed'
                                    trigger.failure_reason = detail
                                    db.commit()
                                    return
                                
                                # 3. ⏳ DELAY DE ESTABILIZAÇÃO (10s) - Skip if interaction
                                if not getattr(trigger, 'is_interaction', False):
                                    target_time = (datetime.now(timezone.utc) + timedelta(seconds=10)).isoformat()
                                    log_node_execution(db, trigger, current_node_id, "processing", f"{detail}. Estabilizando...", {"target_time": target_time})
                                    await asyncio.sleep(10)
                                else:
                                    logger.info(f"⚡ [INTERACTION] Skipping media stabilization delay for trigger {trigger.id}")
                                msg_id = msg_identifier
                            else:
                                # BULK: Fast track
                                detail = "Enviado (Bulk)"
                                msg_id = msg_identifier
                        else:
                            error_data = res.get("error") if isinstance(res, dict) else "Erro de resposta"
                            logger.error(f"❌ [DISPARO FALHA] Chatwoot Mídia retornou erro (Trigger {trigger.id}): {error_data}")
                            trigger.status = 'failed'
                            trigger.failure_reason = f"Chatwoot Media Error: {error_data}"
                            db.commit()
                            return
                    except Exception as cw_err:
                        logger.error(f"❌ [DISPARO ERRO] Exceção ao enviar Mídia (Trigger {trigger.id}): {cw_err}")
                        trigger.status = 'failed'
                        trigger.failure_reason = f"Network Media Error: {cw_err}"
                        db.commit()
                        return
                else:
                    # Direto via Meta
                    now_br = datetime.now(BRAZIL_TZ).strftime("%d/%m/%Y %H:%M:%S")
                    print(f"🚀 [DISPARO] [Trigger {trigger.id}] [{now_br}] [{contact_phone}] Tipo: MÍDIA ({media_type}) (Meta Direto)")
                    
                    if media_type == "image":
                        res = await chatwoot.send_image_official(contact_phone, file_url, caption=caption_processed)

                        if res and not res.get("error"):
                            # 1. Identificar ID
                            raw_id = res.get("messages", [{}])[0].get("id", "direct_meta")
                            msg_identifier = str(raw_id).replace("wamid.", "")
                            
                            logger.info(f"   ✅ [DISPARO SUCESSO] Trigger {trigger.id} (Mídia {media_type} via Meta) | id={msg_identifier}")

                            # 2. ⏳ AGUARDAR CONFIRMAÇÃO REAL (Delivered)
                            if not trigger.is_bulk:
                                log_node_execution(db, trigger, current_node_id, "processing", "Aguardando confirmação do WhatsApp...")
                                state, detail = await wait_for_delivery_sync(db, msg_identifier, trigger, current_node_id)
                                
                                if state == "suspended":
                                    return
                                    
                                if state == "failed":
                                    trigger.status = 'failed'
                                    trigger.failure_reason = detail
                                    db.commit()
                                    return
                                
                                # 3. ⏳ DELAY DE ESTABILIZAÇÃO (10s) - Skip if interaction
                                if not getattr(trigger, 'is_interaction', False):
                                    target_time = (datetime.now(timezone.utc) + timedelta(seconds=10)).isoformat()
                                    log_node_execution(db, trigger, current_node_id, "processing", f"{detail}. Estabilizando...", {"target_time": target_time})
                                    await asyncio.sleep(10)
                                else:
                                    logger.info(f"⚡ [INTERACTION] Skipping media stabilization delay for trigger {trigger.id}")
                                msg_id = msg_identifier
                            else:
                                # BULK
                                detail = "Enviado (Bulk)"
                                msg_id = msg_identifier
                        else:
                            error_detail = res.get('error') if res else 'Unknown'
                            if isinstance(error_detail, dict):
                                error_detail = error_detail.get('message', str(error_detail))
                                
                            logger.error(f"❌ [DISPARO FALHA] Meta Mídia retornou erro (Trigger {trigger.id}): {error_detail}")
                            trigger.status = 'failed'
                            trigger.failure_reason = f"Meta API (Media): {error_detail}"
                            db.commit()
                            return
                    else:
                        logger.warning(f"⚠️ [ENGINE] Apenas Imagens são suportadas no envio oficial direto por enquanto.")
                
                # NEW: Record and handle private note post-delivery
                if msg_id:
                    # Normalize ID: Always save without 'wamid.' prefix for consistency
                    msg_id = str(msg_id).replace("wamid.", "")
                    new_ms = models.MessageStatus(
                        trigger_id=trigger.id,
                        message_id=msg_id,
                        phone_number=contact_phone,
                        status='sent',
                        message_type='FREE_MESSAGE',
                        content=f"[{media_type.capitalize()}: {file_url}]",
                        publish_external_event=data.get("publishExternalEvent", False)
                    )
                    db.add(new_ms)
                    db.commit()


                # --- MEMORY SYNC & COMPLETION ---
                await publish_node_external_event(db, trigger, data, f"[{media_type.capitalize()}: {file_url}] {caption_processed if caption_processed else ''}", contact_phone, node_id=current_node_id, event_type=f"funnel_{media_type}_sent")
                log_node_execution(db, trigger, current_node_id, "completed", "Mídia enviada e sincronizada.", {
                    "media_type": media_type,
                    "media_url": file_url,
                    "media_file": data.get("fileName", "Mídia"),
                    "caption": caption_processed
                })
            else:
                logger.warning(f"⚠️ Media Node {current_node_id} has no mediaUrl. Skipping.")


        elif node_type in ["update_contact", "updateContactNode"]:
             # FEATURE: Update Contact Name in Chatwoot
             name_type = data.get("nameType", "fixed") # fixed, official
             new_name = data.get("newName", "")
             
             if name_type == "official":
                 # Use global contact name if available
                 new_name = trigger.contact_name or "Cliente WhatsApp"
                 logger.info(f"👤 Updating contact name to Official Name: {new_name}")
             else:
                 new_name = apply_vars(new_name)
                 logger.info(f"👤 Updating contact name to FIXED: {new_name}")

             if new_name:
                 # Search contact to get ID
                 clean_phone = ''.join(filter(str.isdigit, contact_phone))
                 contact_res = await chatwoot.search_contact(clean_phone)
                 contact_id = None
                 if contact_res and contact_res.get("payload"):
                     contact_id = contact_res["payload"][0]["id"]
                 
                 if contact_id:
                     await chatwoot.update_contact(contact_id, {"name": new_name})
                     logger.info(f"   ✅ Contact {contact_id} updated to '{new_name}'")
                 else:
                     logger.warning(f"⚠️ Could not find contact {contact_phone} to update name.")

        elif node_type in ["chatwoot_label", "labelNode"]:
             label = data.get("label")
             
             if label:
                 logger.info(f"🏷️ Adding Chatwoot Label: {label}")
                 
                 # 1. Add Label to Conversation (Visible in the Chatwoot interface / sidebar)
                 if conversation_id and int(conversation_id) > 0:
                     logger.info(f"   🔗 Adding Label to Conversation {conversation_id}...")
                     await chatwoot.add_label_to_conversation(conversation_id, label)

                 # 2. Add Label to Contact (For CRM / CRM Filtering)
                 # Re-utilizamos a lógica robusta de busca do ensure_conversation
                 clean_phone = ''.join(filter(str.isdigit, contact_phone))
                 search_queries = [clean_phone, f"+{clean_phone}"]
                 if len(clean_phone) >= 8:
                     search_queries.append(clean_phone[-8:])
                 
                 contact_id = None
                 for q in search_queries:
                     contact_res = await chatwoot.search_contact(q)
                     if contact_res and contact_res.get("payload"):
                         contact_id = contact_res["payload"][0]["id"]
                         break
                 
                 if contact_id:
                     logger.info(f"   👤 Adding Label to Contact ID {contact_id}...")
                     await chatwoot.add_label_to_contact(contact_id, label)
                 else:
                     logger.warning(f"⚠️ Could not find contact {contact_phone} in Chatwoot to add label '{label}' on profile.")
             else:
                 logger.warning(f"⚠️ Label Node {current_node_id} has no label defined.")
                      
        elif node_type in ["delay", "delayNode"]:
            use_random = data.get("useRandom", False)
            # Default to 10 if time/minTime is missing or 0
            raw_time = data.get("time") or data.get("minTime") or 10
            min_time = int(raw_time)
            max_time = int(data.get("maxTime") or min_time)
            
            # Escolher tempo aleatório apenas se solicitado e houver range
            if use_random and max_time > min_time:
                delay_sec = random.randint(min_time, max_time)
                logger.info(f"🎲 Smart Delay: Sorteado {delay_sec} unidades (Range: {min_time}-{max_time})")
            else:
                delay_sec = int(data.get("time") or min_time or 10)
            
            if data.get("unit") == "minutes": delay_sec *= 60
            elif data.get("unit") == "hours": delay_sec *= 3600
            elif data.get("unit") == "days": delay_sec *= 86400
            
            if delay_sec > 60:
                # Long delay: Schedule future execution
                resume_time = datetime.now(timezone.utc) + timedelta(seconds=delay_sec)
                
                # Determine Next Node ID BEFORE suspending
                # Delays usually have one output
                next_node_id = get_next_node(current_node_id, edges, None)
                
                if next_node_id:
                    trigger.status = 'queued'
                    trigger.scheduled_time = resume_time
                    trigger.current_node_id = next_node_id
                    db.commit()
                    logger.info(f"⏳ Long delay ({delay_sec}s). Suspending until {resume_time}")
                    # Log for live tracking
                    resume_time_br = resume_time.astimezone(BRAZIL_TZ)
                    log_node_execution(db, trigger, current_node_id, "waiting", f"Agendado para {resume_time_br.strftime('%H:%M:%S')}", {"target_time": resume_time.isoformat()})
                    return # STOP WORKER
                else:
                    logger.warning("Delay node has no output. Finishing.")
                    break
            else:
                # Short delay
                logger.info(f"⏱️ Short delay ({delay_sec}s)...")
                target_time = datetime.now(timezone.utc) + timedelta(seconds=delay_sec)
                log_node_execution(db, trigger, current_node_id, "waiting", f"Aguardando {delay_sec}s", {"target_time": target_time.isoformat()})
                await asyncio.sleep(delay_sec)
                log_node_execution(db, trigger, current_node_id, "completed", "delay concluido")

        elif node_type in ["condition", "conditionNode"]:
            condition_type = data.get("conditionType", "text")
            source_handle = 'no' # Default
            
            if condition_type == "tag":
                required_tag = normalize_text(data.get("tag", ""))
                logger.info(f"🤔 Evaluating Tags Condition. Required: '{required_tag}'")
                
                # Search contact to get ID
                clean_phone = ''.join(filter(str.isdigit, contact_phone))
                contact_res = await chatwoot.search_contact(clean_phone)
                contact_id = None
                if contact_res and contact_res.get("payload"):
                    contact_id = contact_res["payload"][0]["id"]
                
                if contact_id:
                    contact_labels = await chatwoot.get_contact_labels(contact_id)
                    normalized_contact_tags = [normalize_text(t) for t in contact_labels]
                    logger.info(f"   Contact Tags: {contact_labels} -> Normalized: {normalized_contact_tags}")
                    
                    if required_tag in normalized_contact_tags:
                        source_handle = 'yes'
                else:
                    logger.warning(f"⚠️ Contact {clean_phone} not found in Chatwoot.")

            elif condition_type == "datetime_range":
                tz = zoneinfo.ZoneInfo('America/Sao_Paulo')
                now_dt = datetime.now(tz)
                
                start_str = data.get("startDateTime")
                end_str = data.get("endDateTime")
                
                result = 'between'
                try:
                    if start_str and end_str:
                        start_dt = datetime.fromisoformat(start_str).replace(tzinfo=tz)
                        end_dt = datetime.fromisoformat(end_str).replace(tzinfo=tz)
                        
                        logger.info(f"🤔 Evaluating DateTime Range (BR). Now: {now_dt.strftime('%d/%m %H:%M')}, Range: {start_str} to {end_str}")
                        
                        if now_dt < start_dt: result = 'before'
                        elif now_dt > end_dt: result = 'after'
                        else: result = 'between'
                        
                        # --- ACTION LOGIC ---
                        action = data.get(f"{result}Action", "follow")
                        logger.info(f"   Result: {result.upper()}, Action: {action.upper()}")
                        
                        if action == "stop":
                            logger.info("   🛑 Action STOP: Finishing funnel for this user.")
                            break
                        
                        elif action == "wait":
                            # Wait until next boundary
                            wait_until = None
                            if result == "before": 
                                wait_until = start_dt
                                next_handle = "between"
                            elif result == "between": 
                                wait_until = end_dt
                                next_handle = "after"
                            
                            if wait_until:
                                next_node_id = get_next_node(current_node_id, graph_data.get("edges", []), next_handle)
                                if next_node_id:
                                    trigger.status = 'queued'
                                    trigger.scheduled_time = wait_until.astimezone(timezone.utc)
                                    trigger.current_node_id = next_node_id
                                    db.commit()




                                    logger.info(f"   ⏳ Action WAIT: Suspending funnel until {wait_until} -> Next: {next_node_id}")
                                    return # PAUSE WORKER
                                else:
                                    logger.warning(f"   ⚠️ Action WAIT selected but no node connected to path '{next_handle}'. Finishing.")
                                    break
                            else:
                                logger.info("   ⚠️ Action WAIT is not possible for 'After' state. Finishing.")
                                break
                        
                        else: # follow
                            source_handle = result
                    else:
                        logger.warning("⚠️ Missing start or end datetime for range condition.")
                except Exception as e:
                    logger.error(f"Error parsing datetime range: {e}")

            elif condition_type == "weekday":
                # Dia da semana em Brasília
                tz = zoneinfo.ZoneInfo('America/Sao_Paulo')
                now_dt = datetime.now(tz)
                # 0=Segunda, 6=Domingo
                current_day = str(now_dt.weekday()) 
                allowed_days = data.get("allowedDays", []) 
                
                day_names = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
                logger.info(f"🤔 Evaluating Weekday. Current (BR): {day_names[int(current_day)]}, Allowed: {allowed_days}")
                
                if current_day in allowed_days:
                    source_handle = 'yes'
            
            else:
                # Legado: Busca por texto (simples)
                condition_text = data.get("condition", "").lower()
                if not any(neg in condition_text for neg in ['não', 'nao', 'false', 'no', '0']):
                    source_handle = 'yes'
            
            logger.info(f"   -> Result: {source_handle.upper()}")
                
        elif node_type in ["randomizer", "randomizerNode"]:
            # A/B Testing logic
            # data: { "percentA": 50 } (implies B is remainder)
            percent_a = int(data.get("percentA", 50))
            roll = random.randint(1, 100)
            
            if roll <= percent_a:
                source_handle = "a" # Must match React Flow handle ID
                logger.info(f"🎲 Randomizer: Path A ({roll} <= {percent_a})")
            else:
                source_handle = "b"
                logger.info(f"🎲 Randomizer: Path B ({roll} > {percent_a})")
                
        elif node_type in ["link_funnel", "linkFunnelNode"]:
            # Trigger another funnel
            target_funnel_id = data.get("funnelId")
            if target_funnel_id:
                logger.info(f"🔗 Linking to Funnel ID {target_funnel_id}")
                
                new_trigger = models.ScheduledTrigger(
                    client_id=trigger.client_id,
                    funnel_id=target_funnel_id,
                    parent_id=trigger.id, # Link to parent for UI grouping
                    conversation_id=conversation_id,
                    contact_phone=contact_phone,
                    status='queued',
                    scheduled_time=datetime.now(timezone.utc),
                    is_bulk=False,
                    product_name="HIDDEN_CHILD", # Default name to help filtering
                    current_node_id=None # Start from beginning
                )
                db.add(new_trigger)
                db.commit()
                # Stop current funnel? User didn't specify, but usually "Link" implies handoff.
                # If we continue, we might have parallel funnels. For now, let's allow continue if there is an output edge.
            else:
                logger.warning("🔗 Link Funnel node missing funnelId")

        elif node_type in ["action", "actionNode"]:
             action_type = data.get("actionType") or data.get("action")
             logger.info(f"⚡ [ACTION] Executing Action Node {current_node_id}: {action_type}")
             
             # Implement specific actions
             if action_type == "join_group":
                 # Feature: Implement group joining logic if available
                 logger.info(f"👥 Action: Join Group requested for {contact_phone}")
                 log_node_execution(db, trigger, current_node_id, "completed", "Ação 'Entrar no Grupo' executada.")
             else:
                 logger.info(f"ℹ️ Generic Action '{action_type}' logged.")
                 log_node_execution(db, trigger, current_node_id, "completed", f"Ação {action_type} concluída.")

        elif node_type in ["template", "templateNode"]:
            # Early processing log
            log_node_execution(db, trigger, current_node_id, "processing", "📄 Processando Template...")
            
            template_name = data.get("templateName")
            language = data.get("language", "pt_BR")
            # components can be expanded later if needed
             # FIX: component variable safety
            components = data.get("components") or [] 
            
            # -----------------------------------------------------------------
            # 24h Window Check Feature
            # -----------------------------------------------------------------
            window_open = False
            check_window = data.get("check24hWindow", False)
            fallback_msg = data.get("fallbackMessage")
            fallback_buttons = data.get("fallbackButtons") # FIX: Defined missing variable
            fallback_sent = False

            if check_window:
                logger.info(f"🕒 Verificando Janela 24h para o Nó {current_node_id}...")
                
                # Redirecionamento Inteligente: Verifica se existe QUALQUER janela aberta para este contato
                # BYPASS: Se temos IDs diretos de uma interação verificada, confiamos no conversation_id fornecido
                if chatwoot_contact_id and conversation_id and int(conversation_id) > 0:
                    logger.info(f"   🎯 [ENGINE] Usando ID DIRETO do webhook: {conversation_id}. Pulando re-resolução.")
                    resolved_convo_id = conversation_id
                else:
                    # FIX: Adicionado 'await' e passado 'chatwoot' instance
                    resolved_convo_id = await get_best_conversation(trigger.client_id, contact_phone, conversation_id, db, chatwoot)

                if resolved_convo_id != conversation_id:
                     logger.info(f"   🔄 [ENGINE] Encontrada janela aberta melhor na conversa {resolved_convo_id}. Redirecionando.")
                     conversation_id = resolved_convo_id
                     trigger.conversation_id = resolved_convo_id
                     db.commit()
                
                # Live Check status
                window_open = await chatwoot.is_within_24h_window(conversation_id)
                
                if window_open and fallback_msg and fallback_msg.strip():
                    logger.info(f"✅ Window OPEN. Sending Fallback Message instead of Template.")
                    try:
                        res = None
                        if fallback_buttons:
                             logger.info(f"🔘 Sending Fallback Message WITH BUTTONS: {fallback_buttons}")
                             res = await chatwoot.send_interactive_buttons(contact_phone, fallback_msg, fallback_buttons)
                        else:
                             # Send simple text message (Message Normal)
                             res = await chatwoot.send_message(conversation_id, fallback_msg)
                        
                        # Record message status for delivery tracking and "de graça" visibility
                        fb_msg_id = None
                        if isinstance(res, dict):
                            # From Meta API (send_interactive_buttons)
                            if res.get("messages"):
                                fb_msg_id = res["messages"][0].get("id")
                            # From Chatwoot API (send_message)
                            elif res.get("id"):
                                fb_msg_id = res.get("source_id") or str(res.get("id"))
                        
                        if fb_msg_id:
                            fb_msg_clean = fb_msg_id.replace("wamid.", "")
                            
                            # 2. ⏳ AGUARDAR CONFIRMAÇÃO REAL (Delivered)
                            if not trigger.is_bulk:
                                log_node_execution(db, trigger, current_node_id, "processing", "Aguardando confirmação do WhatsApp (Fallback)...")
                                state, detail = await wait_for_delivery_sync(db, fb_msg_clean, trigger, current_node_id)
                                
                                if state == "suspended":
                                    return
                                    
                                if state == "failed":
                                    trigger.status = 'failed'
                                    trigger.failure_reason = detail
                                    db.commit()
                                    return
                                
                                # 3. ⏳ DELAY DE ESTABILIZAÇÃO (10s) - Skip if interaction
                                if not getattr(trigger, 'is_interaction', False):
                                    target_time = (datetime.now(timezone.utc) + timedelta(seconds=10)).isoformat()
                                    log_node_execution(db, trigger, current_node_id, "processing", f"{detail}. Estabilizando...", {"target_time": target_time})
                                    await asyncio.sleep(10)
                                else:
                                    logger.info(f"⚡ [INTERACTION] Skipping stabilization delay (fallback) for trigger {trigger.id}")
                            else:
                                detail = "Enviado (Bulk)"

                            new_ms = models.MessageStatus(
                                trigger_id=trigger.id,
                                message_id=fb_msg_clean,
                                phone_number=contact_phone,
                                status='sent',
                                message_type='FREE_MESSAGE',
                                content=fallback_msg,
                                publish_external_event=data.get("publishExternalEvent", False)
                            )
                            db.add(new_ms)
                            # Increment total_sent for funnel statistics
                            trigger.total_sent = (trigger.total_sent or 0) + 1
                        
                        db.commit()
                        fallback_sent = True
                        template_name = None # Prevent template sending logic
                    except Exception as fb_err:
                        logger.error(f"❌ Failed to send fallback message: {fb_err}")
                        trigger.status = 'failed'
                        db.commit()
                        return
                else:
                    if window_open:
                        logger.info("ℹ️ Window OPEN but no fallback message configured. Sending Template normally.")
                    else:
                        logger.info("🔒 Window CLOSED. Sending Template normally.")

                # 24h Window Check (Already handled above)
                pass

            if fallback_sent:
                logger.info(f"ℹ️ Node {current_node_id}: Fallback message sent. Skipping Template.")
            
            elif template_name:
                p_msg = data.get("privateMessage", "")
                logger.info(f"📄 Sending Template Node {current_node_id}. Template: '{template_name}' (Lang: {language})")
                result = await chatwoot.send_template(contact_phone, template_name, language, components)
                
                # Check for errors
                if isinstance(result, dict) and result.get("error"):
                    logger.error(f"❌ Failed to send template in Node {current_node_id}: {result.get('detail')}")
                    if not trigger.is_bulk:
                        trigger.status = 'failed'
                        trigger.failure_reason = str(result.get('detail'))
                    db.commit()
                    return # Stop funnel for this user if main template fails
                
                # Record Message ID for status tracking and interactions
                if isinstance(result, dict) and result.get("messages"):
                    raw_id = result["messages"][0].get("id")
                    wamid = raw_id.replace("wamid.", "") if raw_id else raw_id
                    if wamid:
                        # 2. ⏳ AGUARDAR CONFIRMAÇÃO REAL (Delivered)
                        if not trigger.is_bulk:
                            log_node_execution(db, trigger, current_node_id, "processing", "Aguardando confirmação do WhatsApp (Template)...")
                            state, detail = await wait_for_delivery_sync(db, wamid, trigger, current_node_id)
                            
                            if state == "suspended":
                                return
                                
                            if state == "failed":
                                trigger.status = 'failed'
                                trigger.failure_reason = detail
                                db.commit()
                                return
                            
                            # 3. ⏳ DELAY DE ESTABILIZAÇÃO (10s) - Skip if interaction
                            if not getattr(trigger, 'is_interaction', False):
                                target_time = (datetime.now(timezone.utc) + timedelta(seconds=10)).isoformat()
                                log_node_execution(db, trigger, current_node_id, "processing", f"{detail}. Estabilizando...", {"target_time": target_time})
                                await asyncio.sleep(10)
                            else:
                                logger.info(f"⚡ [INTERACTION] Skipping stabilization delay (template) for trigger {trigger.id}")
                        else:
                            detail = "Enviado (Bulk)"

                        new_ms = models.MessageStatus(
                            trigger_id=trigger.id,
                            message_id=wamid,
                            phone_number=contact_phone,
                            status='sent',
                            message_type='TEMPLATE',
                            content=f"[Template: {template_name}]", # Store placeholder
                            publish_external_event=data.get("publishExternalEvent", False)
                        )
                        
                        # NEW: Handle Private Message post-delivery
                        if data.get("sendPrivateMessage") and p_msg:
                            # Processar variáveis na nota privada (Ei {{1}} -> Ei Aryaraj)
                            final_p_msg = apply_vars(p_msg)
                            
                            if fallback_sent:
                                final_p_msg += "\n\n📢 [Sessão 24h] Enviado via Mensagem Direta (Grátis)."
                            else:
                                final_p_msg += f"\n\n📢 Enviado via Template: {template_name}"
                            
                            new_ms.pending_private_note = final_p_msg
                            logger.info(f"   ⏳ Private note stored for template {wamid}, waiting for delivery.")
                        
                        db.add(new_ms)
                        # Increment total_sent
                        trigger.total_sent = (trigger.total_sent or 0) + 1
                        db.commit()
                        logger.info(f"✅ Template sent. Recorded wamid: {wamid}")

                        # Publish External Event if configured (Template Node)
                        template_body = None
                        try:
                            from models import WhatsAppTemplateCache
                            tpl_cache = db.query(WhatsAppTemplateCache).filter(
                                WhatsAppTemplateCache.name == template_name,
                                WhatsAppTemplateCache.client_id == trigger.client_id
                            ).first()
                            if tpl_cache:
                                template_body = tpl_cache.body
                        except:
                            pass
                            
                        await publish_node_external_event(
                            db, 
                            trigger, 
                            data, 
                            template_body or f"[Template: {template_name}]", 
                            contact_phone,
                            node_id=current_node_id,
                            event_type="funnel_template_sent"
                        )

                        # Update history with template preview
                        log_node_execution(db, trigger, current_node_id, "completed", f"Template: {template_name}", {
                            "template_name": template_name,
                            "content": template_body or f"Template: {template_name}"
                        })


            elif not template_name and not fallback_sent:
                logger.warning(f"⚠️ Template Node {current_node_id} has no templateName and no fallback sent.")
            # Template nodes are terminal by design in the frontend.
            # No next handle will be found, so it will break the loop.

        elif node_type == "LEGACY_date_trigger":
             # Wait until specific date
             target_date_str = data.get("targetDate")
             if target_date_str:
                 target_date = datetime.fromisoformat(target_date_str.replace("Z", "+00:00"))
                 now = datetime.now(timezone.utc)
                 
                 if target_date > now:
                     wait_seconds = (target_date - now).total_seconds()
                     
                     next_node_id = get_next_node(current_node_id, edges, None)
                     if next_node_id:
                        trigger.status = 'queued'
                        trigger.scheduled_time = target_date
                        trigger.current_node_id = next_node_id
                        db.commit()
                        return # STOP WORKER
                 else:
                     logger.info("📅 Date already passed, proceeding.")

        # --- TRAVERSAL ---
        next_node_id = get_next_node(current_node_id, edges, source_handle)
        
        # Log completion of CURRENT node before moving
        if next_node_id:
            current_node_id = next_node_id
            # Update state for crash recovery
            trigger.current_node_id = current_node_id
            db.commit()
        else:
            logger.info("🏁 End of path reached.")
            break

    # Finish
    trigger.status = 'completed'
    log_node_execution(db, trigger, "FINISH", "completed", "Funil concluído com sucesso.")
    db.commit()
    logger.info(f"🏁 Funnel {trigger.id} (Flow) finished successfully.")


def get_next_node(current_id, edges, source_handle=None):
    if not current_id: return None
    
    # Normalizar IDs para String (React Flow IDs são strings, DB pode retornar tipos variados)
    cid_str = str(current_id)
    logger.info(f"🔍 [TRAVERSAL] Searching next node after {cid_str} (Handle: {source_handle})")
    
    # DEBUG: Log all edges from this source
    source_edges = [e for e in edges if str(e.get("source")) == cid_str]
    logger.info(f"   Found {len(source_edges)} outgoing edges for {cid_str}: {[e.get('target') for e in source_edges]}")

    for edge in source_edges:
        edge_source = str(edge.get("source", ""))
        logger.info(f"   Found candidate edge: {edge_source} -> {edge['target']} (Edge Handle: {edge.get('sourceHandle')})")
        
        # Se source_handle for fornecido (ex: Decisor Sim/Não), verifica match exato
        if source_handle:
            if edge.get("sourceHandle") == source_handle:
                logger.info(f"   ✅ Match found via handle: {edge['target']}")
                return edge["target"]
        else:
            # Se não houver handle específico, pegamos a primeira saída disponível
            # (Comum para Message, Template, Audio nodes)
            logger.info(f"   ✅ Match found (first edge): {edge['target']}")
            return edge["target"]
    
    logger.warning(f"   🛑 No next node found after {cid_str}")
    return None


async def execute_legacy_funnel(trigger, steps, chatwoot, conversation_id, contact_phone, db, apply_vars):
    """
    Maintains compatibility with linear steps list based funnels.
    """
    total_steps = len(steps)
    if trigger.current_step_index is None:
        trigger.current_step_index = 0
        db.commit()

    while trigger.current_step_index < total_steps:
        step_index = trigger.current_step_index
        step = steps[step_index]
        
        # Check cancellation
        db.refresh(trigger)
        if trigger.status == 'cancelled': return

        step_type = step.get("type")
        content = step.get("content")
        
        # Logging
        logger.info(f"Processing Legacy Step {step_index}: {step_type}")

        if step_type == "message":
            buttons = step.get("buttons")
            content_processed = apply_vars(content)
            if buttons:
                await chatwoot.send_interactive_buttons(contact_phone, content_processed, buttons)
            # Legacy Send and storage
            await chatwoot.send_message(conversation_id, content_processed)
            
            # Record status
            new_ms = models.MessageStatus(
                trigger_id=trigger.id,
                message_id=f"legacy_{int(datetime.now().timestamp())}",
                phone_number=contact_phone,
                status='sent',
                content=content_processed,
                publish_external_event=False # Legacy funnels don't have individual node toggles
            )
            db.add(new_ms)
            trigger.total_sent = (trigger.total_sent or 0) + 1
            db.commit()
            log_node_execution(db, trigger, f"step_{step_index}", "completed")


        elif step_type in ["image", "video", "audio", "document"]:
             # Simple media handler
             await chatwoot.send_attachment(conversation_id, content, step_type)


        # Delay Logic
        raw_delay = int(step.get("delay", 0))
        if raw_delay > 0:
            if raw_delay > 60:
                 trigger.status = 'queued'
                 trigger.scheduled_time = datetime.now(timezone.utc) + timedelta(seconds=raw_delay)
                 trigger.current_step_index = step_index + 1
                 db.commit()
                 return
            else:
                await asyncio.sleep(raw_delay)

        trigger.current_step_index = step_index + 1
        db.commit()
    
    # Finish Legacy Funnel
    trigger.status = 'completed'
    log_node_execution(db, trigger, "FINISH", "completed", "Funil (Lista) concluído com sucesso.")
    db.commit()
    logger.info(f"🏁 Legacy Funnel {trigger.id} finished successfully.")

    trigger.status = 'completed'
    db.commit()

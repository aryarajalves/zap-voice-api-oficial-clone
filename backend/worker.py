
import asyncio
import logging
from rabbitmq_client import rabbitmq
from services.bulk import process_bulk_send, process_bulk_funnel, render_template_body, sanitize_template_components
from services.engine import execute_funnel, log_node_execution, wait_for_delivery_sync
from database import SessionLocal
import models
import json
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import text, or_, func, and_
from datetime import datetime, timezone, timedelta
import os
import time
import re
from config_loader import get_setting
from services.ai_memory import notify_ai_memory, notify_agent_memory_webhook
from services.leads import upsert_webhook_lead
from utils import normalize_phone
from sqlalchemy.sql import expression

# Configuração de logs para o Worker
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("Worker")

# Worker Configuration
PREFETCH_COUNT = int(os.getenv("RABBITMQ_PREFETCH_COUNT", 5))
MESSAGE_DELAY = float(os.getenv("RABBITMQ_MESSAGE_DELAY", 1.0))

# Semaphores for private message concurrency control
semaphores = {}

async def handle_bulk_send(data: dict):
    """
    Processa mensagens de disparo em massa da fila 'zapvoice_bulk_sends'
    """
    logger.info(f"📨 Recebido Job de Bulk Send: {data.get('trigger_id')}")
    
    try:
        trigger_id = data.get("trigger_id")
        
        # Reconstrói os argumentos para a função original
        if data.get("type") == "funnel_bulk":
            await process_bulk_funnel(
                trigger_id=trigger_id,
                funnel_id=data.get("funnel_id"),
                contacts=data.get("contacts"),
                delay=data.get("delay", 5),
                concurrency=data.get("concurrency", 1)
            )
        else:
            await process_bulk_send(
                trigger_id=trigger_id,
                template_name=data.get("template_name"),
                contacts=data.get("contacts"),
                delay=data.get("delay", 5),
                concurrency=data.get("concurrency", 1),
                language=data.get("language", "pt_BR"),
                components=data.get("components"),
                # New fields
                direct_message=data.get("direct_message"),
                direct_message_params=data.get("direct_message_params")
            )
            
        logger.info(f"✅ Job de Bulk Send {trigger_id} concluído com sucesso!")
        
    except Exception as e:
        logger.error(f"❌ Erro ao processar Bulk Send {trigger_id}: {e}")
        # Garantir que o status no banco reflita a falha
        db = SessionLocal()
        try:
            from models import ScheduledTrigger
            t = db.query(ScheduledTrigger).get(trigger_id)
            if t:
                t.status = "failed"
                t.failure_reason = f"Erro no Worker: {str(e)}"
                db.commit()
        except Exception as db_err:
            logger.error(f"⚠️ Erro ao atualizar status de falha no DB: {db_err}")
            db.rollback()
        finally:
            db.close()
    finally:
         # Throttling entre jobs
        if MESSAGE_DELAY > 0:
            logger.info(f"⏳ Aguardando {MESSAGE_DELAY}s antes de liberar slot...")
            await asyncio.sleep(MESSAGE_DELAY)

async def handle_funnel_execution(data: dict):
    """
    Processa execuções de funil da fila 'zapvoice_funnel_executions'
    """
    trigger_id = data.get('trigger_id')
    phone = data.get('contact_phone', 'unknown')
    logger.info(f"🎡 [WORKER] Recebido Job de Funil! Trigger ID: {trigger_id} | Phone: {phone}")
    # REMOVIDO: Atraso cego movido para após a entrega no caso de integração

    try:
        db: Session = SessionLocal()
        try:
            # Trigger fetch early to get client context
            # 1. Obter Trigger com Retry para visibilidade entre containers
            from models import ScheduledTrigger
            trigger = None
            for _ in range(5): # 5 tentativas, 0.5s cada = 2.5s total
                trigger = db.query(models.ScheduledTrigger).filter(
                    models.ScheduledTrigger.id == data.get("trigger_id")
                ).first()
                if trigger: break
                await asyncio.sleep(0.5)
            
            if not trigger:
                logger.error(f"❌ Trigger {data.get('trigger_id')} not found in worker")
                return

            if trigger.status == 'cancelled':
                logger.info(f"⏭️ Trigger {trigger.id} cancelado. Pulando.")
                return

            client_id = trigger.client_id
            contact_phone = data.get("contact_phone")

            # --- SUPPRESSION CHECK (Safety check before dispatch) ---
            # EXECUTADO ANTES DE CRIAR CONVERSA NO CHATWOOT PARA EVITAR "GHOST CONVERSATIONS"
            if trigger.integration_id and trigger.event_type:
                # 1. Find all event mapping types that would suppress (cancel) the current event
                all_mappings = db.query(models.WebhookEventMapping).filter(
                    models.WebhookEventMapping.integration_id == trigger.integration_id,
                    models.WebhookEventMapping.is_active == True
                ).all()
                
                suppressor_types = []
                for m in all_mappings:
                    if m.cancel_events and trigger.event_type in m.cancel_events:
                        suppressor_types.append(m.event_type)
                
                if suppressor_types:
                    # 2. Check for recent (3 days) completed triggers of those suppressor types
                    time_limit = datetime.now(timezone.utc) - timedelta(days=3)
                    superior_reached = db.query(models.ScheduledTrigger).filter(
                        models.ScheduledTrigger.integration_id == trigger.integration_id,
                        models.ScheduledTrigger.contact_phone == contact_phone,
                        models.ScheduledTrigger.product_name == trigger.product_name,
                        models.ScheduledTrigger.event_type.in_(suppressor_types),
                        models.ScheduledTrigger.status.in_(["completed", "processing"]),
                        models.ScheduledTrigger.is_bulk == False,
                        models.ScheduledTrigger.created_at >= time_limit,
                        models.ScheduledTrigger.id != trigger.id
                    ).first()
                    
                    if superior_reached:
                        logger.info(f"⏭️ [WORKER SUPPRESSION] Trigger {trigger.id} ({trigger.event_type}) suprimido por evento superior '{superior_reached.event_type}' encontrado no DB.")
                        trigger.status = 'cancelled'
                        trigger.failure_reason = f"Suprimido por evento superior: {superior_reached.event_type}"
                        db.commit()
                        return

            # Reler do DB após o delay: o webhook do Chatwoot pode ter atualizado
            # o trigger com conversation_id e chatwoot_contact_id corretos.
            db.refresh(trigger)
            conversation_id = trigger.conversation_id or data.get("conversation_id")
            chatwoot_contact_id = trigger.chatwoot_contact_id or data.get("chatwoot_contact_id")
            chatwoot_account_id = trigger.chatwoot_account_id or data.get("chatwoot_account_id")
            chatwoot_inbox_id = trigger.chatwoot_inbox_id or data.get("chatwoot_inbox_id")
            
            # 🔍 [REFATORADO] Não criar conversa prematuramente.
            # A conversa será criada apenas noWebhook de Status 'delivered' ou 'read'.
            # Isso evita "Ghost Conversations" no Chatwoot se o número não existir.
            if not conversation_id:
                logger.info(f"⏳ Conversation ID ausente. O envio será feito via Meta Oficial e a conversa será criada após a entrega confirmada.")
            
            # Se ainda não tiver conversation_id e NÃO for um disparo de mensagem (ex: ação interna de label)
            # No caso de disparo de template/funil, o conversation_id pode ser nulo agora.
            if not conversation_id and not contact_phone:
                logger.error(f"❌ ERRO CRÍTICO: Dados insuficientes para processar trigger {trigger.id}")
                trigger.status = 'failed'
                trigger.failure_reason = "Dados de contato insuficientes."
                db.commit()
                return

            # 4. Execute Funnel OR Direct Template
            funnel_id = data.get("funnel_id")
            
            if funnel_id is None:
                # Caso especial: Disparo Direto (Webhook Mapping sem funil ou Reenvio Manual)
                if trigger.template_name:
                    logger.info(f"📄 Gatilho de Template Direto detectado: {trigger.template_name} para {contact_phone}")
                    
                    from chatwoot_client import ChatwootClient
                    chatwoot_cl = ChatwootClient(client_id=client_id)
                    
                    # --- IDEMPOTÊNCIA: Verificar se já foi entregue ---
                    history = trigger.execution_history or []
                    already_delivered = any(h.get('node_id') == 'DELIVERY' and h.get('status') == 'completed' for h in history)
                    
                    if already_delivered:
                        logger.info(f"♻️ [IDEMPOTENCY] Entrega já confirmada para {contact_phone}. Pulando envio...")
                        # Se já foi entregue, precisamos apenas garantir que o Passo 3 (Estabilização) esteja concluído
                        # antes de seguir para a Sincronização.
                    else:
                        # --- Fluxo Normal de Envio ---
                        # --- NOVO: Lógica de Mensagem Livre (Sessão) ---
                        use_free = getattr(trigger, "is_free_message", False)
                        res = None
                        
                        if use_free:
                            logger.info(f"✨ Tentando envio como MENSAGEM LIVRE (Sessão) para {contact_phone}")
                            # 1. Verificar janela 24h
                            window_open = False
                            if conversation_id:
                                window_open = await chatwoot_cl.is_within_24h_window(conversation_id)
                            else:
                                logger.warning(f"⚠️ Impossível verificar janela de 24h sem Conversation ID.")
                            
                            if window_open:
                                logger.info(f"🟢 Janela de 24h ABERTA para {contact_phone}. Enviando mensagem interativa...")
                                # Buscar conteúdo do template no cache para replicar
                                from models import WhatsAppTemplateCache
                                tpl = db.query(WhatsAppTemplateCache).filter(
                                    WhatsAppTemplateCache.name == trigger.template_name,
                                    WhatsAppTemplateCache.client_id == client_id
                                ).first()
                                
                                if tpl:
                                    body = tpl.body or ""
                                    contact_name = (data.get("contact_name") or trigger.contact_name or 
                                                   (trigger.meta.get("sender", {}).get("name") if trigger.meta else ""))
                                    # Filtrar nome "1" vindo de metadados inconsistentes
                                    if str(contact_name) == "1":
                                        contact_name = ""
                                        
                                    body = render_template_body(body, trigger.template_components or [], contact_name=contact_name)
                                    
                                    # Extrair botões (Apenas QUICK_REPLY para Interactive Button)
                                    buttons = []
                                    if tpl.components:
                                        for c in tpl.components:
                                            if c.get("type") == "BUTTONS":
                                                for b in c.get("buttons", []):
                                                    if b.get("type") == "QUICK_REPLY":
                                                        buttons.append(b.get("text"))
                                    
                                    if buttons:
                                        res = await chatwoot_cl.send_interactive_message(
                                            phone_number=contact_phone,
                                            body_text=body,
                                            buttons=buttons
                                        )
                                    else:
                                        logger.info(f"ℹ️ Sem botões detectados no template '{trigger.template_name}'. Enviando como TEXTO DIRETO para {contact_phone}")
                                        res = await chatwoot_cl.send_text_direct(
                                            phone_number=contact_phone,
                                            content=body
                                        )
                                else:
                                    logger.warning(f"⚠️ Template {trigger.template_name} não encontrado no cache. Fallback para template oficial.")
                            else:
                                logger.info(f"🔴 Janela de 24h FECHADA para {contact_phone}. Fazendo fallback para TEMPLATE oficial.")

                        # --- Envio de Template (Caso padrão ou fallback) ---
                        is_direct_success = False
                        if isinstance(res, dict):
                            # Verificação de sucesso mais abrangente (Meta e Chatwoot APIs)
                            if res.get("messages") or res.get("id") or res.get("success") is True or (not res.get("error") and res.get("messaging_product") == "whatsapp"):
                                is_direct_success = True
                                logger.info(f"✅ [Smart Send SUCCESS] Individual {contact_phone}")
                            
                            if not is_direct_success:
                                err_msg = str(res.get("detail", "")).lower()
                                if "within 24 hours" in err_msg or "window" in err_msg or "expired" in err_msg:
                                    logger.info(f"🔄 [Smart Send] 24h Window expired. Falling back to official template.")
                                else:
                                    logger.warning(f"🛑 [Smart Send] Non-recoverable error ({err_msg}). Skipping fallback to prevent duplication.")
                                    # Consideramos como erro mas paramos aqui para não duplicar se o erro foi "delay" ou algo que pode ter enviado
                                    is_direct_success = True 

                        if not is_direct_success:
                            # Sanitizar componentes antes de enviar (evita "Ei 1")
                            contact_name = (data.get("contact_name") or trigger.contact_name or 
                                           (trigger.meta.get("sender", {}).get("name") if trigger.meta else ""))
                            if str(contact_name) == "1": contact_name = ""
                            
                            clean_components = sanitize_template_components(trigger.template_components or [], contact_name=contact_name)
                            
                            # Enviar Template via Meta
                            logger.info(f"🚀 [WORKER DISPATCH] Disparando Template '{trigger.template_name}' para {contact_phone} com componentes: {clean_components}")
                            res = await chatwoot_cl.send_template(
                                phone_number=contact_phone,
                                template_name=trigger.template_name,
                                language_code=trigger.template_language or "pt_BR",
                                components=clean_components
                            )
                        
                        if isinstance(res, dict) and res.get("error"):
                            logger.error(f"❌ Falha no disparo (Trigger {trigger.id}): {res.get('detail')}")
                            trigger.status = 'failed'
                            trigger.failure_reason = str(res.get('detail'))
                            db.commit()
                            return

                        # Registrar Status e agendar Nota Privada (via webhook delivery callback)
                        if isinstance(res, dict) and res.get("messages"):

                            # --- Variable Replacement for Private Note ---
                            note_content = trigger.private_message or ""
                            if note_content:
                                 contact_name = (data.get("contact_name") or trigger.contact_name or 
                                                (trigger.meta.get("sender", {}).get("name") if trigger.meta else ""))
                                 
                                 # Proteção contra "1"
                                 if str(contact_name) == "1": contact_name = ""
                                 
                                 note_content = render_template_body(note_content, trigger.template_components or [], contact_name=contact_name)
                            
                            logger.info(f"📝 Nota Privada agendada para Trigger {trigger.id} em {trigger.private_message_delay}s")

                            wamid = res["messages"][0].get("id")
                            if wamid:
                                # Normalize ID: Always save without 'wamid.' prefix for consistency
                                clean_wamid = wamid.replace("wamid.", "")
                                
                                actual_type = 'FREE_MESSAGE' if use_free and window_open else 'TEMPLATE'
                                new_ms = models.MessageStatus(
                                    trigger_id=trigger.id,
                                    message_id=clean_wamid,
                                    phone_number=contact_phone,
                                    status='sent',
                                    message_type=actual_type,
                                    content=f"[Livre: {trigger.template_name}]" if actual_type == 'FREE_MESSAGE' else f"[Template: {trigger.template_name}]",
                                    pending_private_note=note_content # Nota processada
                                )
                                db.add(new_ms)
                                trigger.sent_as = actual_type
                                # Incremento imediato de enviados para refletir na UI sem esperar a entrega
                                trigger.total_sent = (trigger.total_sent or 0) + 1
                                db.commit() # Immediate commit to avoid race conditions with webhook status callbacks
                        
                        # 2. ⏳ AGUARDAR CONFIRMAÇÃO REAL (Delivered)
                        log_node_execution(db, trigger, node_id='DELIVERY', status='processing', details='Aguardando confirmação do WhatsApp...')
                        # O ID está no MessageStatus criado acima
                        state, detail = await wait_for_delivery_sync(db, clean_wamid, trigger, current_node_id='DELIVERY')
                        
                        if state == "suspended":
                             return # Job will be resumed by webhook
                             
                        if state == "failed":
                             trigger.status = 'failed'
                             trigger.failure_reason = detail
                             db.commit()
                             return
                        
                        # Marcar Envio e Entrega (Passo 2) como concluído
                        log_node_execution(db, trigger, node_id='DELIVERY', status='completed', details='WhatsApp: Entrega confirmada!')
                    
                    # --- Lógica Comum: Estabilização, Sincronização e Finalização ---
                    # 🔄 Sincronizar trigger e histórico (Webhooks podem ter alterado)
                    db.refresh(trigger)
                    history = trigger.execution_history or []
                    
                    # Verificar se o webhook já iniciou a estabilização
                    stabilization_node = next((h for h in history if h.get('node_id') == 'STABILIZATION'), None)
                    
                    if not stabilization_node:
                        target_time = (datetime.now(timezone.utc) + timedelta(seconds=10)).isoformat()
                        log_node_execution(
                            db, trigger, 
                            node_id='STABILIZATION', 
                            status='processing', 
                            details='WhatsApp: Entrega confirmada! Estabilizando para sincronização...',
                            extra_data={"target_time": target_time}
                        )
                    
                    # 3. 🛡️ ESTABILIZAÇÃO REATIVA (Safety Delay)
                    # Aguarda 10 segundos para dar tempo do Webhook do status 'delivered' ou 'read'
                    # chegar e o Chatwoot processar a criação da conversa.
                    log_node_execution(db, trigger, node_id='STABILIZATION', status='processing', details='Aguardando sincronia final...')
                    await asyncio.sleep(10)
                    log_node_execution(db, trigger, node_id='STABILIZATION', status='completed', details='Estabilização concluída.')
                    db.commit() # Salva o estado verde do Passo 3 antes de prosseguir
                    
                    # 4. 🧬 SINCRONIZAÇÃO CHATWOOT (Passo 2)
                    # Agora que o contato recebeu, podemos sincronizar com segurança
                    logger.info(f"🧬 Iniciando sincronização pós-entrega para {contact_phone}")
                    
                    # Se não temos IDs, tentar descobrir/criar no Chatwoot
                    if not conversation_id or not chatwoot_contact_id:
                        try:
                            from services.discovery import discover_or_create_chatwoot_conversation
                            discovery_res = await discover_or_create_chatwoot_conversation(
                                client_id=client_id,
                                phone=contact_phone,
                                name=data.get("contact_name") or trigger.contact_name
                            )
                            if discovery_res:
                                conversation_id = discovery_res.get("conversation_id")
                                chatwoot_contact_id = discovery_res.get("contact_id")
                                chatwoot_account_id = discovery_res.get("account_id")
                                logger.info(f"✅ [WORKER] Discovery finalizado: Conv {conversation_id}")
                        except Exception as e_disc:
                            logger.error(f"❌ [WORKER] Erro crítico no Discovery: {e_disc}")
                    
                    # --- NOVO: VINCULAR ID INTERNO E REDIRECIONAMENTO NO MESSAGESTATUS ---
                    internal_contact_id = None
                    try:
                        from services.leads import upsert_webhook_lead
                        lead_data = {
                            "phone": contact_phone,
                            "name": data.get("contact_name") or trigger.contact_name or f"Cliente_{contact_phone}",
                            "event_type": trigger.event_type or "dispache_automático"
                        }
                        # Upsert Lead para garantir ID estável
                        target_lead = upsert_webhook_lead(db, trigger.client_id, "zapvoice_worker", lead_data)
                        internal_contact_id = target_lead.id if target_lead else None
                        
                        # Atualizar IDs no Lead para persistência
                        if target_lead and conversation_id:
                            target_lead.chatwoot_conversation_id = conversation_id
                            target_lead.chatwoot_account_id = chatwoot_account_id
                            db.add(target_lead)
                    except Exception as e_lead:
                        logger.warning(f"⚠️ [WORKER] Falha ao upsert lead para histórico: {e_lead}")

                    # Atualizar no MessageStatus para que apareça no Modal de Contatos
                    if conversation_id:
                        msg_record_to_upd = db.query(models.MessageStatus).filter(
                            models.MessageStatus.trigger_id == trigger.id
                        ).order_by(models.MessageStatus.id.desc()).first()
                        
                        if msg_record_to_upd:
                            msg_record_to_upd.chatwoot_conversation_id = conversation_id
                            msg_record_to_upd.chatwoot_account_id = chatwoot_account_id
                            db.add(msg_record_to_upd)
                    
                    log_node_execution(
                        db, trigger, 
                        node_id='DISCOVERY', 
                        status='completed', 
                        details='🧬 CONTEXTO: CHATWOOT SINCRONIZADO',
                        extra_data={
                            "account_id": chatwoot_account_id,
                            "conversation_id": conversation_id,
                            "contact_id": chatwoot_contact_id,
                            "internal_contact_id": internal_contact_id
                        }
                    )
                    db.commit() # Salva Passo 4 e atualizações de ID

                    # 5. 🧠 TAREFAS FINAIS: NOTA PRIVADA E MEMÓRIA (Passo 4)
                    if conversation_id:
                        # Enfileira Nota Privada
                        if trigger.private_message:
                            logger.info(f"💬 Enfileirando Nota Privada para {contact_phone}")
                            await rabbitmq.publish("chatwoot_private_messages", {
                                "client_id": client_id,
                                "phone": contact_phone,
                                "message": note_content,
                                "trigger_id": trigger.id,
                                "conversation_id": conversation_id,
                                "delay": trigger.private_message_delay or 5,
                                "concurrency": trigger.private_message_concurrency or 1
                            })
                            # Log inicial como pendente (opcional, o worker atualizará)
                            log_node_execution(db, trigger, "DELIVERY", "processing", extra_data={"private_note_status": "processing"})

                        # Enfileira Memória IA
                        # Sempre tenta enviar se for integração (conforme regra de negócio)
                        logger.info(f"🧠 Enfileirando Memória IA para {contact_phone}")
                        
                        # Recupera o registro da mensagem para pegar as variáveis detectadas/persistidas
                        msg_record = db.query(models.MessageStatus).filter(
                            models.MessageStatus.trigger_id == trigger.id
                        ).order_by(models.MessageStatus.id.desc()).first()

                        # Renderiza conteúdo para Memória IA se necessário
                        # NOTA: O import já é global no topo do arquivo
                        final_mem_content = ""
                        if msg_record:
                            final_mem_content = render_template_body(
                                trigger.template_body or "", 
                                trigger.template_components or [], 
                                contact_name=trigger.contact_name,
                                var1=msg_record.var1,
                                var2=msg_record.var2,
                                var3=msg_record.var3,
                                var4=msg_record.var4,
                                var5=msg_record.var5
                            ) if trigger.template_body else msg_record.content

                        # Enfileira Memória IA usando o helper para garantir consistência de campos
                        await notify_agent_memory_webhook(
                            client_id=client_id,
                            phone=contact_phone,
                            name=trigger.contact_name or f"Cliente_{contact_phone}",
                            template_name=trigger.template_name or "Mensagem Livre",
                            content=final_mem_content or "[Conteúdo Indisponível]",
                            trigger_id=trigger.id,
                            node_id="DELIVERY",
                            internal_contact_id=internal_contact_id
                        )
                        log_node_execution(db, trigger, "DELIVERY", "processing", extra_data={"memory_status": "processing"})

                    trigger.status = 'completed'
                    # trigger.total_sent já foi incrementado no início do envio
                    db.commit()
                    logger.info(f"✅ Execução direta de integração concluída para {contact_phone}")
                else:
                    # --- NOVO: SINCRONIA DE ID PARA CASO DE AÇÃO DIRETA ---
                    current_convo_id = conversation_id or trigger.conversation_id
                    current_account_id = chatwoot_account_id or trigger.chatwoot_account_id
                    internal_contact_id = None
                    
                    if current_convo_id:
                        try:
                            from services.leads import upsert_webhook_lead
                            lead_data = {
                                "phone": contact_phone,
                                "name": data.get("contact_name") or trigger.contact_name or f"Cliente_{contact_phone}",
                                "event_type": trigger.event_type or "ação_interna"
                            }
                            target_lead = upsert_webhook_lead(db, trigger.client_id, "zapvoice_worker", lead_data)
                            internal_contact_id = target_lead.id if target_lead else None
                            
                            if target_lead:
                                target_lead.chatwoot_conversation_id = current_convo_id
                                target_lead.chatwoot_account_id = current_account_id
                                db.add(target_lead)
                        except Exception as e_lead:
                            logger.warning(f"⚠️ [WORKER] Falha ao upsert lead em ação direta: {e_lead}")

                    log_node_execution(
                        db, trigger, 
                        node_id='DISCOVERY', 
                        status='completed', 
                        details='🧬 CONTEXTO: CHATWOOT SINCRONIZADO',
                        extra_data={
                            "account_id": current_account_id,
                            "conversation_id": current_convo_id,
                            "contact_id": chatwoot_contact_id or trigger.chatwoot_contact_id,
                            "internal_contact_id": internal_contact_id
                        }
                    )
                    
                    # Sem template_name E sem funnel_id. Pode ser apenas para aplicar rótulo ou nota privativa.
                    if trigger.chatwoot_label:
                        logger.info(f"🏷️ Aplicando rótulo(s) {trigger.chatwoot_label} (Sem template) para {contact_phone}")
                        from chatwoot_client import ChatwootClient
                        cw = ChatwootClient(client_id=client_id)
                        await cw.add_label_to_conversation(conversation_id, trigger.chatwoot_label)

                    if trigger.private_message:
                        logger.info(f"📝 Enviando nota privada (Sem template) no Chatwoot para {contact_phone}")
                        from chatwoot_client import ChatwootClient
                        cw = ChatwootClient(client_id=client_id)
                        await cw.create_private_note(conversation_id, trigger.private_message)
                        from services.triggers_service import increment_private_note_stats
                        increment_private_note_stats(db, trigger.id)

                    trigger.status = 'completed'
                    logger.info(f"✅ Execução de ação interna (sem template) concluída para {contact_phone}")
                    db.commit()
            else:
                # Execução Normal de Funil
                await execute_funnel(
                    funnel_id=funnel_id,
                    conversation_id=conversation_id,
                    trigger_id=data.get("trigger_id"),
                    contact_phone=contact_phone,
                    db=db,
                    skip_block_check=getattr(trigger, 'skip_block_check', False),
                    chatwoot_contact_id=chatwoot_contact_id,
                    chatwoot_account_id=chatwoot_account_id,
                    chatwoot_inbox_id=chatwoot_inbox_id
                )
            # 5. Criar nota privada se configurado no trigger (Fallback for logic)
            # if trigger.private_message:
            #      ... (this is now handled in funnel steps or status updates)
            
            logger.info(f"✅ Execução de funil concluída para {contact_phone}")
        finally:
            db.close()
            
    except Exception as e:
        if 'db' in locals() and db:
            try:
                # Se o trigger existir no escopo, marcamos como falha para não ficar travado
                if 'trigger' in locals() and trigger:
                    trigger.status = 'failed'
                    trigger.failure_reason = str(e)
                    db.commit()
            except:
                db.rollback()
        logger.error(f"❌ Erro ao executar funil: {e}")
    finally:
        # Throttling entre execuções
        if MESSAGE_DELAY > 0:
            await asyncio.sleep(MESSAGE_DELAY)

async def handle_chatwoot_private_message(data: dict):
    """
    Cria uma mensagem privada no Chatwoot para um contato disparado em massa.
    Garante intervalo de 5 segundos entre envios.
    """
    client_id = data.get("client_id")
    phone = data.get("phone")
    message = data.get("message")
    trigger_id = data.get("trigger_id")
    # HARDCODED SAFETY LIMITS (Requested by user to protect Chatwoot)
    delay = 1
    # Global/Broad semaphore for all private notes instead of per-trigger
    # to maintain strict server protection regardless of how many triggers run
    global_concurrency = 10
    
    if "private_notes" not in semaphores:
        semaphores["private_notes"] = asyncio.Semaphore(global_concurrency)

    logger.info(f"💬 [PRIVATE_NOTE] Starting for {phone} (Internal Limit: Delay {delay}s, Concurrency {global_concurrency})")
    
    try:
        async with semaphores["private_notes"]:
            if not message:
                logger.warning(f"⚠️ [PRIVATE_NOTE] Message content is empty for {phone}. Skipping.")
                return

            from chatwoot_client import ChatwootClient
            chatwoot = ChatwootClient(client_id=client_id)
            
            # 1. Obter Inbox ID padrão
            inbox_id = await chatwoot.get_default_whatsapp_inbox()
            if not inbox_id:
                logger.error(f"❌ Nenhum inbox encontrado para o cliente {client_id}. Abortando nota privada.")
                return

            # 2. Garantir Conversa (Busca contato, cria se necessário, busca conversa, cria se necessário)
            conv_res = await chatwoot.ensure_conversation(
                phone_number=phone,
                name=phone, # Nome padrão é o número
                inbox_id=inbox_id
            )
            conversation_id = conv_res.get("conversation_id") if conv_res else None
            
            if conversation_id:
                account_id = conv_res.get("account_id")
                logger.info(f"✅ Conversa garantida no Chatwoot para {phone}:")
                logger.info(f"   🔹 Account ID: {account_id}")
                logger.info(f"   🔹 Conversation ID: {conversation_id}")
                
                # Check 24h window
                window_open = await chatwoot.is_within_24h_window(conversation_id)
                
                await chatwoot.send_message(conversation_id, message, private=True)
                logger.info(f"✅ Nota interna registrada para {phone} (Status Janela: {'ABERTA' if window_open else 'FECHADA'})")
                
                # Increment atomic counter
                from services.triggers_service import increment_private_note_stats
                from database import SessionLocal
                with SessionLocal() as db_note:
                    increment_private_note_stats(db_note, trigger_id)
                    
                    # Update Execution History (Success)
                    from services.engine import log_node_execution
                    trigger_record = db_note.query(models.ScheduledTrigger).get(trigger_id)
                    if trigger_record:
                        log_node_execution(db_note, trigger_record, "DELIVERY", "processing", extra_data={"private_note_status": "success"})
                    
                    db_note.commit()
            else:
                logger.error(f"❌ Falha ao garantir conversa para {phone}")
                if trigger_id:
                    with SessionLocal() as db_err:
                        node_id = data.get("node_id", "DISPATCH")
                        await update_node_history_extra(db_err, trigger_id, node_id, "private_note_status", "failed")

            # Dynamic interval for this queue
            logger.info(f"⏳ Aguardando {delay}s para o próximo item da fila de notas privadas do trigger {trigger_id}...")
            await asyncio.sleep(delay)

    except Exception as e:
        logger.error(f"❌ Erro ao enviar nota privada para {phone}: {e}")
        raise  # Propaga para o RabbitMQ reencaminhar a mensagem (requeue_on_error=True na fila)

async def delayed_sync_chatwoot_name(client_id: int, phone: str, name: str, delay: int = 15):
    """
    Aguarda X segundos e sincroniza o nome do contato no Chatwoot com o nome do perfil do WhatsApp.
    """
    if not name or not phone:
        return
        
    await asyncio.sleep(delay)
    logger.info(f"🔄 [SYNC] Iniciando sincronização atrasada para {phone} ({name})")
    
    try:
        from chatwoot_client import ChatwootClient
        chatwoot = ChatwootClient(client_id=client_id)
        
        # Formatar telefone para busca (garante que tenha o + se necessário)
        clean_phone = "".join(filter(str.isdigit, phone))
        search_query = f"+{clean_phone}"
        
        # 1. Buscar contato pelo telefone
        search_res = await chatwoot.search_contact(search_query)
        
        # Fallback se não achou com +
        if not (search_res and search_res.get("payload")):
             search_res = await chatwoot.search_contact(clean_phone)

        if search_res and search_res.get("payload"):
            contact = search_res["payload"][0]
            contact_id = contact["id"]
            current_name = contact.get("name")
            
            # Só atualiza se o nome for diferente e o novo nome for válido
            if name and current_name != name:
                logger.info(f"🔄 [SYNC] Atualizando nome no Chatwoot para {phone}: '{current_name}' -> '{name}'")
                await chatwoot.update_contact(contact_id, {"name": name})
            else:
                logger.info(f"✅ [SYNC] Nome já está atualizado ou coincide para {phone}")
        else:
            logger.warning(f"⚠️ [SYNC] Contato {phone} não encontrado no Chatwoot para atualizar nome.")
            
    except Exception as e:
        logger.error(f"❌ [SYNC] Erro na sincronização atrasada de nome para {phone}: {e}")

async def handle_whatsapp_event(data: dict):
    """
    Processa eventos crus do Webhook da Meta.
    """
    try:
        entry = data.get("entry", [])
        if not entry: return

        db = SessionLocal()
        
        # Cache de config de retorno
        return_config = db.query(models.AppConfig).filter(models.AppConfig.key == "META_RETURN_CONFIG").first()
        return_url = return_config.value if return_config else None
        
        processed_events = []

        for item in entry:
            changes = item.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                
                # Mapa de contatos (wa_id -> profile_name) para sync de nome
                contacts_map = {}
                for c in value.get("contacts", []):
                    wa_id = c.get("wa_id")
                    p_name = c.get("profile", {}).get("name")
                    if wa_id and p_name:
                        contacts_map[wa_id] = p_name

                # 1. STATUS UPDATE (Sent, Delivered, Read, Failed)
                statuses = value.get("statuses", [])
                for status_obj in statuses:
                    msg_id = status_obj.get("id")
                    status = status_obj.get("status")
                    recipient = status_obj.get("recipient_id")
                    timestamp = status_obj.get("timestamp")
                    
                    if not msg_id or not status: continue
                    
                    logger.info(f"🔍 [DEBUG] Processing Status Update: msg_id={msg_id}, status={status}, recipient={recipient}")

                    # Sincronização de nome se disponível no status (raro, mas possível em alguns payloads)
                    # No status o 'recipient_id' é o telefone.
                    # Mas o nome só vem no objeto 'contacts' de mensagens de entrada.

                    # Limpar ID da mensagem (Meta costuma enviar com prefixo 'wamid.')
                    clean_msg_id = msg_id.replace("wamid.", "") if msg_id else msg_id
                    logger.info(f"🔄 [META_STATUS] Recebido evento '{status}' para {msg_id} (Clean: {clean_msg_id})")

                    # RETRY LOOP: O Envio no Engine e o Status do Webhook podem colidir
                    message_record = None
                    for attempt in range(10): # Aumentado de 3 para 10 para maior resiliência
                        message_record = db.query(models.MessageStatus).filter(
                             (models.MessageStatus.message_id == clean_msg_id) | 
                             (models.MessageStatus.message_id == msg_id)
                        ).with_for_update().first()
                        
                        if message_record: break
                        
                        if attempt < 9:
                            logger.info(f"   ⏳ [RETRY] MessageStatus {clean_msg_id} not found yet. Attempt {attempt+1}/10. Waiting 0.5s...")
                            await asyncio.sleep(0.5)
                            db.rollback() # Limpa cache da sessão para refletir mudanças do Engine
                            # db.close() # Keep session open for retry loop performance

                    if not message_record:
                         # Final attempt: refresh and search one last time without with_for_update to skip locks
                         db.rollback()
                         message_record = db.query(models.MessageStatus).filter(
                              (models.MessageStatus.message_id == clean_msg_id) | 
                              (models.MessageStatus.message_id == msg_id)
                         ).first()
                         
                         if not message_record:
                             # 🚀 SMART FALLBACK: Search by Recipient Phone if ID mismatch occurs (Common with Meta/Session messages)
                             try:
                                 recipient_clean = "".join(filter(str.isdigit, str(recipient)))
                                 if recipient_clean:
                                     # Procura por mensagens enviadas para este telefone nos últimos 5 minutos, independente do status (pode já ter sido atualizado)
                                     message_record = db.query(models.MessageStatus).filter(
                                         models.MessageStatus.phone_number.like(f"%{recipient_clean[-10:]}"),
                                         models.MessageStatus.timestamp >= datetime.now(timezone.utc) - timedelta(minutes=5)
                                     ).order_by(models.MessageStatus.timestamp.desc()).first()
                                     
                                     if message_record:
                                         print(f"✅ [SMART SEARCH] Match por Telefone: {recipient_clean} -> Msg ID {message_record.message_id}")
                                         logger.info(f"✅ [SMART SEARCH] Found matching message record by phone fallback for {recipient_clean} (Original msg_id: {message_record.message_id})")
                             except Exception as e_fallback:
                                 logger.warning(f"⚠️ [SMART SEARCH] Fallback search failed: {e_fallback}")

                         if not message_record:
                             logger.warning(f"⚠️ [DEBUG] MessageStatus NOT FOUND for msg_id={msg_id} (Clean: {clean_msg_id}) even after retries. Skipping.")
                             # Opcional: Logar registros recentes para este telefone para ajudar a debugar
                             try:
                                 recent = db.query(models.MessageStatus).order_by(models.MessageStatus.timestamp.desc()).limit(5).all()
                                 recent_ids = [m.message_id for m in recent]
                                 logger.info(f"   📋 Recent Message IDs in DB: {recent_ids}")
                             except: pass
                         else:
                             logger.info(f"   🕒 [FIX] MessageStatus {clean_msg_id} found in final non-locking attempt.")
                    
                    if message_record:
                        logger.info(f"✅ [META_STATUS] Registro encontrado no Banco. Status Atual: {message_record.status} -> Novo: {status} (Trigger ID: {message_record.trigger_id})")
                        old_status = message_record.status
                        
                        # Atualiza se mudou
                        if old_status != status:
                            message_record.status = status
                            message_record.updated_at = datetime.now(timezone.utc)
                            
                            # Capturar erro se houver
                            errors = status_obj.get("errors")
                            if status == "failed" and errors:
                                error_detail = f"{errors[0].get('code')}: {errors[0].get('title')}"
                                message_record.failure_reason = error_detail
                                logger.error(f"❌ [DEBUG] Message failed: {error_detail}")
                            
                            # Atualizar Trigger Pai (Contadores)
                            trigger = message_record.trigger
                            if not trigger:
                                logger.warning(f"⚠️ [DEBUG] Orphan MessageStatus (No parent trigger) for {msg_id}")
                            else:
                                logger.info(f"🔗 [DEBUG] Updating Parent Trigger {trigger.id} (Sent: {trigger.total_sent}, Delivered: {trigger.total_delivered})")
                                is_delivery = status in ['delivered', 'read']
                                was_delivery = old_status in ['delivered', 'read']
                                
                                # Incremento Delivered (STRICT ATOMIC IDEMPOTENCY)
                                if is_delivery:
                                    # Detectar custo via pricing do Meta (category vem no webhook de status)
                                    META_CATEGORY_PRICES_BRL = {
                                        "marketing":      0.35,
                                        "utility":        0.07,
                                        "service":        0.00,
                                        "authentication": 0.15,
                                    }
                                    pricing_obj = status_obj.get("pricing", {})
                                    meta_category = pricing_obj.get("category", "").lower() if pricing_obj else ""
                                    meta_billable = pricing_obj.get("billable", False) if pricing_obj else False

                                    # Guardar categoria no MessageStatus
                                    if meta_category:
                                        message_record.meta_price_category = meta_category

                                    # Determinar custo a usar
                                    if message_record.message_type == 'FREE_MESSAGE':
                                        cost_to_apply = 0.0
                                    elif trigger.cost_per_unit and trigger.cost_per_unit > 0:
                                        cost_to_apply = trigger.cost_per_unit
                                    elif meta_billable and meta_category in META_CATEGORY_PRICES_BRL:
                                        cost_to_apply = META_CATEGORY_PRICES_BRL[meta_category]
                                        trigger.cost_per_unit = cost_to_apply
                                    else:
                                        cost_to_apply = 0.0

                                    if cost_to_apply > 0:
                                        message_record.meta_price_brl = cost_to_apply

                                    from services.triggers_service import increment_delivery_stats
                                    
                                    # Determine cost if template
                                    cost_to_apply = 0.0
                                    if trigger.cost_per_unit and message_record.message_type != 'FREE_MESSAGE':
                                        cost_to_apply = trigger.cost_per_unit
                                        
                                    increment_delivery_stats(db, trigger, message_record, cost_to_apply)
                                    # Atomic increment handled the cost in DB. 
                                    db.refresh(trigger)

                                    # --- [PIPELINE MONITOR] TRANSITION TO STAGE 3 ---
                                    # Only for individual triggers/funnels that use the execution_history
                                    if not trigger.is_bulk:
                                        from services.engine import log_node_execution
                                        # 1. Finaliza Passo 2
                                        log_node_execution(
                                            db, trigger, 
                                            node_id='DELIVERY', 
                                            status='completed', 
                                            details='WhatsApp: Entrega confirmada!'
                                        )
                                        # 2. Inicia Passo 3 (Delay de Segurança)
                                        resume_at = datetime.now(timezone.utc) + timedelta(seconds=10)
                                        log_node_execution(
                                            db, trigger, 
                                            node_id='STABILIZATION', 
                                            status='processing', 
                                            details='Estabilizando conexão (10s)...',
                                            extra_data={
                                                "resumed_at": datetime.now(timezone.utc).isoformat(),
                                                "target_time": resume_at.isoformat()
                                            }
                                        )
                                    
                                    # Notificação N8N: enfileira apenas para disparos em massa
                                    if trigger.is_bulk:
                                        # Busca corpo do template no cache local
                                        template_body = None
                                        try:
                                            cached = db.query(models.WhatsAppTemplateCache).filter(
                                                models.WhatsAppTemplateCache.client_id == trigger.client_id,
                                                models.WhatsAppTemplateCache.name == trigger.template_name
                                            ).first()
                                            if cached:
                                                template_body = cached.body
                                        except Exception:
                                            pass



                                    # 🧠 TRIGGER AI MEMORY (Outgoing Message delivered)
                                    if message_record.content:
                                        msg_type_calc = "template" if "[Template:" in message_record.content else "text"
                                        try:
                                            await notify_ai_memory(
                                                client_id=trigger.client_id,
                                                phone=message_record.phone_number,
                                                content=message_record.content,
                                                msg_type=msg_type_calc,
                                                direction="outgoing"
                                            )
                                            logger.info(f"🧠 [AI MEMORY] Outgoing message queued for {message_record.phone_number}")
                                        except Exception as e_ai:
                                            logger.error(f"❌ [AI MEMORY] Error notifying AI Memory: {e_ai}")

                                
                                # Incremento Read
                                if status == 'read' and old_status != 'read':
                                    from services.triggers_service import increment_read_stats
                                    increment_read_stats(db, trigger.id)

                                # Incremento Failed
                                if status == 'failed' and old_status != 'failed':
                                    from services.triggers_service import increment_failed_stats
                                    increment_failed_stats(db, trigger.id)
                                    
                                    # Se falhou depois de ser dado como enviado, remove do contador de enviados (ATOMIC)
                                    if old_status == 'sent':
                                        db.execute(text("UPDATE scheduled_triggers SET total_sent = GREATEST(0, COALESCE(total_sent, 0) - 1) WHERE id = :tid"), {"tid": trigger.id})
                                        
                                    # Decrement delivered se mudou de delivered -> failed (raro, mas possível) (ATOMIC)
                                    if was_delivery:
                                        db.execute(text("UPDATE scheduled_triggers SET total_delivered = GREATEST(0, COALESCE(total_delivered, 0) - 1) WHERE id = :tid"), {"tid": trigger.id})
                                        # Estornar custo usando o valor real registrado no MessageStatus
                                        cost_to_reverse = message_record.meta_price_brl or trigger.cost_per_unit or 0.0
                                        if cost_to_reverse > 0 and message_record.message_type != 'FREE_MESSAGE':
                                            trigger.total_cost = max(0.0, (trigger.total_cost or 0.0) - cost_to_reverse)
                            
                            async def notify_progress():
                                if not trigger: return
                                
                                progress_data = {
                                    "trigger_id": trigger.id,
                                    "status": trigger.status,
                                    "sent": trigger.total_sent or 0,
                                    "failed": trigger.total_failed or 0,
                                    "total": len(trigger.contacts_list or []),
                                    "delivered": trigger.total_delivered or 0,
                                    "read": trigger.total_read or 0,
                                    "interactions": trigger.total_interactions or 0,
                                    "blocked": trigger.total_blocked or 0,
                                    "cost": trigger.total_cost or 0.0,
                                    "memory_sent": trigger.total_memory_sent or 0,
                                    "processed_contacts": trigger.processed_contacts or [],
                                    "pending_contacts": trigger.pending_contacts or []
                                }
                                await rabbitmq.publish_event("bulk_progress", progress_data)

                            db.commit()
                            logger.info(f"📊 Status Meta: {msg_id} ({status})")

                            # DEFERRED PIPELINE: Discovery, Labels, Memory and Notes now wait 10s for stabilization
                            if trigger and status in ['delivered', 'read']:
                                logger.info(f"⏳ [STATUS] Deferring post-delivery tasks for 10s (Trigger: {trigger.id}, Bulk: {trigger.is_bulk})")
                                asyncio.create_task(handle_deferred_post_delivery(trigger.id, message_record.id, status, msg_id, recipient))
                            
                            processed_events.append({
                                "type": "status",
                                "phone": recipient,
                                "status": status,
                                "message_id": msg_id,
                                "timestamp": timestamp,
                                "trigger_id": trigger.id if trigger else None
                            })

                # 2. INTERAÇÃO (Mensagens/Botões)
                messages = value.get("messages", [])
                for msg in messages:
                    # Log RAW para debug
                    logger.info(f"📨 [DEBUG] Incoming Message Payload: {json.dumps(msg)}")
                    
                    msg_type = msg.get("type")
                    from_phone = msg.get("from")
                    context = msg.get("context", {})

                    # --- LÓGICA DE SINCRONIZAÇÃO DE NOME (15 Segundos de Delay) ---
                    profile_name = contacts_map.get(from_phone)
                    if profile_name:
                         # Tenta descobrir o client_id para instanciar o ChatwootClient correto
                         # Vamos usar Client ID 1 como default se não encontrar nada melhor rápido,
                         # mas o ideal é buscar pela conta vinculada ao phone_number_id que vem no metadata
                         metadata = value.get("metadata", {})
                         pnid = metadata.get("phone_number_id")
                         target_client_id = 1
                         if pnid:
                             conf = db.query(models.AppConfig).filter(models.AppConfig.key == "WA_PHONE_NUMBER_ID", models.AppConfig.value == str(pnid)).first()
                             if conf: target_client_id = conf.client_id
                         
                         logger.info(f"🕒 Agendando sincronização de nome para {from_phone} ({profile_name}) em 15s...")
                         asyncio.create_task(delayed_sync_chatwoot_name(target_client_id, from_phone, profile_name, 15))

                    # Determine if this message should trigger a funnel
                    is_triggerable = msg_type in ['button', 'interactive', 'text'] 
                    
                    if is_triggerable:
                        user_input = ""
                        if msg_type == 'button':
                            user_input = msg.get("button", {}).get("text", "")
                        elif msg_type == 'interactive':
                            reply = msg.get("interactive", {})
                            user_input = (reply.get("button_reply", {}).get("title") or 
                                         reply.get("list_reply", {}).get("title") or "")
                        elif msg_type == 'text':
                            user_input = msg.get("text", {}).get("body", "")
                        
                        user_input_clean = user_input.lower().strip()
                        if not user_input_clean:
                            continue

                        logger.info(f"🎯 [DEBUG] Input detectado: '{user_input_clean}' (Type: {msg_type}) de {from_phone}")
                        button_text = user_input_clean # Compatibility with downstream block

                        # 🧠 TRIGGER AI MEMORY (Incoming Message)
                        try:
                            # Tenta descobrir o client_id logo no início para o AI Memory também
                            metadata = value.get("metadata", {})
                            pnid = metadata.get("phone_number_id")
                            inc_client_id = 1
                            if pnid:
                                try:
                                    conf = db.query(models.AppConfig).filter(models.AppConfig.key == "WA_PHONE_NUMBER_ID", models.AppConfig.value == str(pnid)).first()
                                    if conf: inc_client_id = conf.client_id
                                except: pass

                            await notify_ai_memory(
                                client_id=inc_client_id,
                                phone=from_phone,
                                content=user_input,
                                msg_type="text",
                                direction="incoming"
                            )
                            logger.info(f"🧠 [AI MEMORY] Incoming message queued for {from_phone}")
                        except Exception as e_ai:
                            logger.error(f"❌ [AI MEMORY] Error notifying AI Memory (Incoming): {e_ai}")
                        
                        # 1. Identificar o CLIENTE (Identificação robusta)
                        current_msg_client_id = None
                        trigger = None
                        original_wamid = context.get("id")
                        if original_wamid:
                            clean_orig_id = original_wamid.replace("wamid.", "")
                            original_msg = db.query(models.MessageStatus).filter(
                                (models.MessageStatus.message_id == original_wamid) |
                                (models.MessageStatus.message_id == clean_orig_id)
                            ).first()
                            if original_msg:
                                trigger = original_msg.trigger
                                if trigger:
                                    current_msg_client_id = trigger.client_id

                        # Fallback: Se não achou pela mensagem, busca pela conta da Meta
                        if not current_msg_client_id:
                            phone_number_id = value.get("metadata", {}).get("phone_number_id")
                            if phone_number_id:
                                client_config = db.query(models.AppConfig).filter(
                                    models.AppConfig.key == "WA_PHONE_NUMBER_ID",
                                    models.AppConfig.value == str(phone_number_id)
                                ).first()
                                if client_config:
                                    current_msg_client_id = client_config.client_id

                        if not current_msg_client_id:
                            logger.error(f"❌ Não foi possível identificar o cliente para {from_phone}")
                            continue

                        # --- NEW: Real-time Window Cache Update ---
                        # We just received a message, so we KNOW the 24h window is open.
                        # Updating the local cache here prevents race conditions with Chatwoot API.
                        try:
                            clean_from = "".join(filter(str.isdigit, str(from_phone)))
                            # Use query to find existing entry
                            existing_window = db.query(models.ContactWindow).filter(
                                models.ContactWindow.client_id == current_msg_client_id,
                                models.ContactWindow.phone == clean_from
                            ).first()
                            
                            now_utc = datetime.now(timezone.utc)
                            if existing_window:
                                existing_window.last_interaction_at = now_utc
                                logger.info(f"✨ [WINDOW CACHE] Updated window for {from_phone}")
                            else:
                                db.add(models.ContactWindow(
                                    client_id=current_msg_client_id,
                                    phone=clean_from,
                                    last_interaction_at=now_utc
                                ))
                                logger.info(f"✨ [WINDOW CACHE] Created new window entry for {from_phone}")
                            db.commit()
                        except Exception as win_err:
                            logger.warning(f"⚠️ [WINDOW CACHE] Failed to update local window: {win_err}")
                            db.rollback()

                        # 2. LÓGICA DE BLOQUEIO / INTERAÇÃO
                        db_keywords = get_setting("AUTO_BLOCK_KEYWORDS", "", client_id=current_msg_client_id)
                        
                        if db_keywords:
                            block_keywords = [k.strip().lower() for k in db_keywords.split(",") if k.strip()]
                        else:
                            # Default fallback
                            block_keywords = ["bloquear", "parar", "sair", "cancelar", "não quero", "nao quero", "stop", "unsubscribe", "opt-out", "descadastrar"]
                        
                        is_block_request = any(k in user_input_clean for k in block_keywords)

                        if is_block_request:
                            logger.info(f"🚫 [DEBUG] Pedido de Bloqueio detectado de {from_phone}")
                            if trigger:
                                trigger.total_blocked = (trigger.total_blocked or 0) + 1
                            
                            # Add to blocked contacts
                            contact_name = value.get("contacts", [{}])[0].get("profile", {}).get("name")
                            
                            # Normalize from_phone
                            clean_from = "".join(filter(str.isdigit, str(from_phone)))
                            # Use casting or explicit slicing check to satisfy lint
                            clean_from_str = str(clean_from)
                            suffix = clean_from_str[-8:] if len(clean_from_str) >= 8 else clean_from_str

                            already_blocked = db.query(models.BlockedContact).filter(
                                models.BlockedContact.client_id == current_msg_client_id,
                                models.BlockedContact.phone.like(f"%{suffix}")
                            ).first()
                            if not already_blocked:
                                clean_from_phone = "".join(filter(str.isdigit, str(from_phone)))
                                db.add(models.BlockedContact(
                                    client_id=current_msg_client_id, 
                                    phone=clean_from_phone, 
                                    name=contact_name,
                                    reason=f"Auto-bloqueio: {button_text}"
                                ))
                            db.commit()
                        else:
                            # Se NÃO é bloqueio, conta como interação se houver um trigger associado e for a PRIMEIRA vez (Unique per message)
                            if trigger:
                                # Look for the specific message status to check if it already was an interaction
                                reply_to_id = clean_orig_id if original_wamid else None
                                if reply_to_id:
                                    ms = db.query(models.MessageStatus).filter(models.MessageStatus.message_id == reply_to_id).first()
                                    if ms:
                                        if not ms.is_interaction:
                                            ms.is_interaction = True
                                            trigger.total_interactions = (trigger.total_interactions or 0) + 1
                                            db.add(ms) # Ensure update
                                            logger.info(f"📈 [INTERACTION] Unique interaction counted for trigger {trigger.id} (Msg: {reply_to_id})")
                                        else:
                                            logger.info(f"ℹ️ [INTERACTION] Duplicate interaction ignored for Msg: {reply_to_id}")
                                    else:
                                        # Fallback if MessageStatus missing (unlikely)
                                        trigger.total_interactions = (trigger.total_interactions or 0) + 1
                                else:
                                    # Fallback for OLD interactions without reply_to_id
                                    trigger.total_interactions = (trigger.total_interactions or 0) + 1
                                
                                db.commit()
                            
                            # Define client_id para o restante do fluxo (funis)
                            client_id = current_msg_client_id

                            # 3. LÓGICA DE GATILHO DE FUNIL
                            # Mapear funis que tenham a frase (comparação case-insensitive e multi-keyword)
                            matched_funnel = db.query(models.Funnel).filter(
                                models.Funnel.client_id == client_id,
                                or_(
                                    func.lower(models.Funnel.trigger_phrase) == button_text,
                                    models.Funnel.trigger_phrase.ilike(f"%,{button_text},%"),
                                    models.Funnel.trigger_phrase.ilike(f"{button_text},%"),
                                    models.Funnel.trigger_phrase.ilike(f"%,{button_text}"),
                                    # Suporte para espaços após a vírgula
                                    models.Funnel.trigger_phrase.ilike(f"%, {button_text},%"),
                                    models.Funnel.trigger_phrase.ilike(f"%, {button_text}")
                                )
                            ).first()

                            if matched_funnel:
                                # Idempotency Check for Button Click (Don't trigger if already triggered recently for THIS funnel + phone)
                                limit_time = datetime.now(timezone.utc) - timedelta(seconds=20)
                                already_running = db.query(models.ScheduledTrigger).filter(
                                    models.ScheduledTrigger.client_id == client_id,
                                    models.ScheduledTrigger.funnel_id == matched_funnel.id,
                                    models.ScheduledTrigger.contact_phone.in_([from_phone, "".join(filter(str.isdigit, str(from_phone)))]),
                                    models.ScheduledTrigger.created_at >= limit_time
                                ).first()

                                if already_running:
                                    logger.warning(f"⏩ [IDEMPOTENCY] Funnel '{matched_funnel.name}' already triggered recently for {from_phone}. Ignoring duplicate click.")
                                    return

                                logger.info(f"🚀 Disparando funil: {matched_funnel.name} (ID: {matched_funnel.id})")
                                
                                # Individual Execution
                                contact_name = value.get("contacts", [{}])[0].get("profile", {}).get("name")
                                
                                # PRE-RESOLVE Conversation ID to avoid lookup failures later
                                logger.info(f"🔍 [PRE-RESOLVE] Getting conversation for {from_phone}...")
                                from chatwoot_client import ChatwootClient
                                cw = ChatwootClient(client_id=client_id)
                                inbox_id_cw = await cw.get_default_whatsapp_inbox()
                                conv_res = await cw.ensure_conversation(from_phone, contact_name or from_phone, inbox_id_cw)
                                conv_id_resolved = conv_res.get("conversation_id") if conv_res else None
                                cw_account_id = conv_res.get("account_id") if conv_res else None
                                cw_contact_id = conv_res.get("contact_id") if conv_res else None
                                
                                # --- NEW: Sync Inbound Message to Chatwoot (Reset 24h Timer) ---
                                # This makes the user's interaction visible in Chatwoot UI and enables sending session messages.
                                try:
                                    await cw.send_message(
                                        conversation_id=conv_id_resolved,
                                        content=button_text,
                                        message_type="incoming"
                                    )
                                    logger.info(f"🚀 [CHATWOOT SYNC] Inbound message '{button_text}' synced to convo {conv_id_resolved}")
                                except Exception as sync_err:
                                    if "422" in str(sync_err) or "Api inboxes" in str(sync_err):
                                        logger.info(f"ℹ️ [CHATWOOT SYNC] Sincronização pulada: Inbox Oficial não permite criação manual de interações (422).")
                                    else:
                                        logger.warning(f"⚠️ [CHATWOOT SYNC] Falha ao sincronizar interação: {sync_err}")

                                # --- NEW: Immediate Window ID Sync ---
                                # We just got the convo ID, so we must associate it with the fresh window timestamp.
                                try:
                                    clean_from = "".join(filter(str.isdigit, str(from_phone)))
                                    existing_win = db.query(models.ContactWindow).filter(
                                        models.ContactWindow.client_id == client_id,
                                        models.ContactWindow.phone == clean_from
                                    ).first()
                                    if existing_win:
                                        existing_win.chatwoot_conversation_id = conv_id_resolved
                                        existing_win.last_interaction_at = datetime.now(timezone.utc)
                                    else:
                                        db.add(models.ContactWindow(
                                            client_id=client_id,
                                            phone=clean_from,
                                            chatwoot_conversation_id=conv_id_resolved,
                                            last_interaction_at=datetime.now(timezone.utc)
                                        ))
                                    db.commit()
                                    logger.info(f"✨ [WINDOW SYNC] Linked conversation {conv_id_resolved} for {from_phone}")
                                except Exception as sync_err:
                                    logger.warning(f"⚠️ [WINDOW SYNC] Failed to sync window ID: {sync_err}")
                                    db.rollback()

                                # --- ATOMIC IDEMPOTENCY CHECK (Anti-Double Trigger with Race Condition Protection) ---
                                from sqlalchemy import text
                                import zlib
                                
                                # Gera um lock ID determinístico (32-bit int) para o par (cliente, telefone, funil)
                                norm_phone = normalize_phone(from_phone)
                                lock_key = f"lock_{client_id}_{norm_phone}_{matched_funnel.id}"
                                lock_id = zlib.adler32(lock_key.encode()) & 0x7FFFFFFF

                                # Bloqueia a execução concorrente para este par específico durante esta transação
                                db.execute(text("SELECT pg_advisory_xact_lock(:id)"), {"id": lock_id})

                                limit_time = datetime.now(timezone.utc) - timedelta(seconds=30)

                                existing_trigger = db.query(models.ScheduledTrigger).filter(
                                    models.ScheduledTrigger.client_id == client_id,
                                    models.ScheduledTrigger.funnel_id == matched_funnel.id,
                                    models.ScheduledTrigger.contact_phone.in_([from_phone, norm_phone]),
                                    models.ScheduledTrigger.created_at >= limit_time,
                                    models.ScheduledTrigger.status != 'cancelled'
                                ).first()

                                if existing_trigger:
                                    logger.warning(f"⏭️ [IDEMPOTENCY] Trigger para funil {matched_funnel.id} e contato {from_phone} já criado recentemente (ID: {existing_trigger.id}). Pulando duplicata.")
                                    continue

                                new_trigger = models.ScheduledTrigger(
                                    client_id=client_id,
                                    funnel_id=matched_funnel.id,
                                    contact_phone=from_phone,
                                    contact_name=contact_name,
                                    conversation_id=conv_id_resolved, # STORED ID
                                    chatwoot_account_id=cw_account_id, # STORED CONTEXT
                                    chatwoot_contact_id=cw_contact_id, # STORED CONTEXT
                                    status='processing',
                                    scheduled_time=datetime.now(timezone.utc),
                                    template_name=f"Interação: {button_text}", # Visible Name
                                    is_bulk=False,
                                    is_interaction=True,
                                    parent_id=trigger.id if trigger else None, # Link to originator
                                    skip_block_check=False # Interactions skip block check? Let's keep it safe.
                                )
                                db.add(new_trigger)
                                db.commit()
                                logger.info(f"✅ Execução individual criada para {from_phone} (ID: {new_trigger.id})")

                                # --- NEW: Dispatch Immediately to Engine ---
                                await rabbitmq.publish("zapvoice_funnel_executions", {
                                    "trigger_id": new_trigger.id,
                                    "funnel_id": matched_funnel.id,
                                    "conversation_id": conv_id_resolved,
                                    "contact_phone": from_phone,
                                    "chatwoot_contact_id": cw_contact_id,
                                    "chatwoot_account_id": cw_account_id,
                                    "chatwoot_inbox_id": inbox_id_cw
                                })
                                logger.info(f"🚀 [DISPATCH] Funil '{matched_funnel.name}' enviado para execução imediata.")
                                
                                # --- NEW: Real-time UI Update for new trigger ---
                                try:
                                    from services.engine import trigger_to_dict
                                    await rabbitmq.publish_event("trigger_progress", trigger_to_dict(new_trigger))
                                except Exception as e_ws:
                                    logger.error(f"❌ [WS] Erro ao notificar novo trigger: {e_ws}")
                            else:
                                logger.warning(f"❓ Nenhum funil encontrado para a frase: '{button_text}' (Cliente {client_id})")


                        # Global Progress Notification for the original trigger (if exists)
                        if trigger:
                            try:
                                from services.engine import trigger_to_dict
                                event_payload = trigger_to_dict(trigger)
                                # Emite ambos para compatibilidade com partes antigas e novas do sistema
                                await rabbitmq.publish_event("bulk_progress", event_payload)
                                await rabbitmq.publish_event("trigger_progress", event_payload)
                            except Exception as e_ws:
                                logger.error(f"❌ [WS] Erro ao notificar progresso: {e_ws}")

                        processed_events.append({
                            "type": "interaction",
                            "subtype": msg_type,
                            "phone": from_phone,
                            "is_block": is_block_request,
                            "payload": button_text,
                            "trigger_id": trigger.id if trigger else None
                        })

        db.close()

        # 3. RETORNO EXTERNO (Se configurado)
        if return_url and processed_events:
            async with httpx.AsyncClient() as client:
                try:
                    await client.post(return_url, json={"events": processed_events}, timeout=5.0)
                    logger.info(f"📤 Eventos encaminhados para {return_url}")
                except Exception as e:
                    logger.error(f"❌ Falha ao enviar para Return URL: {e}")

    except Exception as e:
        logger.error(f"❌ Erro fatal processando evento WhatsApp: {e}")

async def update_node_history_extra(db: Session, trigger_id: int, node_id: str, field: str, value: str):
    """
    Updates a specific field inside the 'extra' JSONB object of a node in execution_history.
    Generic version of update_node_memory_status.
    """
    try:
        from sqlalchemy import text
        import json
        
        sql = text("""
            UPDATE scheduled_triggers 
            SET execution_history = (
                SELECT jsonb_agg(
                    CASE 
                        WHEN (elem->>'node_id') = :node_id THEN 
                            jsonb_set(
                                jsonb_set(elem, '{extra}', COALESCE(elem->'extra', '{}'::jsonb), true),
                                ARRAY['extra', :field], :val, true
                            )
                        ELSE elem 
                    END
                )
                FROM jsonb_array_elements(COALESCE(execution_history, '[]'::jsonb)) AS elem
            )
            WHERE id = :trigger_id
        """)
        
        db.execute(sql, {
            "node_id": node_id, 
            "field": field,
            "val": json.dumps(value), 
            "trigger_id": trigger_id
        })
        db.commit()
    except Exception as e:
        logger.error(f"❌ [DB UPDATE] Failed to update node history extra ({field}): {e}")
        db.rollback()

async def update_node_memory_status(db: Session, trigger_id: int, node_id: str, status: str):
    """Backward compatibility wrapper for update_node_history_extra"""
    await update_node_history_extra(db, trigger_id, node_id, "memory_status", status)

async def handle_deferred_post_delivery(trigger_id: int, message_record_id: int, status: str, msg_id: str, recipient: str):
    """
    Handles Discovery, Labels, Memory and Private Notes AFTER a 10s stabilization delay.
    This ensures we don't 'jump' steps in the UI and data is synced correctly with Meta/Chatwoot.
    """
    await asyncio.sleep(10) # Standard Stabilization Delay
    
    db = SessionLocal()
    try:
        # Re-fetch fresh objects in this session
        trigger = db.query(models.ScheduledTrigger).get(trigger_id)
        message_record = db.query(models.MessageStatus).get(message_record_id)
        
        if not trigger or not message_record:
            logger.warning(f"⚠️ [DEFERRED] Trigger {trigger_id} or Message {message_record_id} not found. Aborting.")
            return

        # RESOLVE CONTACT NAME (Important for Bulk)
        contact_name = trigger.contact_name
        if not contact_name and trigger.is_bulk and trigger.contacts_list:
            try:
                clean_p = "".join(filter(str.isdigit, str(recipient)))
                for c in trigger.contacts_list or []:
                    val = c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '')
                    c_phone = "".join(filter(str.isdigit, str(val)))
                    if c_phone == clean_p or (len(c_phone) >= 8 and len(clean_p) >= 8 and c_phone[-8:] == clean_p[-8:]):
                        if isinstance(c, dict):
                            contact_name = (
                                c.get('{{1}}') or c.get('1') or c.get('nome') or 
                                c.get('name') or c.get('full_name') or c.get('contact_name') or ""
                            )
                        break
            except Exception as e_name:
                logger.warning(f"⚠️ [DEFERRED] Error resolving name from list: {e_name}")

        final_display_name = contact_name or f"Cliente_{recipient}"

        # 1. Log Discovery Start (Step 4)
        log_node_execution(
            db, trigger, 
            node_id='DISCOVERY', 
            status='processing', 
            details='🧬 Iniciando sincronização pós-estabilização...'
        )
        db.commit()

        # 2. Chatwoot Discovery & Conversation Sync
        convo_id = trigger.conversation_id
        chatwoot_account_id = trigger.chatwoot_account_id
        chatwoot_contact_id = trigger.chatwoot_contact_id
        
        if not convo_id:
            logger.info(f"🆕 [DEFERRED] Creating conversation for {recipient}...")
            try:
                from chatwoot_client import ChatwootClient
                cw_temp = ChatwootClient(client_id=trigger.client_id)
                inbox_id = await cw_temp.get_default_whatsapp_inbox()
                conv_res = await cw_temp.ensure_conversation(
                    phone_number=recipient,
                    name=final_display_name,
                    inbox_id=inbox_id
                )
                convo_id = conv_res.get("conversation_id") if conv_res else None
                if convo_id:
                    trigger.conversation_id = convo_id
                    chatwoot_account_id = conv_res.get("account_id")
                    chatwoot_contact_id = conv_res.get("contact_id")
                    message_record.trigger_id = trigger.id
                    db.commit()
                    
                    # Sync content for history
                    sync_content = message_record.content
                    if sync_content and not sync_content.startswith("[Template:") and message_record.message_type != 'FREE_MESSAGE':
                        await cw_temp.send_message(convo_id, sync_content, message_type="outgoing")
                    
                    # Notify UI that Step 4 (Discovery) is done
                    from services.engine import trigger_to_dict
                    await rabbitmq.publish_event("bulk_progress", trigger_to_dict(trigger))
            except Exception as e:
                logger.error(f"❌ [DEFERRED] Error in Discovery: {e}")

        # 3. Labels Logic
        if convo_id and trigger.integration_id and trigger.event_type:
            mapping = db.query(models.WebhookEventMapping).filter(
                models.WebhookEventMapping.integration_id == trigger.integration_id,
                models.WebhookEventMapping.event_type == trigger.event_type
            ).first()
            
            if mapping and mapping.chatwoot_label:
                try:
                    from core.utils import robust_extract_labels
                    valid_labels = robust_extract_labels(mapping.chatwoot_label)
                    if valid_labels:
                        from chatwoot_client import ChatwootClient
                        chatwoot_cl = ChatwootClient(client_id=trigger.client_id)
                        await chatwoot_cl.add_label_to_conversation(convo_id, valid_labels)
                        trigger.label_added = True
                        db.commit()
                except Exception: pass

        log_node_execution(
            db, trigger, 
            node_id='DISCOVERY', 
            status='completed', 
            details='🧬 CONTEXTO: CHATWOOT SINCRONIZADO',
            extra_data={
                "account_id": chatwoot_account_id,
                "conversation_id": convo_id,
                "contact_id": chatwoot_contact_id
            }
        )
        db.commit()

        # 4. Memory Webhook
        memory_webhook = get_setting("AGENT_MEMORY_WEBHOOK_URL", "", client_id=trigger.client_id)
        individual_toggle = message_record.publish_external_event or trigger.publish_external_event
        
        # LÓGICA HÍBRIDA: 
        # - Se for Disparo em Massa (Bulk), dispara sempre que a URL estiver configurada.
        # - Se for Disparo Individual (Funil/Integração), respeita o toggle 'publish_external_event' configurado no nó.
        should_trigger_memory = False
        if (memory_webhook and str(memory_webhook).strip()):
            if trigger.is_bulk:
                should_trigger_memory = True
            else:
                should_trigger_memory = individual_toggle
        
        logger.info(f"🧠 [MEMORY DEBUG] Trigger {trigger.id} | Bulk: {trigger.is_bulk} | URL: {bool(memory_webhook)} | Toggle: {individual_toggle} | Should: {should_trigger_memory}")

        if should_trigger_memory:
            # 1. Tentar Lock Atômico (Incluindo retentativa se estiver 'pending' há mais de 30s)
            from datetime import datetime, timezone, timedelta
            stale_limit = datetime.now(timezone.utc) - timedelta(seconds=30)
            
            # Filtro robusto: Aceita se for None, 'failed' ou se estiver 'pending' travado (stale)
            if (message_record.memory_webhook_status is None or 
                message_record.memory_webhook_status == "failed" or
                (message_record.memory_webhook_status == "pending" and message_record.updated_at and message_record.updated_at < stale_limit)):
                
                locked = db.query(models.MessageStatus).filter(
                    models.MessageStatus.id == message_record.id,
                    or_(
                        models.MessageStatus.memory_webhook_status == None, 
                        models.MessageStatus.memory_webhook_status == "failed",
                        and_(models.MessageStatus.memory_webhook_status == "pending", models.MessageStatus.updated_at < stale_limit)
                    )
                ).update({"memory_webhook_status": "pending", "updated_at": datetime.now(timezone.utc)})
                db.commit()

                logger.info(f"🧠 [MEMORY DEBUG] Locked: {locked} for Msg {message_record.id}")

                if locked > 0:
                    try:
                        # RENDER TEMPLATE CONTENT FOR AI MEMORY
                        final_content = message_record.content
                        
                        # -----------------------------------------------------------------
                        # NOVO: Fallback para Nó de Texto se o conteúdo estiver vazio (Race Condition)
                        # -----------------------------------------------------------------
                        if not final_content or not str(final_content).strip():
                             try:
                                 # Recuperamos o ID do nó que gerou esta mensagem
                                 node_id = message_record.node_id or trigger.current_node_id
                                 if node_id:
                                     # Buscamos o funil para ler o conteúdo original do nó no grafo
                                     from models import Funnel
                                     fun_obj = db.query(Funnel).filter(Funnel.id == trigger.funnel_id).first()
                                     if fun_obj and fun_obj.steps:
                                         import json
                                         # O campo 'steps' armazena o JSON do Grafo (nodes/edges)
                                         graph_data = fun_obj.steps if isinstance(fun_obj.steps, dict) else json.loads(fun_obj.steps)
                                         nodes_list = graph_data.get("nodes", [])
                                         # Localiza o nó exato pelo ID
                                         node_data = next((n for n in nodes_list if str(n.get("id")) == str(node_id)), None)
                                         if node_data:
                                             node_d = node_data.get("data", {})
                                             # Tenta capturar o texto de diferentes formatos de nó
                                             raw_text = node_d.get("content") or node_d.get("text") or node_d.get("caption")
                                             if raw_text:
                                                 final_content = raw_text
                                                 logger.info(f"✅ [MEMORY FALLBACK] Conteúdo recuperado do Nó {node_id}: {final_content[:50]}...")
                             except Exception as e:
                                 logger.error(f"⚠️ [MEMORY FALLBACK] Erro ao recuperar texto do nó: {e}")

                        if final_content and "[Template:" in final_content:
                            tpl_name = message_record.template_name or trigger.template_name
                            if not tpl_name:
                                import re
                                match = re.search(r"\[Template:\s*(.*?)\]", final_content)
                                tpl_name = match.group(1) if match else None
                            
                            if tpl_name:
                                from models import WhatsAppTemplateCache
                                tpl_cache = db.query(WhatsAppTemplateCache).filter(
                                    WhatsAppTemplateCache.name == tpl_name,
                                    WhatsAppTemplateCache.client_id == trigger.client_id
                                ).first()
                                if tpl_cache:
                                    from services.bulk import render_template_body
                                    final_content = render_template_body(
                                        tpl_cache.body,
                                        trigger.template_components or [],
                                        contact_name=trigger.contact_name or recipient,
                                        var1=message_record.var1,
                                        var2=message_record.var2,
                                        var3=message_record.var3,
                                        var4=message_record.var4,
                                        var5=message_record.var5
                                    )

                        from services.ai_memory import notify_agent_memory_webhook
                        await notify_agent_memory_webhook(
                            client_id=trigger.client_id,
                            phone=recipient,
                            name=final_display_name,
                            template_name=message_record.template_name or trigger.template_name or "Mensagem",
                            content=final_content,
                            trigger_id=trigger.id,
                            node_id="DELIVERY"
                        )
                        # Notify UI that Memory Task is enqueued
                        from services.engine import trigger_to_dict
                        await rabbitmq.publish_event("bulk_progress", trigger_to_dict(trigger))
                    except Exception as e_mem:
                        logger.error(f"❌ [DEFERRED] Error rendering/sending memory: {e_mem}")

        # 5. Private Note
        if trigger.is_bulk and status in ['delivered', 'read'] and message_record.pending_private_note and not message_record.private_note_posted:
            locked = db.query(models.MessageStatus).filter(
                models.MessageStatus.id == message_record.id,
                models.MessageStatus.private_note_posted == False
            ).update({"private_note_posted": True})
            db.commit()

            if locked > 0:
                try:
                    queue_data = {
                        "client_id": trigger.client_id,
                        "phone": recipient,
                        "message": message_record.pending_private_note,
                        "trigger_id": trigger.id,
                        "delay": trigger.private_message_delay or 5,
                        "concurrency": trigger.private_message_concurrency or 1
                    }
                    await rabbitmq.publish("chatwoot_private_messages", queue_data)
                except Exception: pass

        # 6. Finalization
        if not trigger.is_bulk:
            trigger.status = 'completed'
            log_node_execution(
                db, trigger, 
                node_id='DELIVERY', 
                status='completed', 
                details='✅ Automação finalizada com sucesso',
                extra_data={
                    "memory_status": "processing",
                    "private_note_status": "processing" if message_record.private_note_posted else "not_needed"
                }
            )
            db.commit()
            
            # Final Progress Notification
            try:
                from services.engine import trigger_to_dict
                await rabbitmq.publish_event("bulk_progress", trigger_to_dict(trigger))
            except: pass

        logger.info(f"🏁 [DEFERRED] Pipeline finished for {recipient} (Trigger: {trigger_id})")

    except Exception as e:
        logger.error(f"❌ [DEFERRED] Critical error in post-delivery task: {e}")
    finally:
        db.close()

async def handle_agent_memory_webhook(data: dict):
    """
    Processa o envio de dados para o Webhook de Memória do Agente de forma sequencial.
    """
    client_id = data.get("client_id")
    phone = data.get("contact_phone")
    trigger_id = data.get("trigger_id")
    node_id = data.get("node_id")
    
    db = SessionLocal()
    try:
        # 1. Buscar a URL mais atualizada do banco para este cliente
        webhook_url = get_setting("AGENT_MEMORY_WEBHOOK_URL", "", client_id=client_id)
        
        if not webhook_url or not str(webhook_url).strip():
            logger.warning(f"⚠️ [Webhook Memory Worker] URL não configurada no banco (AppConfig) para o cliente {client_id}. Verifique as configurações de Integração.")
            # Marcar no banco que não foi enviado por falta de configuração
            if trigger_id:
                # Update MessageStatus
                db.query(models.MessageStatus).filter(
                    models.MessageStatus.trigger_id == trigger_id,
                    models.MessageStatus.phone_number == phone
                ).update({"memory_webhook_status": "not_configured"})
                
                # Update Execution History (Atomic)
                if node_id:
                     await update_node_memory_status(db, trigger_id, node_id, "not_configured")
                
                db.commit()
            return

        logger.info(f"🔗 [Webhook Memory Worker] Enviando dados de {phone} para {webhook_url}")
        
        # 2. Realizar o POST para o Webhook externo
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(webhook_url, json=data)
                
                if response.status_code >= 400:
                    error_msg = f"HTTP {response.status_code}"
                    logger.warning(f"⚠️ [Webhook Memory Worker] Retorno inesperado ({error_msg}) de {webhook_url}")
                    if trigger_id:
                        db.query(models.MessageStatus).filter(
                            models.MessageStatus.trigger_id == trigger_id,
                            models.MessageStatus.phone_number == phone
                        ).update({"memory_webhook_status": "failed", "memory_webhook_error": error_msg})
                        
                        if node_id:
                             await update_node_memory_status(db, trigger_id, node_id, "failed")
                             
                        db.commit()
                else:
                    logger.info(f"✅ [Webhook Memory Worker] Webhook notificado com sucesso para {phone}")
                    if trigger_id:
                        db.query(models.MessageStatus).filter(
                            models.MessageStatus.trigger_id == trigger_id,
                            models.MessageStatus.phone_number == phone
                        ).update({"memory_webhook_status": "sent"})
                        
                        # Increment summary counter on the trigger for better UI visibility
                        db.query(models.ScheduledTrigger).filter(
                            models.ScheduledTrigger.id == trigger_id
                        ).update({"total_memory_sent": models.ScheduledTrigger.total_memory_sent + 1})
                        
                        # Update Execution History (Atomic - Success)
                        if node_id:
                             await update_node_memory_status(db, trigger_id, node_id, "success")
                             
                             # NOTIFY UI (REAL-TIME)
                             trigger = db.query(models.ScheduledTrigger).get(trigger_id)
                             if trigger:
                                 from services.engine import trigger_to_dict
                                 await rabbitmq.publish_event("bulk_progress", trigger_to_dict(trigger))
                        
                        db.commit()
        except Exception as post_err:
            logger.error(f"❌ [Webhook Memory Worker] Erro de conexão ao enviar para {webhook_url}: {post_err}")
            if trigger_id:
                db.query(models.MessageStatus).filter(
                    models.MessageStatus.trigger_id == trigger_id,
                    models.MessageStatus.phone_number == phone
                ).update({"memory_webhook_status": "failed", "memory_webhook_error": str(post_err)})
                
                # Update Execution History (Atomic - Failure)
                if node_id:
                     await update_node_memory_status(db, trigger_id, node_id, "failed")
                
                db.commit()
                
    except Exception as e:
        logger.error(f"❌ [Webhook Memory Worker] Falha ao processar envio para {phone}: {e}")
    finally:
        db.close()

async def handle_chatwoot_private_message(data: dict):
    """
    Consumidor dedicado para envio de notas privadas no Chatwoot via RabbitMQ.
    Isso permite retry individual e controle de vazão (Throttling).
    """
    client_id = data.get("client_id")
    phone = data.get("phone")
    message = data.get("message")
    trigger_id = data.get("trigger_id")
    conversation_id = data.get("conversation_id")
    delay = data.get("delay", 5)
    
    if delay > 0:
        await asyncio.sleep(delay)
        
    db = SessionLocal()
    try:
        from chatwoot_client import ChatwootClient
        cw = ChatwootClient(client_id=client_id)
        
        # 1. Se não temos conversation_id, tentamos descobrir
        if not conversation_id:
            inbox_id = await cw.get_default_whatsapp_inbox()
            conv_res = await cw.ensure_conversation(phone, phone, inbox_id)
            conversation_id = conv_res.get("conversation_id") if conv_res else None
            
        if conversation_id:
            logger.info(f"💬 [PRIVATE_NOTE] Enviando nota para Conv {conversation_id} (Cliente {client_id})")
            res = await cw.create_private_note(conversation_id, message)
            
            if res:
                from services.triggers_service import increment_private_note_stats
                increment_private_note_stats(db, trigger_id)
                
                # ATUALIZAÇÃO DE STATUS NO HISTÓRICO (RAIO-X)
                if trigger_id:
                    await update_node_history_extra(db, trigger_id, "DELIVERY", "private_note_status", "success")
                    
                    # NOTIFY UI (REAL-TIME)
                    trigger = db.query(models.ScheduledTrigger).get(trigger_id)
                    if trigger:
                        from services.engine import trigger_to_dict
                        await rabbitmq.publish_event("bulk_progress", trigger_to_dict(trigger))
                
                logger.info(f"✅ [PRIVATE_NOTE] Nota enviada com sucesso para {phone}")
            else:
                logger.warning(f"⚠️ [PRIVATE_NOTE] Falha ao enviar nota para {phone}")
                if trigger_id:
                    await update_node_history_extra(db, trigger_id, "DELIVERY", "private_note_status", "failed")
        else:
            logger.error(f"❌ [PRIVATE_NOTE] Não foi possível encontrar conversa para enviar nota: {phone}")
            if trigger_id:
                await update_node_history_extra(db, trigger_id, "DELIVERY", "private_note_status", "failed")
                
    except Exception as e:
        logger.error(f"❌ [PRIVATE_NOTE] Erro ao processar nota privada: {e}")
        if 'trigger_id' in locals() and trigger_id:
            await update_node_history_extra(db, trigger_id, "DELIVERY", "private_note_status", "failed")
    finally:
        db.close()

# REDUNDANT SCHEDULER REMOVED - Using services/scheduler.py instead for better reliability.

async def start_worker():
    """Inicia o worker e conecta às filas"""
    logger.info(f"👷 Iniciando ZapVoice Worker | Prefetch: {PREFETCH_COUNT} | Delay: {MESSAGE_DELAY}s")
    
    # Conecta ao RabbitMQ
    await rabbitmq.connect()
    
    # Define os consumidores com QoS apropriado
    # Bulk Sends são pesados, mantemos 1 ou PREFETCH_COUNT baixo se quiser paralelizar jobs
    # Para Bulks, 1 é mais seguro para não sobrecarregar memória se cada job for gigante
    await rabbitmq.consume("zapvoice_bulk_sends", handle_bulk_send, prefetch_count=1)
    
    # Webhook de Memória (Agente de IA) - Sequencial 1 a 1 conforme solicitado pelo usuário
    await rabbitmq.consume("agent_memory_webhook_queue", handle_agent_memory_webhook, prefetch_count=1)
    
    # Fila de Eventos do WhatsApp (Meta Webhooks)
    # Processamento rápido, pode ter prefetch maior
    await rabbitmq.consume("whatsapp_events", handle_whatsapp_event, prefetch_count=20)
    
    # Funis usam a configuração do ENV
    await rabbitmq.consume("zapvoice_funnel_executions", handle_funnel_execution, prefetch_count=PREFETCH_COUNT)

    # Fila de Notas Privadas (Chatwoot) - Prefetch aumentado para suportar concorrência dinâmica
    # requeue_on_error=True: se falhar, reencaminha 1x para garantir entrega da nota
    await rabbitmq.consume("chatwoot_private_messages", handle_chatwoot_private_message, prefetch_count=50, requeue_on_error=True)

    # NOTE: Old Scheduler Task Task removed from here. Using services/scheduler.py.

    logger.info("🚀 Worker rodando e aguardando processamento...")
    
    # Mantém o worker rodando
    try:
        await asyncio.Future()
    except asyncio.CancelledError:
        logger.info("🛑 Worker parando...")
        await rabbitmq.close()

if __name__ == "__main__":
    try:
        asyncio.run(start_worker())
    except KeyboardInterrupt:
        print("Worker parado manualmente")

from sqlalchemy.orm import Session
from sqlalchemy import text, func, or_
import models
from datetime import datetime, timezone, timedelta
import os
import json
import asyncio
from fastapi import APIRouter, Request, Body, Depends, HTTPException, BackgroundTasks
from core.deps import get_db
from core.security import limiter
from core.logger import setup_logger
from services.webhook_processing_service import check_hmac_signature_logic
from rabbitmq_client import rabbitmq
from utils import normalize_phone

logger = setup_logger(__name__)
router = APIRouter()

@router.post("/chatwoot")
@router.post("/chatwoot_events")
@router.post("/webhooks/chatwoot_events")
@limiter.limit("5000/minute")
async def chatwoot_webhook(request: Request, background_tasks: BackgroundTasks, payload: dict = Body(...), db: Session = Depends(get_db)):
    chatwoot_secret = os.getenv("CHATWOOT_WEBHOOK_SECRET", "")
    if chatwoot_secret:
        body = await request.body()
        signature = request.headers.get("X-Chatwoot-Signature", "")
        if not check_hmac_signature_logic(body, chatwoot_secret, signature):
            logger.warning("❌ Chatwoot webhook: assinatura HMAC inválida")
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event_type = payload.get("event")
    log_msg = f"📥 [CHATWOOT] {datetime.now(timezone.utc)} | Event: {event_type}"
    logger.info(log_msg)
    
    with open("webhooks_incoming.log", "a", encoding="utf-8") as f:
        f.write(f"{log_msg} | Payload: {json.dumps(payload)}\n")

    try:
        from models import AppConfig
        debug_json = json.dumps({"timestamp": str(datetime.now(timezone.utc)), "payload": payload})
        existing = db.query(AppConfig).filter(AppConfig.key == "DEBUG_CHATWOOT_LAST").first()
        if existing: existing.value = debug_json
        else: db.add(AppConfig(client_id=1, key="DEBUG_CHATWOOT_LAST", value=debug_json))
        db.commit()
    except Exception as e:
        logger.error(f"Erro ao salvar debug chatwoot: {e}")

    if event_type == "message_created":
        msg_type = payload.get("message_type")
        if msg_type in ["incoming", "outgoing", 0, 1]:
            try:
                account_id = payload.get("account", {}).get("id")
                inbox_id = payload.get("inbox", {}).get("id")
                conversation = payload.get("conversation", {})
                sender = payload.get("sender", {})
                phone_number = sender.get("phone_number") or conversation.get("meta", {}).get("sender", {}).get("phone_number") or conversation.get("contact_inbox", {}).get("source_id")
                
                if phone_number:
                    clean_phone = "".join(filter(str.isdigit, str(phone_number)))
                    
                    client_id_param = request.query_params.get("client_id")
                    if client_id_param and client_id_param.isdigit():
                        client_id = int(client_id_param)
                    else:
                        client_id = 1 
                        config = db.query(models.AppConfig).filter(models.AppConfig.key == 'CHATWOOT_ACCOUNT_ID', models.AppConfig.value == str(account_id)).first()
                        if config: client_id = config.client_id
                    
                    if msg_type in ["incoming", 0]:
                        now_utc = datetime.now(timezone.utc)
                        logger.info(f"🕒 [WINDOW] Atualizando janela para {clean_phone} (Client: {client_id}, Inbox: {inbox_id})")
                        window = db.query(models.ContactWindow).filter(models.ContactWindow.phone == clean_phone, models.ContactWindow.client_id == client_id).first()
                        if window:
                            window.last_interaction_at = now_utc
                            window.chatwoot_conversation_id = conversation.get("id")
                            window.chatwoot_inbox_id = inbox_id
                            logger.info(f"✅ [WINDOW] Janela existente atualizada para {clean_phone}")
                        else:
                            db.add(models.ContactWindow(client_id=client_id, phone=clean_phone, chatwoot_inbox_id=inbox_id, last_interaction_at=now_utc, chatwoot_conversation_id=conversation.get("id")))
                            logger.info(f"🆕 [WINDOW] Nova janela criada para {clean_phone}")
                        db.commit()

                        # --- [NOVO] GATILHO DE FUNIL COM HIERARQUIA E DELAY ---
                        # Movido do whatsapp.py para garantir estabilidade da conversa no Chatwoot.
                        # O delay de 7 segundos permite que o Chatwoot processe a mensagem.
                        user_input = payload.get("content", "").strip()
                        if user_input:
                            background_tasks.add_task(
                                process_funnel_trigger_with_delay,
                                client_id,
                                clean_phone,
                                user_input,
                                conversation.get("id"),
                                account_id,
                                inbox_id,
                                payload.get("sender", {}).get("name") or "Contato"
                            )
                        # -----------------------------------------------------
                        pass
            except Exception as e:
                logger.error(f"❌ Erro no processamento de webhook Chatwoot: {e}")
                db.rollback()

    elif event_type == "message_updated":
        msg_id = payload.get("id")
        status = payload.get("status")
        if msg_id and status:
            msg_id_str = str(msg_id)
            message_record = db.query(models.MessageStatus).filter(models.MessageStatus.message_id == msg_id_str).with_for_update().first()
            if message_record:
                if message_record.status != status:
                    message_record.status = status
                    message_record.updated_at = datetime.now(timezone.utc)
                    db.commit()
                    return {"status": "updated", "msg_id": msg_id, "new_status": status}
    return {"status": "ok"}
    
async def process_funnel_trigger_with_delay(client_id: int, phone: str, text_input: str, conversation_id: int, account_id: int, inbox_id: int, contact_name: str):
    """
    Executa o gatilho do funil após um delay de segurança para garantir sincronia com Chatwoot.
    Também identifica e vincula o disparo pai (parent_id) se houver uma interação recente.
    """
    await asyncio.sleep(7)
    from database import SessionLocal
    db = SessionLocal()
    try:
        text_clean = text_input.strip().lower()
        
        # Busca todos os funis ativos do cliente para fazer o match em Python (mais robusto com espaços e vírgulas)
        active_funnels = db.query(models.Funnel).filter(
            models.Funnel.client_id == client_id,
            models.Funnel.is_active == True
        ).all()
        
        matched_funnel = None
        for funnel in active_funnels:
            if not funnel.trigger_phrase:
                continue
            
            # Divide por vírgula, limpa espaços extras e converte para minúsculo
            phrases = [p.strip().lower() for p in funnel.trigger_phrase.split(",") if p.strip()]
            
            if text_clean in phrases:
                matched_funnel = funnel
                break

        if matched_funnel:
            # Busca o último disparo interagido para este telefone nos últimos 60 segundos
            # para estabelecer a hierarquia (parent_id)
            parent_msg = db.query(models.MessageStatus).filter(
                models.MessageStatus.phone_number == phone,
                models.MessageStatus.interaction_counted == True,
                models.MessageStatus.updated_at >= datetime.now(timezone.utc) - timedelta(seconds=60)
            ).order_by(models.MessageStatus.updated_at.desc()).first()

            parent_id = parent_msg.trigger_id if parent_msg else None

            # Evita disparos duplicados para a mesma interação (idempotência básica)
            # Como não temos o msg_id da Meta aqui facilmente, usamos o conversation_id + funnel_id + timestamp (curto prazo)
            # Mas o melhor é confiar que o webhook do Chatwoot só chama uma vez por mensagem.
            
            new_trigger = models.ScheduledTrigger(
                client_id=client_id,
                funnel_id=matched_funnel.id,
                contact_phone=phone,
                contact_name=contact_name,
                conversation_id=conversation_id,
                chatwoot_account_id=account_id,
                chatwoot_inbox_id=inbox_id,
                status='processing',
                scheduled_time=datetime.now(timezone.utc),
                is_bulk=False,
                is_interaction=True,
                parent_id=parent_id # Vínculo hierárquico
            )
            db.add(new_trigger)
            db.commit()
            db.refresh(new_trigger)

            await rabbitmq.publish("zapvoice_funnel_executions", {
                "trigger_id": new_trigger.id,
                "funnel_id": matched_funnel.id,
                "contact_phone": phone,
                "conversation_id": conversation_id
            })
            logger.info(f"🚀 [CH-TRIGGER] Funil {matched_funnel.id} ({matched_funnel.name}) iniciado para {phone} (Parent: {parent_id})")
        else:
            # Log de diagnóstico para ajudar a entender o motivo da falha
            funnel_list = [f"{f.name} (ID: {f.id}, Trigger: '{f.trigger_phrase}')" for f in active_funnels]
            logger.warning(f"⚠️ [CH-TRIGGER] Nenhum funil ativo encontrado para a palavra-chave: '{text_clean}' (Phone: {phone}) | Client ID: {client_id} | Funis Ativos Verificados: {len(active_funnels)} | Lista: {funnel_list}")
    except Exception as e:
        logger.error(f"❌ Erro ao processar gatilho de funil no Chatwoot: {e}")
    finally:
        db.close()

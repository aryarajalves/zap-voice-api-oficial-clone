import asyncio
from datetime import datetime, timezone, timedelta
from core.logger import setup_logger
import models
from ..logging import log_node_execution

logger = setup_logger("FunnelEngine.Nodes.InputData")

async def handle_input_data_node(db, trigger, node, chatwoot, conversation_id, contact_phone, apply_vars_func, funnel):
    """
    Nó de Coleta de Dados / Aguardar Resposta.
    Se configurada, envia uma pergunta inicial opcional na primeira execução.
    Pausa a automação (suspenso) e aguarda interação textual do cliente.
    Se o tempo limite (timeout) for atingido sem resposta válida -> segue porta 'timeout'.
    """
    current_node_id = node.get("id")
    data = node.get("data", {})
    
    timeout_value = int(data.get("timeoutValue", 2))
    timeout_unit = data.get("timeoutUnit", "hours") # minutes, hours, days
    
    # Verificar se já estava suspenso (sinal de que fomos acordados pelo scheduler por expiração de tempo)
    now = datetime.now(timezone.utc)
    history_entries = trigger.execution_history or []
    node_start_time_str = None
    for entry in history_entries:
        if entry.get("node_id") == current_node_id and entry.get("status") == "suspended":
            node_start_time_str = entry.get("timestamp")
            break

    if node_start_time_str:
        try:
            node_start_time = datetime.fromisoformat(node_start_time_str.replace("Z", "+00:00"))
        except Exception:
            node_start_time = trigger.updated_at or trigger.created_at
    else:
        node_start_time = now

        # --- NOVA MECÂNICA: Enviar Pergunta Inicial se Configurada ---
        question_template = data.get("question", "")
        if question_template.strip():
            final_question = apply_vars_func(question_template)
            log_node_execution(db, trigger, current_node_id, "processing", f"📩 Enviando pergunta inicial: {final_question}")
            
            # ZapVoice-only: Chatwoot removido — envio sempre via Meta Direto,
            # igual ao padrão já usado em nodes/message.py e nodes/media.py.
            msg_id = None
            res = await chatwoot.send_text_official(contact_phone, final_question)
            if not getattr(trigger, 'is_interaction', False):
                await asyncio.sleep(10)

            if res and not res.get("error"):
                msg_id = res.get("messages", [{}])[0].get("id", "direct_meta")
            else:
                trigger.status = 'failed'
                trigger.failure_reason = f"Erro ao enviar pergunta via Meta API: {res.get('error') if res else 'Unknown'}"
                db.commit()
                return "abort"

            if msg_id:
                msg_id_clean = str(msg_id).replace("wamid.", "")
                existing_ms = db.query(models.MessageStatus).filter_by(message_id=msg_id_clean).first()
                if not existing_ms:
                    db.add(models.MessageStatus(
                        trigger_id=trigger.id,
                        message_id=msg_id_clean,
                        phone_number=contact_phone,
                        status='sent',
                        message_type='FREE_MESSAGE',
                        content=final_question,
                        publish_external_event=data.get("publishExternalEvent", False)
                    ))
                    trigger.total_sent = (trigger.total_sent or 0) + 1
                    db.commit()

    # Calcula expiração
    if timeout_unit == "minutes":
        delta = timedelta(minutes=timeout_value)
    elif timeout_unit == "days":
        delta = timedelta(days=timeout_value)
    else: # hours
        delta = timedelta(hours=timeout_value)
        
    expiration_time = node_start_time + delta

    # Se o prazo expirou e a trigger já estava suspensa
    if now >= expiration_time and node_start_time_str:
        log_node_execution(
            db, trigger, current_node_id, "completed", 
            f"⏱️ Tempo limite esgotado ({timeout_value} {timeout_unit}). Resposta não recebida a tempo."
        )
        return "timeout"

    # Caso contrário, suspendemos o funil e agendamos a verificação de expiração para o final do prazo
    trigger.status = "suspended"
    trigger.current_node_id = current_node_id
    trigger.scheduled_time = expiration_time
    db.commit()
    
    tz_brasilia = timezone(timedelta(hours=-3))
    expiration_time_br = expiration_time.astimezone(tz_brasilia)
    expiration_time_formatted = expiration_time_br.strftime("%d/%m/%y %H:%M")

    log_node_execution(
        db, trigger, current_node_id, "suspended", 
        f"⏳ Aguardando entrada de dados do contato por até {timeout_value} {timeout_unit} (Prazo: {expiration_time_formatted})."
    )
    return {"status": "stop", "conversation_id": conversation_id}


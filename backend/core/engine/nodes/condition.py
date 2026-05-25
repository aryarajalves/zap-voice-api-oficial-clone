import zoneinfo
from core.logger import setup_logger
import json
import httpx
from datetime import datetime, timezone
from ..utils import normalize_text, get_next_node
from ..logging import log_node_execution
from config_loader import get_setting

logger = setup_logger("FunnelEngine.Nodes.Condition")

async def handle_condition_node(db, trigger, node, chatwoot, contact_phone, edges, conversation_id=None):
    data = node.get("data", {})
    current_node_id = node["id"]
    condition_type = data.get("conditionType", "text")
    source_handle = 'no'
    
    if condition_type == "tag":
        required_tag = normalize_text(data.get("tag", ""))
        clean_phone = ''.join(filter(str.isdigit, contact_phone))
        contact_res = await chatwoot.search_contact(clean_phone)
        if contact_res and contact_res.get("payload"):
            contact_id = contact_res["payload"][0]["id"]
            contact_labels = await chatwoot.get_contact_labels(contact_id)
            if required_tag in [normalize_text(t) for t in contact_labels]:
                source_handle = 'yes'

    elif condition_type == "datetime_range":
        tz = zoneinfo.ZoneInfo('America/Sao_Paulo')
        now_dt = datetime.now(tz)
        start_str, end_str = data.get("startDateTime"), data.get("endDateTime")
        
        if start_str and end_str:
            start_dt = datetime.fromisoformat(start_str).replace(tzinfo=tz)
            end_dt = datetime.fromisoformat(end_str).replace(tzinfo=tz)
            
            if now_dt < start_dt: result = 'before'
            elif now_dt > end_dt: result = 'after'
            else: result = 'between'
            
            action = data.get(f"{result}Action", "follow")
            if action == "stop": return "break"
            elif action == "wait":
                wait_until = start_dt if result == "before" else (end_dt if result == "between" else None)
                next_h = "between" if result == "before" else ("after" if result == "between" else None)
                if wait_until:
                    next_node_id = get_next_node(current_node_id, edges, next_h)
                    if next_node_id:
                        trigger.status = 'queued'
                        trigger.scheduled_time = wait_until.astimezone(timezone.utc)
                        trigger.current_node_id = next_node_id
                        db.commit()
                        return "stop"
                return "break"
            else: source_handle = result

    elif condition_type == "weekday":
        tz = zoneinfo.ZoneInfo('America/Sao_Paulo')
        current_day = str(datetime.now(tz).weekday())
        if current_day in data.get("allowedDays", []): source_handle = 'yes'
    
    elif condition_type == "ai_question":
        ai_question = data.get("aiQuestion", "").strip()
        ai_instructions = data.get("aiInstructions", "").strip()
        ai_limit = int(data.get("aiLimit") or 15)

        if not ai_question:
            logger.warning("⚠️ [AI_CONDITION] Pergunta do nó de IA está vazia. Seguindo fluxo 'error'.")
            log_node_execution(db, trigger, current_node_id, "failed", "Nó de IA sem pergunta configurada.")
            return "error"

        # Tentar carregar conversation_id se não fornecido
        if not conversation_id:
            logger.info(f"🔍 [AI_CONDITION] Sem conversation_id. Buscando conversa do contato {contact_phone}...")
            conversations = await chatwoot.get_contact_conversations(phone=contact_phone)
            if conversations:
                conversation_id = conversations[0]["id"]
            else:
                logger.warning(f"⚠️ [AI_CONDITION] Nenhuma conversa encontrada para {contact_phone}. Seguindo fluxo 'error'.")
                log_node_execution(db, trigger, current_node_id, "failed", "Nenhuma conversa encontrada no Chatwoot.")
                return "error"

        logger.info(f"📖 [AI_CONDITION] Buscando mensagens para conversa {conversation_id} (limite: {ai_limit})...")
        messages_res = await chatwoot.get_messages(conversation_id)
        
        raw_msgs = []
        if isinstance(messages_res, list):
            raw_msgs = messages_res
        elif isinstance(messages_res, dict):
            raw_msgs = messages_res.get("payload", []) or messages_res.get("data", []) or []

        # Filtrar e formatar mensagens textuais válidas
        valid_msgs = []
        for msg in raw_msgs:
            if not isinstance(msg, dict):
                continue
            if msg.get("private"):
                continue
            content = msg.get("content")
            if not content:
                attachments = msg.get("attachments")
                if attachments and isinstance(attachments, list):
                    content = "[Mídia/Anexo enviado]"
                else:
                    continue
            
            msg_type = msg.get("message_type")
            if msg_type == 0:
                sender = "Contato"
            elif msg_type == 1:
                sender = "Agente"
            else:
                continue

            created_at = msg.get("created_at") or 0
            valid_msgs.append({
                "sender": sender,
                "content": content,
                "created_at": created_at
            })

        # Ordenar e pegar as mais recentes
        valid_msgs.sort(key=lambda x: x["created_at"])
        recent_msgs = valid_msgs[-ai_limit:]

        if not recent_msgs:
            logger.warning(f"⚠️ [AI_CONDITION] Histórico de mensagens vazio para conversa {conversation_id}. Seguindo fluxo 'error'.")
            log_node_execution(db, trigger, current_node_id, "failed", "Histórico de mensagens do contato está vazio.")
            return "error"

        formatted_history = "\n".join([f"{m['sender']}: {m['content']}" for m in recent_msgs])

        # Chamar a OpenAI
        openai_key = get_setting("OPENAI_API_KEY", "", client_id=trigger.client_id)
        default_model = get_setting("OPENAI_API_MODEL", "gpt-5-mini", client_id=trigger.client_id)

        if not openai_key:
            logger.error("❌ [AI_CONDITION] OPENAI_API_KEY não configurada. Seguindo fluxo 'error'.")
            log_node_execution(db, trigger, current_node_id, "failed", "OPENAI_API_KEY não configurada nas configurações.")
            return "error"

        system_prompt = (
            "Você é um assistente de análise de conversas de WhatsApp para automação de vendas.\n"
            "Sua tarefa é analisar o histórico de mensagens recente entre o 'Agente' e o 'Contato' e responder se o 'Contato' respondeu a uma pergunta específica do Agente.\n"
            "Pergunta específica a verificar: \"" + ai_question + "\"\n"
        )
        if ai_instructions:
            system_prompt += f"Instruções e critérios adicionais para considerar a resposta como válida (Sim):\n\"{ai_instructions}\"\n"
            
        system_prompt += (
            "\nRetorne estritamente um objeto JSON com o seguinte formato:\n"
            "{\n"
            "  \"answered\": true ou false,\n"
            "  \"reason\": \"uma justificativa curta em português\"\n"
            "}\n"
            "Não adicione nenhuma outra informação, marcação markdown como ```json ou comentários extras além do JSON bruto."
        )

        user_content = f"Histórico de Mensagens Recentes:\n{formatted_history}"

        openai_url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {openai_key}",
            "Content-Type": "application/json"
        }

        # Modelos a tentar
        models_to_try = [default_model, "gpt-4o-mini"]
        if default_model == "gpt-4o-mini":
            models_to_try = ["gpt-4o-mini"]

        model_used = None
        response_json = None

        for model in models_to_try:
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                "temperature": 0.0,
                "response_format": {"type": "json_object"}
            }

            try:
                logger.info(f"🤖 [AI_CONDITION] Enviando requisição para OpenAI usando modelo {model}...")
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(openai_url, json=payload, headers=headers)
                    if resp.status_code == 200:
                        response_json = resp.json()
                        model_used = model
                        break
                    else:
                        logger.warning(f"⚠️ [AI_CONDITION] Falha com modelo {model} (Status {resp.status_code}): {resp.text}")
            except Exception as e:
                logger.error(f"❌ [AI_CONDITION] Erro de rede ou timeout com modelo {model}: {e}")

        if not response_json or not model_used:
            logger.error("❌ [AI_CONDITION] Todas as tentativas de chamada à OpenAI falharam.")
            log_node_execution(db, trigger, current_node_id, "failed", "Falha crítica nas chamadas à OpenAI (ambos os modelos falharam).")
            return "error"

        try:
            choice = response_json["choices"][0]["message"]["content"]
            result_data = json.loads(choice.strip())
            is_answered = result_data.get("answered", False)
            reason = result_data.get("reason", "")
            
            logger.info(f"🎯 [AI_CONDITION] IA Analisou (modelo: {model_used}). Resposta? {is_answered}. Motivo: {reason}")
            log_node_execution(
                db, trigger, current_node_id, "completed",
                f"IA concluiu usando o modelo {model_used}. Resposta identificada? {'Sim' if is_answered else 'Não'}. Motivo: {reason}",
                {"model_used": model_used, "openai_response": result_data}
            )

            return "yes" if is_answered else "no"

        except Exception as parse_err:
            logger.error(f"❌ [AI_CONDITION] Erro ao parsear resposta da OpenAI: {parse_err}")
            log_node_execution(db, trigger, current_node_id, "failed", f"Erro no parse do JSON retornado pela OpenAI: {parse_err}")
            return "error"

    else:
        condition_text = data.get("condition", "").lower()
        if not any(neg in condition_text for neg in ['não', 'nao', 'false', 'no', '0']):
            source_handle = 'yes'
            
    return source_handle

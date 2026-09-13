import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from core.deps import get_db, get_current_user
from core.logger import setup_logger
from config_loader import get_setting
from ..common import get_client_id

logger = setup_logger("ChatRouter.AIAnalysis")

router = APIRouter()


@router.get("/chat/ai-config")
async def get_ai_config(
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
):
    openai_key = get_setting("OPENAI_API_KEY", "", client_id=client_id)
    return {
        "openai_configured": bool(openai_key and openai_key.strip())
    }


@router.post("/chat/conversations/{conversation_id}/analyze-doubts")
async def analyze_conversation_doubts(
    conversation_id: int,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    openai_key = get_setting("OPENAI_API_KEY", "", client_id=client_id)
    if not openai_key or not openai_key.strip():
        raise HTTPException(status_code=400, detail="Chave OPENAI_API_KEY não configurada no projeto.")

    convo = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.client_id == client_id
    ).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")

    messages = db.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == conversation_id
    ).order_by(models.ChatMessage.timestamp.asc()).all()

    if not messages:
        return {
            "status": "ok",
            "conversation_id": conversation_id,
            "contact_name": convo.contact_name or convo.phone,
            "has_unanswered_doubts": False,
            "summary": "Nenhuma mensagem encontrada nesta conversa.",
            "unanswered_doubts": [],
            "raw_report": "Nenhuma dúvida não respondida encontrada nesta conversa."
        }

    formatted_transcript = []
    for m in messages:
        sender = "👤 Cliente" if m.sender_type == "contact" else "🤖 Agente/Bot"
        formatted_transcript.append(f"{sender}: {m.content or ''}")

    transcript_text = "\n".join(formatted_transcript)
    openai_model = get_setting("OPENAI_API_MODEL", "gpt-4o-mini", client_id=client_id)
    system_prompt = (
        "Você é um especialista em Análise de Qualidade de Atendimento ao Cliente e Inteligência Artificial. "
        "Sua missão é ler o histórico de conversa entre o Cliente e o Agente/Robô e identificar as principais dúvidas, "
        "perguntas, problemas ou objeções do cliente que o agente/robô NÃO SOUBE RESPONDER, deu respostas genéricas/evasivas "
        "ou simplesmente ignorou.\n\n"
        "Regras:\n"
        "1. Se TODAS as dúvidas do cliente foram devidamente respondidas com clareza pelo agente, declare explicitamente: "
        "'Nenhuma dúvida não respondida encontrada nesta conversa.'\n"
        "2. Se houver dúvidas não respondidas ou mal respondidas, liste cada uma claramente explicando a dúvida do cliente, "
        "o que o agente respondeu de errado ou se ficou sem resposta, e o que falta treinar no robô.\n"
        "3. Responda em Português do Brasil com formatação limpa e objetiva em tópicos."
    )
    user_prompt = f"Contato: {convo.contact_name or convo.phone} (#{convo.id})\n\nHistórico de Mensagens:\n{transcript_text}"

    try:
        async with httpx.AsyncClient(timeout=60.0) as http_client:
            openai_res = await http_client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_key.strip()}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": openai_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.3
                }
            )

        if openai_res.status_code != 200:
            logger.error(f"Erro OpenAI ({openai_res.status_code}): {openai_res.text}")
            raise HTTPException(status_code=500, detail=f"Erro ao chamar API da OpenAI ({openai_res.status_code}).")

        res_data = openai_res.json()
        ai_content = res_data["choices"][0]["message"]["content"].strip()
        has_doubts = "Nenhuma dúvida não respondida" not in ai_content

        return {
            "status": "ok",
            "conversation_id": conversation_id,
            "contact_name": convo.contact_name or convo.phone,
            "phone": convo.phone,
            "has_unanswered_doubts": has_doubts,
            "raw_report": ai_content
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Erro ao analisar dúvidas por IA na conversa {conversation_id}: {exc}")
        raise HTTPException(status_code=500, detail=f"Falha no serviço de análise por IA: {exc}")


@router.post("/chat/conversations/analyze-doubts-bulk")
async def analyze_conversations_doubts_bulk(
    payload: dict,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    openai_key = get_setting("OPENAI_API_KEY", "", client_id=client_id)
    if not openai_key or not openai_key.strip():
        raise HTTPException(status_code=400, detail="Chave OPENAI_API_KEY não configurada no projeto.")

    conversation_ids = payload.get("conversation_ids", [])
    if not conversation_ids or not isinstance(conversation_ids, list):
        raise HTTPException(status_code=400, detail="Nenhuma conversa selecionada para análise.")

    convos = db.query(models.ChatConversation).filter(
        models.ChatConversation.id.in_(conversation_ids),
        models.ChatConversation.client_id == client_id
    ).all()

    if not convos:
        raise HTTPException(status_code=404, detail="Nenhuma conversa válida encontrada.")

    combined_transcripts = []
    for c in convos:
        msgs = db.query(models.ChatMessage).filter(
            models.ChatMessage.conversation_id == c.id
        ).order_by(models.ChatMessage.timestamp.asc()).all()

        formatted_msgs = []
        for m in msgs:
            sender = "👤 Cliente" if m.sender_type == "contact" else "🤖 Agente/Bot"
            formatted_msgs.append(f"{sender}: {m.content or ''}")

        convo_text = f"--- Conversa #{c.id} ({c.contact_name or c.phone}) ---\n" + "\n".join(formatted_msgs)
        combined_transcripts.append(convo_text)

    all_transcripts_text = "\n\n".join(combined_transcripts)
    openai_model = get_setting("OPENAI_API_MODEL", "gpt-4o-mini", client_id=client_id)
    system_prompt = (
        "Você é um Analista de Inteligência Artificial de Atendimento. "
        "Sua tarefa é analisar o histórico de MÚLTIPLAS conversas entre clientes e o agente/robô de atendimento. "
        "Identifique todas as DÚVIDAS, OBJEÇÕES e PERGUNTAS dos clientes que o agente/robô NÃO SOUBE RESPONDER "
        "ou respondeu de forma incompleta/genérica.\n\n"
        "Gere um relatório consolidado com a seguinte estrutura em Markdown:\n"
        "1. **Resumo Geral de Treinamento**: Visão geral de quantas conversas tinham dúvidas pendentes.\n"
        "2. **Tópicos e Perguntas Mais Frequentes Não Respondidas**: Agrupadas por tema com sugestões de treinamento para o prompt do robô.\n"
        "3. **Detalhamento por Contato**: Lista dos contatos e as dúvidas específicas que ficaram sem resposta em cada conversa (se não houve nenhuma no contato, informe 'Nenhuma dúvida não respondida').\n\n"
        "Se em NENHUMA conversa foram encontradas dúvidas não respondidas, afirme explicitamente: "
        "'Nenhuma dúvida não respondida encontrada nas conversas analisadas.'"
    )
    user_prompt = f"Total de Conversas Analisadas: {len(convos)}\n\nHistóricos de Conversas:\n{all_transcripts_text}"

    try:
        async with httpx.AsyncClient(timeout=90.0) as http_client:
            openai_res = await http_client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_key.strip()}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": openai_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.3
                }
            )

        if openai_res.status_code != 200:
            logger.error(f"Erro OpenAI Bulk ({openai_res.status_code}): {openai_res.text}")
            raise HTTPException(status_code=500, detail=f"Erro ao chamar API da OpenAI ({openai_res.status_code}).")

        res_data = openai_res.json()
        ai_content = res_data["choices"][0]["message"]["content"].strip()
        has_doubts = "Nenhuma dúvida não respondida encontrada nas conversas analisadas" not in ai_content

        return {
            "status": "ok",
            "total_analyzed": len(convos),
            "conversation_ids": [c.id for c in convos],
            "has_unanswered_doubts": has_doubts,
            "raw_report": ai_content
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Erro ao analisar dúvidas por IA em massa: {exc}")
        raise HTTPException(status_code=500, detail=f"Falha no serviço de análise por IA em massa: {exc}")

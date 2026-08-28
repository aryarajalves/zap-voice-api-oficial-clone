import json
import re
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import httpx

import models
from core.deps import get_db, get_current_user
from config_loader import get_setting
from core.logger import setup_logger
from .common import get_client_id

logger = setup_logger("ChatRouter.ExportQA")

router = APIRouter(tags=["Chat Export & QA Analysis"])


def _extract_heuristic_qa(messages: List[models.ChatMessage]) -> List[Dict[str, Any]]:
    qa_items = []
    q_index = 1
    
    question_triggers = [
        "?", "quanto", "qual", "como", "onde", "quando", "quem", "por que", 
        "porque", "tem", "posso", "aceita", "valor", "preço", "preco", "link", 
        "desconto", "funciona", "horário", "horario", "endereço", "endereco"
    ]

    for i, msg in enumerate(messages):
        if msg.sender_type == "contact" and msg.content:
            text_lower = msg.content.strip().lower()
            is_question = "?" in text_lower or any(re.search(rf"\b{re.escape(w)}\b", text_lower) for w in question_triggers)
            
            if is_question:
                time_str = msg.timestamp.strftime("%H:%M") if msg.timestamp else ""
                
                ans_text = None
                ans_time = ""
                for next_msg in messages[i + 1:]:
                    if next_msg.sender_type in ("user", "agent") and next_msg.content:
                        ans_text = next_msg.content.strip()
                        ans_time = next_msg.timestamp.strftime("%H:%M") if next_msg.timestamp else ""
                        break
                    elif next_msg.sender_type == "contact":
                        break
                
                if ans_text:
                    qa_items.append({
                        "question_id": f"q-{q_index}",
                        "question_text": msg.content.strip(),
                        "question_time": time_str,
                        "answer_text": ans_text,
                        "answer_time": ans_time,
                        "status": "answered",
                        "status_label": "Respondida com Clareza",
                        "ai_analysis": "Resposta registrada pelo agente na sequência da dúvida."
                    })
                else:
                    qa_items.append({
                        "question_id": f"q-{q_index}",
                        "question_text": msg.content.strip(),
                        "question_time": time_str,
                        "answer_text": None,
                        "answer_time": "",
                        "status": "unanswered",
                        "status_label": "Sem Resposta",
                        "ai_analysis": "Nenhuma resposta do agente foi localizada para esta dúvida."
                    })
                q_index += 1

    return qa_items


@router.post(
    "/chat/conversations/{conversation_id}/export-qa-analysis",
    summary="Análise semântica de Perguntas & Respostas com GPT-5.2 para exportação"
)
async def analyze_qa_for_export(
    conversation_id: int,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
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
            "total_questions": 0,
            "answered_count": 0,
            "incomplete_count": 0,
            "unanswered_count": 0,
            "model_used": "none",
            "is_ai_evaluated": False,
            "qa_items": []
        }

    openai_key = get_setting("OPENAI_API_KEY", "", client_id=client_id)
    openai_model = get_setting("OPENAI_API_MODEL", "gpt-5.2", client_id=client_id)

    if not openai_key or not openai_key.strip():
        heuristic_items = _extract_heuristic_qa(messages)
        ans_count = sum(1 for it in heuristic_items if it["status"] == "answered")
        unans_count = sum(1 for it in heuristic_items if it["status"] == "unanswered")
        return {
            "status": "ok",
            "conversation_id": conversation_id,
            "contact_name": convo.contact_name or convo.phone,
            "total_questions": len(heuristic_items),
            "answered_count": ans_count,
            "incomplete_count": 0,
            "unanswered_count": unans_count,
            "model_used": "heuristic",
            "is_ai_evaluated": False,
            "qa_items": heuristic_items
        }

    transcript_lines = []
    for m in messages:
        sender = "👤 Cliente" if m.sender_type == "contact" else "🤖 Agente/Robô"
        time_str = m.timestamp.strftime("%d/%m/%Y %H:%M") if m.timestamp else ""
        content = m.content or (f"[{m.message_type}]" if m.message_type else "[mídia]")
        transcript_lines.append(f"[{time_str}] {sender}: {content}")

    transcript_text = "\n".join(transcript_lines)

    system_prompt = (
        "Você é um Auditor Especialista em Qualidade de Atendimento e Inteligência Artificial.\n"
        "Sua missão é analisar o diálogo entre o Cliente e o Agente/Robô e extrair TODAS as dúvidas, "
        "perguntas ou solicitações feitas pelo cliente, avaliando com rigor semântico a resposta dada pelo agente.\n\n"
        "Regras de Avaliação Semântica:\n"
        "1. 'answered' (Respondida com Clareza): O agente respondeu com precisão e sanou diretamente a dúvida.\n"
        "2. 'incomplete' (Resposta Evasiva/Incompleta): O agente respondeu, mas não esclareceu a dúvida, foi evasivo, genérico ou forneceu informação incompleta.\n"
        "3. 'unanswered' (Sem Resposta/Ignorada): O cliente fez a pergunta e o agente não respondeu, mudou de assunto ou a conversa se encerrou sem retorno.\n\n"
        "Formato Obrigatório da Resposta (Responda APENAS em JSON válido estrito sem blocos markdown):\n"
        "{\n"
        '  "qa_items": [\n'
        "    {\n"
        '      "question_id": "q-1",\n'
        '      "question_text": "Pergunta exata ou resumida do cliente",\n'
        '      "question_time": "HH:MM ou data",\n'
        '      "answer_text": "Resposta exata ou resumida do agente (ou null se sem resposta)",\n'
        '      "answer_time": "HH:MM ou data",\n'
        '      "status": "answered | incomplete | unanswered",\n'
        '      "status_label": "Respondida com Clareza | Resposta Evasiva/Incompleta | Sem Resposta",\n'
        '      "ai_analysis": "Parecer objetivo explicando por que a resposta está satisfatória ou onde falhou."\n'
        "    }\n"
        "  ]\n"
        "}"
    )

    user_prompt = f"Contato: {convo.contact_name or convo.phone} (#{convo.id})\n\nHistórico:\n{transcript_text}"

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
                    "temperature": 0.2
                }
            )

        if openai_res.status_code != 200:
            logger.error(f"Erro OpenAI QA Analysis ({openai_res.status_code}): {openai_res.text}")
            heuristic_items = _extract_heuristic_qa(messages)
            return {
                "status": "ok",
                "conversation_id": conversation_id,
                "contact_name": convo.contact_name or convo.phone,
                "total_questions": len(heuristic_items),
                "answered_count": sum(1 for it in heuristic_items if it["status"] == "answered"),
                "incomplete_count": 0,
                "unanswered_count": sum(1 for it in heuristic_items if it["status"] == "unanswered"),
                "model_used": "heuristic_fallback",
                "is_ai_evaluated": False,
                "qa_items": heuristic_items
            }

        raw_content = openai_res.json()["choices"][0]["message"]["content"].strip()
        cleaned_json = re.sub(r"^```(?:json)?\s*", "", raw_content, flags=re.IGNORECASE)
        cleaned_json = re.sub(r"\s*```$", "", cleaned_json)

        parsed_data = json.loads(cleaned_json)
        qa_items = parsed_data.get("qa_items", [])

        ans_count = sum(1 for it in qa_items if it.get("status") == "answered")
        inc_count = sum(1 for it in qa_items if it.get("status") == "incomplete")
        unans_count = sum(1 for it in qa_items if it.get("status") == "unanswered")

        return {
            "status": "ok",
            "conversation_id": conversation_id,
            "contact_name": convo.contact_name or convo.phone,
            "total_questions": len(qa_items),
            "answered_count": ans_count,
            "incomplete_count": inc_count,
            "unanswered_count": unans_count,
            "model_used": openai_model,
            "is_ai_evaluated": True,
            "qa_items": qa_items
        }

    except Exception as exc:
        logger.error(f"Exceção ao processar QA Analysis com IA: {exc}")
        heuristic_items = _extract_heuristic_qa(messages)
        return {
            "status": "ok",
            "conversation_id": conversation_id,
            "contact_name": convo.contact_name or convo.phone,
            "total_questions": len(heuristic_items),
            "answered_count": sum(1 for it in heuristic_items if it["status"] == "answered"),
            "incomplete_count": 0,
            "unanswered_count": sum(1 for it in heuristic_items if it["status"] == "unanswered"),
            "model_used": "heuristic_fallback",
            "is_ai_evaluated": False,
            "qa_items": heuristic_items
        }

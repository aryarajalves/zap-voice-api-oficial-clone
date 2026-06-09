from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Query
from typing import Optional
from chatwoot_client import ChatwootClient
import models
import schemas
from fastapi import Depends
from core.deps import get_current_user, get_db
from core.permissions import require_premium, require_user
from core.logger import setup_logger
from config_loader import get_setting
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, time
from .whatsapp import list_templates # Import list_templates for the assistant chat context

logger = setup_logger(__name__)

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])

@router.get("/profile", summary="Busca o perfil do WhatsApp Business")
async def get_whatsapp_profile(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_user),
    db: Session = Depends(get_db)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=client_id)
    wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=client_id)

    if not wa_token or not wa_phone_id:
        return {"error": "Configurações do WhatsApp incompletas."}

    async with httpx.AsyncClient(timeout=30.0) as http:
        # 1. Busca detalhes do perfil
        res = await http.get(
            f"https://graph.facebook.com/v25.0/{wa_phone_id}/whatsapp_business_profile",
            params={
                "fields": "about,address,description,email,profile_picture_url,websites,vertical",
                "access_token": wa_token
            }
        )
        
        profile_data = res.json().get("data", [{}])[0]
        
        # 2. Busca detalhes do número (para pegar display_phone_number, messaging_limit_tier e verified_name)
        num_res = await http.get(
            f"https://graph.facebook.com/v25.0/{wa_phone_id}",
            params={
                "fields": "display_phone_number,messaging_limit_tier,quality_rating,verified_name,name_status",
                "access_token": wa_token
            }
        )
        if num_res.status_code == 200:
            num_data = num_res.json()
            profile_data["display_phone_number"] = num_data.get("display_phone_number", "")
            profile_data["messaging_limit_tier"] = num_data.get("messaging_limit_tier", "TIER_250")
            profile_data["quality_rating"] = num_data.get("quality_rating", "UNKNOWN")
            profile_data["verified_name"] = num_data.get("verified_name", "")
            profile_data["name_status"] = num_data.get("name_status", "APPROVED")

        # 3. Busca status da conta empresarial (WABA/BM Verification)
        wa_waba_id = get_setting("WA_BUSINESS_ACCOUNT_ID", "", client_id=client_id)
        if wa_waba_id:
            try:
                waba_res = await http.get(
                    f"https://graph.facebook.com/v25.0/{wa_waba_id}",
                    params={
                        "fields": "verification_status,account_review_status,name,message_template_namespace",
                        "access_token": wa_token
                    }
                )
                if waba_res.status_code == 200:
                    waba_data = waba_res.json()
                    logger.info(f"WABA Data for {wa_waba_id}: {waba_data}")
                    
                    # Se verification_status for 'not_verified' mas account_review_status for 'APPROVED', 
                    # pode ser que a Meta considere como funcionalmente verificada para templates.
                    profile_data["verification_status"] = waba_data.get("verification_status", "not_verified")
                    profile_data["account_review_status"] = waba_data.get("account_review_status", "")
                    
                    # Tentar buscar status da BM vinculada se possível
                    bm_res = await http.get(
                        f"https://graph.facebook.com/v25.0/{wa_waba_id}",
                        params={
                            "fields": "business",
                            "access_token": wa_token
                        }
                    )
                    if bm_res.status_code == 200:
                        bm_info = bm_res.json().get("business")
                        if bm_info:
                            logger.info(f"BM Info for WABA {wa_waba_id}: {bm_info}")
                            # Se a BM estiver verificada, sobrepomos o status da WABA para fins de exibição
                            if bm_info.get("verification_status") == "verified":
                                profile_data["verification_status"] = "verified"
            except Exception as e:
                logger.error(f"Erro ao buscar status de verificação da WABA: {e}")

        # 4. Calcular envios realizados hoje via Banco de Dados
        try:
            # Início do dia em UTC
            today_start = datetime.combine(datetime.now(timezone.utc).date(), time.min).replace(tzinfo=timezone.utc)
            
            # Encontrar todos os clients que usam o mesmo WA_PHONE_NUMBER_ID
            sibling_client_ids = db.query(models.AppConfig.client_id)\
                .filter(models.AppConfig.key == 'WA_PHONE_NUMBER_ID', models.AppConfig.value == wa_phone_id)\
                .all()
            sibling_ids = [c[0] for c in sibling_client_ids]

            # Contar MessageStatus vinculados a esses client_ids
            usage_count = db.query(func.count(models.MessageStatus.id))\
                .join(models.ScheduledTrigger, models.MessageStatus.trigger_id == models.ScheduledTrigger.id)\
                .filter(
                    models.ScheduledTrigger.client_id.in_(sibling_ids),
                    models.MessageStatus.timestamp >= today_start,
                    models.MessageStatus.status != 'failed' # Não contar falhas
                ).scalar() or 0
            
            profile_data["current_usage"] = usage_count
        except Exception as e:
            logger.error(f"Erro ao calcular uso de mensagens: {e}")
            profile_data["current_usage"] = 0
            
        return profile_data


@router.post("/profile-picture", summary="Atualiza a foto de perfil do WhatsApp Business")
async def update_profile_picture(
    file: UploadFile = File(...),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=client_id)
    wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=client_id)

    if not wa_token or not wa_phone_id:
        raise HTTPException(status_code=400, detail="Configurações do WhatsApp incompletas.")

    file_bytes = await file.read()
    file_length = len(file_bytes)
    mime_type = file.content_type or "image/jpeg"

    async with httpx.AsyncClient(timeout=60.0) as http:
        # Step 1: Request Upload Session
        session_res = await http.post(
            "https://graph.facebook.com/v25.0/app/uploads",
            params={
                "file_length": file_length,
                "file_type": mime_type,
                "access_token": wa_token,
            }
        )
        if session_res.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Erro ao criar sessão de upload: {session_res.text}")

        upload_session_id = session_res.json().get("id")

        # Step 2: Upload the file
        upload_res = await http.post(
            f"https://graph.facebook.com/v25.0/{upload_session_id}",
            headers={
                "Authorization": f"OAuth {wa_token}",
                "file_offset": "0",
                "Content-Type": mime_type,
            },
            content=file_bytes,
        )
        if upload_res.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Erro no upload da imagem: {upload_res.text}")

        handle = upload_res.json().get("h")
        logger.info(f"Upload concluído na Meta. Handle: {handle}")
        if not handle:
            raise HTTPException(status_code=400, detail="Handle não retornado pela Meta.")

        # Step 3: Update Profile
        logger.info(f"Tentando atualizar perfil do WhatsApp {wa_phone_id} na v25.0...")
        update_res = await http.post(
            f"https://graph.facebook.com/v25.0/{wa_phone_id}/whatsapp_business_profile",
            headers={"Authorization": f"OAuth {wa_token}"},
            json={
                "messaging_product": "whatsapp",
                "profile_picture_handle": handle
            }
        )
        
        if update_res.status_code != 200:
            logger.error(f"Erro ao salvar perfil WhatsApp: {update_res.text}")
            raise HTTPException(status_code=400, detail=f"Erro ao salvar perfil: {update_res.text}")

        logger.info("✅ Foto de perfil do WhatsApp atualizada com sucesso.")
        return {"success": True, "message": "Foto de perfil atualizada com sucesso!"}


@router.post("/profile", summary="Atualiza campos do perfil comercial do WhatsApp")
async def update_whatsapp_profile(
    payload: dict,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=client_id)
    wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=client_id)

    if not wa_token or not wa_phone_id:
        raise HTTPException(status_code=400, detail="Configurações do WhatsApp incompletas.")

    # Filter only allowed fields to avoid errors
    allowed_fields = {"about", "address", "description", "email", "websites", "vertical"}
    filtered_payload = {k: v for k, v in payload.items() if k in allowed_fields}
    filtered_payload["messaging_product"] = "whatsapp"
    
    if not filtered_payload:
        raise HTTPException(status_code=400, detail="Nenhum campo válido para atualizar.")

    async with httpx.AsyncClient(timeout=30.0) as http:
        res = await http.post(
            f"https://graph.facebook.com/v25.0/{wa_phone_id}/whatsapp_business_profile",
            headers={"Authorization": f"OAuth {wa_token}"},
            json=filtered_payload
        )
        
        if res.status_code != 200:
            logger.error(f"Erro ao atualizar perfil WhatsApp: {res.text}")
            raise HTTPException(status_code=400, detail=f"Erro Meta API: {res.text}")

        return {"success": True, "message": "Perfil atualizado com sucesso!"}


@router.post("/profile-name", summary="Atualiza o nome de exibição do WhatsApp Business")
async def update_whatsapp_name(
    payload: dict,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=client_id)
    wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=client_id)
    new_name = payload.get("display_name")

    if not wa_token or not wa_phone_id:
        raise HTTPException(status_code=400, detail="Configurações do WhatsApp incompletas.")
    
    if not new_name:
        raise HTTPException(status_code=400, detail="O nome de exibição é obrigatório.")

    async with httpx.AsyncClient(timeout=30.0) as http:
        # Step 1: Solicitar alteração de nome na Meta
        res = await http.post(
            f"https://graph.facebook.com/v25.0/{wa_phone_id}",
            params={"access_token": wa_token},
            json={"display_name": new_name}
        )
        
        if res.status_code != 200:
            logger.error(f"Erro ao atualizar nome WhatsApp: {res.text}")
            raise HTTPException(status_code=400, detail=f"Erro Meta API: {res.text}")

        return {"success": True, "message": "Solicitação de alteração de nome enviada. A Meta analisará a mudança."}


@router.post("/register-number", summary="Registra o número de telefone (Ativa certificado de nome)")
async def register_whatsapp_number(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=client_id)
    wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=client_id)

    if not wa_token or not wa_phone_id:
        raise HTTPException(status_code=400, detail="Configurações do WhatsApp incompletas.")

    wa_pin = get_setting("WA_PIN", "123456", client_id=client_id)

    async with httpx.AsyncClient(timeout=30.0) as http:
        res = await http.post(
            f"https://graph.facebook.com/v25.0/{wa_phone_id}/register",
            headers={"Authorization": f"Bearer {wa_token}"},
            json={
                "messaging_product": "whatsapp",
                "pin": wa_pin
            }
        )
        
        if res.status_code != 200:
            logger.error(f"Erro ao registrar número: {res.text}")
            if "pin" in res.text.lower():
                return {"success": False, "error": "PIN incorreto ou necessário. Verifique no painel da Meta."}
            raise HTTPException(status_code=400, detail=f"Erro ao registrar: {res.text}")

        return {"success": True, "message": "Número registrado com sucesso! O nome deve aparecer em breve."}


@router.get("/debug/meta/{waba_id}")
async def debug_meta(
    waba_id: str,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=client_id)
    
    async with httpx.AsyncClient(timeout=30.0) as http:
        res = await http.get(
            f"https://graph.facebook.com/v25.0/{waba_id}",
            params={
                "fields": "verification_status,account_review_status,name,message_template_namespace,business",
                "access_token": wa_token
            }
        )
        return {
            "status_code": res.status_code,
            "data": res.json()
        }


@router.post("/assistant/chat")
async def assistant_chat(
    payload: dict,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_user),
    db: Session = Depends(get_db)
):
    import os
    import json
    target_client_id = x_client_id if x_client_id else current_user.client_id
    messages = payload.get("messages", [])
    
    active_templates = []
    try:
        active_templates = await list_templates(
            include_archived=False,
            include_paused=False,
            x_client_id=target_client_id,
            current_user=current_user,
            db=db
        )
    except Exception as e:
        logger.error(f"Erro ao obter templates ativos para o contexto do assistente: {e}")

    system_prompt = (
        "Você é o assistente inteligente de criação de templates do ZapVoice (ZapVoice IA).\n"
        "Seu objetivo é ajudar o usuário a criar templates de mensagens para o WhatsApp Business da Meta de alta conversão.\n\n"
        "Aqui estão os templates ativos atuais do projeto para você estudar e manter a mesma identidade visual, tom e estilo:\n"
    )
    
    templates_str = ""
    for tpl in active_templates:
        tpl_min = {
            "name": tpl.get("name"),
            "category": tpl.get("category"),
            "language": tpl.get("language"),
            "body_text": tpl.get("body_text") or "",
            "components": tpl.get("components") or []
        }
        templates_str += f"- Template: {json.dumps(tpl_min, ensure_ascii=False)}\n"
        
    if not templates_str:
        templates_str = "(Nenhum template ativo encontrado ainda no projeto. Crie o primeiro com o usuário!)\n"
        
    system_prompt += templates_str + "\n"
    system_prompt += (
        "INSTRUÇÕES CRÍTICAS:\n"
        "1. Dê feedbacks e conselhos sobre como escrever ótimas mensagens (tome como base as regras do WhatsApp, sem links enganosos, textos claros, etc.).\n"
        "2. Quando propor ou fechar a estrutura de um template com o usuário, você DEVE retornar a sugestão estruturada do template em formato JSON no final da sua mensagem, dentro de um bloco de código de marcação Markdown no formato exato:\n"
        "```json\n"
        "{\n"
        "  \"name\": \"nome_do_template_em_minusculo_com_sublinhados\",\n"
        "  \"category\": \"MARKETING\",\n"
        "  \"language\": \"pt_BR\",\n"
        "  \"header_type\": \"NONE\",\n"
        "  \"header_text\": \"Texto do cabeçalho se aplicável\",\n"
        "  \"body_text\": \"Corpo da mensagem com {{1}} para variáveis se necessário\",\n"
        "  \"footer_text\": \"Rodapé opcional\",\n"
        "  \"buttons\": [\n"
        "     { \"type\": \"QUICK_REPLY\", \"text\": \"Texto do Botão 1\" }\n"
        "  ]\n"
        "}\n"
        "```\n"
        "Observação de botões: suportamos QUICK_REPLY, PHONE_NUMBER (com chave phone_number) e URL (com chave url). Máximo 10 botões.\n"
        "Você deve incluir esse bloco json se e somente se o usuário pedir para criar ou fechar o template de mensagem, ou quando você finalizar a sugestão perfeita de template. O botão 'Aplicar ao Formulário' aparecerá para o usuário baseado nesse bloco."
    )

    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        logger.error("OPENAI_API_KEY não configurada no backend.")
        raise HTTPException(
            status_code=400,
            detail="OPENAI_API_KEY não configurada no backend. Por favor, adicione-a ao arquivo .env."
        )

    openai_model = os.getenv("OPENAI_API_MODEL", "gpt-5-mini")
    
    api_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        role = msg.get("role", "user")
        if role in ["user", "assistant"]:
            api_messages.append({"role": role, "content": msg.get("content", "")})

    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            openai_res = await http_client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": openai_model,
                    "messages": api_messages
                }
            )
            
            if openai_res.status_code != 200:
                err_body = openai_res.text
                logger.error(f"Erro na API da OpenAI ({openai_res.status_code}): {err_body}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Erro ao chamar OpenAI ({openai_res.status_code}): {err_body}"
                )
                
            res_json = openai_res.json()
            assistant_message = res_json["choices"][0]["message"]["content"]
            
            return {
                "role": "assistant",
                "content": assistant_message
            }
    except httpx.HTTPError as he:
        logger.error(f"Erro de conexão HTTP ao chamar OpenAI: {he}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro de conexão com o servidor da OpenAI: {str(he)}"
        )
    except Exception as exc:
        logger.error(f"Erro inesperado no chat do assistente: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro inesperado no assistente: {str(exc)}"
        )


@router.post("/assistant/optimize-text")
async def assistant_optimize_text(
    payload: dict,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_user),
    db: Session = Depends(get_db)
):
    import os
    text_to_optimize = payload.get("text", "")
    if not text_to_optimize:
        raise HTTPException(status_code=400, detail="O texto a ser otimizado é obrigatório.")
        
    system_prompt = (
        "Você é um redator publicitário de alto nível especializado em copywriting para conversão no WhatsApp.\n"
        "Sua tarefa é receber uma pergunta ou mensagem inicial usada em fluxos de Entrada de Dados e reescrevê-la de forma que seja extremamente clara, persuasiva, amigável e incentive o lead a responder imediatamente.\n"
        "Retorne estritamente o texto otimizado, sem introduções, aspas ou explicações."
    )
    
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        logger.error("OPENAI_API_KEY não configurada no backend.")
        raise HTTPException(
            status_code=400,
            detail="OPENAI_API_KEY não configurada no backend. Por favor, adicione-a ao arquivo .env."
        )

    openai_model = os.getenv("OPENAI_API_MODEL", "gpt-4o-mini")
    
    api_messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": text_to_optimize}
    ]

    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            openai_res = await http_client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": openai_model,
                    "messages": api_messages
                }
            )
            
            if openai_res.status_code != 200:
                err_body = openai_res.text
                logger.error(f"Erro na API da OpenAI ({openai_res.status_code}): {err_body}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Erro ao chamar OpenAI ({openai_res.status_code}): {err_body}"
                )
                
            res_json = openai_res.json()
            assistant_message = res_json["choices"][0]["message"]["content"].strip()
            
            return {
                "optimized_text": assistant_message
            }
    except httpx.HTTPError as he:
        logger.error(f"Erro de conexão HTTP ao chamar OpenAI: {he}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro de conexão com o servidor da OpenAI: {str(he)}"
        )
    except Exception as exc:
        logger.error(f"Erro inesperado na otimização de texto: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro inesperado na otimização: {str(exc)}"
        )


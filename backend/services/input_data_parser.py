import re
import json
import httpx
from core.logger import setup_logger
from config_loader import get_setting

logger = setup_logger("FunnelEngine.Services.InputDataParser")

async def parse_and_extract_input_data(db, user_input: str, node_data: dict, client_id: int, trigger) -> tuple[bool, str]:
    """
    Analisa e extrai o dado a partir do input do usuário para o nó de Entrada de Dados.
    Suporta o modo 'traditional' (Regex) e 'ai' (OpenAI LLM).
    
    Retorna uma tupla (is_valid, extracted_val).
    """
    collection_type = node_data.get("collectionType", "traditional")
    var_name = node_data.get("varName", "variavel")
    user_input_stripped = user_input.strip()
    
    if collection_type == "ai":
        ai_instructions = node_data.get("aiInstructions", "").strip()
        
        logger.info(f"🤖 [INPUT-DATA-AI] Iniciando extração inteligente para a variável '{var_name}' com input: '{user_input_stripped}'")
        
        openai_key = get_setting("OPENAI_API_KEY", "", client_id=client_id)
        default_model = get_setting("OPENAI_API_MODEL", "gpt-4o-mini", client_id=client_id)
        
        if not openai_key:
            logger.error("❌ [INPUT-DATA-AI] OPENAI_API_KEY não configurada. Falhando validação por falta de chave.")
            return False, user_input_stripped
            
        system_prompt = (
            "Você é um assistente especialista em extrair dados estruturados a partir de mensagens textuais enviadas por clientes no WhatsApp.\n"
            "Sua tarefa é analisar a mensagem enviada pelo cliente (Contato) e extrair a informação desejada de acordo com as seguintes instruções de extração:\n"
            f"\"{ai_instructions}\"\n\n"
            "Retorne estritamente um objeto JSON com o seguinte formato:\n"
            "{\n"
            "  \"is_valid\": true ou false,\n"
            "  \"extracted_value\": \"a informação limpa e extraída (ex: se for CPF, apenas os 11 números, se for data, o formato ideal, etc) ou null\"\n"
            "}\n"
            "Não adicione nenhuma outra informação, marcação markdown como ```json ou comentários extras além do JSON bruto."
        )
        
        user_content = f"Mensagem enviada pelo Contato:\n\"{user_input_stripped}\""
        
        openai_url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {openai_key}",
            "Content-Type": "application/json"
        }
        
        models_to_try = [default_model, "gpt-4o-mini"]
        if default_model == "gpt-4o-mini":
            models_to_try = ["gpt-4o-mini"]
            
        response_json = None
        model_used = None
        
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
                logger.info(f"🤖 [INPUT-DATA-AI] Enviando requisição para OpenAI usando modelo {model}...")
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(openai_url, json=payload, headers=headers)
                    if resp.status_code == 200:
                        response_json = resp.json()
                        model_used = model
                        break
                    else:
                        logger.warning(f"⚠️ [INPUT-DATA-AI] Falha com modelo {model} (Status {resp.status_code}): {resp.text}")
            except Exception as e:
                logger.error(f"❌ [INPUT-DATA-AI] Erro de rede ou timeout com modelo {model}: {e}")
                
        if not response_json or not model_used:
            logger.error("❌ [INPUT-DATA-AI] Todas as tentativas de chamada à OpenAI falharam.")
            return False, user_input_stripped
            
        try:
            choice = response_json["choices"][0]["message"]["content"]
            result_data = json.loads(choice.strip())
            is_valid = result_data.get("is_valid", False)
            extracted_value = result_data.get("extracted_value")
            
            # Se for nulo ou inválido, extracted_value cai para o input original ou None
            if not is_valid or extracted_value is None:
                return False, user_input_stripped
                
            logger.info(f"🎯 [INPUT-DATA-AI] IA Extraiu com sucesso (modelo: {model_used}): '{extracted_value}'")
            return True, str(extracted_value)
            
        except Exception as parse_err:
            logger.error(f"❌ [INPUT-DATA-AI] Erro ao parsear resposta da OpenAI: {parse_err}")
            return False, user_input_stripped

    # Caso tradicional (Regex/Expressão)
    validation_rule = node_data.get("validationRule", "text")
    is_valid = False
    extracted_val = user_input_stripped
    
    if validation_rule == "email":
        match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", user_input_stripped)
        if match:
            is_valid = True
            extracted_val = match.group(0)
    elif validation_rule == "phone":
        nums = re.sub(r"\D", "", user_input_stripped)
        if len(nums) >= 10:
            is_valid = True
            extracted_val = nums
    elif validation_rule == "number":
        nums = re.sub(r"\D", "", user_input_stripped)
        if nums:
            is_valid = True
            extracted_val = nums
    elif validation_rule == "cpf":
        nums = re.sub(r"\D", "", user_input_stripped)
        if len(nums) == 11:
            is_valid = True
            extracted_val = nums
    elif validation_rule == "cnpj":
        nums = re.sub(r"\D", "", user_input_stripped)
        if len(nums) == 14:
            is_valid = True
            extracted_val = nums
    else:
        # Texto livre / Sem regra
        if user_input_stripped:
            is_valid = True
            extracted_val = user_input_stripped
            
    return is_valid, extracted_val

async def generate_ai_error_message(user_input: str, node_data: dict, client_id: int) -> str:
    """
    Gera uma mensagem de erro personalizada usando IA se a flag errorByAi estiver ativa.
    """
    var_name = node_data.get("varName", "campo")
    collection_type = node_data.get("collectionType", "traditional")
    validation_rule = node_data.get("validationRule", "none")
    ai_instructions = node_data.get("aiInstructions", "").strip()
    base_error = node_data.get("errorMessage", "").strip()
    
    if not base_error:
        base_error = "Entrada inválida. Digite novamente."

    openai_key = get_setting("OPENAI_API_KEY", "", client_id=client_id)
    default_model = get_setting("OPENAI_API_MODEL", "gpt-4o-mini", client_id=client_id)
    
    if not openai_key:
        logger.warning("⚠️ [INPUT-DATA-AI-ERROR] OPENAI_API_KEY não configurada. Usando mensagem de erro estática.")
        return base_error

    system_prompt = (
        "Você é um assistente virtual atencioso de atendimento no WhatsApp.\n"
        "O cliente enviou uma resposta que não passou na validação do campo que você solicitou.\n"
        "Sua tarefa é escrever uma mensagem curta, empática e natural (linguagem de WhatsApp) explicando o erro e pedindo a informação correta novamente.\n\n"
        f"Nome do Campo esperado: {var_name}\n"
        f"Tipo de coleta: {collection_type}\n"
    )
    if collection_type == "traditional":
        system_prompt += f"Regra de validação: {validation_rule}\n"
    else:
        system_prompt += f"Instruções originais do campo: {ai_instructions}\n"
        
    system_prompt += (
        f"Mensagem base sugerida para o erro: \"{base_error}\"\n\n"
        "Regras cruciais:\n"
        "1. Seja direto, simpático e educado.\n"
        "2. NUNCA invente informações. Apenas peça o dado correto de forma natural.\n"
        "3. Não use formatação markdown de blocos ou listas. Use apenas emojis sutilmente se fizer sentido.\n"
        "4. Retorne APENAS o texto da mensagem de resposta final, sem comentários adicionais."
    )

    user_content = f"Mensagem incorreta enviada pelo cliente:\n\"{user_input}\""
    
    openai_url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {openai_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": default_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "temperature": 0.7
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(openai_url, json=payload, headers=headers)
            if resp.status_code == 200:
                result = resp.json()
                ai_text = result["choices"][0]["message"]["content"].strip()
                if ai_text:
                    logger.info(f"✨ [INPUT-DATA-AI-ERROR] Mensagem de erro gerada pela IA: '{ai_text}'")
                    return ai_text
            logger.warning(f"⚠️ [INPUT-DATA-AI-ERROR] Falha ao chamar OpenAI (Status {resp.status_code}): {resp.text}")
    except Exception as e:
        logger.error(f"❌ [INPUT-DATA-AI-ERROR] Erro ao chamar OpenAI para gerar erro: {e}")

    return base_error

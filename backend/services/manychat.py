# Grupo 1: Bibliotecas padrão do Python
import asyncio

# Grupo 2: Bibliotecas externas
import httpx

# Grupo 3: Arquivos e módulos locais do projeto
from config_loader import get_settings
from core.logger import logger

async def sync_to_manychat_and_update_history(client_id: int, name: str, phone: str, tag: str, email: str, history_id: int):
    """
    Wrapper para o background task que sincroniza com ManyChat e atualiza o histórico.
    """
    from database import SessionLocal
    import models
    
    # 1. Marcar como pendente no banco IMEDIATAMENTE
    db = SessionLocal()
    try:
        history = db.query(models.WebhookHistory).filter(models.WebhookHistory.id == history_id).first()
        if history:
            updated_data = dict(history.processed_data or {})
            updated_data["manychat_sync"] = {
                "status": "pending",
                "contact": {"status": "processing"},
                "tag": {"status": "pending", "name": tag}
            }
            history.processed_data = updated_data
            db.commit()
            logger.info(f"MANYCHAT | Webhook #{history_id} marcado como processando.")

            # Emitir evento para o WebSocket mostrar "PENDENTE" imediatamente
            try:
                from rabbitmq_client import rabbitmq
                asyncio.create_task(rabbitmq.publish_event("webhook_history_update", {
                    "history_id": int(history_id) if history_id else None,
                    "integration_id": str(history.integration_id) if history.integration_id else None,
                    "client_id": int(client_id) if client_id else None,
                    "processed_data": updated_data
                }))
            except Exception as ws_err:
                logger.warning(f"MANYCHAT | Erro ao emitir evento WS (pending): {ws_err}")
    except Exception as e:
        logger.error(f"MANYCHAT | Erro ao marcar status inicial no webhook #{history_id}: {e}")
        db.rollback()
    finally:
        db.close()

    # 2. Executar Sincronização Real
    try:
        result = await sync_to_manychat(client_id, name, phone, tag, email)
        
        # 3. Atualizar com o resultado final
        db = SessionLocal()
        try:
            history = db.query(models.WebhookHistory).filter(models.WebhookHistory.id == history_id).first()
            if history:
                updated_data = dict(history.processed_data or {})
                updated_data["manychat_sync"] = result
                history.processed_data = updated_data
                db.commit()
                logger.info(f"MANYCHAT | Webhook #{history_id} sincronizado com sucesso. Status final: {result.get('status')}")
                
                # Emitir evento para o WebSocket atualizar o frontend em tempo real
                try:
                    from rabbitmq_client import rabbitmq
                    # Usamos um agendamento curto para garantir que o commit do banco terminou antes do frontend ler
                    asyncio.create_task(rabbitmq.publish_event("webhook_history_update", {
                        "history_id": int(history_id) if history_id else None,
                        "integration_id": str(history.integration_id) if history.integration_id else None,
                        "client_id": int(client_id) if client_id else None,
                        "processed_data": updated_data
                    }))
                except Exception as ws_err:
                    logger.warning(f"MANYCHAT | Erro ao emitir evento WS: {ws_err}")
        except Exception as update_err:
            logger.error(f"MANYCHAT | Erro ao salvar status final no webhook #{history_id}: {update_err}")
            db.rollback()
        finally:
            db.close()
    except Exception as e:
        logger.error(f"MANYCHAT | Erro crítico na tarefa de fundo do ManyChat: {e}")

async def sync_to_manychat(client_id: int, name: str, phone: str, tag: str, email: str = None) -> dict:
    """
    Sincroniza contato com ManyChat e adiciona etiqueta.
    Retorna dicionário com o resultado da operação.
    """
    settings = get_settings(client_id)
    api_key = settings.get("MANYCHAT_API_KEY")
    
    result_status = {
        "status": "pending",
        "contact": {"status": "unknown", "id": None},
        "tag": {"status": "pending", "name": tag},
        "error": None
    }

    if not api_key or api_key == "seu_token_aqui":
        logger.warning(f"ManyChat API Key não configurada para o cliente {client_id}")
        result_status["status"] = "skipped"
        result_status["error"] = "API Key not configured"
        return result_status

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "accept": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Limpa o telefone
            clean_phone_digits = "".join(filter(str.isdigit, str(phone)))

            # --- 1. TENTATIVA DE CRIAÇÃO DIRETA ---
            create_url = f"https://api.manychat.com/fb/subscriber/createSubscriber"
            create_payload = {
                "first_name": name,
                "whatsapp_phone": clean_phone_digits,
                "has_opt_in_sms": True,
                "consent_phrase": "Ao fornecer seu número, você concorda em receber mensagens de marketing."
            }
            if email:
                create_payload["email"] = email
                create_payload["has_opt_in_email"] = True

            logger.info(f"Tentando criar contato {clean_phone_digits} no ManyChat...")
            resp = await client.post(create_url, json=create_payload, headers=headers)
            
            # Se falhar por falta de permissão de email, tenta criar novamente sem email
            if resp.status_code == 400 and "Permission denied to import email" in resp.text:
                logger.warning("MANYCHAT | Conta sem permissão para e-mail. Tentando criar contato sem o campo de e-mail...")
                create_payload_no_email = {
                    "first_name": name,
                    "whatsapp_phone": clean_phone_digits,
                    "has_opt_in_sms": True,
                    "consent_phrase": "Ao fornecer seu número, você concorda em receber mensagens de marketing."
                }
                resp = await client.post(create_url, json=create_payload_no_email, headers=headers)

            subscriber_id = None
            located_via_phone = False
            
            if resp.status_code == 200:
                result = resp.json()
                subscriber_id = result.get("data", {}).get("id")
                logger.info(f"Contato criado com sucesso. ID: {subscriber_id}")
                result_status["contact"]["status"] = "created"
                result_status["contact"]["id"] = subscriber_id
            elif resp.status_code == 400 and "already exists" in resp.text:
                logger.info(f"Contato já existe. Iniciando Deep Scan para localizar o ID...")
                result_status["contact"]["status"] = "existed"
                
                # Tentar extrair o ID numérico da mensagem de erro (muitas respostas de erro trazem o ID do subscriber em conflito)
                import re
                match = re.search(r'\b\d{8,16}\b', resp.text)
                if match:
                    extracted_id = match.group(0)
                    if extracted_id != clean_phone_digits and extracted_id != clean_phone_digits[2:]:
                        try:
                            subscriber_id = int(extracted_id)
                            logger.info(f"ID {subscriber_id} extraído via regex da resposta de erro do ManyChat.")
                        except ValueError:
                            pass
                
                # A0. Tentar busca direta por e-mail se fornecido (mais rápido e preciso para conflitos de e-mail)
                if not subscriber_id and email:
                    find_email_url = f"https://api.manychat.com/fb/subscriber/findBySystemField?email={email}"
                    f_resp_email = await client.get(find_email_url, headers=headers)
                    if f_resp_email.status_code == 200:
                        subs = f_resp_email.json().get("data", [])
                        if subs:
                            subscriber_id = subs[0].get("id")
                            logger.info(f"ID {subscriber_id} localizado via E-mail ({email})")

                if not subscriber_id:
                    # Preparar variantes de telefone para comparação (incluindo nono dígito do Brasil de forma bidirecional)
                    phone_variants = [clean_phone_digits]
                    if clean_phone_digits.startswith("55"):
                        if len(clean_phone_digits) == 13:
                            # Remover o 9 (se for 13 dígitos)
                            variant_no_9 = "55" + clean_phone_digits[2:4] + clean_phone_digits[5:]
                            phone_variants.append(variant_no_9)
                        elif len(clean_phone_digits) == 12:
                            # Adicionar o 9 (se for 12 dígitos)
                            variant_with_9 = "55" + clean_phone_digits[2:4] + "9" + clean_phone_digits[4:]
                            phone_variants.append(variant_with_9)
                    
                    if not clean_phone_digits.startswith("55") and len(clean_phone_digits) in (10, 11):
                        phone_variants.append("55" + clean_phone_digits)
                        if len(clean_phone_digits) == 10:
                            phone_variants.append("55" + clean_phone_digits[:2] + "9" + clean_phone_digits[2:])
                            phone_variants.append(clean_phone_digits[:2] + "9" + clean_phone_digits[2:])
                    
                    extended_variants = [p for p in phone_variants] + [f"+{p}" for p in phone_variants]

                    # A. Tentar busca direta por múltiplos campos (Fallback rápido)
                    search_targets = extended_variants + [clean_phone_digits[2:]]
                    for p_var in search_targets:
                        # 1. Tenta pelo campo 'phone' padrão
                        find_url = f"https://api.manychat.com/fb/subscriber/findBySystemField?phone={p_var.replace('+', '%2B')}"
                        f_resp = await client.get(find_url, headers=headers)
                        if f_resp.status_code == 200:
                            subs = f_resp.json().get("data", [])
                            if subs:
                                subscriber_id = subs[0].get("id")
                                located_via_phone = True
                                logger.info(f"ID {subscriber_id} localizado via phone ({p_var})")
                                break
                        
                        # 2. Tenta pelo campo 'whatsapp_id' (Algumas contas usam wa_id)
                        for param in ["whatsapp_id", "wa_id"]:
                            find_url_wa = f"https://api.manychat.com/fb/subscriber/getInfoByWhatsAppId?{param}={p_var.replace('+', '%2B')}"
                            f_resp_wa = await client.get(find_url_wa, headers=headers)
                            if f_resp_wa.status_code == 200:
                                res_wa = f_resp_wa.json()
                                if res_wa.get("status") == "success":
                                    subscriber_id = res_wa.get("data", {}).get("id")
                                    located_via_phone = True
                                    logger.info(f"ID {subscriber_id} localizado via {param} ({p_var})")
                                    break
                        if subscriber_id: break
                
                # B. Deep Scan por Nome (Se a busca por telefone falhou)
                if not subscriber_id and name and name.lower() != "name":
                    logger.info(f"Busca direta falhou. Vasculhando candidatos por nome '{name}'...")
                    find_url_name = f"https://api.manychat.com/fb/subscriber/findByName?name={name}"
                    name_resp = await client.get(find_url_name, headers=headers)
                    if name_resp.status_code == 200:
                        candidates = name_resp.json().get("data", [])
                        logger.info(f"Encontrados {len(candidates)} candidatos. Investigando...")
                        for cand in candidates:
                            c_id = cand.get("id")
                            info_url = f"https://api.manychat.com/fb/subscriber/getInfo?subscriber_id={c_id}"
                            info_resp = await client.get(info_url, headers=headers)
                            if info_resp.status_code == 200:
                                details = info_resp.json().get("data", {})
                                
                                c_wa_id = str(details.get("whatsapp_id") or "")
                                c_wa_phone = str(details.get("whatsapp_phone") or "")
                                c_wa_obj_id = str(details.get("whatsapp_info", {}).get("id") or "")
                                
                                found_match = False
                                for v in search_targets:
                                    v_clean = v.replace("+", "")
                                    if v_clean in [c_wa_id.replace("+", ""), c_wa_phone.replace("+", ""), c_wa_obj_id.replace("+", "")]:
                                        found_match = True
                                        break
                                
                                if found_match:
                                    subscriber_id = c_id
                                    logger.info(f"✅ SUCESSO! ID {subscriber_id} localizado via WhatsApp ID no scan de nome.")
                                    break
                                
                                if email and email.lower() == str(details.get("email") or "").lower():
                                    subscriber_id = c_id
                                    logger.info(f"✅ SUCESSO! ID {subscriber_id} localizado via Email no scan de nome.")
                                    break
                                
                                if len(candidates) == 1 and not c_wa_id and not c_wa_phone:
                                    subscriber_id = c_id
                                    logger.info(f"Candidato único '{name}' sem WhatsApp ID. Assumindo que é o perfil correto para vincular.")
                                    break
                
                if subscriber_id:
                    result_status["contact"]["id"] = subscriber_id
            else:
                logger.error(f"Erro inesperado no ManyChat (Status {resp.status_code}): {resp.text}")
                result_status["status"] = "failed"
                result_status["error"] = f"API Error {resp.status_code}: {resp.text[:200]}"
                
            if subscriber_id:
                # --- 2. ADIÇÃO DE TAG ---
                # Garantir que a tag existe
                await client.post(f"https://api.manychat.com/fb/page/createTag", json={"name": tag}, headers=headers)
                
                # Aplicar a tag
                tag_add_payload = {"subscriber_id": subscriber_id, "tag_name": tag}
                tag_resp = await client.post(f"https://api.manychat.com/fb/subscriber/addTagByName", 
                                           json=tag_add_payload, 
                                           headers=headers)
                if tag_resp.status_code == 200:
                    logger.info(f"Tag '{tag}' aplicada com sucesso ao contato {subscriber_id}")
                    result_status["tag"]["status"] = "applied"
                    result_status["status"] = "success"
                else:
                    logger.warning(f"Erro ao aplicar tag no contato existente {subscriber_id} (Status {tag_resp.status_code}): {tag_resp.text}. Iniciando fallback de deleção e re-criação...")
                    
                    # --- FALLBACK DE DELEÇÃO E RE-CRIAÇÃO ---
                    # Se localizamos o ID, mas a aplicação da tag falhou (porque o contato está quebrado ou sem canal ativo),
                    # deletamos e recriamos o contato no ManyChat para registrá-lo com o telefone correto.
                    delete_url = "https://api.manychat.com/fb/subscriber/deleteSubscriber"
                    try:
                        del_resp = await client.post(delete_url, json={"subscriber_id": subscriber_id}, headers=headers)
                        if del_resp.status_code == 200:
                            logger.info(f"MANYCHAT | Contato {subscriber_id} deletado com sucesso do ManyChat.")
                            # Tentar recriar agora com o telefone correto
                            resp_retry = await client.post(create_url, json=create_payload, headers=headers)
                            if resp_retry.status_code == 400 and "Permission denied to import email" in resp_retry.text:
                                resp_retry = await client.post(create_url, json=create_payload_no_email, headers=headers)
                            
                            if resp_retry.status_code == 200:
                                result_retry = resp_retry.json()
                                new_sub_id = result_retry.get("data", {}).get("id")
                                logger.info(f"MANYCHAT | Contato recriado com sucesso após deleção. Novo ID: {new_sub_id}")
                                result_status["contact"]["status"] = "created"
                                result_status["contact"]["id"] = new_sub_id
                                
                                # Aplicar a tag no novo contato recriado
                                tag_retry_resp = await client.post(f"https://api.manychat.com/fb/subscriber/addTagByName", 
                                                                   json={"subscriber_id": new_sub_id, "tag_name": tag}, 
                                                                   headers=headers)
                                if tag_retry_resp.status_code == 200:
                                    logger.info(f"Tag '{tag}' aplicada com sucesso ao novo contato {new_sub_id}")
                                    result_status["tag"]["status"] = "applied"
                                    result_status["status"] = "success"
                                    result_status["error"] = None
                                else:
                                    result_status["tag"]["status"] = "failed"
                                    result_status["status"] = "partial_success"
                                    result_status["error"] = f"Tag error: {tag_retry_resp.text[:200]}"
                            else:
                                result_status["status"] = "failed"
                                result_status["error"] = f"Erro ao recriar contato após deleção: {resp_retry.text[:200]}"
                        else:
                            logger.warning(f"MANYCHAT | Falha ao deletar contato {subscriber_id} (Status {del_resp.status_code}): {del_resp.text}")
                            result_status["tag"]["status"] = "failed"
                            result_status["status"] = "failed"
                            result_status["error"] = f"Tag error: {tag_resp.text[:200]}"
                    except Exception as del_err:
                        logger.error(f"MANYCHAT | Exceção ao tentar deletar/recriar contato {subscriber_id}: {del_err}")
                        result_status["status"] = "failed"
                        result_status["error"] = str(del_err)
            else:
                logger.error("Falha total em localizar ou criar o contato no ManyChat após Deep Scan.")
                if result_status["status"] != "failed":
                    result_status["status"] = "failed"
                    result_status["error"] = (
                        "O contato já existe no ManyChat, mas a API não conseguiu localizá-lo porque o "
                        "campo de telefone do sistema (System Field 'Phone') está vazio nesse contato no ManyChat, "
                        "e a busca por e-mail ou nome também falhou. Certifique-se de preencher o Telefone "
                        "do Sistema ou usar o nome idêntico ao do perfil do WhatsApp para que a busca encontre o ID."
                    )

    except Exception as e:
        logger.error(f"Exceção ao sincronizar com ManyChat: {e}")
        result_status["status"] = "failed"
        result_status["error"] = str(e)

    return result_status

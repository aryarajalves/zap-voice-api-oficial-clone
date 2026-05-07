import httpx
import asyncio
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
                    "history_id": history_id,
                    "integration_id": history.integration_id,
                    "client_id": client_id,
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
                        "history_id": history_id,
                        "integration_id": history.integration_id,
                        "client_id": client_id,
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
            
            subscriber_id = None
            
            if resp.status_code == 200:
                result = resp.json()
                subscriber_id = result.get("data", {}).get("id")
                logger.info(f"Contato criado com sucesso. ID: {subscriber_id}")
                result_status["contact"]["status"] = "created"
                result_status["contact"]["id"] = subscriber_id
            elif resp.status_code == 400 and "already exists" in resp.text:
                logger.info(f"Contato já existe. Iniciando Deep Scan para localizar o ID...")
                result_status["contact"]["status"] = "existed"
                
                # Preparar variantes de telefone para comparação
                phone_variants = [clean_phone_digits]
                if clean_phone_digits.startswith("55") and len(clean_phone_digits) == 13:
                    variant_no_9 = "55" + clean_phone_digits[2:4] + clean_phone_digits[5:]
                    phone_variants.append(variant_no_9)
                extended_variants = [p for p in phone_variants] + [f"+{p}" for p in phone_variants]

                # A. Tentar busca direta por múltiplos campos (Fallback rápido)
                search_targets = extended_variants + [clean_phone_digits[2:]] # Tenta também sem o 55
                for p_var in search_targets:
                    # 1. Tenta pelo campo 'phone' padrão
                    find_url = f"https://api.manychat.com/fb/subscriber/findBySystemField?phone={p_var.replace('+', '%2B')}"
                    f_resp = await client.get(find_url, headers=headers)
                    if f_resp.status_code == 200:
                        subs = f_resp.json().get("data", [])
                        if subs:
                            subscriber_id = subs[0].get("id")
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
                                # logger.info(f"DEBUG ESTRUTURA COMPLETA {c_id}: {details}") # Comentado para evitar log excessivo
                                
                                # Captura todas as possíveis formas do WhatsApp ID aparecer
                                c_wa_id = str(details.get("whatsapp_id") or "")
                                c_wa_phone = str(details.get("whatsapp_phone") or "")
                                c_wa_obj_id = str(details.get("whatsapp_info", {}).get("id") or "")
                                
                                # Compara com as variantes do WhatsApp ID que temos (com e sem 9, com e sem +)
                                found_match = False
                                for v in search_targets:
                                    v_clean = v.replace("+", "")
                                    if v_clean in [c_wa_id.replace("+", ""), c_wa_phone.replace("+", ""), c_wa_obj_id.replace("+", "")]:
                                        found_match = True
                                        break
                                
                                if found_match:
                                    subscriber_id = c_id
                                    logger.info(f"✅ SUCESSO! ID {subscriber_id} localizado via WhatsApp ID.")
                                    break
                                
                                # Fallback por Email (caso o WhatsApp ID esteja vindo vazio por algum bug da API)
                                if email and email.lower() == str(details.get("email") or "").lower():
                                    subscriber_id = c_id
                                    logger.info(f"✅ SUCESSO! ID {subscriber_id} localizado via Email.")
                                    break
                                
                                # Se for o único candidato com esse nome exato e não tiver WhatsApp ID vinculado, assume-se que é o perfil a ser vinculado
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
                
                # Aplicar a tag (usando addTagByName que é mais resiliente se o subscriber_id for o correto)
                tag_add_payload = {"subscriber_id": subscriber_id, "tag_name": tag}
                tag_resp = await client.post(f"https://api.manychat.com/fb/subscriber/addTagByName", 
                                           json=tag_add_payload, 
                                           headers=headers)
                if tag_resp.status_code == 200:
                    logger.info(f"Tag '{tag}' aplicada com sucesso ao contato {subscriber_id}")
                    result_status["tag"]["status"] = "applied"
                    result_status["status"] = "success"
                else:
                    logger.error(f"Erro ao aplicar tag: {tag_resp.text}")
                    result_status["tag"]["status"] = "failed"
                    result_status["status"] = "partial_success"
                    result_status["error"] = f"Tag error: {tag_resp.text[:200]}"
            else:
                logger.error("Falha total em localizar ou criar o contato no ManyChat após Deep Scan.")
                if result_status["status"] != "failed":
                    result_status["status"] = "failed"
                    result_status["error"] = "Contact not found or created"

    except Exception as e:
        logger.error(f"Exceção ao sincronizar com ManyChat: {e}")
        result_status["status"] = "failed"
        result_status["error"] = str(e)

    return result_status

import httpx
from core.logger import setup_logger
from ..logging import log_node_execution
from services.leads import upsert_webhook_lead
from .local_segment import handle_local_segment_node

logger = setup_logger("FunnelEngine.Nodes.CrmActions")

async def handle_crm_actions_node(db, trigger, node, chatwoot, contact_phone, conversation_id, apply_vars_func):
    current_node_id = node.get("id")
    data = node.get("data", {})
    
    platform = data.get("platform", "chatwoot").strip().lower()
    action = data.get("action", "").strip()
    value_raw = data.get("value", "").strip()
    value = apply_vars_func(value_raw) if value_raw else ""
    
    log_node_execution(
        db, trigger, current_node_id, "processing", 
        f"⚙️ Processando Ação de CRM (Plataforma: {platform}, Ação: {action}, Valor: '{value}')..."
    )

    try:
        # ==========================================
        # CHATWOOT ACTIONS
        # ==========================================
        if platform == "chatwoot":
            # Obter ou criar conversa local ZapVoice
            clean_phone = "".join(filter(str.isdigit, str(contact_phone)))
            chat_convo = None
            if clean_phone:
                suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone
                import models
                chat_convo = db.query(models.ChatConversation).filter(
                    models.ChatConversation.client_id == trigger.client_id,
                    models.ChatConversation.phone.like(f"%{suffix}")
                ).first()
                if not chat_convo:
                    chat_convo = models.ChatConversation(
                        client_id=trigger.client_id,
                        phone=clean_phone,
                        contact_name=trigger.contact_name or clean_phone,
                        status="open",
                        unread_count=0
                    )
                    db.add(chat_convo)
                    db.flush()

            if action == "chatwoot_label":
                # Adicionar e remover etiquetas na conversa local
                add_str = data.get("label", "").strip()
                remove_str = data.get("remove_label", "").strip()

                if not add_str and not remove_str:
                    log_node_execution(db, trigger, current_node_id, "completed", "Etiquetagem local ignorada: nenhuma etiqueta de adicionar ou remover fornecida.")
                    return "default"

                if chat_convo:
                    current_labels = list(chat_convo.labels) if chat_convo.labels else []
                    
                    if add_str:
                        labels_to_add = [l.strip() for l in add_str.split(",") if l.strip()]
                        for label in labels_to_add:
                            if label not in current_labels:
                                current_labels.append(label)
                                
                    if remove_str:
                        labels_to_remove = [l.strip() for l in remove_str.split(",") if l.strip()]
                        current_labels = [l for l in current_labels if l not in labels_to_remove]
                    
                    from sqlalchemy.orm.attributes import flag_modified
                    chat_convo.labels = current_labels
                    flag_modified(chat_convo, "labels")
                    db.commit()

                    # Notificar via WebSocket
                    try:
                        from rabbitmq_client import rabbitmq
                        payload_ws = {
                            "conversation_id": chat_convo.id,
                            "client_id": trigger.client_id,
                            "labels": current_labels
                        }
                        import asyncio
                        asyncio.create_task(rabbitmq.publish_event("conversation_updated", payload_ws))
                    except Exception as e_ws:
                        logger.error(f"Erro no WebSocket ao atualizar labels: {e_ws}")

                log_node_execution(db, trigger, current_node_id, "completed", f"Etiquetas locais processadas. Adicionadas: '{add_str or 'Nenhuma'}'. Removidas: '{remove_str or 'Nenhuma'}'.")

            elif action == "update_contact":
                name_type = data.get("nameType", "fixed")
                new_name = (trigger.contact_name or "Cliente WhatsApp") if name_type == "official" else apply_vars_func(data.get("newName", ""))

                if new_name and chat_convo:
                    chat_convo.contact_name = new_name
                    db.commit()
                    
                    # WebSocket update
                    try:
                        from rabbitmq_client import rabbitmq
                        payload_ws = {
                            "conversation_id": chat_convo.id,
                            "client_id": trigger.client_id,
                            "contact_name": new_name
                        }
                        import asyncio
                        asyncio.create_task(rabbitmq.publish_event("conversation_updated", payload_ws))
                    except Exception as e_ws:
                        logger.error(f"Erro no WebSocket ao atualizar nome: {e_ws}")

                    log_node_execution(db, trigger, current_node_id, "completed", f"Contato atualizado localmente para o nome: '{new_name}'.")
                else:
                    log_node_execution(db, trigger, current_node_id, "completed", "Atualização de contato ignorada.")

            elif action == "add_private_note":
                if not value:
                    log_node_execution(db, trigger, current_node_id, "completed", "Ação de Nota Privada ignorada: conteúdo vazio.")
                    return "default"
                if chat_convo:
                    chat_convo.private_note = value
                    db.commit()

                    # Registrar a nota privada na timeline do chat também
                    from datetime import datetime, timezone
                    chat_msg = models.ChatMessage(
                        conversation_id=chat_convo.id,
                        sender_type="system", # system = notas ou avisos do sistema
                        message_type="text",
                        content=f"📌 [Nota Privada]: {value}"
                    )
                    db.add(chat_msg)
                    db.commit()

                    # WebSocket notify message
                    try:
                        from rabbitmq_client import rabbitmq
                        payload_ws = {
                            "id": chat_msg.id,
                            "conversation_id": chat_msg.conversation_id,
                            "sender_type": chat_msg.sender_type,
                            "message_type": chat_msg.message_type,
                            "content": chat_msg.content,
                            "timestamp": chat_msg.timestamp.isoformat() if chat_msg.timestamp else datetime.now(timezone.utc).isoformat(),
                            "client_id": trigger.client_id
                        }
                        import asyncio
                        asyncio.create_task(rabbitmq.publish_event("new_message", payload_ws))
                    except Exception as e_ws:
                        logger.error(f"Erro no WebSocket ao enviar mensagem: {e_ws}")

                    log_node_execution(db, trigger, current_node_id, "completed", f"Nota Privada adicionada localmente.")

            elif action == "change_assignee":
                if not value:
                    log_node_execution(db, trigger, current_node_id, "completed", "Ação de Alterar Responsável ignorada: ID do agente não fornecido.")
                    return "default"
                
                try:
                    agent_id = int(value.strip())
                    if chat_convo:
                        chat_convo.assigned_user_id = agent_id
                        db.commit()

                        # WebSocket update
                        try:
                            from rabbitmq_client import rabbitmq
                            payload_ws = {
                                "conversation_id": chat_convo.id,
                                "client_id": trigger.client_id,
                                "assigned_user_id": agent_id
                            }
                            import asyncio
                            asyncio.create_task(rabbitmq.publish_event("conversation_updated", payload_ws))
                        except Exception as e_ws:
                            logger.error(f"Erro no WebSocket ao atualizar responsável: {e_ws}")

                        log_node_execution(db, trigger, current_node_id, "completed", f"Responsável da conversa alterado localmente para o agente ID {agent_id}.")
                except ValueError:
                    log_node_execution(db, trigger, current_node_id, "completed", f"Ação de Alterar Responsável ignorada: ID do agente inválido ('{value}').")

        # ==========================================
        # LOCAL SEGMENTATION ACTIONS (ZAPVOICE)
        # ==========================================
        elif platform == "local":
            fake_node = {
                "id": current_node_id,
                "data": {
                    "action": action,
                    "tagName": value
                }
            }
            return await handle_local_segment_node(db, trigger, fake_node, contact_phone)

        # ==========================================
        # MANYCHAT ACTIONS
        # ==========================================
        elif platform == "manychat":
            settings = chatwoot.settings
            api_key = settings.get("MANYCHAT_API_KEY")
            if not api_key or api_key == "seu_token_aqui":
                log_node_execution(db, trigger, current_node_id, "completed", "Ação do ManyChat ignorada: API Key não configurada.")
                return "default"

            # 1. Encontrar ou criar o contato no ManyChat para obter o subscriber_id
            from services.manychat import sync_to_manychat
            mc_sync_res = await sync_to_manychat(
                client_id=trigger.client_id,
                name=trigger.contact_name or "Cliente WhatsApp",
                phone=contact_phone,
                tag=value if action == "add_tag" else "ZapVoice_CRM_Ping"
            )
            subscriber_id = mc_sync_res.get("contact", {}).get("id")

            if not subscriber_id:
                log_node_execution(db, trigger, current_node_id, "completed", f"Ação do ManyChat ignorada: Não foi possível obter o ID do contato na Meta (erro: {mc_sync_res.get('error')}).")
                return "default"

            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "accept": "application/json"
            }

            async with httpx.AsyncClient(timeout=15.0) as client:
                if action == "add_tag":
                    if not value: return "default"
                    # Garante que a tag existe na conta
                    await client.post("https://api.manychat.com/fb/page/createTag", json={"name": value}, headers=headers)
                    # Adiciona a tag
                    resp = await client.post(
                        "https://api.manychat.com/fb/subscriber/addTagByName",
                        json={"subscriber_id": subscriber_id, "tag_name": value},
                        headers=headers
                    )
                    log_node_execution(db, trigger, current_node_id, "completed", f"Tag ManyChat '{value}' adicionada. Status: {resp.status_code}.")

                elif action == "remove_tag":
                    if not value: return "default"
                    resp = await client.post(
                        "https://api.manychat.com/fb/subscriber/removeTagByName",
                        json={"subscriber_id": subscriber_id, "tag_name": value},
                        headers=headers
                    )
                    log_node_execution(db, trigger, current_node_id, "completed", f"Tag ManyChat '{value}' removida. Status: {resp.status_code}.")

                elif action == "set_custom_field":
                    # Espera o formato "nome_do_campo:valor"
                    if ":" not in value_raw:
                        log_node_execution(db, trigger, current_node_id, "completed", "Ação Custom Field ignorada: formato inválido. Use 'nome_do_campo:valor'.")
                        return "default"
                    
                    field_name_raw, field_val_raw = value_raw.split(":", 1)
                    field_name = field_name_raw.strip()
                    field_value = apply_vars_func(field_val_raw.strip())
                    
                    # 1. Obter todos os custom fields da conta para encontrar o field_id correspondente
                    fields_resp = await client.get("https://api.manychat.com/fb/page/getCustomFields", headers=headers)
                    field_id = None
                    if fields_resp.status_code == 200:
                        fields_data = fields_resp.json().get("data", [])
                        for f in fields_data:
                            if f.get("name", "").lower() == field_name.lower():
                                field_id = f.get("id")
                                break
                    
                    if not field_id:
                        log_node_execution(db, trigger, current_node_id, "completed", f"Ação Custom Field ignorada: campo '{field_name}' não cadastrado no ManyChat.")
                        return "default"

                    # 2. Definir o valor do custom field para o contato
                    resp = await client.post(
                        "https://api.manychat.com/fb/subscriber/setCustomField",
                        json={"subscriber_id": subscriber_id, "field_id": field_id, "field_value": field_value},
                        headers=headers
                    )
                    log_node_execution(db, trigger, current_node_id, "completed", f"Custom Field ManyChat '{field_name}' definido como '{field_value}'. Status: {resp.status_code}.")

        return "default"
    except Exception as e:
        logger.error(f"Erro ao processar ações de CRM no nó {current_node_id}: {e}")
        log_node_execution(db, trigger, current_node_id, "failed", f"Erro no processamento da ação de CRM: {str(e)}")
        return "default"

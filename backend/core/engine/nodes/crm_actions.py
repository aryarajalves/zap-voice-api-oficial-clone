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
            if action == "chatwoot_label":
                # Adicionar e remover etiquetas em lote de forma sequencial ou paralela
                add_str = data.get("label", "").strip()
                remove_str = data.get("remove_label", "").strip()

                if not add_str and not remove_str:
                    log_node_execution(db, trigger, current_node_id, "completed", "Etiquetagem Chatwoot ignorada: nenhuma etiqueta de adicionar ou remover fornecida.")
                    return "default"

                clean_phone = "".join(filter(str.isdigit, str(contact_phone)))
                contact_res = await chatwoot.search_contact(clean_phone)
                contact_id = contact_res["payload"][0]["id"] if contact_res and contact_res.get("payload") else None

                # Processar adições
                if add_str:
                    labels_to_add = [l.strip() for l in add_str.split(",") if l.strip()]
                    if conversation_id and int(conversation_id) > 0:
                        await chatwoot.add_label_to_conversation(conversation_id, labels_to_add)
                    if contact_id:
                        await chatwoot.add_label_to_contact(contact_id, labels_to_add)

                # Processar remoções
                if remove_str:
                    labels_to_remove = [l.strip() for l in remove_str.split(",") if l.strip()]
                    if conversation_id and int(conversation_id) > 0:
                        await chatwoot.remove_label_from_conversation(conversation_id, labels_to_remove)
                    if contact_id:
                        await chatwoot.remove_label_from_contact(contact_id, labels_to_remove)

                log_node_execution(db, trigger, current_node_id, "completed", f"Etiquetas Chatwoot processadas. Adicionadas: '{add_str or 'Nenhuma'}'. Removidas: '{remove_str or 'Nenhuma'}'.")

            elif action == "update_contact":
                name_type = data.get("nameType", "fixed")
                new_name = (trigger.contact_name or "Cliente WhatsApp") if name_type == "official" else apply_vars_func(data.get("newName", ""))

                if new_name:
                    clean_phone = "".join(filter(str.isdigit, str(contact_phone)))
                    contact_res = await chatwoot.search_contact(clean_phone)
                    if contact_res and contact_res.get("payload"):
                        await chatwoot.update_contact(contact_res["payload"][0]["id"], {"name": new_name})
                    log_node_execution(db, trigger, current_node_id, "completed", f"Contato Chatwoot atualizado para o nome: '{new_name}'.")
                else:
                    log_node_execution(db, trigger, current_node_id, "completed", "Atualização de contato ignorada: novo nome não foi fornecido.")

            elif action == "add_private_note":
                if not value:
                    log_node_execution(db, trigger, current_node_id, "completed", "Ação de Nota Privada ignorada: conteúdo da nota vazio.")
                    return "default"
                if conversation_id and int(conversation_id) > 0:
                    await chatwoot.send_private_note(conversation_id, value)
                    log_node_execution(db, trigger, current_node_id, "completed", f"Nota Privada adicionada à conversa Chatwoot.")
                else:
                    log_node_execution(db, trigger, current_node_id, "completed", "Ação de Nota Privada ignorada: ID da conversa inválido.")

            elif action == "change_assignee":
                if not value:
                    log_node_execution(db, trigger, current_node_id, "completed", "Ação de Alterar Responsável ignorada: ID do agente não fornecido.")
                    return "default"
                
                try:
                    agent_id = int(value.strip())
                    if conversation_id and int(conversation_id) > 0:
                        await chatwoot.assign_agent_to_conversation(conversation_id, agent_id)
                        log_node_execution(db, trigger, current_node_id, "completed", f"Responsável da conversa alterado para o agente ID {agent_id}.")
                    else:
                        log_node_execution(db, trigger, current_node_id, "completed", "Ação de Alterar Responsável ignorada: ID da conversa inválido.")
                except ValueError:
                    log_node_execution(db, trigger, current_node_id, "completed", f"Ação de Alterar Responsável ignorada: ID do agente inválido ('{value}').")

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

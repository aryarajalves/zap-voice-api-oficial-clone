from core.logger import setup_logger
from ..logging import log_node_execution
from services.leads import upsert_webhook_lead
import models

logger = setup_logger("FunnelEngine.Nodes.LocalSegment")

async def handle_local_segment_node(db, trigger, node, contact_phone):
    current_node_id = node.get("id")
    data = node.get("data", {})
    
    action = data.get("action", "add_tag")
    tag_name = data.get("tagName", "").strip()
    clean_phone = "".join(filter(str.isdigit, str(contact_phone)))
    
    log_node_execution(
        db, trigger, current_node_id, "processing", 
        f"⚙️ Processando Segmentação Local (Ação: {action}, Tag: '{tag_name}')..."
    )

    try:
        # Ações de Tag (Etiqueta Local no ZapVoice)
        if action in ["add_tag", "remove_tag"]:
            if not tag_name:
                log_node_execution(
                    db, trigger, current_node_id, "completed",
                    "Ação de tag ignorada pois nenhuma tag foi informada."
                )
                return "default"
                
            lead_data = {
                "phone": clean_phone,
                "name": trigger.contact_name or "Cliente WhatsApp",
                "event_type": "funnel_automation"
            }
            
            if action == "add_tag":
                upsert_webhook_lead(db, trigger.client_id, "funnel", lead_data, tag=tag_name)
                log_node_execution(
                    db, trigger, current_node_id, "completed",
                    f"Tag '{tag_name}' adicionada com sucesso ao contato {clean_phone}."
                )
            else:
                upsert_webhook_lead(db, trigger.client_id, "funnel", lead_data, tags_to_remove=tag_name)
                log_node_execution(
                    db, trigger, current_node_id, "completed",
                    f"Tag '{tag_name}' removida com sucesso do contato {clean_phone}."
                )
                
        # Ações de Blacklist (Bloquear Contato no ZapVoice)
        elif action in ["block", "unblock"]:
            if action == "block":
                # Verificar se já está bloqueado
                exists = db.query(models.BlockedContact).filter_by(
                    client_id=trigger.client_id,
                    phone=clean_phone
                ).first()
                if not exists:
                    block_entry = models.BlockedContact(
                        client_id=trigger.client_id,
                        phone=clean_phone,
                        name=trigger.contact_name or "Cliente WhatsApp",
                        reason="Bloqueado dinamicamente via Funil"
                    )
                    db.add(block_entry)
                    db.commit()

                    # Enviar nota privada no Chatwoot informando o bloqueio
                    if trigger.conversation_id:
                        try:
                            import asyncio
                            from services.block_note import send_block_note_async
                            loop = asyncio.get_event_loop()
                            if loop.is_running():
                                loop.create_task(send_block_note_async(
                                    client_id=trigger.client_id,
                                    conversation_id=trigger.conversation_id,
                                    phone=clean_phone,
                                    reason="Bloqueado dinamicamente via Funil"
                                ))
                            else:
                                loop.run_until_complete(send_block_note_async(
                                    client_id=trigger.client_id,
                                    conversation_id=trigger.conversation_id,
                                    phone=clean_phone,
                                    reason="Bloqueado dinamicamente via Funil"
                                ))
                        except Exception as e_note:
                            pass  # Nota é não-crítica, não deve interromper o funil
                log_node_execution(
                    db, trigger, current_node_id, "completed",
                    f"Contato {clean_phone} adicionado à Blacklist local com sucesso."
                )
            else:
                db.query(models.BlockedContact).filter_by(
                    client_id=trigger.client_id,
                    phone=clean_phone
                ).delete()
                db.commit()
                log_node_execution(
                    db, trigger, current_node_id, "completed",
                    f"Contato {clean_phone} removido da Blacklist local com sucesso."
                )

        return "default"
    except Exception as e:
        logger.error(f"Erro ao processar segmentação local no nó {current_node_id}: {e}")
        db.rollback()
        log_node_execution(
            db, trigger, current_node_id, "failed",
            f"Erro ao processar segmentação local: {str(e)}"
        )
        return "default"

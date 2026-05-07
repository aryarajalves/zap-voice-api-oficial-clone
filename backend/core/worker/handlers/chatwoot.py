import asyncio
import logging
import models
from database import SessionLocal
from chatwoot_client import ChatwootClient
from ..utils import update_node_history_extra

logger = logging.getLogger("Worker.Chatwoot")

async def handle_chatwoot_private_message(data: dict):
    """
    Consumidor dedicado para envio de notas privadas no Chatwoot via RabbitMQ.
    """
    client_id = data.get("client_id")
    phone = data.get("phone")
    message = data.get("message")
    trigger_id = data.get("trigger_id")
    conversation_id = data.get("conversation_id")
    delay = data.get("delay", 5)
    
    if delay > 0:
        await asyncio.sleep(delay)
        
    db = SessionLocal()
    try:
        cw = ChatwootClient(client_id=client_id)
        
        if not conversation_id:
            inbox_id = await cw.get_default_whatsapp_inbox()
            conv_res = await cw.ensure_conversation(phone, phone, inbox_id)
            conversation_id = conv_res.get("conversation_id") if conv_res else None
            
        if conversation_id:
            logger.info(f"💬 [PRIVATE_NOTE] Enviando nota para Conv {conversation_id} (Cliente {client_id})")
            res = await cw.create_private_note(conversation_id, message)
            
            if res:
                from services.triggers_service import increment_private_note_stats
                increment_private_note_stats(db, trigger_id)
                
                if trigger_id:
                    await update_node_history_extra(db, trigger_id, "DELIVERY", "private_note_status", "success")
                    
                    trigger = db.query(models.ScheduledTrigger).get(trigger_id)
                    if trigger:
                        from services.engine import trigger_to_dict
                        from rabbitmq_client import rabbitmq
                        await rabbitmq.publish_event("bulk_progress", trigger_to_dict(trigger))
                
                logger.info(f"✅ [PRIVATE_NOTE] Nota enviada com sucesso para {phone}")
            else:
                logger.warning(f"⚠️ [PRIVATE_NOTE] Falha ao enviar nota para {phone}")
                if trigger_id:
                    await update_node_history_extra(db, trigger_id, "DELIVERY", "private_note_status", "failed")
        else:
            logger.error(f"❌ [PRIVATE_NOTE] Não foi possível encontrar conversa para enviar nota: {phone}")
            if trigger_id:
                await update_node_history_extra(db, trigger_id, "DELIVERY", "private_note_status", "failed")
                
    except Exception as e:
        logger.error(f"❌ [PRIVATE_NOTE] Erro ao processar nota privada: {e}")
        if trigger_id:
            await update_node_history_extra(db, trigger_id, "DELIVERY", "private_note_status", "failed")
    finally:
        db.close()

async def delayed_sync_chatwoot_name(client_id: int, phone: str, name: str, delay: int = 15):
    """
    Aguarda X segundos e sincroniza o nome do contato no Chatwoot.
    """
    if not name or not phone: return
        
    await asyncio.sleep(delay)
    logger.info(f"🔄 [SYNC] Iniciando sincronização atrasada para {phone} ({name})")
    
    try:
        chatwoot = ChatwootClient(client_id=client_id)
        clean_phone = "".join(filter(str.isdigit, phone))
        search_query = f"+{clean_phone}"
        
        search_res = await chatwoot.search_contact(search_query)
        if not (search_res and search_res.get("payload")):
             search_res = await chatwoot.search_contact(clean_phone)

        if search_res and search_res.get("payload"):
            contact = search_res["payload"][0]
            contact_id = contact["id"]
            current_name = contact.get("name")
            
            if name and current_name != name:
                logger.info(f"🔄 [SYNC] Atualizando nome no Chatwoot para {phone}: '{current_name}' -> '{name}'")
                await chatwoot.update_contact(contact_id, {"name": name})
            else:
                logger.info(f"✅ [SYNC] Nome já está atualizado ou coincide para {phone}")
        else:
            logger.warning(f"⚠️ [SYNC] Contato {phone} não encontrado no Chatwoot.")
            
    except Exception as e:
        logger.error(f"❌ [SYNC] Erro na sincronização atrasada de nome para {phone}: {e}")

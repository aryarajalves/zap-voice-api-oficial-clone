import httpx
import asyncio
from core.logger import setup_logger
from models import ContactWindow

logger = setup_logger("ChatwootSyncUtils")

async def safe_chatwoot_sync(db, trigger, contact_phone, client_id, effective_inbox_id, chatwoot_client, sync_fn):
    """
    Executa uma função de sincronização do Chatwoot com tratamento resiliente contra HTTP 404.
    Se falhar com 404 (conversa inexistente no Chatwoot oficial), invalida o cache local
    e obtém a conversa real via ensure_conversation.
    """
    conversation_id = trigger.conversation_id
    
    # Se não temos ID de conversa inicialmente, não há o que tentar direto.
    # Mas se temos, tentamos com ele.
    if conversation_id:
        try:
            logger.info(f"🔄 [SYNC_CHATWOOT] Tentando sincronizar na conversa {conversation_id} para {contact_phone}...")
            await sync_fn(conversation_id)
            return
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.warning(f"⚠️ [SYNC_404] Conversa {conversation_id} não encontrada no Chatwoot para {contact_phone}. Invalidando cache...")
            else:
                logger.error(f"❌ [SYNC] Erro HTTP ao sincronizar na conversa {conversation_id}: {e}")
                return
        except Exception as err:
            logger.error(f"❌ [SYNC] Erro inesperado ao sincronizar na conversa {conversation_id}: {err}")
            return

    # Se falhou com 404, ou se não tínhamos conversation_id inicial, faz a autocorreção
    logger.info(f"🔍 [SYNC_RECOVERY] Resolvendo conversa atualizada via ensure_conversation para {contact_phone}...")
    
    # 1. Invalida qualquer cache local da tabela ContactWindow
    try:
        clean_phone = ''.join(filter(str.isdigit, contact_phone))
        db.query(ContactWindow).filter(
            ContactWindow.phone == clean_phone,
            ContactWindow.client_id == client_id
        ).delete()
        db.commit()
    except Exception as db_err:
        logger.error(f"❌ [SYNC_RECOVERY] Erro ao limpar ContactWindow: {db_err}")
        db.rollback()

    # 2. Obter nova conversa real no Chatwoot (ensure_conversation)
    try:
        conv = await chatwoot_client.ensure_conversation(
            contact_phone, 
            trigger.contact_name or contact_phone, 
            effective_inbox_id
        )
        if conv and (isinstance(conv, dict) and conv.get("conversation_id")):
            new_conv_id = conv.get("conversation_id")
            trigger.conversation_id = new_conv_id
            db.commit()
            
            logger.info(f"🔄 [SYNC_RECOVERY] Nova conversa resolvida: {new_conv_id}. Retentando sincronização...")
            # 3. Retentar o envio da nota/mensagem informativa
            await sync_fn(new_conv_id)
            logger.info(f"✅ [SYNC_RECOVERY] Sincronização concluída com sucesso após autocorreção!")
        elif conv and isinstance(conv, int):
            # Caso o ensure_conversation retorne diretamente o ID inteiro
            trigger.conversation_id = conv
            db.commit()
            logger.info(f"🔄 [SYNC_RECOVERY] Nova conversa resolvida (int): {conv}. Retentando sincronização...")
            await sync_fn(conv)
            logger.info(f"✅ [SYNC_RECOVERY] Sincronização concluída com sucesso após autocorreção!")
        else:
            logger.error(f"❌ [SYNC_RECOVERY] Não foi possível criar/encontrar uma conversa para {contact_phone}")
    except Exception as re_err:
        logger.error(f"❌ [SYNC_RECOVERY] Falha na tentativa de recuperação automática de conversa/sincronização: {re_err}")


async def sync_message_to_local_chat(db, client_id: int, phone: str, contact_name: str, content: str, message_type: str = "text", media_url: str = None, wa_message_id: str = None):
    """
    Sincroniza uma mensagem enviada pela automação/funil com o chat de atendimento local do cliente.
    """
    try:
        from rabbitmq_client import rabbitmq
        import models
        from datetime import datetime, timezone
        
        clean_phone = "".join(filter(str.isdigit, str(phone)))
        if not clean_phone:
            return
        suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone
        
        # Buscar conversa local pelo client_id e sufixo de 8 dígitos
        chat_convo = db.query(models.ChatConversation).filter(
            models.ChatConversation.client_id == client_id,
            models.ChatConversation.phone.like(f"%{suffix}")
        ).first()
        
        if not chat_convo:
            chat_convo = models.ChatConversation(
                client_id=client_id,
                phone=clean_phone,
                contact_name=contact_name or clean_phone,
                status="open",
                unread_count=0
            )
            db.add(chat_convo)
            db.flush()
            
        # Registrar a mensagem disparada
        chat_message = models.ChatMessage(
            conversation_id=chat_convo.id,
            sender_type="user", # user = enviado pelo agente / sistema
            message_type=message_type,
            content=content,
            media_url=media_url,
            wa_message_id=wa_message_id
        )
        db.add(chat_message)
        
        # Atualiza a conversa
        chat_convo.last_message_content = content or f"[{message_type.upper()} enviado]"
        chat_convo.unread_count = 0
        chat_convo.last_message_at = datetime.now(timezone.utc)
        db.commit()
        
        # Broadcast via WebSocket em tempo real para o frontend
        payload_ws = {
            "id": chat_message.id,
            "conversation_id": chat_message.conversation_id,
            "sender_type": chat_message.sender_type,
            "message_type": chat_message.message_type,
            "content": chat_message.content,
            "media_url": chat_message.media_url,
            "timestamp": chat_message.timestamp.isoformat() if chat_message.timestamp else datetime.now(timezone.utc).isoformat(),
            "wa_message_id": chat_message.wa_message_id,
            "client_id": client_id
        }
        await rabbitmq.publish_event("new_message", payload_ws)
    except Exception as e:
        import logging
        logging.getLogger("LocalChatSync").error(f"❌ [CHAT-LOCAL-SYNC] Erro ao sincronizar mensagem do funil localmente: {e}")

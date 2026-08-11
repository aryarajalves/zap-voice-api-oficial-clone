"""
Utilitário para enviar notas privadas no Chatwoot sobre eventos de bloqueio.
"""
import asyncio
from datetime import datetime
from core.logger import setup_logger
from config_loader import get_setting

logger = setup_logger("BlockedNoteService")


async def send_block_note_async(
    client_id: int,
    conversation_id,
    phone: str,
    reason: str = "Manual",
    operator_name: str = None
):
    """
    Envia uma anotação privada no Chatwoot informando que o contato foi bloqueado.
    """
    if not conversation_id:
        return

    try:
        from chatwoot_client import ChatwootClient

        account_id = get_setting("CHATWOOT_ACCOUNT_ID", "1", client_id=client_id)
        cw = ChatwootClient(account_id=account_id, client_id=client_id)

        now = datetime.now().strftime("%d/%m/%Y às %H:%M")
        by_str = f" por **{operator_name}**" if operator_name else ""

        note_text = (
            f"🚫 **Contato bloqueado**{by_str}\n\n"
            f"📞 Número: `{phone}`\n"
            f"📋 Motivo: {reason}\n"
            f"🕒 Data: {now}\n\n"
            f"_Este contato não receberá mais disparos em massa enquanto estiver bloqueado._"
        )

        await cw.send_private_note(conversation_id, note_text)
        logger.info(f"✅ [BLOCK_NOTE] Nota privada de bloqueio enviada na conversa {conversation_id} para {phone}")

    except Exception as e:
        logger.warning(f"⚠️ [BLOCK_NOTE] Falha ao enviar nota de bloqueio na conversa {conversation_id}: {e}")


def send_block_note_sync(
    client_id: int,
    conversation_id,
    phone: str,
    reason: str = "Manual",
    operator_name: str = None
):
    """
    Versão síncrona — usa asyncio.run() ou cria um loop para rotas síncronas FastAPI.
    """
    if not conversation_id:
        return
    try:
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Estamos dentro de um contexto async — agendar como task
                loop.create_task(send_block_note_async(
                    client_id, conversation_id, phone, reason, operator_name
                ))
            else:
                loop.run_until_complete(send_block_note_async(
                    client_id, conversation_id, phone, reason, operator_name
                ))
        except RuntimeError:
            asyncio.run(send_block_note_async(
                client_id, conversation_id, phone, reason, operator_name
            ))
    except Exception as e:
        logger.warning(f"⚠️ [BLOCK_NOTE_SYNC] Falha ao disparar nota de bloqueio: {e}")

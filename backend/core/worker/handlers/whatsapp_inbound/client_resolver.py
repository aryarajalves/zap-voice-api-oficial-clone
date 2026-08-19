from datetime import datetime, timezone, timedelta
from typing import Tuple, List, Optional
from sqlalchemy import or_
import models
from core.logger import setup_logger
import core.worker.handlers.whatsapp as wah

logger = setup_logger("Worker.WhatsAppInbound.ClientResolver")


def resolve_target_client(db, metadata: dict, from_phone: str, explicit_client_id: Optional[int] = None) -> Tuple[Optional[models.Client], int, List[int]]:
    """
    Identifica o client_id associado ao phone_number_id e resolve eventuais colisões de multi-inquilinos.
    Retorna (target_client, target_cid, candidate_cids).
    """
    if explicit_client_id:
        target_client = db.query(models.Client).filter(models.Client.id == explicit_client_id).first()
        if target_client and target_client.is_active:
            return target_client, explicit_client_id, [explicit_client_id]

    candidate_cids = [1]
    pnid = metadata.get("phone_number_id")
    if pnid:
        confs = db.query(models.AppConfig).join(
            models.Client, models.Client.id == models.AppConfig.client_id
        ).filter(
            models.AppConfig.key == "WA_PHONE_NUMBER_ID",
            models.AppConfig.value == str(pnid),
            models.Client.is_active == True
        ).all()
        if confs:
            candidate_cids = list(set([c.client_id for c in confs]))

    target_cid = candidate_cids[0] if candidate_cids else 1

    # Se houver duplicidade do mesmo número ativo em mais de um cliente (colisão de teste)
    if len(candidate_cids) > 1:
        clean_phone = "".join(filter(str.isdigit, str(from_phone)))
        suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone

        convo = db.query(models.ChatConversation).filter(
            models.ChatConversation.client_id.in_(candidate_cids),
            models.ChatConversation.phone.like(f"%{suffix}")
        ).order_by(models.ChatConversation.last_message_at.desc()).first()

        if convo:
            target_cid = convo.client_id
            logger.info(f"🎯 [INBOUND] Colisão de multi-inquilinos resolvida por conversa ativa com {from_phone}: Client ID {target_cid}")
        else:
            logger.info(f"🎯 [INBOUND] Colisão detectada e sem conversa ativa. Usando primeiro cliente ativo: Client ID {target_cid}")

    target_client = db.query(models.Client).filter(models.Client.id == target_cid).first()
    return target_client, target_cid, candidate_cids


def check_is_bulk_contact(db, from_phone: str) -> bool:
    """Verifica se o telefone recebido veio de um disparo em massa recente (últimas 2h)."""
    try:
        two_hours_ago = datetime.now(timezone.utc) - timedelta(hours=2)
        last_msg = db.query(models.MessageStatus).filter(
            models.MessageStatus.phone_number == from_phone,
            models.MessageStatus.timestamp >= two_hours_ago
        ).order_by(models.MessageStatus.timestamp.desc()).first()
        if last_msg:
            trigger_check = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == last_msg.trigger_id).first()
            if trigger_check:
                if trigger_check.is_bulk:
                    return True
                elif trigger_check.parent_id:
                    parent_trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_check.parent_id).first()
                    if parent_trigger and parent_trigger.is_bulk:
                        return True
    except Exception as e_check:
        logger.error(f"⚠️ Erro ao verificar bulk para contato {from_phone}: {e_check}")
    return False


async def sync_contact_window(
    db,
    target_cid: int,
    from_phone: str,
    raw_from: str,
    contacts_map: dict,
    is_bulk_contact: bool,
    cw
) -> Optional[int]:
    """Sincroniza conversa no Chatwoot (se não for bulk), atualiza ContactWindow e tabela customizada."""
    resolved_convo_id = None
    try:
        if not is_bulk_contact:
            conv_res = await cw.ensure_conversation(from_phone, contacts_map.get(raw_from, "Contato"))
            if isinstance(conv_res, dict):
                resolved_convo_id = conv_res.get("conversation_id")
            elif isinstance(conv_res, int) or (isinstance(conv_res, str) and conv_res.isdigit()):
                resolved_convo_id = int(conv_res)
        else:
            logger.info(f"⏭️ [WINDOW-META] Contato {from_phone} é de disparo em massa (bulk). Pulando ensure_conversation para evitar conversa fantasma.")
    except Exception as e_conv:
        logger.error(f"⚠️ [WINDOW-META] Erro ao sincronizar conversa com Chatwoot: {e_conv}")

    now_utc = datetime.now(timezone.utc)
    window = db.query(models.ContactWindow).filter(
        models.ContactWindow.phone == from_phone,
        models.ContactWindow.client_id == target_cid
    ).first()

    if window:
        window.last_interaction_at = now_utc
        if resolved_convo_id:
            window.chatwoot_conversation_id = resolved_convo_id
        logger.info(f"🕒 [WINDOW-META] Janela existente atualizada para {from_phone} (Client: {target_cid}, Convo: {resolved_convo_id})")
    else:
        new_window = models.ContactWindow(
            client_id=target_cid,
            phone=from_phone,
            last_interaction_at=now_utc,
            chatwoot_conversation_id=resolved_convo_id
        )
        db.add(new_window)
        logger.info(f"🆕 [WINDOW-META] Nova janela criada para {from_phone} (Client: {target_cid}, Convo: {resolved_convo_id})")
    db.commit()

    # Sincroniza contato na tabela customizada (ex: contatos_monitorados)
    try:
        from services.window_manager import sync_contact_to_custom_table
        sender_name = contacts_map.get(raw_from, "Contato")
        inbox_id = window.chatwoot_inbox_id if window else None

        sync_contact_to_custom_table(
            db=db,
            client_id=target_cid,
            phone=from_phone,
            name=sender_name,
            inbox_id=inbox_id,
            last_interaction_at=now_utc
        )
    except Exception as e_sync:
        logger.error(f"❌ Erro ao chamar sync_contact_to_custom_table no Meta Worker: {e_sync}")

    return resolved_convo_id


def sync_lead_bsud(
    db,
    target_cid: int,
    from_phone: str,
    raw_from: str,
    msg: dict,
    bsud_map: dict,
    contacts_map: dict
):
    """Atualiza ou cria WebhookLead associando o BSUD."""
    bsud_val = msg.get("from_user_id") or bsud_map.get(raw_from)
    if not bsud_val:
        return

    try:
        suffix_l = from_phone[-8:] if len(from_phone) >= 8 else from_phone
        lead = db.query(models.WebhookLead).filter(
            models.WebhookLead.client_id == target_cid,
            or_(
                models.WebhookLead.phone == from_phone,
                models.WebhookLead.phone.like(f"%{suffix_l}")
            )
        ).first()
        if lead:
            if lead.bsud != bsud_val:
                lead.bsud = bsud_val
                db.commit()
                logger.info(f"✨ [BSUD-UPDATE] BSUD '{bsud_val}' associado ao Lead ID {lead.id} ({from_phone})")
        else:
            new_lead = models.WebhookLead(
                client_id=target_cid,
                name=contacts_map.get(raw_from, "Contato"),
                phone=from_phone,
                bsud=bsud_val,
                platform="whatsapp",
                total_events=1
            )
            db.add(new_lead)
            db.commit()
            logger.info(f"🆕 [BSUD-NEW-LEAD] Criado novo Lead com BSUD '{bsud_val}' para {from_phone}")
    except Exception as e_bsud:
        logger.error(f"❌ Erro ao associar BSUD ao Lead: {e_bsud}")

import database
import models
from core.logger import setup_logger

logger = setup_logger(__name__)


def SessionLocal():
    return database.SessionLocal()


async def refresh_dynamic_label_contacts(init_trig, db=None) -> list:
    """
    Se o trigger estiver configurado como is_dynamic_label=True, busca a lista
    de contatos mais recente da tabela de Contatos (WebhookLead - Aba de Contatos)
    no banco de dados local para as etiquetas especificadas.

    Também aplica dinamicamente o filtro de exclusão:
    - Re-consulta as etiquetas configuradas em `exclusion_tags` (com modo OR ou AND).
    - Subtrai da lista de envio qualquer contato que possua a etiqueta de exclusão ou
      esteja na `exclusion_list` (números estáticos manuais/planilha).
    """
    if getattr(init_trig, "is_dynamic_label", False) is not True:
        return None

    # 1. Coletar todas as etiquetas de envio (inclusão)
    target_labels = []
    if getattr(init_trig, "dynamic_label_name", None):
        target_labels.extend([t.strip() for t in str(init_trig.dynamic_label_name).split(",") if t.strip()])

    if getattr(init_trig, "chatwoot_label", None):
        if isinstance(init_trig.chatwoot_label, list):
            target_labels.extend([str(t).strip() for t in init_trig.chatwoot_label if str(t).strip()])
        elif isinstance(init_trig.chatwoot_label, str):
            target_labels.extend([t.strip() for t in init_trig.chatwoot_label.split(",") if t.strip()])

    # Deduplicar preservando a ordem
    target_labels = list(dict.fromkeys(target_labels))
    if not target_labels:
        return None

    local_db = db
    should_close = False
    if local_db is None:
        local_db = SessionLocal()
        should_close = True

    try:
        from models import WebhookLead
        from sqlalchemy import func, or_, and_

        # 2. Buscar contatos das etiquetas de destino (Inclusão)
        inclusion_filters = [
            func.concat(',', func.replace(func.coalesce(WebhookLead.tags, ''), ', ', ','), ',').ilike(f"%,{label},%")
            for label in target_labels
        ]

        leads = local_db.query(WebhookLead).filter(
            WebhookLead.client_id == init_trig.client_id,
            or_(*inclusion_filters)
        ).all()

        raw_contacts = []
        seen_phones = set()
        for l in leads:
            if getattr(l, "phone", None):
                phone_digits = "".join(filter(str.isdigit, str(l.phone)))
                if len(phone_digits) >= 8 and phone_digits not in seen_phones:
                    seen_phones.add(phone_digits)
                    raw_contacts.append({
                        "phone": phone_digits,
                        "name": getattr(l, "name", "") or "",
                        "email": getattr(l, "email", "") or ""
                    })

        # 3. Coletar números a serem excluídos dinamicamente
        excluded_phones = set()

        # A) Etiquetas de exclusão (exclusion_tags)
        raw_ex_tags = getattr(init_trig, "exclusion_tags", None)
        ex_tags = []
        if raw_ex_tags:
            if isinstance(raw_ex_tags, list):
                ex_tags = [str(t).strip() for t in raw_ex_tags if str(t).strip()]
            elif isinstance(raw_ex_tags, str):
                ex_tags = [t.strip() for t in raw_ex_tags.split(",") if t.strip()]

        if ex_tags:
            tag_mode = (getattr(init_trig, "exclusion_tag_mode", "OR") or "OR").upper()
            tag_conditions = [
                func.concat(',', func.replace(func.coalesce(WebhookLead.tags, ''), ', ', ','), ',').ilike(f"%,{t},%")
                for t in ex_tags
            ]

            ex_query = local_db.query(WebhookLead.phone).filter(
                WebhookLead.client_id == init_trig.client_id
            )
            if tag_mode == "AND":
                ex_query = ex_query.filter(and_(*tag_conditions))
            else:
                ex_query = ex_query.filter(or_(*tag_conditions))

            for (phone_val,) in ex_query.all():
                if phone_val:
                    digits = "".join(filter(str.isdigit, str(phone_val)))
                    if digits:
                        excluded_phones.add(digits)

        # B) Lista de exclusão estática (números manuais ou via CSV)
        raw_ex_list = getattr(init_trig, "exclusion_list", None)
        if raw_ex_list and isinstance(raw_ex_list, list):
            for item in raw_ex_list:
                num = item if isinstance(item, str) else (item.get("phone") if isinstance(item, dict) else str(item))
                digits = "".join(filter(str.isdigit, str(num)))
                if digits:
                    excluded_phones.add(digits)

        # Preparar sufixos de 8 dígitos para matching resiliente de exclusão
        excluded_suffixes_8 = {p[-8:] for p in excluded_phones if len(p) >= 8}

        # 4. Filtrar a lista final subtraindo os contatos excluídos
        final_contacts = []
        excluded_count = 0
        for c in raw_contacts:
            c_phone = c["phone"]
            c_suffix_8 = c_phone[-8:] if len(c_phone) >= 8 else c_phone

            if c_phone in excluded_phones or c_suffix_8 in excluded_suffixes_8:
                excluded_count += 1
                continue
            final_contacts.append(c)

        logger.info(
            f"🔄 [DYNAMIC REFRESH] Trigger {init_trig.id} | Etiquetas: {target_labels} | "
            f"Brutos: {len(raw_contacts)} | Excluídos por tags ({ex_tags}) ou lista: {excluded_count} | "
            f"Total Final Qualificado: {len(final_contacts)}"
        )

        return final_contacts
    except Exception as e_local:
        logger.error(f"⚠️ Erro ao atualizar contatos dinâmicos com exclusão para o trigger {getattr(init_trig, 'id', None)}: {e_local}")
        return None
    finally:
        if should_close:
            local_db.close()


async def sync_queued_dynamic_triggers(db, client_id: int):
    """
    Sincroniza os contatos de todos os disparos com is_dynamic_label=True no status 'queued'
    para o client_id informado.
    """
    try:
        queued_dynamic = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.client_id == client_id,
            models.ScheduledTrigger.status == 'queued',
            models.ScheduledTrigger.is_dynamic_label == True
        ).all()

        if not queued_dynamic:
            return

        changed = False
        for trig in queued_dynamic:
            new_contacts = await refresh_dynamic_label_contacts(trig, db=db)
            if new_contacts is not None:
                trig.contacts_list = new_contacts
                trig.total_contacts = len(new_contacts)
                changed = True

        if changed:
            db.commit()
    except Exception as e:
        logger.error(f"⚠️ Erro ao sincronizar contatos de disparos dinâmicos em fila: {e}")

from sqlalchemy.orm import Session
from datetime import datetime, timezone
import models
from core.logger import logger

def upsert_webhook_lead(db: Session, client_id: int, platform: str, parsed_data: dict, event_time: datetime = None, force_time: bool = False, tag: str = None, tags_to_remove: str = None) -> models.WebhookLead:
    """
    Cria ou atualiza um lead na tabela webhook_leads baseado no telefone do contato.
    - tag: Etiquetas para ADICIONAR (separadas por vírgula)
    - tags_to_remove: Etiquetas para REMOVER (separadas por vírgula)
    """
    phone = parsed_data.get("phone")
    if not phone:
        return None

    try:
        # Normalize phone for lookup
        clean_phone_lookup = "".join(filter(str.isdigit, str(phone)))
        name = parsed_data.get("name")
        email = parsed_data.get("email")
        event_type = parsed_data.get("event_type")
        product_name_raw = parsed_data.get("product_name") or "Produto Desconhecido"
        payment_method = parsed_data.get("payment_method")
        price = parsed_data.get("price")
        currency = parsed_data.get("currency", "BRL")
        
        # Currency symbol map
        symbol_map = {"BRL": "R$", "USD": "$", "EUR": "€"}
        symbol = symbol_map.get(str(currency).upper(), "R$")

        # Recursive split to handle mixed separators or results from previous runs
        def get_all_items(raw_str):
            if not raw_str: return []
            parts_pipe = [p.strip() for p in raw_str.split('|') if p.strip()]
            final_items = []
            for p in parts_pipe:
                parts_comma = [c.strip() for c in p.split(',') if c.strip()]
                final_items.extend(parts_comma)
            return list(dict.fromkeys(final_items))

        incoming_items = get_all_items(product_name_raw)

        def format_item(p_name, p_price=None, p_symbol=None):
            if not p_name: return "Produto Desconhecido"
            s = p_symbol or symbol
            if p_price and f"({s}" not in p_name:
                return f"{p_name} ({s} {p_price})"
            return p_name

        def get_pure_name(full_str):
            import re
            return re.sub(r"\s+\((R\$|\$|€)\s*.*?\)$", "", full_str).strip().lower()

        formatted_incoming = []
        for itm in incoming_items:
            if len(incoming_items) == 1:
                formatted_incoming.append(format_item(itm, price))
            else:
                formatted_incoming.append(itm)

        # Determine the last 8 digits for matching
        last_8 = clean_phone_lookup[-8:] if len(clean_phone_lookup) >= 8 else clean_phone_lookup

        lead = db.query(models.WebhookLead).filter(
            models.WebhookLead.client_id == client_id,
            models.WebhookLead.phone.like(f"%{last_8}")
        ).first()
        
        # Determine correct event time
        final_event_time = event_time
        event_time_str = parsed_data.get("event_time")
        if event_time_str:
            try:
                if "T" in str(event_time_str):
                    final_event_time = datetime.fromisoformat(str(event_time_str).replace('Z', '+00:00'))
                else:
                    final_event_time = datetime.strptime(str(event_time_str), "%Y-%m-%d %H:%M:%S")
                    final_event_time = final_event_time.replace(tzinfo=timezone.utc)
            except Exception:
                pass
        
        final_event_time = final_event_time or datetime.now(timezone.utc)
        if final_event_time.tzinfo is None:
            final_event_time = final_event_time.replace(tzinfo=timezone.utc)
        
        # Helper to split tags robustly
        def split_tags(t_str):
            if not t_str: return []
            return [t.strip() for t in str(t_str).split(",") if t.strip()]

        tags_to_add = split_tags(tag)
        tags_to_del = split_tags(tags_to_remove)

        if lead:
            # Update existing lead metadata
            lead.name = name or lead.name
            lead.email = email or lead.email
            lead.last_event_type = event_type or lead.last_event_type
            
            if lead.last_event_at and lead.last_event_at.tzinfo is None:
                lead.last_event_at = lead.last_event_at.replace(tzinfo=timezone.utc)

            if not lead.last_event_at or force_time or final_event_time > lead.last_event_at:
                lead.last_event_at = final_event_time
            
            # --- Advanced Tag Management ---
            current_tags = split_tags(lead.tags)
            
            # 1. Filtratags_to_add to ensure removal prevails
            # If a tag is in both sets, it won't be added
            final_tags_to_add = [t for t in tags_to_add if t not in tags_to_del]
            
            # 2. Remove requested tags
            if tags_to_del:
                current_tags = [t for t in current_tags if t not in tags_to_del]
            
            # 3. Add new tags (avoid duplicates and respect removal precedence)
            for t in final_tags_to_add:
                if t not in current_tags:
                    current_tags.append(t)
            
            lead.tags = ", ".join(current_tags)

            # --- Product Management ---
            existing_items = get_all_items(lead.product_name or "")
            for new_itm in formatted_incoming:
                new_pure = get_pure_name(new_itm)
                found_idx = -1
                for i, old_itm in enumerate(existing_items):
                    if get_pure_name(old_itm) == new_pure:
                        found_idx = i
                        break
                
                if found_idx >= 0:
                    if "(" in new_itm or "(" not in existing_items[found_idx]:
                        existing_items[found_idx] = new_itm
                else:
                    existing_items.append(new_itm)
            
            final_product_text = " | ".join(existing_items)
            lead.product_name = final_product_text[:250] + "..." if len(final_product_text) > 250 else final_product_text
            lead.platform = platform
            lead.payment_method = payment_method or lead.payment_method
            lead.price = price or lead.price
            lead.total_events = (lead.total_events or 0) + 1
        else:
            # Create new lead record
            lead = models.WebhookLead(
                client_id=client_id,
                name=name,
                phone=clean_phone_lookup,
                email=email,
                last_event_type=event_type,
                last_event_at=final_event_time,
                product_name=" | ".join(formatted_incoming)[:250],
                platform=platform,
                payment_method=payment_method,
                price=price,
                tags=", ".join(tags_to_add) if tags_to_add else None,
                total_events=1
            )
            db.add(lead)
        
        db.commit()
        db.refresh(lead)
        return lead
    except Exception as e:
        logger.error(f"❌ [LEAD SERVICE] Erro ao upsert lead: {e}")
        db.rollback()
        return None

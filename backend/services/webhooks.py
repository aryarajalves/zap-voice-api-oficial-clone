from datetime import datetime, timezone, timedelta
import re
from core.logger import logger

def get_brasilia_now():
    # Simplificado: UTC-3. Idealmente usaria pytz, mas timedelta resolve aqui.
    return datetime.now(timezone.utc) - timedelta(hours=3)

def compute_dynamic_manychat_tag(mapping) -> str:
    """
    Calcula o nome da etiqueta dinâmica baseada na próxima ocorrência da rotação.
    Ex: Se hoje é sexta e o workshop é terça, retorna a data da próxima terça.
    """
    if not getattr(mapping, "manychat_tag_automation", False):
        return mapping.manychat_tag

    now = get_brasilia_now()
    prefix = mapping.manychat_tag_prefix or "tag"
    
    # Se o usuário não quiser incluir a data, retorna apenas o prefixo
    if not getattr(mapping, "manychat_tag_include_date", True):
        return prefix

    target_weekday = mapping.manychat_tag_rotation_day if mapping.manychat_tag_rotation_day is not None else 0
    rotation_time_str = mapping.manychat_tag_rotation_time or "00:00"
    
    try:
        hour, minute = map(int, rotation_time_str.split(':'))
    except:
        hour, minute = 0, 0

    # 1. Encontrar a ocorrência deste dia na semana atual
    current_weekday = now.weekday()
    # (Ex: se hoje é sexta(4) e queremos terça(1), days_until = (1-4)%7 = 4)
    days_until = (target_weekday - current_weekday) % 7
    
    candidate_date = now + timedelta(days=days_until)
    rotation_point = candidate_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
    
    # 2. Se agora já passou do horário de rotação para ESSA ocorrência, pula para a próxima semana
    if now > rotation_point:
        final_date = candidate_date + timedelta(days=7)
    else:
        final_date = candidate_date
        
    tag_date = final_date.strftime("%d-%m-%Y")
    return f"{prefix}-{tag_date}"


def parse_webhook_payload(platform: str, payload: dict) -> dict:
    """
    Função dedicada para extrair os dados padronizados de diferentes plataformas.
    """
    platform_lower = str(platform or "outros").lower().strip()
    result = {
        "name": None,
        "phone": None,
        "email": None,
        "event_type": None, # 'pix_gerado', 'compra_aprovada', 'carrinho_abandonado', 'cartao_recusado', 'pix_expirado', 'outros'
        "country": None,
        "product_name": None,
        "order_bump": False,
        "payment_method": None,
        "raw_status": None,
        "price": None,
        "checkout_url": None,
        "pix_qrcode": None,
        "utm_source": None,
        "utm_medium": None,
        "utm_campaign": None,
        "platform": platform_lower,
        "event_time": None,
        "currency": "BRL",
        "items": []
    }
    
    def get_val(keys, default=None):
        curr = payload
        for key in keys:
            if isinstance(curr, dict) and key in curr:
                curr = curr[key]
            else:
                return default
        
        # Smart unwrapping for WordPress/Elementor/Typeform style objects
        if isinstance(curr, dict) and "value" in curr:
            return curr["value"]
            
        return curr
    
    def clean_str(val):
        if not val: return None
        return str(val).strip().replace('\u00a0', ' ')

    if platform_lower == 'hotmart':
        event = payload.get("event", "")
        if event == "PURCHASE_APPROVED": result['event_type'] = "compra_aprovada"
        elif event == "PURCHASE_CANCELED" or event == "PURCHASE_REFUNDED": result['event_type'] = "reembolso"
        elif event == "PURCHASE_BILLET_PRINTED": result['event_type'] = "boleto_impresso"
        elif event == "PURCHASE_DELAYED": result['event_type'] = "cartao_recusado"
        elif event == "ABANDONED_CART": result['event_type'] = "carrinho_abandonado"
        
        data = payload.get("data", {})
        buyer = data.get("buyer", {})
        product = data.get("product", {})
        purchase = data.get("purchase", {})
        
        result['name'] = buyer.get("name")
        result['email'] = buyer.get("email")
        checkout_phone = buyer.get("checkout_phone", "")
        if checkout_phone: result['phone'] = checkout_phone
        else: result['phone'] = get_val(["buyer", "phone"])

        result['country'] = get_val(["buyer", "address", "country"])
        result['product_name'] = product.get("name")
        result['payment_method'] = purchase.get("payment", {}).get("type")
        result['order_bump'] = purchase.get("is_order_bump", False)
        result['raw_status'] = purchase.get("status")
        
        if result['payment_method'] == "PIX" and result['raw_status'] == "WAITING_PAYMENT":
            result['event_type'] = "pix_gerado"

    elif platform_lower == 'kiwify':
        order_status = payload.get("order_status") or payload.get("status", "")
        if order_status == "paid": result['event_type'] = "compra_aprovada"
        elif order_status == "waiting_payment":
            payment_method = str(payload.get("payment_method") or "").lower()
            if payment_method == "pix": result['event_type'] = "pix_gerado"
            else: result['event_type'] = "boleto_impresso"
        elif order_status == "refunded": result['event_type'] = "reembolso"
        elif order_status == "refused": result['event_type'] = "cartao_recusado"
        elif order_status in ["abandoned_cart", "abandoned"]: result['event_type'] = "carrinho_abandonado"

        customer = payload.get("Customer", {})
        result['name'] = customer.get("full_name")
        result['email'] = customer.get("email")
        result['phone'] = customer.get("mobile") or customer.get("phone")
        result['product_name'] = payload.get("Product", {}).get("product_name")
        result['currency'] = get_val(["Commissions", "currency"]) or "BRL"
        result['event_time'] = payload.get("created_at") or payload.get("updated_at")
        
        payload_pm = str(payload.get("payment_method") or "")
        kiwify_pm_map = {
            "credit_card": "Cartão de Crédito",
            "card_pix": "Cartão de Crédito",
            "pix": "Pix",
            "billet": "Boleto",
            "free": "Gratuito"
        }
        result['payment_method'] = kiwify_pm_map.get(payload_pm.lower(), payload_pm)
        result['price'] = get_val(["Commissions", "charge_amount"])
        result['raw_status'] = order_status
        result['status'] = order_status # Keep both for safety


    elif platform_lower == 'eduzz':
        is_orbita = "buyer" in payload or "student" in payload or "items" in payload or (
            isinstance(payload.get("data"), dict) and ("buyer" in payload["data"] or "items" in payload["data"] or "student" in payload["data"])
        )
        
        if is_orbita:
            if "data" in payload and isinstance(payload["data"], dict) and not ("buyer" in payload or "student" in payload or "items" in payload):
                data_ctx = payload["data"]
            else:
                data_ctx = payload

            status = str(data_ctx.get("status") or "").lower()
            if status == "paid": result['event_type'] = "compra_aprovada"
            elif status == "waiting_payment":
                pm = str(data_ctx.get("paymentMethod") or "").lower()
                if pm == "pix": result['event_type'] = "pix_gerado"
                else: result['event_type'] = "boleto_impresso"
            elif status == "refunded": result['event_type'] = "reembolso"
            elif status == "abandoned_cart": result['event_type'] = "carrinho_abandonado"
            elif status == "canceled": result['event_type'] = "cartao_recusado"

            buyer = data_ctx.get("buyer") or data_ctx.get("student") or {}
            result['name'] = buyer.get("name")
            result['email'] = buyer.get("email")
            result['phone'] = buyer.get("cellphone") or buyer.get("phone")
            
            items_list = data_ctx.get("items", [])
            if items_list:
                currency_code = str(data_ctx.get("price", {}).get("currency") or data_ctx.get("paid", {}).get("currency") or "BRL").upper()
                result['currency'] = currency_code
                symbol_map = {"BRL": "R$", "USD": "$", "EUR": "€", "GBP": "£"}
                main_symbol = symbol_map.get(currency_code, "$")

                formatted_items = []
                for i in items_list:
                    p_name = i.get("name", "Produto Desconhecido")
                    formatted_items.append(p_name)
                
                result['product_name'] = " | ".join(formatted_items)
                total_price = data_ctx.get("price", {}).get("value") or data_ctx.get("paid", {}).get("value")
                if total_price:
                    result['price'] = total_price

            result['payment_method'] = data_ctx.get("paymentMethod")
            result['raw_status'] = status
        else:
            status_name = str(get_val(["transacao_status", "nome"]) or "").lower()
            if "pago" in status_name: result['event_type'] = "compra_aprovada"
            elif "aguardando pagamento" in status_name:
                if str(get_val(["transacao_forma_pagamento", "nome"]) or "").lower() == "pix": result['event_type'] = "pix_gerado"
                else: result['event_type'] = "boleto_impresso"
            elif "cancelado" in status_name: result['event_type'] = "cartao_recusado"
            elif "abandonado" in status_name: result['event_type'] = "carrinho_abandonado"

            result['name'] = get_val(["cli_nome"])
            result['email'] = get_val(["cli_email"])
            result['phone'] = get_val(["cli_celular"])
            result['product_name'] = get_val(["produto_nome"])
            result['payment_method'] = get_val(["transacao_forma_pagamento", "nome"])
            result['raw_status'] = status_name
    
    elif platform_lower == 'kirvano':
        event = str(payload.get("event") or "").upper()
        status = str(payload.get("status") or "").upper()
        payment_method = str(payload.get("payment_method") or get_val(["payment", "method"]) or "").upper()
        
        if status in ["PAID", "APPROVED"] or event in ["ORDER.PAID", "SALE_APPROVED"]: 
            result['event_type'] = "compra_aprovada"
        elif status == "PENDING" or event == "ORDER.PENDING":
            if payment_method == "PIX": result['event_type'] = "pix_gerado"
            else: result['event_type'] = "boleto_impresso"
        elif status == "CANCELED" or event in ["ORDER.CANCELED", "PIX_EXPIRED", "SALE_CANCELED"]: 
            if "PIX" in payment_method or "PIX" in event: result['event_type'] = "pix_expirado"
            else: result['event_type'] = "cartao_recusado"
        elif status == "REFUNDED" or event == "ORDER.REFUNDED": result['event_type'] = "reembolso"
        elif event in ["CHECKOUT.ABANDONED", "ABANDONED_CART"]: result['event_type'] = "carrinho_abandonado"

        customer = payload.get("customer", {})
        result['name'] = customer.get("name") or customer.get("full_name")
        result['email'] = customer.get("email")
        result['phone'] = customer.get("phone") or customer.get("mobile") or customer.get("phone_number")
        result['product_name'] = payload.get("product", {}).get("name")
        result['payment_method'] = payment_method
        result['raw_status'] = status or event

    # Standardize Phone (Generic Fallback)
    if not result.get('phone'):
        result['phone'] = (
            payload.get("phone") or payload.get("phone_number") or payload.get("celular") or 
            payload.get("telefone") or payload.get("mobile") or payload.get("whatsapp") or
            payload.get("Telefone") or payload.get("Celular") or payload.get("Whatsapp") or
            payload.get("WhatsApp") or
            payload.get("fields[phone][value]") or payload.get("fields[whatsapp][value]") or
            payload.get("fields[telefone][value]") or payload.get("fields[celular][value]") or
            get_val(["fields", "phone"]) or get_val(["fields", "phone", "value"]) or
            get_val(["respondent", "answers", "INFORME AQUI QUAL O MELHOR NÚMERO PARA FALAR COM VOCÊ NO WHATS"]) or
            get_val(["respondent", "answers", "WHATSAPP"]) or get_val(["respondent", "answers", "TELEFONE"]) or
            get_val(["customer", "phone"]) or get_val(["customer", "phone_number"]) or
            get_val(["buyer", "phone"]) or get_val(["data", "buyer", "phone"]) or
            get_val(["fields", "celular"]) or get_val(["fields", "whatsapp"]) or 
            get_val(["cliente", "phone"])
        )
    
    # Standardize Name (Generic Fallback)
    if not result.get('name'):
        result['name'] = (
            payload.get("name") or payload.get("fullname") or payload.get("first_name") or
            payload.get("nome") or payload.get("nome_completo") or payload.get("full_name") or
            payload.get("primeiro_nome") or payload.get("Nome") or payload.get("Nome Completo") or
            payload.get("fields[name][value]") or payload.get("fields[nome][value]") or
            get_val(["fields", "name"]) or get_val(["fields", "name", "value"]) or
            get_val(["respondent", "answers", "SEU NOME COMPLETO"]) or
            get_val(["respondent", "answers", "NOME COMPLETO"]) or
            get_val(["respondent", "answers", "NOME"]) or
            get_val(["customer", "name"]) or get_val(["buyer", "name"]) or
            get_val(["fields", "nome"]) or get_val(["data", "buyer", "name"])
        )

    # Standardize Email (Generic Fallback)
    if not result.get('email'):
        result['email'] = (
            payload.get("email") or payload.get("mail") or payload.get("contactEmail") or
            payload.get("fields[email][value]") or
            get_val(["respondent", "answers", "SEU MELHOR E-MAIL"]) or
            get_val(["respondent", "answers", "E-MAIL"]) or
            get_val(["respondent", "answers", "Email"]) or
            get_val(["customer", "email"]) or get_val(["buyer", "email"]) or
            get_val(["fields", "email"])
        )

    # Standardize Product Name (Generic Fallback)
    if not result.get('product_name'):
        products = payload.get("products")
        if isinstance(products, list) and len(products) > 0:
            main_product = next((p for p in products if not p.get("is_order_bump")), products[0])
            result['product_name'] = main_product.get("name")
        
        if not result.get('product_name'):
            result['product_name'] = (
                payload.get("product_name") or payload.get("produto") or
                get_val(["product", "name"]) or get_val(["Product", "product_name"]) or
                get_val(["form", "form_name"])
            )

    # Price Normalization
    if not result.get('price'):
        val = (
            payload.get("total_price") or payload.get("amount") or 
            payload.get("net_value") or payload.get("total_amount") or 
            payload.get("price") or payload.get("valor") or
            get_val(["fiscal", "total_value"]) or
            get_val(["data", "amount"]) or get_val(["payment", "amount"])
        )
        if val: result['price'] = val

    price_to_normalize = result.get('price')
    if price_to_normalize:
        try:
            is_cents = False
            f_val = 0.0
            val = price_to_normalize
            if isinstance(val, (int, float)):
                f_val = float(val)
                is_cents = isinstance(val, int) or (f_val == int(f_val))
            elif isinstance(val, str):
                val_clean = val.replace('\u00a0', ' ').replace("R$", "").replace("$", "").replace(" ", "").strip()
                if "," in val_clean and "." in val_clean:
                    val_clean = val_clean.replace(".", "").replace(",", ".")
                elif "," in val_clean:
                    val_clean = val_clean.replace(",", ".")
                is_cents = "." not in val_clean
                f_val = float(val_clean)
            
            if is_cents and platform_lower == 'kiwify':
                f_val = f_val / 100
            
            currency = str(payload.get("currency") or get_val(["Commissions", "currency"]) or "BRL").upper()
            result['currency'] = currency
            rates = {"USD": 5.45, "EUR": 5.85, "GBP": 6.80, "MXN": 0.30}
            if currency != "BRL" and currency in rates:
                f_val = f_val * rates[currency]
            result['price'] = f"{f_val:.2f}"
        except:
            result['price'] = str(price_to_normalize)

    # Final event_type fallback
    if not result.get('event_type'):
        event_raw = payload.get("event") or payload.get("status") or payload.get("event_type") or "outros"
        result['event_type'] = str(event_raw).lower().replace(".", "_")

    # Map status to a friendly name
    raw_val = str(result.get('raw_status') or result.get('status') or payload.get("status") or payload.get("event") or "outros").upper()
    friendly_map = {
        "APPROVED": "Compra Aprovada", "SALE_APPROVED": "Compra Aprovada", "PAID": "Compra Aprovada",
        "PENDING": "Pix Gerado", "WAITING_PAYMENT": "Pix Gerado", "REFUNDED": "Reembolso", 
        "REFUSED": "Cartão Recusado", "ABANDONED_CART": "Carrinho Abandonado",
        "WAITING": "Aguardando", "CANCELED": "Cancelado", "EXPIRED": "Expirado"
    }
    result['raw_status'] = friendly_map.get(raw_val, raw_val.capitalize())

    # Phone Normalization (The 9-digit fix)
    if result.get("phone"):
        cleaned = ''.join(filter(str.isdigit, str(result["phone"])))
        if not cleaned.startswith("55") and len(cleaned) <= 11:
            cleaned = "55" + cleaned
        if cleaned.startswith("55") and len(cleaned) == 12:
            ddd = cleaned[2:4]
            number = cleaned[4:]
            cleaned = f"55{ddd}9{number}"
        result["phone"] = cleaned

    # Name Validation
    if result.get("name"):
        name_val = str(result["name"]).strip()
        if name_val.isdigit() or len(name_val) <= 1:
             result["name"] = None

    return result

def extract_mapped_variables(payload: dict, parsed_data: dict, mapping_config: dict, header_format: str = None) -> list:
    components = []
    if not mapping_config:
        return components
    parameters = []
    
    def extract_value(key):
        if key in parsed_data:
            val = parsed_data.get(key)
            if val: return str(val)
        parts = key.split('.')
        curr = payload
        for p in parts:
            if isinstance(curr, dict) and p in curr:
                curr = curr[p]
            else:
                curr = None
                break
        if curr is not None:
            return str(curr)
        return ""

    body_mapping = {k: v for k, v in mapping_config.items() if k.isdigit()}
    for index_str, key in sorted(body_mapping.items(), key=lambda x: int(x[0])):
        val = extract_value(key)
        parameters.append({"type": "text", "text": val if val else "-"})
        
    if parameters:
        components.append({"type": "body", "parameters": parameters})
        
    header_url_key = mapping_config.get("header_url")
    if header_url_key and header_format in ["IMAGE", "VIDEO", "DOCUMENT"]:
        val = extract_value(header_url_key)
        if val:
            media_type = header_format.lower()
            components.append({
                "type": "header",
                "parameters": [{"type": media_type, media_type: {"link": val}}]
            })
    return components

def extract_nested_custom_fields(payload: dict, mapping: dict) -> dict:
    custom_fields = {}
    if not mapping:
        return custom_fields
    for field_name, json_path in mapping.items():
        parts = str(json_path).split('.')
        curr = payload
        for p in parts:
            if isinstance(curr, dict) and p in curr:
                curr = curr[p]
            else:
                curr = None
                break
        if curr is not None:
            custom_fields[field_name] = str(curr)
    return custom_fields

def replace_variables_in_string(text: str, payload: dict, parsed_data: dict) -> str:
    """
    Substitui variáveis por valores reais.
    Suporta dois formatos:
    1. Chave simples (do dropdown): 'name', 'phone', 'email', 'buyer.name', etc.
    2. Sintaxe mustache: {{name}}, {{phone}}, {{campo_customizado}}, etc.
    """
    if not text: return ""

    # Mapeamento das chaves simples do dropdown para os campos do parsed_data
    SIMPLE_KEY_MAP = {
        "name": "name",
        "phone": "phone",
        "email": "email",
        "product_name": "product_name",
        "payment_method": "payment_method",
        "checkout_url": "checkout_url",
        "pix_qrcode": "pix_qrcode",
    }

    # 1. Se o texto for uma chave simples conhecida (sem {{ }}), resolve direto
    text_stripped = text.strip()
    if text_stripped in SIMPLE_KEY_MAP and "{{" not in text_stripped:
        val = parsed_data.get(SIMPLE_KEY_MAP[text_stripped])
        return str(val) if val is not None else ""

    # 2. Se for uma chave de caminho (ex: 'buyer.name' ou 'Customer.full_name') sem {{ }}
    if "{{" not in text_stripped and "." in text_stripped:
        parts = text_stripped.split(".")
        curr = payload
        for p in parts:
            if isinstance(curr, dict) and p in curr:
                curr = curr[p]
            else:
                curr = None
                break
        if curr is not None:
            return str(curr)

    # 3. Processa sintaxe mustache: {{variavel}}
    matches = re.findall(r"\{\{([^}]+)\}\}", text)
    for match in matches:
        key = match.strip()
        
        # Tenta no parsed_data primeiro
        val = None
        if key in SIMPLE_KEY_MAP:
            val = parsed_data.get(SIMPLE_KEY_MAP[key])
        elif key in parsed_data:
            val = parsed_data.get(key)
            
        # Se não achou, tenta no payload bruto (suporta caminhos aninhados)
        if val is None:
            parts = key.split('.')
            curr = payload
            for p in parts:
                if isinstance(curr, dict) and p in curr:
                    curr = curr[p]
                else:
                    curr = None
                    break
            val = curr
            
        if val is not None:
            text = text.replace(f"{{{{{match}}}}}", str(val))
        else:
            # Se não achou de jeito nenhum, limpa a variável para não enviar o texto bruto
            text = text.replace(f"{{{{{match}}}}}", "")

    return text

async def process_webhook_automation(client_id: int, mapping: any, variables: dict, history_id: int):
    """
    Processa a automação principal do webhook (disparo de funil ou template).
    """
    from database import SessionLocal
    import models
    from rabbitmq_client import rabbitmq
    
    db = SessionLocal()
    try:
        # Carrega mapping e history se necessário (estamos em background_tasks)
        history = db.query(models.WebhookHistory).filter(models.WebhookHistory.id == history_id).first()
        if not history:
            logger.error(f"AUTO_PROCESS | Webhook #{history_id} não encontrado no banco.")
            return

        payload = history.payload or {}
        
        # Mapeamento já vem no argumento, mas vamos garantir que temos os dados
        template_name = mapping.template_name
        funnel_id = mapping.funnel_id
        
        # Fallback: se o nome estiver nulo, busca no cache pelo ID
        if not template_name and mapping.template_id:
            tpl_cache = db.query(models.WhatsAppTemplateCache).filter(
                models.WhatsAppTemplateCache.id == mapping.template_id
            ).first()
            if tpl_cache:
                template_name = tpl_cache.name

        # --- LÓGICA DE INTERRUPÇÃO INTELIGENTE (CANCELAMENTO) ---
        if getattr(mapping, "cancel_pending_on_trigger", False) and mapping.cancel_event_types:
            phone = variables.get("phone")
            event_types_to_cancel = mapping.cancel_event_types
            
            if phone and event_types_to_cancel:
                logger.info(f"🛡️ SMART_CANCEL | Iniciando cancelamento para {phone} nos eventos: {event_types_to_cancel}")
                
                # Busca disparos pendentes/enfileirados para este contato e eventos
                pending_triggers = db.query(models.ScheduledTrigger).filter(
                    models.ScheduledTrigger.client_id == client_id,
                    models.ScheduledTrigger.contact_phone == phone,
                    models.ScheduledTrigger.status.in_(["pending", "queued"]),
                    models.ScheduledTrigger.event_type.in_(event_types_to_cancel)
                ).all()
                
                for pt in pending_triggers:
                    logger.info(f"🚫 SMART_CANCEL | Cancelando trigger #{pt.id} (Evento: {pt.event_type})")
                    pt.status = "cancelled"
                    pt.failure_reason = f"Interrompido pelo evento: {history.event_type}"
                
                if pending_triggers:
                    db.commit()
                    logger.info(f"✅ SMART_CANCEL | {len(pending_triggers)} disparos cancelados com sucesso.")

        if not template_name and not funnel_id and not mapping.private_note:
            logger.info(f"AUTO_SKIP | Mapeamento #{mapping.id} sem conteúdo de disparo.")
            return

        # Extrai variáveis para o template
        components = extract_mapped_variables(payload, variables, mapping.variables_mapping or {})
        
        # Nota privada
        private_msg_text = mapping.private_note if mapping.private_note else None
        
        # Calcula delay
        delay_min = mapping.delay_minutes or 0
        delay_sec = mapping.delay_seconds or 0
        total_delay_sec = (delay_min * 60) + delay_sec

        scheduled_time = datetime.now(timezone.utc)
        if total_delay_sec > 0:
            scheduled_time = scheduled_time + timedelta(seconds=total_delay_sec)
            status = "queued"
        else:
            status = "processing"

        # Cria o Disparo
        st = models.ScheduledTrigger(
            scheduled_time=scheduled_time,
            status=status,
            contact_name=variables.get("name"),
            contact_phone=variables.get("phone"),
            template_name=template_name,
            template_components=components,
            template_language=mapping.template_language or "pt_BR",
            client_id=client_id,
            product_name=variables.get("product_name"),
            private_message=private_msg_text,
            publish_external_event=mapping.publish_external_event,
            chatwoot_label=mapping.chatwoot_label,
            is_free_message=False, # Decidido automaticamente pelo Worker via Smart Dispatch
            event_type=history.event_type,
            integration_id=mapping.integration_id,
            funnel_id=funnel_id,
            is_bulk=False
        )
        db.add(st)
        db.commit()
        db.refresh(st)
        
        # Se não houver delay, publica direto no RabbitMQ
        if total_delay_sec <= 0:
            await rabbitmq.publish("zapvoice_funnel_executions", {
                "trigger_id": st.id,
                "funnel_id": funnel_id,
                "conversation_id": None,
                "contact_phone": variables.get("phone"),
                "contact_name": variables.get("name")
            })
            
        history.status = "processed"
        db.commit()
        logger.info(f"✅ AUTO_SUCCESS | Webhook #{history_id} processado. Trigger ID: {st.id}")

    except Exception as e:
        logger.error(f"❌ AUTO_ERROR | Falha ao processar automação #{history_id}: {e}")
        import traceback
        logger.error(traceback.format_exc())
        if history:
            history.status = "failed"
            history.error_message = str(e)
            db.commit()
    finally:
        db.close()

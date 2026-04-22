from datetime import datetime, timezone, timedelta
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
    platform_lower = platform.lower().strip()
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
        if isinstance(val, str): return val.strip()
        return str(val)

    if platform_lower == 'hotmart':
        # Hotmart version 2.0.0
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
        
        # Phone logic (DDI + number)
        checkout_phone = buyer.get("checkout_phone", "")
        if checkout_phone: result['phone'] = checkout_phone
        else: result['phone'] = get_val(["buyer", "phone"])

        result['country'] = get_val(["buyer", "address", "country"])
        result['product_name'] = product.get("name")
        result['payment_method'] = purchase.get("payment", {}).get("type")
        
        # Check order bump in Hotmart
        result['order_bump'] = purchase.get("is_order_bump", False)
        result['raw_status'] = purchase.get("status")
        
        if result['payment_method'] == "PIX" and result['raw_status'] == "WAITING_PAYMENT":
            result['event_type'] = "pix_gerado"

    elif platform_lower == 'kiwify':
        # Kiwify uses order_status (Paid) or status (Abandoned)
        order_status = payload.get("order_status") or payload.get("status", "")
        if order_status == "paid": result['event_type'] = "compra_aprovada"
        elif order_status == "waiting_payment":
            payment_method = payload.get("payment_method", "").lower()
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
        
        # Tradução do método de pagamento Kiwify
        payload_pm = payload.get("payment_method", "")
        kiwify_pm_map = {
            "credit_card": "Cartão de Crédito",
            "card_pix": "Cartão de Crédito",
            "pix": "Pix",
            "billet": "Boleto",
            "free": "Gratuito"
        }
        result['payment_method'] = kiwify_pm_map.get(payload_pm.lower(), payload_pm)
        
        # Extração de preço específica da Kiwify (Centavos)
        result['price'] = get_val(["Commissions", "charge_amount"])
        
        result['raw_status'] = order_status

    elif platform_lower == 'eduzz':
        is_orbita = "buyer" in payload or "student" in payload or "items" in payload or (
            isinstance(payload.get("data"), dict) and ("buyer" in payload["data"] or "items" in payload["data"] or "student" in payload["data"])
        )
        
        if is_orbita:
            # Format v2/Orbita
            if "data" in payload and isinstance(payload["data"], dict) and not ("buyer" in payload or "student" in payload or "items" in payload):
                data_ctx = payload["data"]
            else:
                data_ctx = payload

            status = data_ctx.get("status", "").lower()
            if status == "paid": result['event_type'] = "compra_aprovada"
            elif status == "waiting_payment":
                pm = data_ctx.get("paymentMethod", "").lower()
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
                currency_code = (data_ctx.get("price", {}).get("currency") or data_ctx.get("paid", {}).get("currency") or "BRL").upper()
                result['currency'] = currency_code
                symbol_map = {"BRL": "R$", "USD": "$", "EUR": "€", "GBP": "£"}
                main_symbol = symbol_map.get(currency_code, "$")

                formatted_items = []
                for i in items_list:
                    p_name = i.get("name", "Produto Desconhecido")
                    item_price_data = i.get("price", {})
                    p_value = item_price_data.get("value")
                    p_currency = (item_price_data.get("currency") or currency_code).upper()
                    p_symbol = symbol_map.get(p_currency, main_symbol)

                    if p_value is not None:
                        formatted_items.append(f"{p_name} ({p_symbol} {p_value})")
                    else:
                        formatted_items.append(p_name)
                
                result['product_name'] = " | ".join(formatted_items)
                
                total_price = data_ctx.get("price", {}).get("value") or data_ctx.get("paid", {}).get("value")
                if total_price:
                    result['price'] = total_price

            result['payment_method'] = data_ctx.get("paymentMethod")
            result['raw_status'] = status
        else:
            # Format v1/Legacy
            status_name = get_val(["transacao_status", "nome"], "").lower()
            if "pago" in status_name: result['event_type'] = "compra_aprovada"
            elif "aguardando pagamento" in status_name:
                if get_val(["transacao_forma_pagamento", "nome"], "").lower() == "pix": result['event_type'] = "pix_gerado"
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
        event = payload.get("event", "").upper()
        status = payload.get("status", "").upper()
        payment_method = str(payload.get("payment_method") or get_val(["payment", "method"]) or "").upper()
        
        if status in ["PAID", "APPROVED"] or event in ["ORDER.PAID", "SALE_APPROVED"]: 
            result['event_type'] = "compra_aprovada"
        elif status == "PENDING" or event == "ORDER.PENDING":
            if payment_method == "PIX": result['event_type'] = "pix_gerado"
            else: result['event_type'] = "boleto_impresso"
        elif status == "CANCELED" or event in ["ORDER.CANCELED", "PIX_EXPIRED", "SALE_CANCELED"]: 
            if payment_method == "PIX" or "PIX" in event: result['event_type'] = "pix_expirado"
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

    # Standardize Phone
    if not result.get('phone'):
        result['phone'] = (
            payload.get("phone") or payload.get("phone_number") or payload.get("celular") or 
            payload.get("telefone") or payload.get("mobile") or payload.get("whatsapp") or
            get_val(["customer", "phone"]) or get_val(["buyer", "phone"]) or
            get_val(["data", "buyer", "phone"]) or get_val(["fields", "celular"]) or
            get_val(["fields", "whatsapp"]) or get_val(["fields", "telefone"]) or
            get_val(["fields", "whatsapp_number"]) or get_val(["cliente", "phone"])
        )
    
    # Standardize Name
    if not result.get('name'):
        result['name'] = (
            payload.get("name") or payload.get("fullname") or payload.get("first_name") or
            payload.get("nome") or payload.get("nome_completo") or
            get_val(["customer", "name"]) or get_val(["buyer", "name"]) or
            get_val(["fields", "name"]) or get_val(["fields", "nome"])
        )

    # ── VALIDATE NAME ─────────────────────────────────────────────────────────
    if result.get("name"):
        name_val = str(result["name"]).strip()
        if name_val.isdigit() or len(name_val) <= 1:
             logger.warning(f"⚠️ [PARSER] Nome inválido ignorado (services): '{name_val}'")
             result["name"] = None

    # Standardize Email
    if not result.get('email'):
        result['email'] = (
            payload.get("email") or payload.get("mail") or payload.get("contactEmail") or
            get_val(["customer", "email"]) or get_val(["buyer", "email"]) or
            get_val(["data", "buyer", "email"]) or get_val(["cliente", "email"]) or
            get_val(["fields", "email"])
        )

    # Standardize Product Name
    if not result.get('product_name'):
        products = payload.get("products")
        if isinstance(products, list) and len(products) > 0:
            main_product = next((p for p in products if not p.get("is_order_bump")), products[0])
            result['product_name'] = main_product.get("name")
            result['e_order_bump'] = any([p.get("is_order_bump") for p in products])
            result['items_detailed'] = [{"name": p.get('name'), "price": p.get('price')} for p in products]
        
        if not result.get('product_name'):
            result['product_name'] = (
                payload.get("product_name") or payload.get("produto") or
                get_val(["product", "name"]) or get_val(["Product", "product_name"])
            )

    # Price Normalization (Extracted from webhooks_public)
    if not result.get('price'):
        val = (
            payload.get("total_price") or payload.get("amount") or 
            payload.get("net_value") or payload.get("total_amount") or 
            payload.get("price") or payload.get("valor") or
            payload.get("preco") or
            get_val(["fiscal", "total_value"]) or
            get_val(["data", "amount"]) or get_val(["data", "net_value"]) or
            get_val(["payment", "amount"])
        )
        if val: result['price'] = val

    # Normalização Robusta e Conversão de Moeda
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
            
            currency = (
                payload.get("currency") or 
                get_val(["Commissions", "currency"]) or 
                get_val(["data", "purchase", "price", "currency"]) or 
                payload.get("original_currency") or "BRL"
            ).upper()
            
            result['currency'] = currency
            rates = {"USD": 5.45, "EUR": 5.85, "GBP": 6.80, "MXN": 0.30}
            if currency != "BRL" and currency in rates:
                f_val = f_val * rates[currency]

            result['price'] = f"{f_val:.2f}"
        except:
            result['price'] = str(price_to_normalize)

    # Map status to a friendly name
    if not result.get('raw_status'):
        result['raw_status'] = str(payload.get("status") or payload.get("event") or "outros").upper()

    return result

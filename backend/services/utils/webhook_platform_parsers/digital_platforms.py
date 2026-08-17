import re as _re
from urllib.parse import urlparse, parse_qs
from .common import get_val


def parse_hotmart(payload: dict, result: dict) -> None:
    """Parser unificado para webhooks da Hotmart."""
    event = payload.get("event", "")
    data = payload.get("data", {})
    buyer = data.get("buyer", {})
    product = data.get("product", {})
    purchase = data.get("purchase", {})
    
    # 1. Mapeamento de Evento Base
    if event == "PURCHASE_APPROVED":
        result['event_type'] = "compra_aprovada"
    elif event == "PURCHASE_COMPLETE":
        result['event_type'] = "compra_concluida"
    elif event in ["PURCHASE_CANCELED", "PURCHASE_REFUNDED"]:
        result['event_type'] = "reembolso"
    elif event == "PURCHASE_BILLET_PRINTED":
        result['event_type'] = "boleto_impresso"
    elif event == "PURCHASE_DELAYED":
        result['event_type'] = "cartao_recusado"
    elif event == "ABANDONED_CART":
        result['event_type'] = "carrinho_abandonado"
    elif event == "PURCHASE_CHARGEBACK":
        result['event_type'] = "chargeback"
    elif event == "PURCHASE_PROTEST":
        result['event_type'] = "reembolso"
    elif event == "PURCHASE_EXPIRED":
        result['event_type'] = "pix_expirado"
    elif event == "PURCHASE_OUT_OF_SHOPPING_CART":
        result['event_type'] = "carrinho_abandonado"
    elif event == "SUBSCRIPTION_CANCELLATION":
        result['event_type'] = "reembolso"
    elif event == "SWITCH_PLAN":
        result['event_type'] = "troca_de_plano"
    elif event == "UPDATE_SUBSCRIPTION_CHARGE_DATE":
        result['event_type'] = "alteracao_vencimento"
    elif str(event).startswith("CLUB_"):
        result['event_type'] = "evento_aluno"
        
    # 2. Extração de Informações do Comprador/Aluno
    if str(event).startswith("CLUB_"):
        user_data = data.get("user", {})
        result['name'] = user_data.get("name")
        result['email'] = user_data.get("email")
        result['phone'] = user_data.get("phone")
    else:
        result['name'] = buyer.get("name")
        result['email'] = buyer.get("email")
        
        subscriber = data.get("subscriber", {})
        if subscriber:
            if not result['name']:
                result['name'] = subscriber.get("name")
            if not result['email']:
                result['email'] = subscriber.get("email")
            if subscriber.get("phone"):
                sub_phone = subscriber.get("phone")
                if isinstance(sub_phone, dict):
                    cell = sub_phone.get("cell") or sub_phone.get("phone") or ""
                    ddd = sub_phone.get("dddCell") or sub_phone.get("dddPhone") or ""
                    if cell:
                        result['phone'] = f"{ddd}{cell}"
                else:
                    result['phone'] = sub_phone
                    
        subscription_user = data.get("subscription", {}).get("user", {})
        if subscription_user:
            if not result['email']:
                result['email'] = subscription_user.get("email")
            if not result['name']:
                result['name'] = subscription_user.get("name")
                    
        checkout_phone = buyer.get("checkout_phone", "")
        if checkout_phone:
            result['phone'] = checkout_phone
        elif not result.get('phone'):
            result['phone'] = buyer.get("phone")
            
    result['country'] = buyer.get("address", {}).get("country") or buyer.get("address", {}).get("country_iso")
    
    # 3. Nome do Produto / Assinatura
    result['product_name'] = product.get("name")
    if event == "SWITCH_PLAN":
        plans = data.get("plans", [])
        active_plan = next((p for p in plans if p.get("current") is True), None)
        if active_plan:
            result['product_name'] = active_plan.get("name")
        elif plans:
            result['product_name'] = plans[0].get("name")
            
    # 4. Dados de Pagamento
    result['payment_method'] = purchase.get("payment", {}).get("type")
    if event == "PURCHASE_BILLET_PRINTED":
        result['payment_method'] = "BILLET"
    result['order_bump'] = purchase.get("is_order_bump", False)
    
    payment_info = purchase.get("payment", {})
    if payment_info:
        result['pix_code'] = payment_info.get("pix_code")
        result['pix_qrcode'] = payment_info.get("pix_qrcode")
        
    # 5. Resolução de Status (para friendly_map)
    if event == "PURCHASE_CHARGEBACK":
        result['raw_status'] = "CHARGEBACK"
    elif event == "PURCHASE_PROTEST":
        result['raw_status'] = "DISPUTE"
    elif event == "PURCHASE_DELAYED":
        result['raw_status'] = "DELAYED"
    elif event == "PURCHASE_EXPIRED":
        result['raw_status'] = "EXPIRED"
    elif event == "PURCHASE_OUT_OF_SHOPPING_CART":
        result['raw_status'] = "PURCHASE_OUT_OF_SHOPPING_CART"
    elif event in ["PURCHASE_CANCELED", "PURCHASE_REFUNDED"]:
        result['raw_status'] = event
    elif event == "SUBSCRIPTION_CANCELLATION":
        result['raw_status'] = "SUBSCRIPTION_CANCELLATION"
    elif event == "SWITCH_PLAN":
        result['raw_status'] = "SWITCH_PLAN"
    elif event == "UPDATE_SUBSCRIPTION_CHARGE_DATE":
        result['raw_status'] = "UPDATE_SUBSCRIPTION_CHARGE_DATE"
    elif str(event).startswith("CLUB_"):
        result['raw_status'] = event
    else:
        result['raw_status'] = purchase.get("status") or event
        
    # Trata PURCHASE_BILLET_PRINTED condicionalmente se for PIX
    if event == "PURCHASE_BILLET_PRINTED":
        if result['payment_method'] == "PIX":
            result['event_type'] = "pix_gerado"
            result['raw_status'] = "PENDING"
        else:
            result['event_type'] = "boleto_impresso"
            result['raw_status'] = "BOLETO_IMPRESSO"
            
    # Fallback de PIX com status WAITING_PAYMENT
    if result['payment_method'] == "PIX" and result['raw_status'] == "WAITING_PAYMENT":
        result['event_type'] = "pix_gerado"
        result['raw_status'] = "PENDING"
        
    # 6. Extração de Preço e Moeda
    price_val = purchase.get("price") or purchase.get("full_price")
    currency_val = purchase.get("currency_value")
    
    if isinstance(price_val, dict):
        if not currency_val:
            currency_val = price_val.get("currency_value")
        price_val = price_val.get("value")
        
    if price_val is None and event == "SUBSCRIPTION_CANCELLATION":
        price_val = data.get("actual_recurrence_value")
        
    if price_val is not None:
        result['price'] = price_val
        
    if currency_val:
        result['currency'] = currency_val

    # OB separado (segunda webhook): sobrescreve event_type
    if result.get('order_bump') and result.get('event_type') == 'compra_aprovada':
        result['event_type'] = 'compra_aprovada_ob'


def parse_kiwify(payload: dict, result: dict) -> None:
    """Parser unificado para webhooks da Kiwify."""
    order_status = payload.get("order_status") or payload.get("status", "")
    if order_status == "paid": result['event_type'] = "compra_aprovada"
    elif order_status == "waiting_payment":
        payment_method = str(payload.get("payment_method") or "").lower()
        if payment_method == "pix": result['event_type'] = "pix_gerado"
        else: result['event_type'] = "boleto_impresso"
    elif order_status == "refunded": result['event_type'] = "reembolso"
    elif order_status == "refused": result['event_type'] = "cartao_recusado"
    elif order_status in ["abandoned_cart", "abandoned"]: result['event_type'] = "carrinho_abandonado"
    elif order_status == "chargeback": result['event_type'] = "chargeback"
    elif order_status == "subscription_canceled": result['event_type'] = "assinatura_cancelada"
    elif order_status == "subscription_late": result['event_type'] = "assinatura_atrasada"
    elif order_status == "subscription_renewed": result['event_type'] = "assinatura_renovada"

    customer = payload.get("Customer", {})
    result['name'] = customer.get("full_name")
    result['email'] = customer.get("email")
    result['phone'] = customer.get("mobile") or customer.get("phone")
    result['product_name'] = payload.get("Product", {}).get("product_name")
    result['currency'] = get_val(payload, ["Commissions", "currency"]) or "BRL"
    result['event_time'] = payload.get("created_at") or payload.get("updated_at")
    
    payload_pm = str(payload.get("payment_method") or "")
    kiwify_pm_map = {
        "credit_card": "Cartão de Crédito",
        "card_pix": "Cartão de Crédito",
        "pix": "Pix",
        "billet": "Boleto",
        "bank_transfer": "Transferência",
        "direct_debit": "Débito"
    }
    result['payment_method'] = kiwify_pm_map.get(payload_pm.lower(), payload_pm)
    result['raw_status'] = order_status.upper()

    # OB: detecta OrderBumps da Kiwify e ajusta event_type
    ob_list = payload.get("OrderBumps") or []
    if ob_list:
        result['order_bump'] = True
        if result.get('event_type') == 'compra_aprovada':
            result['event_type'] = 'compra_aprovada_ob'


def parse_eduzz(payload: dict, result: dict) -> None:
    """Parser unificado para webhooks da Eduzz (Nutror, Órbita e MyEduzz)."""
    event_raw = payload.get("event") or ""
    is_nutror = str(event_raw).startswith("nutror.") or (
        isinstance(payload.get("data"), dict) and "learner" in payload["data"]
    )
    is_myeduzz = str(event_raw).startswith("myeduzz.")
    
    is_orbita = "buyer" in payload or "student" in payload or "items" in payload or "customer" in payload or (
        isinstance(payload.get("data"), dict) and ("buyer" in payload["data"] or "items" in payload["data"] or "student" in payload["data"] or "customer" in payload["data"])
    )
    
    if is_nutror:
        data_ctx = payload.get("data") if isinstance(payload.get("data"), dict) else payload
        result['event_type'] = "evento_aluno"
        
        learner = data_ctx.get("learner") or {}
        result['name'] = learner.get("name")
        result['email'] = learner.get("email")
        result['phone'] = learner.get("phone") or learner.get("cellphone")
        
        course = data_ctx.get("course") or {}
        result['product_name'] = course.get("title")
        
        result['raw_status'] = "EVENTO_ALUNO"
        result['payment_method'] = None
        result['price'] = None

    elif is_orbita:
        if "data" in payload and isinstance(payload["data"], dict) and not ("buyer" in payload or "student" in payload or "items" in payload or "customer" in payload):
            data_ctx = payload["data"]
        else:
            data_ctx = payload

        # Detect sun/orbit event and resolve status
        status = str(data_ctx.get("status") or "").lower()
        event_name = str(payload.get("event") or "").lower()
        if event_name.startswith("sun."):
            sub_event = event_name.replace("sun.", "")
            if sub_event in ("cart_abandonment", "order_cart_abandonment"):
                status = "abandoned_cart"
            elif sub_event == "order_paid":
                status = "paid"
            elif sub_event == "order_waiting_payment":
                status = "waiting_payment"
            elif sub_event == "order_refunded":
                status = "refunded"
            elif sub_event in ("order_cancelled", "order_canceled"):
                status = "canceled"
            else:
                status = sub_event

        if status == "paid": result['event_type'] = "compra_aprovada"
        elif status == "waiting_payment":
            pm = str(data_ctx.get("paymentMethod") or "").lower()
            if pm == "pix": result['event_type'] = "pix_gerado"
            else: result['event_type'] = "boleto_impresso"
        elif status == "refunded": result['event_type'] = "reembolso"
        elif status == "abandoned_cart": result['event_type'] = "carrinho_abandonado"
        elif status == "canceled": result['event_type'] = "cartao_recusado"

        buyer = data_ctx.get("buyer") or data_ctx.get("student") or data_ctx.get("customer") or {}
        result['name'] = buyer.get("name")
        result['email'] = buyer.get("email")
        result['phone'] = buyer.get("cellphone") or buyer.get("phone")
        
        # Extract product name
        items_list = data_ctx.get("items", [])
        if items_list:
            currency_code = str(data_ctx.get("price", {}).get("currency") or data_ctx.get("paid", {}).get("currency") or "BRL").upper()
            result['currency'] = currency_code
            symbol_map = {"BRL": "R$", "USD": "$", "EUR": "€", "GBP": "£"}
            main_symbol = symbol_map.get(currency_code, "$")

            formatted_items = []
            parsed_items = []
            for i in items_list:
                p_name = i.get("name", "Produto Desconhecido")
                formatted_items.append(p_name)
                item_price = i.get("price", {}).get("value") if isinstance(i.get("price"), dict) else i.get("price")
                parsed_items.append({
                    "name": p_name,
                    "price": item_price
                })
            result['items'] = parsed_items

            if len(parsed_items) > 1:
                result['order_bump_products'] = parsed_items[1:]

            result['product_name'] = formatted_items[0] if formatted_items else None
            total_price = data_ctx.get("price", {}).get("value") or data_ctx.get("paid", {}).get("value")
            if total_price:
                result['price'] = total_price
        else:
            # If no items list, try to get from productId or href
            prod_ids = data_ctx.get("productId")
            if prod_ids:
                if isinstance(prod_ids, list) and len(prod_ids) > 0:
                    result['product_name'] = f"Produto {prod_ids[0]}"
                else:
                    result['product_name'] = f"Produto {prod_ids}"
            else:
                href = data_ctx.get("href")
                if href:
                    try:
                        parsed_href = urlparse(href)
                        queries = parse_qs(parsed_href.query)
                        if "produto" in queries:
                            result['product_name'] = f"Produto {queries['produto'][0]}"
                    except:
                        pass

        result['payment_method'] = data_ctx.get("paymentMethod")
        result['raw_status'] = status

    elif is_myeduzz:
        data_ctx = payload.get("data") if isinstance(payload.get("data"), dict) else payload
        result['event_type'] = "outros"
        
        result['name'] = f"Fatura #{data_ctx.get('invoiceId')}"
        result['email'] = None
        result['phone'] = None
        
        price_info = data_ctx.get("price") or {}
        result['price'] = str(price_info.get("value")) if price_info.get("value") is not None else None
        result['currency'] = str(price_info.get("currency") or "BRL").upper()
        
        result['product_name'] = f"Fatura #{data_ctx.get('invoiceId')}"
        result['payment_method'] = None
        result['raw_status'] = "COMMISSION_PROCESSED"
    else:
        status_name = str(get_val(payload, ["transacao_status", "nome"]) or "").lower()
        if "pago" in status_name: result['event_type'] = "compra_aprovada"
        elif "aguardando pagamento" in status_name:
            if str(get_val(payload, ["transacao_forma_pagamento", "nome"]) or "").lower() == "pix": result['event_type'] = "pix_gerado"
            else: result['event_type'] = "boleto_impresso"
        elif "cancelado" in status_name: result['event_type'] = "cartao_recusado"
        elif "abandonado" in status_name: result['event_type'] = "carrinho_abandonado"

        result['name'] = get_val(payload, ["cli_nome"])
        result['email'] = get_val(payload, ["cli_email"])
        result['phone'] = get_val(payload, ["cli_celular"])
        result['product_name'] = get_val(payload, ["produto_nome"])
        result['payment_method'] = get_val(payload, ["transacao_forma_pagamento", "nome"])
        result['raw_status'] = status_name


def parse_kirvano(payload: dict, result: dict) -> None:
    """Parser unificado para webhooks da Kirvano."""
    event = str(payload.get("event") or "").upper()
    status = str(payload.get("status") or "").upper()
    payment_method = str(payload.get("payment_method") or get_val(payload, ["payment", "method"]) or "").upper()

    # Check event field first (specific) before falling back to status
    EVENT_TYPE_MAP = {
        "SALE_APPROVED":        "compra_aprovada",
        "SUBSCRIPTION_RENEWED": "assinatura_renovada",
        "SALE_REFUSED":         "cartao_recusado",
        "SALE_REFUNDED":        "reembolso",
        "SALE_CHARGEBACK":      "chargeback",
        "BANK_SLIP_GENERATED":  "boleto_impresso",
        "BANK_SLIP_EXPIRED":    "boleto_expirado",
        "PIX_GENERATED":        "pix_gerado",
        "PIX_EXPIRED":          "pix_expirado",
        "ABANDONED_CART":       "carrinho_abandonado",
        "CHECKOUT.ABANDONED":   "carrinho_abandonado",
        "SUBSCRIPTION_CANCELED":"assinatura_cancelada",
        "SUBSCRIPTION_EXPIRED": "assinatura_atrasada",
        # legacy / alternate event names
        "ORDER.PAID":           "compra_aprovada",
        "ORDER.REFUNDED":       "reembolso",
        "ORDER.CANCELED":       "compra_cancelada",
        "SALE_CANCELED":        "compra_cancelada",
    }

    if event in EVENT_TYPE_MAP:
        result['event_type'] = EVENT_TYPE_MAP[event]
    else:
        # Fallback: infer from status + payment method
        if status in ["PAID", "APPROVED"]:
            result['event_type'] = "compra_aprovada"
        elif status == "PENDING":
            result['event_type'] = "pix_gerado" if payment_method == "PIX" else "boleto_impresso"
        elif status == "CANCELED":
            result['event_type'] = "pix_expirado" if ("PIX" in payment_method or "PIX" in event) else "cartao_recusado"
        elif status == "REFUNDED":
            result['event_type'] = "reembolso"

    customer = payload.get("customer", {})
    result['name'] = customer.get("name") or customer.get("full_name")
    result['email'] = customer.get("email")
    result['phone'] = customer.get("phone") or customer.get("mobile") or customer.get("phone_number")
    result['payment_method'] = payment_method
    result['raw_status'] = event if event in EVENT_TYPE_MAP else (status or event)

    # Products — separate main products from Order Bumps
    products = payload.get("products") or []
    main_products = [p for p in products if not p.get("is_order_bump")]
    ob_products   = [p for p in products if p.get("is_order_bump")]

    result['product_name'] = main_products[0].get("name") if main_products else (products[0].get("name") if products else None)

    # Price: prefer total_price, fallback to first main product price
    raw_price = payload.get("total_price") or (main_products[0].get("price") if main_products else None)
    if raw_price:
        clean = _re.sub(r'[^\d,\.]', '', str(raw_price)).replace(',', '.')
        try:
            result['price'] = f"{float(clean):.2f}"
        except Exception:
            result['price'] = str(raw_price)

    if ob_products and result.get('event_type') == 'compra_aprovada':
        result['event_type'] = 'compra_aprovada_com_ob'
        result['order_bump_products'] = [
            {'name': p.get('name'), 'price': p.get('price')} for p in ob_products
        ]


def parse_pagtrust(payload: dict, result: dict) -> None:
    """Parser unificado para webhooks da PagTrust."""
    status = str(payload.get("status") or "").lower()
    raw_status_val = status.upper()
    if status in ["approved", "paid"]:
        result['event_type'] = "compra_aprovada"
    elif status in ["waiting_payment", "pending", "billet_printed", "pix_generated"]:
        payment_method = str(payload.get("payment_type") or "").lower()
        if payment_method == "pix":
            result['event_type'] = "pix_gerado"
            raw_status_val = "PIX_GERADO"
        else:
            result['event_type'] = "boleto_impresso"
            raw_status_val = "BOLETO_IMPRESSO"
    elif status == "refunded":
        result['event_type'] = "reembolso"
    elif status == "chargeback":
        result['event_type'] = "chargeback"
    elif status == "canceled":
        result['event_type'] = "compra_cancelada"
        raw_status_val = "COMPRA_CANCELADA"
    elif status in ["refused", "declined"]:
        payment_method = str(payload.get("payment_type") or "").lower()
        if payment_method == "pix":
            result['event_type'] = "pix_expirado"
            raw_status_val = "PIX_EXPIRADO"
        else:
            result['event_type'] = "cartao_recusado"
            raw_status_val = "CARTAO_RECUSADO"
    elif status in ["abandoned", "abandoned_cart"]:
        result['event_type'] = "carrinho_abandonado"
        
    result['name'] = payload.get("buyerVOName") or payload.get("customerFullName") or payload.get("buyerVO", {}).get("name") or payload.get("name") or payload.get("first_name")
    result['email'] = payload.get("buyerVOEmail") or payload.get("customerEmail") or payload.get("buyerVO", {}).get("email") or payload.get("email")
    
    local_code = payload.get("phone_local_code") or payload.get("phone_checkout_local_code") or ""
    num = payload.get("phone_number") or payload.get("phone_checkout_number") or ""
    if local_code and num:
        result['phone'] = f"{local_code}{num}"
    else:
        result['phone'] = num or local_code
        
    if not result.get('phone'):
        result['phone'] = payload.get("customerFullPhoneNumber") or payload.get("buyerVO", {}).get("phone")
        
    result['product_name'] = payload.get("productName") or payload.get("productUCode") or payload.get("prod_name")
    result['currency'] = payload.get("currency") or "BRL"
    result['event_time'] = payload.get("purchase_date") or payload.get("confirmation_purchase_date")
    result['payment_method'] = payload.get("payment_type")
    result['price'] = payload.get("price") or payload.get("full_price")
    result['raw_status'] = raw_status_val
    result['order_bump'] = str(payload.get("order_bump") or "").lower() == "true"

    # OB separado (segunda webhook): sobrescreve event_type
    if result.get('order_bump') and result.get('event_type') == 'compra_aprovada':
        result['event_type'] = 'compra_aprovada_ob'

    result['utm_source'] = payload.get("utm_source")
    result['utm_medium'] = payload.get("utm_medium")
    result['utm_campaign'] = payload.get("utm_campaign")


def parse_monetizze(payload: dict, result: dict) -> None:
    """Parser unificado para webhooks da Monetizze."""
    status_obj = payload.get("status") or {}
    if isinstance(status_obj, dict):
        status_id = status_obj.get("id")
        status_name = str(status_obj.get("name") or "").lower()
    else:
        status_id = None
        status_name = str(status_obj).lower()

    # status_id mapping (IDs oficiais Monetizze)
    # 3=Aprovado, 4=Cancelado, 5=Estornado, 6=Chargeback
    # 20=Aguardando Boleto, 21=Aguardando PIX, 22=Inadimplente
    MONETIZZE_STATUS = {
        3:  "compra_aprovada",
        4:  "cartao_recusado",
        5:  "reembolso",
        6:  "reembolso",
        20: "boleto_impresso",
        21: "pix_gerado",
        22: "assinatura_atrasada",
    }
    if status_id in MONETIZZE_STATUS:
        result['event_type'] = MONETIZZE_STATUS[status_id]
    elif "aprovado" in status_name or "approved" in status_name:
        result['event_type'] = "compra_aprovada"
    elif "aguardando" in status_name:
        pm = str((payload.get("payment_method") or {}).get("name") or "").lower()
        result['event_type'] = "pix_gerado" if "pix" in pm else "boleto_impresso"
    elif "cancelado" in status_name or "canceled" in status_name:
        result['event_type'] = "cartao_recusado"
    elif "estornado" in status_name or "reembolso" in status_name or "refunded" in status_name:
        result['event_type'] = "reembolso"
    elif "chargeback" in status_name:
        result['event_type'] = "chargeback"
    elif "abandonado" in status_name or "abandoned" in status_name:
        result['event_type'] = "carrinho_abandonado"

    # Subscription events via 'type'
    event_type_field = str(payload.get("type") or payload.get("event") or "").lower()
    if "subscription" in event_type_field:
        if "canceled" in event_type_field or "cancelado" in event_type_field:
            result['event_type'] = "assinatura_cancelada"
        elif "renewed" in event_type_field or "renovado" in event_type_field:
            result['event_type'] = "assinatura_renovada"

    consumer = payload.get("consumer") or {}
    result['name'] = consumer.get("name") or consumer.get("full_name")
    result['email'] = consumer.get("email")
    result['phone'] = consumer.get("cellphone") or consumer.get("phone") or consumer.get("phone_number")

    product = payload.get("product") or {}
    result['product_name'] = product.get("name") or product.get("description")
    result['price'] = product.get("price") or payload.get("value") or payload.get("total")

    pm = payload.get("payment_method") or {}
    result['payment_method'] = pm.get("name") if isinstance(pm, dict) else str(pm)
    result['raw_status'] = str(status_id or status_name).upper()
    result['currency'] = "BRL"
    result['utm_source'] = payload.get("utm_source")
    result['utm_medium'] = payload.get("utm_medium")
    result['utm_campaign'] = payload.get("utm_campaign")


def parse_cakto(payload: dict, result: dict) -> None:
    """Parser unificado para webhooks da Cakto."""
    event = str(payload.get("event") or "").lower()
    data = payload.get("data") or {}
    order = data.get("order") or data.get("sale") or {}
    customer = data.get("customer") or data.get("buyer") or {}
    product = data.get("product") or data.get("offer") or {}

    EVENT_MAP = {
        "order.paid":              "compra_aprovada",
        "order.approved":          "compra_aprovada",
        "sale.approved":           "compra_aprovada",
        "order.refunded":          "reembolso",
        "order.chargedback":       "chargeback",
        "order.chargeback":        "chargeback",
        "order.canceled":          "cartao_recusado",
        "order.refused":           "cartao_recusado",
        "order.abandoned":         "carrinho_abandonado",
        "order.billet_generated":  "boleto_impresso",
        "order.pix_generated":     "pix_gerado",
        "order.pix_expired":       "pix_expirado",
        "subscription.canceled":   "assinatura_cancelada",
        "subscription.renewed":    "assinatura_renovada",
        "subscription.overdue":    "assinatura_atrasada",
    }
    result['event_type'] = EVENT_MAP.get(event, "outros")

    result['name'] = customer.get("name") or customer.get("full_name")
    result['email'] = customer.get("email")
    result['phone'] = customer.get("phone") or customer.get("cellphone") or customer.get("phone_number")

    result['product_name'] = product.get("name") or product.get("title")

    total = order.get("total") or order.get("amount") or order.get("price")
    # Cakto envia centavos em alguns formatos
    if total and isinstance(total, int) and total > 10000:
        total = round(total / 100, 2)
    result['price'] = total

    pm = str(order.get("payment_method") or order.get("payment_type") or "").lower()
    PM_MAP = {
        "credit_card": "Cartão de Crédito", "creditcard": "Cartão de Crédito",
        "pix": "Pix", "billet": "Boleto", "boleto": "Boleto",
    }
    result['payment_method'] = PM_MAP.get(pm, pm or None)
    result['raw_status'] = event.upper().replace(".", "_")
    result['currency'] = order.get("currency") or "BRL"
    result['utm_source'] = (data.get("utm") or {}).get("utm_source") or payload.get("utm_source")
    result['utm_medium'] = (data.get("utm") or {}).get("utm_medium") or payload.get("utm_medium")
    result['utm_campaign'] = (data.get("utm") or {}).get("utm_campaign") or payload.get("utm_campaign")

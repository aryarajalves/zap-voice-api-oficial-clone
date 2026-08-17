from typing import Union, List, Optional, Any, Dict
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse, parse_qs
import re as _re

def get_doc_label(doc: Optional[str]) -> str:
    if not doc:
        return "Documento"
    doc_digits = "".join(filter(str.isdigit, str(doc)))
    if 10 <= len(doc_digits) <= 12:
        return "CPF"
    elif 13 <= len(doc_digits) <= 15:
        return "CNPJ"
    return "Documento"

def get_val(payload: dict, keys: list, default=None):
    curr = payload
    for key in keys:
        if isinstance(curr, dict) and key in curr:
            curr = curr[key]
        else:
            return default
    if isinstance(curr, dict) and "value" in curr:
        return curr["value"]
    return curr

def parse_hotmart(payload: dict, result: dict) -> None:
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
        import re as _re
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
    # Monetizze envia status como objeto {id, name} ou string direta
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


def parse_ticto(payload: dict, result: dict) -> None:
    event = str(payload.get("event") or "").lower()
    order = payload.get("order") or payload
    status = str(order.get("status") or "").lower()
    payment_method = str(order.get("payment_method") or order.get("payment_type") or "").lower()

    EVENT_MAP = {
        "purchase.approved":       "compra_aprovada",
        "purchase.refused":        "cartao_recusado",
        "purchase.canceled":       "compra_cancelada",
        "purchase.refunded":       "reembolso",
        "purchase.chargeback":     "chargeback",
        "purchase.abandoned_cart": "carrinho_abandonado",
        "abandoned_cart":          "carrinho_abandonado",
        "subscription.canceled":   "assinatura_cancelada",
        "subscription.renewed":    "assinatura_renovada",
        "subscription.overdue":    "assinatura_vencida",
        "subscription.late":       "assinatura_atrasada",
    }

    if event in EVENT_MAP:
        result['event_type'] = EVENT_MAP[event]
    elif "waiting" in event or "waiting_payment" in event or status in ["waiting_payment", "pending"]:
        if "pix" in payment_method or "pix" in event:
            result['event_type'] = "pix_gerado"
        else:
            result['event_type'] = "boleto_impresso"
    elif status == "approved": result['event_type'] = "compra_aprovada"
    elif status in ["refused", "canceled"]: result['event_type'] = "cartao_recusado"
    elif status == "refunded": result['event_type'] = "reembolso"

    buyer = order.get("buyer") or order.get("customer") or {}
    result['name'] = buyer.get("name") or buyer.get("full_name")
    result['email'] = buyer.get("email")
    result['phone'] = buyer.get("phone_number") or buyer.get("phone") or buyer.get("cellphone")

    product = order.get("product") or order.get("products") or {}
    if isinstance(product, list) and product:
        product = product[0]
    result['product_name'] = product.get("name") or product.get("title")
    result['price'] = order.get("total_price") or order.get("price")
    result['payment_method'] = payment_method or None
    result['raw_status'] = event.upper().replace(".", "_") if event else status.upper()

    # OB: detecta order_bumps da Ticto e ajusta event_type
    ob_list = order.get("order_bumps") or []
    if ob_list and result.get("event_type") == "compra_aprovada":
        result["order_bump"] = True
        result["event_type"] = "compra_aprovada_ob"


def parse_pepper(payload: dict, result: dict) -> None:
    event = str(payload.get("event") or "").upper()
    data = payload.get("data") or payload

    EVENT_MAP = {
        "PURCHASE_APPROVED":   "compra_aprovada",
        "PURCHASE_CANCELED":   "compra_cancelada",
        "PURCHASE_REFUSED":    "cartao_recusado",
        "PURCHASE_REFUNDED":   "reembolso",
        "PURCHASE_CHARGEBACK": "chargeback",
        "BILLET_GENERATED":    "boleto_impresso",
        "PIX_GENERATED":       "pix_gerado",
        "ABANDONED_CART":      "carrinho_abandonado",
    }
    result['event_type'] = EVENT_MAP.get(event, "outros")

    # Detecta order bumps e reclassifica se necessário
    if event == "PURCHASE_APPROVED":
        ob_products = data.get("order_bumps") or []
        if ob_products:
            result['event_type'] = "compra_aprovada_com_ob"
            bump_names = ", ".join(str(ob.get("product", {}).get("name") or "Produto OB") for ob in ob_products)
            result.setdefault("custom_fields", {})["Produto(s) Order Bump"] = bump_names
            result["order_bump"] = True

    customer = data.get("customer") or {}
    result['name'] = customer.get("name") or customer.get("full_name")
    result['email'] = customer.get("email")
    result['phone'] = customer.get("phone") or customer.get("phone_number")

    product = data.get("product") or {}
    result['product_name'] = product.get("name") or product.get("title")
    transaction = data.get("transaction") or {}
    result['price'] = transaction.get("price") or transaction.get("amount")
    result['payment_method'] = transaction.get("payment_method")
    result['raw_status'] = event


def parse_braip(payload: dict, result: dict) -> None:
    event = str(payload.get("event") or payload.get("status") or "").lower()

    if event in ["approved", "sale_approved"]:
        ob = payload.get("order_bump")
        if ob:
            result['event_type'] = "compra_aprovada_com_ob"
            ob_name = ob.get("product_title") or ob.get("name") or "Produto OB"
            result.setdefault("custom_fields", {})["Produto(s) Order Bump"] = ob_name
            result["order_bump"] = True
        else:
            result['event_type'] = "compra_aprovada"
    elif event in ["refused", "declined"]: result['event_type'] = "cartao_recusado"
    elif event == "canceled": result['event_type'] = "compra_cancelada"
    elif event == "refunded": result['event_type'] = "reembolso"
    elif event == "chargeback": result['event_type'] = "chargeback"
    elif event in ["billet", "boleto", "waiting_payment"]:
        payment = str(payload.get("payment_method") or "").lower()
        if "pix" in payment: result['event_type'] = "pix_gerado"
        else: result['event_type'] = "boleto_impresso"
    elif "abandon" in event: result['event_type'] = "carrinho_abandonado"

    result['name'] = payload.get("contact_name") or payload.get("name")
    result['email'] = payload.get("contact_email") or payload.get("email")
    result['phone'] = payload.get("contact_phone") or payload.get("phone")
    result['product_name'] = payload.get("product_title") or payload.get("product_name")
    result['price'] = payload.get("price") or payload.get("total_price")
    result['payment_method'] = payload.get("payment_method")
    result['raw_status'] = event.upper()

def parse_guru(payload: dict, result: dict) -> None:
    webhook_type = str(payload.get("webhook_type") or "").lower()

    # ---- TRANSACTION webhook ----
    if webhook_type == "transaction":
        status = str(payload.get("status") or "").lower()
        payment = payload.get("payment") or {}
        method = str(payment.get("method") or "").lower()
        product = payload.get("product") or {}

        # Detecta upsell se o nome do produto contiver "upsell" ou "upgrade"
        prod_name_lower = str(product.get("name") or "").lower()
        is_upsell = "upsell" in prod_name_lower or "upgrade" in prod_name_lower

        # Detecta order bump na lista products no plural
        products = payload.get("products") or []
        ob_products = [p for p in products if p.get("is_order_bump")]

        if status == "approved":
            if is_upsell:
                result['event_type'] = "compra_aprovada_upsell"
            elif ob_products:
                result['event_type'] = "compra_aprovada_com_ob"
            else:
                result['event_type'] = "compra_aprovada"
        elif status in ("refused", "declined", "refused_by_antifraud"):
            result['event_type'] = "cartao_recusado"
        elif status == "refunded":
            result['event_type'] = "reembolso"
        elif status == "chargeback":
            result['event_type'] = "chargeback"
        elif status in ("canceled", "cancelled"):
            result['event_type'] = "compra_cancelada"
        elif status in ("billet_printed", "waiting_payment"):
            if "pix" in method:
                result['event_type'] = "pix_gerado"
            else:
                result['event_type'] = "boleto_impresso"
        elif status == "expired":
            if "pix" in method:
                result['event_type'] = "pix_expirado"
            else:
                result['event_type'] = "boleto_expirado"
        elif status == "abandoned":
            result['event_type'] = "carrinho_abandonado"

        contact = payload.get("contact") or {}
        phone_code = str(contact.get("phone_local_code") or "")
        phone_num  = str(contact.get("phone_number") or "")
        result['name']  = contact.get("name")
        result['email'] = contact.get("email")
        
        # Limpa telefone
        phone_raw = phone_code + phone_num
        import re as _re
        phone_clean = _re.sub(r'\D', '', phone_raw)
        result['phone'] = phone_clean if phone_clean else None

        product = payload.get("product") or {}
        result['product_name'] = product.get("name")
        raw_price = payment.get("total") or product.get("total_value")
        if raw_price is not None:
            try:
                result['price'] = f"{float(raw_price):.2f}"
            except Exception:
                result['price'] = str(raw_price)

        result['payment_method'] = method or None
        result['currency']       = str(payment.get("currency") or "").upper() or None
        result['checkout_url']   = payload.get("checkout_url")

        # PIX qrcode
        pix = payment.get("pix") or {}
        qrcode = (pix.get("qrcode") or {}) if pix else {}
        result['pix_qrcode'] = qrcode.get("signature") or qrcode.get("url")

        # Boleto URL
        billet = payment.get("billet") or {}
        result['checkout_url'] = result.get('checkout_url') or billet.get("url")

        # Country: from infrastructure (geo-IP) then contact address
        infra = payload.get("infrastructure") or {}
        result['country'] = (
            str(infra.get("country") or "").upper()
            or str(contact.get("address_country") or "").upper()
            or None
        )

        result['raw_status'] = status.upper() if status else None

        # CPF / CNPJ do comprador (contact.doc)
        custom_fields = {}
        doc = str(contact.get("doc") or "").strip()
        if doc:
            doc_label = get_doc_label(doc)
            custom_fields[doc_label] = doc

        # Order Bump e Upsell
        if ob_products:
            bump_names = ", ".join(str(p.get("name") or "Produto OB") for p in ob_products)
            custom_fields["Produto(s) Order Bump"] = bump_names
            result["order_bump"] = True

        if is_upsell:
            result["is_upsell"] = True

        if custom_fields:
            result['custom_fields'] = custom_fields

    # ---- SUBSCRIPTION webhook ----
    elif webhook_type == "subscription":
        last_status = str(payload.get("last_status") or "").lower()

        if last_status == "active":
            result['event_type'] = "assinatura_renovada"
        elif last_status in ("canceled", "cancelled"):
            result['event_type'] = "assinatura_cancelada"
        elif last_status == "delayed":
            result['event_type'] = "assinatura_atrasada"
        elif last_status in ("trialing", "trial"):
            result['event_type'] = "compra_aprovada"

        subscriber = payload.get("subscriber") or {}
        phone_code = str(subscriber.get("phone_local_code") or "")
        phone_num  = str(subscriber.get("phone_number") or "")
        result['name']  = subscriber.get("name")
        result['email'] = subscriber.get("email")
        
        # Limpa telefone
        phone_raw = phone_code + phone_num
        import re as _re
        phone_clean = _re.sub(r'\D', '', phone_raw)
        result['phone'] = phone_clean if phone_clean else None

        product = payload.get("product") or {}
        result['product_name'] = product.get("name")
        invoice = payload.get("current_invoice") or {}
        raw_price = invoice.get("value")
        if raw_price is not None:
            try:
                result['price'] = f"{float(raw_price):.2f}"
            except Exception:
                result['price'] = str(raw_price)

        result['payment_method'] = str(payload.get("payment_method") or "").lower() or None
        result['country'] = str(subscriber.get("address_country") or "").upper() or None
        result['raw_status'] = last_status.upper() if last_status else None

        # CPF / CNPJ do comprador (subscriber.doc)
        custom_fields = {}
        doc = str(subscriber.get("doc") or "").strip()
        if doc:
            doc_label = get_doc_label(doc)
            custom_fields[doc_label] = doc

        # Detecta upsell se o nome do produto contiver "upsell" ou "upgrade"
        prod_name_lower = str(product.get("name") or "").lower()
        is_upsell = "upsell" in prod_name_lower or "upgrade" in prod_name_lower
        if is_upsell:
            result["is_upsell"] = True
            if last_status in ("trialing", "trial"):
                result['event_type'] = "compra_aprovada_upsell"

        if custom_fields:
            result['custom_fields'] = custom_fields

def parse_lastlink(payload: dict, result: dict) -> None:
    event = str(payload.get("Event") or payload.get("event") or "").strip()
    data  = payload.get("Data") or payload.get("data") or {}

    buyer    = data.get("Buyer") or data.get("buyer") or {}
    products = data.get("Products") or data.get("products") or []
    purchase = data.get("Purchase") or data.get("purchase") or {}
    payment  = purchase.get("Payment") or purchase.get("payment") or {}
    method   = str(payment.get("PaymentMethod") or payment.get("paymentMethod") or "").lower()

    # ---- Event mapping ----
    if event == "Purchase_Order_Confirmed":
        is_upsell = bool(purchase.get("IsUpsell") or purchase.get("isUpsell"))
        result['event_type'] = "compra_aprovada_upsell" if is_upsell else "compra_aprovada"
    elif event == "Recurrent_Payment":
        result['event_type'] = "assinatura_renovada"
    elif event == "Payment_Refund":
        result['event_type'] = "reembolso"
    elif event == "Refund_Requested":
        result['event_type'] = "reembolso"
    elif event == "Payment_Chargeback":
        result['event_type'] = "chargeback"
    elif event == "Purchase_Request_Canceled":
        result['event_type'] = "compra_cancelada"
    elif event == "Purchase_Request_Confirmed":
        # Fatura criada — antes do pagamento (pix/boleto pendente)
        if "pix" in method:
            result['event_type'] = "pix_gerado"
        else:
            result['event_type'] = "boleto_impresso"
    elif event == "Purchase_Request_Expired":
        if "pix" in method:
            result['event_type'] = "pix_expirado"
        else:
            result['event_type'] = "boleto_expirado"
    elif event == "Abandoned_Cart":
        result['event_type'] = "carrinho_abandonado"
    elif event == "Subscription_Canceled":
        result['event_type'] = "assinatura_cancelada"
    elif event in ("Subscription_Expired", "Subscription_Renewal_Pending"):
        result['event_type'] = "assinatura_atrasada"
    elif event == "Refund_Period_Over":
        result['event_type'] = "compra_concluida"

    # ---- Buyer ----
    result['name']  = buyer.get("Name") or buyer.get("name")
    result['email'] = buyer.get("Email") or buyer.get("email")
    phone_raw = buyer.get("PhoneNumber") or buyer.get("phoneNumber") or ""
    # PhoneNumber comes as "+5511987654321" — strip leading "+"
    result['phone'] = phone_raw.lstrip('+') if phone_raw else None

    # ---- Product ----
    if products:
        p0 = products[0]
        result['product_name'] = p0.get("Name") or p0.get("name")
        raw_price = p0.get("Price") or p0.get("price")
        if raw_price is not None:
            try:
                result['price'] = f"{float(raw_price):.2f}"
            except Exception:
                result['price'] = str(raw_price)

    # Override price with what the buyer actually paid if available
    paid_price = (purchase.get("Price") or {}).get("Value")
    if paid_price is not None:
        try:
            result['price'] = f"{float(paid_price):.2f}"
        except Exception:
            pass

    # ---- Payment details ----
    result['payment_method'] = method or None
    result['checkout_url'] = (
        purchase.get("InvoiceUrl") or purchase.get("invoiceUrl")
        or (data.get("Offer") or {}).get("Url")
        or (data.get("offer") or {}).get("url")
    )

    result['raw_status'] = event


def parse_hubla(payload: dict, result: dict) -> None:
    """Parser for Hubla v2.0.0 webhooks."""
    event_type = str(payload.get("type") or "").strip()
    event = payload.get("event") or {}

    # ---- Common helpers ----
    invoice = event.get("invoice") or {}
    subscription = event.get("subscription") or {}
    user = event.get("user") or {}
    product = event.get("product") or {}
    payer = invoice.get("payer") or {}
    lead = event.get("lead") or {}

    payment_method = str(
        invoice.get("paymentMethod") or subscription.get("paymentMethod") or ""
    ).lower()
    invoice_status = str(invoice.get("status") or "").lower()

    # ---- Event type mapping ----
    if event_type == "invoice.payment_succeeded":
        result['event_type'] = "compra_aprovada"
    elif event_type == "invoice.payment_failed":
        if "pix" in payment_method:
            result['event_type'] = "pix_expirado"
        elif "bank_slip" in payment_method or "boleto" in payment_method:
            result['event_type'] = "boleto_expirado"
        else:
            result['event_type'] = "cartao_recusado"
    elif event_type == "invoice.refunded":
        result['event_type'] = "reembolso"
    elif event_type == "invoice.expired":
        if "pix" in payment_method:
            result['event_type'] = "pix_expirado"
        elif "bank_slip" in payment_method or "boleto" in payment_method:
            result['event_type'] = "boleto_expirado"
        else:
            result['event_type'] = "compra_cancelada"
    elif event_type == "invoice.created":
        if "pix" in payment_method:
            result['event_type'] = "pix_gerado"
        elif "bank_slip" in payment_method or "boleto" in payment_method:
            result['event_type'] = "boleto_impresso"
    elif event_type == "invoice.status_updated":
        if invoice_status in ("chargeback", "disputed"):
            result['event_type'] = "chargeback"
        elif invoice_status == "refunded":
            result['event_type'] = "reembolso"
        elif invoice_status == "paid":
            result['event_type'] = "compra_aprovada"
        elif invoice_status in ("overdue", "unpaid"):
            result['event_type'] = "cartao_recusado"
    elif event_type == "subscription.activated":
        result['event_type'] = "assinatura_renovada"
    elif event_type in ("subscription.deactivated", "subscription.renewal_disabled"):
        result['event_type'] = "assinatura_cancelada"
    elif event_type == "subscription.expiring":
        result['event_type'] = "assinatura_atrasada"
    elif event_type in ("lead.created", "lead.abandoned_cart"):
        result['event_type'] = "carrinho_abandonado"

    # ---- Name ----
    # Prefer payer, fallback to user, then lead
    first = (
        payer.get("firstName") or user.get("firstName") or lead.get("firstName") or ""
    )
    last = (
        payer.get("lastName") or user.get("lastName") or lead.get("lastName") or ""
    )
    full_name = f"{first} {last}".strip() or None
    result['name'] = full_name

    # ---- Email ----
    result['email'] = (
        payer.get("email") or user.get("email") or lead.get("email") or None
    )

    # ---- Phone ----
    phone_raw = (
        payer.get("phone") or user.get("phone") or lead.get("phone") or ""
    )
    if phone_raw:
        result['phone'] = str(phone_raw).lstrip("+")
    else:
        result['phone'] = None

    # ---- Product ----
    result['product_name'] = product.get("name") or None

    # ---- Price (cents → BRL) ----
    amount = invoice.get("amount") or subscription.get("amount") or {}
    total_cents = amount.get("totalCents")
    if total_cents is not None:
        try:
            result['price'] = f"{float(total_cents) / 100:.2f}"
        except Exception:
            result['price'] = str(total_cents)

    # ---- Payment method ----
    result['payment_method'] = payment_method or None

    # ---- Currency ----
    currency = str(invoice.get("currency") or subscription.get("currency") or "").upper()
    result['currency'] = currency or None

    # ---- Country ----
    billing = invoice.get("billingAddress") or subscription.get("billingAddress") or {}
    country = str(billing.get("countryCode") or "").upper()
    result['country'] = country or None

    # ---- Raw status ----
    result['raw_status'] = event_type


def parse_greenn(payload: dict, result: dict) -> None:
    """Parser for Greenn webhooks (sale, contract, lead)."""
    wh_type = str(payload.get("type") or "").lower()
    event = str(payload.get("event") or "").lower()
    product = payload.get("product") or {}

    result['product_name'] = product.get("name") or None
    custom_fields = {}

    if wh_type == "sale":
        sale = payload.get("sale") or {}
        client = payload.get("client") or {}
        current_status = str(sale.get("status") or payload.get("currentStatus") or "").lower()
        method = str(sale.get("method") or product.get("method") or "").upper()

        is_pix = "PIX" in method
        is_boleto = "BOLETO" in method

        # Detecta upsell se o nome do produto contiver "upsell" ou "upgrade"
        prod_name_lower = str(product.get("name") or "").lower()
        is_upsell = "upsell" in prod_name_lower or "upgrade" in prod_name_lower
        
        products = payload.get("products") or []
        ob_products = [p for p in products if p.get("is_order_bump")]

        if current_status == "paid":
            if is_upsell:
                result['event_type'] = "compra_aprovada_upsell"
            elif ob_products:
                result['event_type'] = "compra_aprovada_com_ob"
            else:
                result['event_type'] = "compra_aprovada"
        elif current_status == "waiting_payment":
            if is_pix:
                result['event_type'] = "pix_gerado"
            elif is_boleto:
                result['event_type'] = "boleto_impresso"
            else:
                result['event_type'] = "boleto_impresso"
        elif current_status == "refused":
            if is_pix:
                result['event_type'] = "pix_expirado"
            elif is_boleto:
                result['event_type'] = "boleto_expirado"
            else:
                result['event_type'] = "cartao_recusado"
        elif current_status == "refunded":
            result['event_type'] = "reembolso"
        elif current_status == "chargedback":
            result['event_type'] = "chargeback"

        result['name'] = client.get("name") or None
        result['email'] = client.get("email") or None
        
        # Limpa telefone: remove +, espaços e caracteres não numéricos
        phone_raw = str(client.get("cellphone") or "").strip()
        import re as _re
        phone_clean = _re.sub(r'\D', '', phone_raw)
        result['phone'] = phone_clean if phone_clean else None

        raw_price = sale.get("amount")
        if raw_price is not None:
            try:
                result['price'] = f"{float(raw_price):.2f}"
            except Exception:
                result['price'] = str(raw_price)

        result['payment_method'] = method.lower() if method else None
        result['country'] = "BR"
        result['raw_status'] = current_status.upper() if current_status else None

        # CPF / CNPJ do comprador
        doc = str(client.get("cpf_cnpj") or "").strip()
        if doc:
            doc_label = get_doc_label(doc)
            custom_fields[doc_label] = doc

        # Order Bump e Upsell adicionais
        if ob_products:
            bump_names = ", ".join(str(p.get("name") or "Produto OB") for p in ob_products)
            custom_fields["Produto(s) Order Bump"] = bump_names
            result["order_bump"] = True

        if is_upsell:
            result["is_upsell"] = True

    elif wh_type == "contract":
        current_sale = payload.get("currentSale") or {}
        client = payload.get("client") or {}
        contract = payload.get("contract") or {}
        current_status = str(contract.get("status") or payload.get("currentStatus") or "").lower()
        method = str(current_sale.get("method") or "").upper()

        if current_status == "paid":
            result['event_type'] = "assinatura_renovada"
        elif current_status == "trialing":
            result['event_type'] = "compra_aprovada"
        elif current_status in ("pending_payment", "unpaid"):
            result['event_type'] = "assinatura_atrasada"
        elif current_status == "canceled":
            result['event_type'] = "assinatura_cancelada"

        result['name'] = client.get("name") or None
        result['email'] = client.get("email") or None
        
        # Limpa telefone
        phone_raw = str(client.get("cellphone") or "").strip()
        import re as _re
        phone_clean = _re.sub(r'\D', '', phone_raw)
        result['phone'] = phone_clean if phone_clean else None

        raw_price = current_sale.get("amount") or product.get("amount")
        if raw_price is not None:
            try:
                result['price'] = f"{float(raw_price):.2f}"
            except Exception:
                result['price'] = str(raw_price)

        result['payment_method'] = method.lower() if method else None
        result['country'] = "BR"
        result['raw_status'] = current_status.upper() if current_status else None

        # CPF / CNPJ do comprador
        doc = str(client.get("cpf_cnpj") or "").strip()
        if doc:
            doc_label = get_doc_label(doc)
            custom_fields[doc_label] = doc

    elif wh_type == "lead" and event == "checkoutabandoned":
        lead = payload.get("lead") or {}
        result['event_type'] = "carrinho_abandonado"
        result['name'] = lead.get("name") or None
        result['email'] = lead.get("email") or None
        
        # Limpa telefone
        phone_raw = str(lead.get("cellphone") or "").strip()
        import re as _re
        phone_clean = _re.sub(r'\D', '', phone_raw)
        result['phone'] = phone_clean if phone_clean else None
        
        result['country'] = "BR"
        result['raw_status'] = "CHECKOUT_ABANDONED"

    if custom_fields:
        result['custom_fields'] = custom_fields


def parse_herospark(payload: dict, result: dict) -> None:
    """Parser for HeroSpark webhooks.

    HeroSpark uses user-configured Liquid templates, so the payload structure
    depends on what the user configured. The recommended body template
    (from Clint / ZapVoice docs) produces:
    {
        "event": "<HARDCODED_EVENT>",
        "id": "<webhook_id>",
        "buyer": { "name", "email", "phone", "doc" },
        "product": { "id", "name" },
        "purchase": {
            "price": { "gross": "<cents>", "value": "<cents>" },
            "status": "{{payment_status}}",
            "payment": { "type": "credit_card|bank_slip|pix" },
            "transaction": "{{payment_id}}",
            "subscription": { "id", "status" }
        }
    }
    offer_price is sent in cents (divide by 100).
    """
    event = str(payload.get("event") or "").upper().strip()
    buyer = payload.get("buyer") or {}
    product = payload.get("product") or {}
    purchase = payload.get("purchase") or {}
    price_obj = purchase.get("price") or {}
    payment = purchase.get("payment") or {}
    method = str(payment.get("type") or "").lower()
    subscription = purchase.get("subscription") or {}

    is_pix = "pix" in method
    is_boleto = "bank_slip" in method or "boleto" in method

    # ---- Flags de Order Bump e Upsell ----
    bump_used = bool(payload.get("purchaseBumpUsed")) or bool(payload.get("bump"))
    upsell    = bool(payload.get("upsell"))

    # ---- Event type mapping ----
    if event == "PURCHASE_APPROVED":
        if upsell:
            result['event_type'] = "compra_aprovada_upsell"
        elif bump_used:
            result['event_type'] = "compra_aprovada_com_ob"
        else:
            result['event_type'] = "compra_aprovada"
    elif event == "PURCHASE_CANCELED":
        if is_pix:
            result['event_type'] = "pix_expirado"
        elif is_boleto:
            result['event_type'] = "boleto_expirado"
        else:
            result['event_type'] = "cartao_recusado"
    elif event == "PURCHASE_BILLET_PRINTED":
        result['event_type'] = "pix_gerado" if is_pix else "boleto_impresso"
    elif event in ("PURCHASE_REFUNDED",):
        result['event_type'] = "reembolso"
    elif event in ("PURCHASE_CHARGEBACK", "PURCHASE_PROTEST"):
        result['event_type'] = "chargeback"
    elif event == "PURCHASE_EXPIRED":
        result['event_type'] = "pix_expirado" if is_pix else "boleto_expirado"
    elif event == "PURCHASE_DELAYED":
        result['event_type'] = "assinatura_atrasada"
    elif event == "PURCHASE_OUT_OF_SHOPPING_CART":
        result['event_type'] = "carrinho_abandonado"
    elif event == "SUBSCRIPTION_CANCELED":
        result['event_type'] = "assinatura_cancelada"
    elif event == "SUBSCRIPTION_RENEWED":
        result['event_type'] = "assinatura_renovada"

    # ---- Buyer info ----
    result['name'] = buyer.get("name") or None
    result['email'] = buyer.get("email") or None

    # Limpa telefone: remove +, espaços e caracteres não numéricos
    phone_raw = str(buyer.get("phone") or "").strip()
    import re as _re
    phone_clean = _re.sub(r'\D', '', phone_raw)
    result['phone'] = phone_clean if phone_clean else None

    # ---- Product ----
    result['product_name'] = product.get("name") or None

    # ---- Price (offer_price is in cents) ----
    raw_price = price_obj.get("value") or price_obj.get("gross")
    if raw_price is not None:
        try:
            cents = float(raw_price)
            # Heuristic: if value > 1000 it's likely cents, divide by 100
            result['price'] = f"{(cents / 100 if cents > 1000 else cents):.2f}"
        except Exception:
            result['price'] = str(raw_price)

    # ---- Payment method ----
    result['payment_method'] = method or None

    # ---- Country default BR ----
    result['country'] = "BR"

    # ---- Raw status ----
    result['raw_status'] = event or None

    # ---- Campos extras (custom_fields) ----
    custom_fields = {}

    # CPF / CNPJ / documento do comprador
    doc = str(buyer.get("doc") or "").strip()
    if doc:
        doc_label = get_doc_label(doc)
        custom_fields[doc_label] = doc

    # Assinatura (apenas status se houver)
    sub_status = str(subscription.get("status") or "").strip() if isinstance(subscription, dict) else ""
    if sub_status:
        custom_fields["Status Assinatura"] = sub_status

    # Produtos do Order Bump (array "bump")
    bump_items = payload.get("bump") or []
    if isinstance(bump_items, list) and bump_items:
        bump_names = ", ".join(
            str(b.get("name") or "Produto OB") for b in bump_items if isinstance(b, dict)
        )
        if bump_names:
            custom_fields["Produto(s) Order Bump"] = bump_names

    if custom_fields:
        result['custom_fields'] = custom_fields

    # Flags para uso pelo sistema de disparo
    if bump_used:
        result['order_bump'] = True
    if upsell:
        result['is_upsell'] = True


# ---------------------------------------------------------------------------
# Appmax
# ---------------------------------------------------------------------------
def parse_appmax(payload: dict, result: dict) -> None:
    """
    Appmax "Standard Model" (DefaultResponse) webhook.
    Payload structure:
      {
        "data": {
          "id": <int>,
          "status": "aprovado"|"integrado"|"autorizado"|"processing"|
                    "analyzing"|"waiting_payment"|"estornado"|
                    "pending_refund"|"cancelado",
          "total": <float>,           # BRL
          "full_payment_amount": <str>,
          "payment_type": "credit_card"|"pix"|"boleto",
          "customer": {
            "firstname": ..., "lastname": ...,
            "email": ..., "telephone": ...
          },
          "products": [{"name": ..., "price": ..., "qty": ...}],
          "subscription": {"id": ..., "status": ...}  # optional
        }
      }
    Minimal webhook (ecomplus-style): { "data": { "id": <int> } }
    — in that case event_type stays None (caller should fetch order details).
    """
    data = payload.get("data") or {}
    status = str(data.get("status") or "").lower().strip()
    payment_type = str(data.get("payment_type") or data.get("payment_method") or "").lower().strip()
    subscription = data.get("subscription") or {}
    customer = data.get("customer") or {}
    products = data.get("products") or []

    is_pix = "pix" in payment_type
    is_boleto = "boleto" in payment_type

    # ---- Event type mapping ----
    if status in ("aprovado", "integrado", "autorizado", "processing"):
        result['event_type'] = "compra_aprovada"
    elif status == "waiting_payment":
        if is_pix:
            result['event_type'] = "pix_gerado"
        elif is_boleto:
            result['event_type'] = "boleto_impresso"
        else:
            result['event_type'] = "boleto_impresso"
    elif status in ("estornado", "pending_refund"):
        result['event_type'] = "reembolso"
    elif status == "cancelado":
        if is_pix:
            result['event_type'] = "pix_expirado"
        elif is_boleto:
            result['event_type'] = "boleto_expirado"
        else:
            result['event_type'] = "cartao_recusado"
    elif status == "analyzing":
        # Card under manual review — treat as recusado
        result['event_type'] = "cartao_recusado"

    # Override for subscription-level status if present
    sub_status = str(subscription.get("status") or "").lower().strip()
    if sub_status == "canceled":
        result['event_type'] = "assinatura_cancelada"
    elif sub_status in ("unpaid", "overdue", "atrasada"):
        result['event_type'] = "assinatura_atrasada"
    elif sub_status in ("active", "renewed") and status in ("aprovado", "integrado", "autorizado"):
        result['event_type'] = "assinatura_renovada"

    # ---- Customer ----
    first = str(customer.get("firstname") or "").strip()
    last = str(customer.get("lastname") or "").strip()
    full_name = f"{first} {last}".strip() if first or last else None
    result['name'] = full_name or None
    result['email'] = customer.get("email") or None
    phone_raw = str(customer.get("telephone") or customer.get("phone") or "").strip().lstrip("+")
    result['phone'] = phone_raw if phone_raw else None

    # ---- Product ----
    if products:
        result['product_name'] = products[0].get("name") or None

    # ---- Price (BRL, not cents) ----
    raw_total = data.get("total") or data.get("full_payment_amount")
    if raw_total is not None:
        try:
            result['price'] = f"{float(raw_total):.2f}"
        except Exception:
            result['price'] = str(raw_total)

    # ---- Payment method ----
    result['payment_method'] = payment_type or None

    # ---- Country ----
    result['country'] = "BR"

    # ---- Raw status ----
    result['raw_status'] = status or None


def parse_zapgroup(payload: dict, result: dict) -> None:
    """
    Parser para a plataforma ZapGroup (Extração de Leads e Votos de Enquete de Grupos do WhatsApp).
    
    Payload de Exemplo:
    {
      "grupo": {
        "id": "teste-preview-id",
        "jid": "120363405673797894@g.us",
        "nome": "WhatsApp - Teste - Astrologia"
      },
      "evento": "voto_enquete_teste",
      "usuario": {
        "nome": "Lead de Demonstração",
        "numero": "5511999998888"
      }
    }
    """
    # 1. Nome e Telefone do Contato / Usuário
    usuario = payload.get("usuario")
    if isinstance(usuario, dict):
        result['name'] = usuario.get("nome") or usuario.get("name") or usuario.get("contact_name")
        phone_raw = usuario.get("numero") or usuario.get("phone") or usuario.get("whatsapp") or usuario.get("celular") or usuario.get("telefone") or usuario.get("jid")
        if phone_raw:
            phone_str = str(phone_raw).split("@")[0]
            result['phone'] = "".join(filter(str.isdigit, phone_str))
    else:
        result['name'] = payload.get("nome") or payload.get("name") or payload.get("contact_name")
        phone_raw = payload.get("numero") or payload.get("phone") or payload.get("whatsapp") or payload.get("celular") or payload.get("telefone")
        if phone_raw:
            result['phone'] = str(phone_raw).strip()
    
    # 2. Grupo -> Nome do Produto (Garante extração de string se grupo for um dict)
    grupo = payload.get("grupo") or payload.get("product_name") or payload.get("group_name") or payload.get("group")
    if isinstance(grupo, dict):
        result['product_name'] = grupo.get("nome") or grupo.get("name") or grupo.get("id") or str(grupo)
    elif grupo:
        result['product_name'] = str(grupo).strip()
    
    # 3. Enquete / Variáveis personalizadas
    enquete = payload.get("enquete")
    if isinstance(enquete, dict):
        if not result.get('variables'):
            result['variables'] = {}
        if enquete.get("titulo"):
            result['variables']['titulo_enquete'] = str(enquete.get("titulo"))
        if enquete.get("opcao_marcada"):
            result['variables']['opcao_marcada'] = str(enquete.get("opcao_marcada"))
        if enquete.get("opcoes_marcadas"):
            result['variables']['opcoes_marcadas'] = ", ".join(map(str, enquete.get("opcoes_marcadas")))

    # 4. Tipo de Evento
    event_val = payload.get("evento") or payload.get("event") or payload.get("event_type") or payload.get("status") or "lead_extraido"
    event_str = str(event_val).lower().strip()
    if "voto" in event_str or "enquete" in event_str:
        result['event_type'] = "voto_enquete"
    elif "lead" in event_str or "extra" in event_str:
        result['event_type'] = "lead_extraido"
    else:
        result['event_type'] = event_str
    
    # 5. Timestamp e Metadados do Evento
    result['event_time'] = payload.get("data_hora") or payload.get("extraido_em") or payload.get("created_at") or payload.get("timestamp")
    result['raw_status'] = str(event_val)
    result['country'] = "BR"

